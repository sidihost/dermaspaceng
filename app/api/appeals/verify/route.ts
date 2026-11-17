import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { rateLimit } from '@/lib/redis'
import { ensureAccountAppealsTable } from '@/lib/suspension-appeals-db'
import {
  maskEmail,
  normalizeAppealRole,
  verifyAppealToken,
} from '@/lib/suspension-appeals'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const limit = await rateLimit('appeals:verify', ip, 30, 300)
    if (!limit.ok) {
      return NextResponse.json(
        {
          valid: false,
          code: 'rate_limited',
          error: 'Too many verification attempts. Please wait a few minutes and try again.',
        },
        { status: 429 },
      )
    }

    const token = request.nextUrl.searchParams.get('token')
    const verified = verifyAppealToken(token)
    if (!verified.ok) {
      return NextResponse.json(
        {
          valid: false,
          code: verified.code,
          error:
            verified.code === 'expired'
              ? 'This appeal link has expired. You can still submit an appeal using your account email below.'
              : 'This appeal link is invalid. You can still submit an appeal using your account email below.',
        },
        { status: 400 },
      )
    }

    const userRows = (await sql`
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

    const user = userRows[0]
    if (
      !user ||
      user.deleted_at !== null ||
      (user.email || '').trim().toLowerCase() !== verified.payload.email
    ) {
      return NextResponse.json(
        {
          valid: false,
          code: 'invalid',
          error: 'This appeal link is no longer valid. You can still submit an appeal using your account email below.',
        },
        { status: 400 },
      )
    }

    if (user.is_active !== false) {
      return NextResponse.json({
        valid: true,
        status: 'reinstated',
        firstName: user.first_name || null,
        maskedEmail: maskEmail(user.email || verified.payload.email),
        role: normalizeAppealRole(user.role),
      })
    }

    await ensureAccountAppealsTable()
    const pendingRows = (await sql`
      SELECT id, created_at
      FROM account_appeals
      WHERE user_id = ${user.id} AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `) as Array<{ id: string; created_at: string }>

    if (pendingRows.length > 0) {
      return NextResponse.json({
        valid: true,
        status: 'already_pending',
        firstName: user.first_name || null,
        maskedEmail: maskEmail(user.email || verified.payload.email),
        role: normalizeAppealRole(user.role),
        reason: verified.payload.reason,
        appeal: {
          id: String(pendingRows[0].id),
          createdAt: String(pendingRows[0].created_at),
        },
      })
    }

    return NextResponse.json({
      valid: true,
      status: 'eligible',
      firstName: user.first_name || null,
      maskedEmail: maskEmail(user.email || verified.payload.email),
      role: normalizeAppealRole(user.role),
      reason: verified.payload.reason,
    })
  } catch (error) {
    console.error('[api/appeals/verify] GET error:', error)
    return NextResponse.json(
      { valid: false, error: 'Could not verify your appeal link right now.' },
      { status: 500 },
    )
  }
}
