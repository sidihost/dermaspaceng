import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { rateLimit } from '@/lib/redis'
import { isPlaceholderEmail } from '@/lib/auth-onboarding'
import { sendAppealReceivedEmail } from '@/lib/email'
import { notifyAdmins } from '@/lib/notifications'
import { ensureAccountAppealsTable } from '@/lib/suspension-appeals-db'
import {
  normalizeAppealRole,
  validateAppealSubmission,
  verifyAppealToken,
} from '@/lib/suspension-appeals'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const limit = await rateLimit('appeals:ip', ip, 10, 600)
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many appeal requests. Please wait a few minutes and try again.' },
        { status: 429 },
      )
    }

    const body = (await request.json().catch(() => ({}))) as {
      token?: unknown
      email?: unknown
      appealMessage?: unknown
      contactEmail?: unknown
    }

    const validation = validateAppealSubmission({
      appealMessage: body.appealMessage,
      contactEmail: body.contactEmail,
    })
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const rawToken = typeof body.token === 'string' ? body.token.trim() : ''
    const rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

    let targetUser: {
      id: string
      email: string | null
      first_name: string | null
      last_name: string | null
      role: string | null
      is_active: boolean
      deleted_at: string | null
    } | null = null
    let suspensionReason: string | null = null

    if (rawToken) {
      const verified = verifyAppealToken(rawToken)
      if (!verified.ok) {
        return NextResponse.json(
          {
            error:
              verified.code === 'expired'
                ? 'Your appeal link has expired. Enter your account email instead to submit an appeal.'
                : 'Your appeal link is invalid. Enter your account email instead to submit an appeal.',
          },
          { status: 400 },
        )
      }
      suspensionReason = verified.payload.reason
      const rows = (await sql`
        SELECT id, email, first_name, last_name, role, COALESCE(is_active, TRUE) AS is_active, deleted_at
        FROM users
        WHERE id = ${verified.payload.userId}
        LIMIT 1
      `) as Array<{
        id: string
        email: string | null
        first_name: string | null
        last_name: string | null
        role: string | null
        is_active: boolean
        deleted_at: string | null
      }>
      const candidate = rows[0] ?? null
      if (
        !candidate ||
        candidate.deleted_at !== null ||
        (candidate.email || '').trim().toLowerCase() !== verified.payload.email
      ) {
        return NextResponse.json(
          {
            error:
              'Your appeal link is no longer valid. Enter your account email instead to submit an appeal.',
          },
          { status: 400 },
        )
      }
      targetUser = candidate

      if (targetUser.is_active !== false) {
        return NextResponse.json(
          {
            error: 'This account is currently active and does not require an appeal. You can sign in directly.',
          },
          { status: 409 },
        )
      }

      await ensureAccountAppealsTable()

      const existing = (await sql`
        SELECT id, created_at
        FROM account_appeals
        WHERE user_id = ${targetUser.id} AND status = 'pending'
        ORDER BY created_at DESC
        LIMIT 1
      `) as Array<{ id: string; created_at: string }>

      if (existing.length > 0) {
        return NextResponse.json(
          {
            error: 'You already have an appeal under review.',
            existingAppealId: String(existing[0].id),
            createdAt: String(existing[0].created_at),
          },
          { status: 409 },
        )
      }

      const appealId = `APL-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`
      const userRole = normalizeAppealRole(targetUser.role)
      const userName =
        [targetUser.first_name, targetUser.last_name].filter(Boolean).join(' ').trim() ||
        targetUser.email ||
        'Dermaspace Member'
      const storedEmail = targetUser.email || ''

      await sql`
        INSERT INTO account_appeals (
          id,
          user_id,
          user_email,
          user_name,
          user_role,
          suspension_reason,
          appeal_message,
          contact_email,
          status
        ) VALUES (
          ${appealId},
          ${String(targetUser.id)},
          ${storedEmail},
          ${userName},
          ${userRole},
          ${suspensionReason},
          ${validation.appealMessage},
          ${validation.contactEmail},
          'pending'
        )
      `

      if (targetUser.email && !isPlaceholderEmail(targetUser.email)) {
        await sendAppealReceivedEmail({
          email: targetUser.email,
          firstName: targetUser.first_name,
          appealId,
          role: userRole,
        }).catch((err) => {
          console.error('[api/appeals] failed to send confirmation email:', err)
        })
      }

      const roleLabel = userRole === 'user' ? 'Client' : userRole === 'staff' ? 'Staff' : 'Admin'
      await notifyAdmins({
        title: 'New suspension appeal',
        message: `${roleLabel} ${userName} submitted appeal ${appealId}.`,
        type: 'system',
        referenceType: 'appeal',
        referenceId: appealId,
        actionUrl: '/admin/appeals',
        priority: 'high',
        roles: ['admin'],
      })

      return NextResponse.json(
        {
          success: true,
          appealId,
          status: 'pending',
        },
        { status: 201 },
      )
    }

    // Untokenized appeal submission: prevent account/suspension-status
    // enumeration and third-party contactEmail relay abuse by enforcing
    // per-email rate limiting and always returning the same generic
    // confirmation regardless of whether the email exists, is active, or
    // already has an open appeal.
    if (!rawEmail || rawEmail.length > 254 || !EMAIL_RE.test(rawEmail)) {
      return NextResponse.json(
        { error: 'Please enter the email address on your suspended account.' },
        { status: 400 },
      )
    }

    const emailLimit = await rateLimit('appeals:email', rawEmail, 3, 3600)
    if (!emailLimit.ok) {
      return NextResponse.json(
        { error: 'Too many appeal requests for this email address. Please try again later.' },
        { status: 429 },
      )
    }

    const genericSuccess = {
      success: true,
      generic: true,
      message:
        'If a suspended account matches that email address, your appeal has been recorded and updates will be sent to the email address on file.',
    }

    const rows = (await sql`
      SELECT id, email, first_name, last_name, role, COALESCE(is_active, TRUE) AS is_active, deleted_at
      FROM users
      WHERE LOWER(email) = LOWER(${rawEmail})
        AND deleted_at IS NULL
      LIMIT 1
    `) as Array<{
      id: string
      email: string | null
      first_name: string | null
      last_name: string | null
      role: string | null
      is_active: boolean
      deleted_at: string | null
    }>
    targetUser = rows[0] ?? null

    if (!targetUser || targetUser.is_active !== false) {
      return NextResponse.json(genericSuccess, { status: 200 })
    }

    await ensureAccountAppealsTable()

    const existing = (await sql`
      SELECT id
      FROM account_appeals
      WHERE user_id = ${targetUser.id} AND status = 'pending'
      LIMIT 1
    `) as Array<{ id: string }>

    if (existing.length > 0) {
      return NextResponse.json(genericSuccess, { status: 200 })
    }

    const appealId = `APL-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`
    const userRole = normalizeAppealRole(targetUser.role)
    const userName =
      [targetUser.first_name, targetUser.last_name].filter(Boolean).join(' ').trim() ||
      targetUser.email ||
      'Dermaspace Member'

    await sql`
      INSERT INTO account_appeals (
        id,
        user_id,
        user_email,
        user_name,
        user_role,
        suspension_reason,
        appeal_message,
        contact_email,
        status
      ) VALUES (
        ${appealId},
        ${String(targetUser.id)},
        ${targetUser.email || rawEmail},
        ${userName},
        ${userRole},
        ${null},
        ${validation.appealMessage},
        ${validation.contactEmail},
        'pending'
      )
    `

    if (targetUser.email && !isPlaceholderEmail(targetUser.email)) {
      await sendAppealReceivedEmail({
        email: targetUser.email,
        firstName: targetUser.first_name,
        appealId,
        role: userRole,
      }).catch((err) => {
        console.error('[api/appeals] failed to send confirmation email:', err)
      })
    }

    const roleLabel = userRole === 'user' ? 'Client' : userRole === 'staff' ? 'Staff' : 'Admin'
    await notifyAdmins({
      title: 'New suspension appeal',
      message: `${roleLabel} ${userName} submitted appeal ${appealId}.`,
      type: 'system',
      referenceType: 'appeal',
      referenceId: appealId,
      actionUrl: '/admin/appeals',
      priority: 'high',
      roles: ['admin'],
    })

    return NextResponse.json(genericSuccess, { status: 200 })
  } catch (error) {
    console.error('[api/appeals] POST error:', error)
    return NextResponse.json(
      { error: 'Could not submit your appeal. Please try again.' },
      { status: 500 },
    )
  }
}
