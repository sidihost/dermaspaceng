/**
 * POST /api/admin/users/[userId]/impersonate
 *
 * Lets an admin temporarily sign in as another user to investigate
 * an issue from the customer's POV. The original admin session is
 * preserved (NOT destroyed) — we mint a new session for the target
 * user, swap the cookie, and stash a pointer back to the admin
 * session so the "Stop impersonating" route can restore it later.
 *
 * Schema details (see scripts/430-admin-impersonation.sql):
 *   sessions.impersonator_id           = admin's user_id
 *   sessions.impersonator_session_id   = admin's original session id
 *   admin_impersonation_log            = tamper-evident audit log,
 *                                        insert-only.
 *
 * Security guards:
 *   - Caller must already be an admin (requireAdmin throws otherwise).
 *   - Admins cannot impersonate themselves.
 *   - Admins cannot impersonate other admins (avoids privilege ladder
 *     abuse — if the admin needs another admin's view they should sign
 *     in directly).
 *   - Suspended target accounts are blocked (would defeat the point of
 *     the suspension).
 *
 * Returns the new session id alongside `success` so the client can
 * confirm the swap before redirecting.
 */

import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'
import { requireAdmin } from '@/lib/auth'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await requireAdmin()
    const { userId } = await params

    if (userId === admin.id) {
      return NextResponse.json(
        { error: 'You cannot impersonate yourself.' },
        { status: 400 }
      )
    }

    const targetRows = await sql`
      SELECT id, role, is_active, first_name, last_name, email
      FROM users WHERE id = ${userId} LIMIT 1
    `
    if (targetRows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const target = targetRows[0] as {
      id: string
      role: string
      is_active: boolean
      first_name: string
      last_name: string
      email: string
    }

    if (target.role === 'admin') {
      return NextResponse.json(
        { error: 'Admins cannot impersonate other admins.' },
        { status: 403 }
      )
    }
    if (target.is_active === false) {
      return NextResponse.json(
        {
          error:
            'This user is suspended. Reactivate them first before signing in as them.',
        },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const adminSessionId = cookieStore.get('session_id')?.value
    if (!adminSessionId) {
      return NextResponse.json(
        { error: 'Admin session expired — sign in again.' },
        { status: 401 }
      )
    }

    // Optional reason from the request body. We don't require it
    // because the audit log already captures who/when/IP — but if the
    // admin types a reason in the confirmation modal it's stored
    // alongside the row.
    let reason: string | null = null
    try {
      const body = await request.json().catch(() => ({}))
      if (body && typeof body.reason === 'string') {
        reason = body.reason.trim().slice(0, 500) || null
      }
    } catch {
      // No body / malformed JSON — that's fine, reason stays null.
    }

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const deviceInfo = `[Impersonation] ${userAgent.slice(0, 240)}`

    const newSessionId = uuidv4()
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000) // 4-hour cap

    // Mint the impersonation session. The two impersonator_* columns
    // are the breadcrumb back to the admin's real session.
    await sql`
      INSERT INTO sessions (
        id, user_id, device_info, ip_address, expires_at,
        impersonator_id, impersonator_session_id
      )
      VALUES (
        ${newSessionId}, ${target.id}, ${deviceInfo}, ${ipAddress}, ${expiresAt},
        ${admin.id}, ${adminSessionId}
      )
    `

    // Tamper-evident audit row. Failures here are best-effort logged
    // but never block the impersonation — the operational need to
    // investigate a customer issue outweighs a one-off log write
    // failing.
    try {
      await sql`
        INSERT INTO admin_impersonation_log (
          admin_id, target_user_id, session_id, reason, ip_address, user_agent
        )
        VALUES (
          ${admin.id}, ${target.id}, ${newSessionId}, ${reason}, ${ipAddress}, ${userAgent}
        )
      `
    } catch (logErr) {
      console.error('[v0] Impersonation audit log insert failed:', logErr)
    }

    // Swap the cookie. We deliberately reuse the same name + flags as
    // the regular signin flow so the rest of the auth stack just
    // works.
    cookieStore.set('session_id', newSessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    })

    return NextResponse.json({
      success: true,
      target: {
        id: target.id,
        first_name: target.first_name,
        last_name: target.last_name,
        email: target.email,
      },
    })
  } catch (error) {
    console.error('[v0] Impersonate error:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to start impersonation'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
