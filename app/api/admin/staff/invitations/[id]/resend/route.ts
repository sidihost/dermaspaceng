import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { v4 as uuidv4 } from 'uuid'
import { requireAdmin } from '@/lib/auth'
import { sendStaffInvitation } from '@/lib/email'

const sql = neon(process.env.DATABASE_URL!)

/**
 * POST /api/admin/staff/invitations/[id]/resend
 *
 * Re-sends a pending staff invitation email and rotates the token.
 *
 * Why rotate the token instead of re-sending the existing one:
 *   - The previous token may have been pasted into Slack / email /
 *     a screenshot. Issuing a fresh secret on resend is the safer
 *     default and matches how every modern auth provider treats
 *     "resend invite" (Vercel, Linear, Notion, GitHub).
 *   - Rotating also extends `expires_at` so an admin can rescue an
 *     invite that's about to lapse without having to delete and
 *     re-create it.
 *
 * Hard guards: the invitation must exist, must not already be
 * accepted (`used_at IS NULL`), and the inviter must still be an
 * admin. Anything else returns a 4xx so the UI can show a useful
 * error instead of silently doing nothing.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Invitation id is required' },
        { status: 400 }
      )
    }

    const rows = await sql`
      SELECT id, email, role, used_at
      FROM staff_invitations
      WHERE id = ${id}
      LIMIT 1
    `
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }
    const invite = rows[0] as {
      id: string
      email: string
      role: string
      used_at: string | null
    }
    if (invite.used_at) {
      return NextResponse.json(
        { error: 'This invitation has already been accepted.' },
        { status: 409 }
      )
    }

    const newToken = uuidv4()
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await sql`
      UPDATE staff_invitations
      SET token = ${newToken},
          expires_at = ${newExpiresAt}
      WHERE id = ${id}
    `

    const headerOrigin = request.headers.get('origin')
    const proto = request.headers.get('x-forwarded-proto') ?? 'https'
    const host = request.headers.get('host')
    const baseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      headerOrigin ||
      (host ? `${proto}://${host}` : '')
    ).replace(/\/+$/, '')
    const inviteUrl = `${baseUrl}/accept-invite?token=${newToken}`

    let emailSent = false
    try {
      const inviterName =
        `${admin.first_name || ''} ${admin.last_name || ''}`.trim() ||
        admin.email ||
        'Dermaspace Admin'
      emailSent = await sendStaffInvitation({
        email: invite.email,
        inviterName,
        role: (invite.role === 'admin' ? 'admin' : 'staff') as 'admin' | 'staff',
        token: newToken,
      })
    } catch (emailErr) {
      console.error('Resend invite email failed:', emailErr)
    }

    return NextResponse.json({
      success: true,
      emailSent,
      inviteUrl,
      expiresAt: newExpiresAt.toISOString(),
      message: emailSent
        ? `Reminder sent to ${invite.email}`
        : `Link refreshed for ${invite.email}, but the email failed to send.`,
    })
  } catch (error) {
    console.error('Resend invitation error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = /unauthor|forbidden/i.test(message) ? 401 : 500
    return NextResponse.json(
      { error: status === 401 ? message : `Failed to resend invitation: ${message}` },
      { status }
    )
  }
}
