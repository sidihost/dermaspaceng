import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'
import { sendStaffInvitation } from '@/lib/email'

const sql = neon(process.env.DATABASE_URL!)

function resolveBaseUrl(request: NextRequest): string {
  const headerOrigin = request.headers.get('origin')
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  const host = request.headers.get('host')
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    headerOrigin ||
    (host ? `${proto}://${host}` : '')
  return raw.replace(/\/+$/, '')
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    // Bullet-proof users-only fetch so optional activity tables can never
    // blank out the team roster. Archived rows (deleted_at IS NOT NULL)
    // are excluded from active roster display.
    const staffRows = (await sql`
      SELECT
        u.id, u.email, u.username, u.first_name, u.last_name, u.phone,
        u.role, u.is_active, u.email_verified, u.avatar_url,
        COALESCE(u.must_change_password, FALSE) AS must_change_password,
        COALESCE(u.is_super_admin, FALSE) AS is_super_admin,
        COALESCE(u.can_manage_services, FALSE) AS can_manage_services,
        u.created_at,
        COALESCE(u.updated_at, u.created_at) AS last_seen_at
      FROM users u
      WHERE u.role IN ('staff', 'admin')
        AND u.deleted_at IS NULL
      ORDER BY u.created_at DESC
    `) as Array<Record<string, unknown>>

    // Best-effort activity counts. Wrapped in try/catch so a missing
    // optional column on a fresh database can't blank out the whole page.
    let activityById = new Map<
      string,
      {
        replies_count: number
        complaints_assigned: number
        consultations_assigned: number
        gift_cards_assigned: number
      }
    >()
    try {
      const activityRows = (await sql`
        SELECT
          u.id::text AS id,
          COUNT(DISTINCT ar.id) as replies_count,
          COUNT(DISTINCT CASE WHEN cm.assigned_to = u.id THEN cm.id END) as complaints_assigned,
          COUNT(DISTINCT CASE WHEN c.assigned_to = u.id THEN c.id END) as consultations_assigned,
          COUNT(DISTINCT CASE WHEN gcr.assigned_to = u.id THEN gcr.id END) as gift_cards_assigned
        FROM users u
        LEFT JOIN admin_replies ar ON ar.staff_id = u.id
        LEFT JOIN contact_messages cm ON cm.assigned_to = u.id
        LEFT JOIN consultations c ON c.assigned_to = u.id
        LEFT JOIN gift_card_requests gcr ON gcr.assigned_to = u.id
        WHERE u.role IN ('staff', 'admin')
          AND u.deleted_at IS NULL
        GROUP BY u.id
      `) as Array<Record<string, unknown>>
      for (const row of activityRows) {
        activityById.set(String(row.id), {
          replies_count: Number(row.replies_count ?? 0),
          complaints_assigned: Number(row.complaints_assigned ?? 0),
          consultations_assigned: Number(row.consultations_assigned ?? 0),
          gift_cards_assigned: Number(row.gift_cards_assigned ?? 0),
        })
      }
    } catch (activityErr) {
      console.warn('Staff activity counts failed (optional join):', activityErr)
      activityById = new Map()
    }

    // Separate best-effort live chat count so a missing table never impacts core counts.
    const liveChatById = new Map<string, number>()
    try {
      const chatRows = (await sql`
        SELECT assigned_staff_id::text AS id, COUNT(*)::int AS live_chats_assigned
        FROM live_chat_sessions
        WHERE assigned_staff_id IS NOT NULL
        GROUP BY assigned_staff_id
      `) as Array<Record<string, unknown>>
      for (const row of chatRows) {
        liveChatById.set(String(row.id), Number(row.live_chats_assigned ?? 0))
      }
    } catch {
      // Optional table; ignore gracefully
    }

    const staff = staffRows.map((row) => {
      const id = String(row.id)
      const counts = activityById.get(id) ?? {
        replies_count: 0,
        complaints_assigned: 0,
        consultations_assigned: 0,
        gift_cards_assigned: 0,
      }
      return {
        ...row,
        ...counts,
        live_chats_assigned: liveChatById.get(id) ?? 0,
      }
    })

    // Get pending invitations (including token so admins can copy the invite link directly)
    const rawInvitations = (await sql`
      SELECT
        si.id, si.email, si.role, si.token, si.created_at, si.expires_at,
        u.first_name as invited_by_name, u.last_name as invited_by_last
      FROM staff_invitations si
      LEFT JOIN users u ON u.id = si.invited_by
      WHERE si.used_at IS NULL AND si.expires_at > NOW()
      ORDER BY si.created_at DESC
    `) as Array<Record<string, unknown>>

    const baseUrl = resolveBaseUrl(request)
    const invitations = rawInvitations.map((inv) => {
      const token = typeof inv.token === 'string' ? inv.token : null
      return {
        id: inv.id,
        email: inv.email,
        role: inv.role,
        created_at: inv.created_at,
        expires_at: inv.expires_at,
        invited_by_name: inv.invited_by_name ?? null,
        invited_by_last: inv.invited_by_last ?? null,
        invite_url: token ? `${baseUrl}/accept-invite?token=${token}` : null,
      }
    })

    return NextResponse.json({ staff, invitations })
  } catch (error) {
    console.error('Get staff error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch staff'
    const status = /unauthor|forbidden/i.test(message) ? 401 : 500
    return NextResponse.json(
      { error: status === 401 ? message : 'Failed to fetch staff' },
      { status }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()

    const { email, role } = await request.json()

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    if (!normalizedEmail || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      )
    }

    // Basic email shape check — prevents obviously-broken invites from
    // persisting and surfaces a nicer message than a DB constraint error.
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    if (!emailOk) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    if (!['staff', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await sql`SELECT id FROM users WHERE email = ${normalizedEmail}`
    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      )
    }

    // Check for existing pending invitation
    const existingInvite = await sql`
      SELECT id FROM staff_invitations 
      WHERE email = ${normalizedEmail} AND used_at IS NULL AND expires_at > NOW()
    `
    if (existingInvite.length > 0) {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email' },
        { status: 400 }
      )
    }

    // Create invitation token + row id.
    //
    // We generate the `id` in application code instead of relying on the
    // table's `DEFAULT gen_random_uuid()`. On some Neon databases that
    // default isn't applied (the pgcrypto extension wasn't enabled when
    // the table was first created, or a later migration dropped the
    // default), which surfaces to admins as:
    //   null value in column "id" of relation "staff_invitations"
    //   violates not-null constraint
    // Passing the id explicitly makes this route correct regardless of
    // the underlying DB defaults.
    const invitationId = uuidv4()
    const token = uuidv4()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await sql`
      INSERT INTO staff_invitations (id, email, role, invited_by, token, expires_at)
      VALUES (${invitationId}, ${normalizedEmail}, ${role}, ${admin.id}, ${token}, ${expiresAt})
    `

    // Build the invite link against a reliable base:
    //   1. NEXT_PUBLIC_APP_URL if set
    //   2. Otherwise, derive the origin from the current request headers so
    //      localhost / preview deploys just work without any env config.
    // The accept-invite page reads the token from ?token=… (not a path
    // segment), so the URL format must match that.
    const headerOrigin = request.headers.get('origin')
    const proto = request.headers.get('x-forwarded-proto') ?? 'https'
    const host = request.headers.get('host')
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      headerOrigin ||
      (host ? `${proto}://${host}` : '')
    const inviteUrl = `${baseUrl}/accept-invite?token=${token}`

    // Email the invitee — best-effort. Previously the route only
    // returned the URL for the admin to copy, which is what the
    // user reported as "staff invitation not working at all". We
    // now send a branded invitation email containing the same
    // link, so the invitee actually receives a notification. If
    // the email transport is misconfigured we still return the
    // URL so the admin can fall back to copying the link.
    let emailSent = false
    try {
      const inviterName =
        `${admin.first_name || ''} ${admin.last_name || ''}`.trim() ||
        admin.email ||
        'Dermaspace Admin'
      emailSent = await sendStaffInvitation({
        email: normalizedEmail,
        inviterName,
        role,
        token,
      })
    } catch (emailErr) {
      console.error('Staff invitation email send failed:', emailErr)
    }

    return NextResponse.json({
      success: true,
      inviteUrl,
      emailSent,
      message: emailSent
        ? `Invitation email sent to ${normalizedEmail}`
        : `Invitation created. Email could not be sent — copy the link below to share manually.`,
    })
  } catch (error) {
    console.error('Create invitation error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = /unauthor|forbidden/i.test(message) ? 401 : 500
    return NextResponse.json(
      { error: status === 401 ? message : `Failed to create invitation: ${message}` },
      { status }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin()

    const { invitationId } = await request.json()

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      )
    }

    await sql`DELETE FROM staff_invitations WHERE id = ${invitationId}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete invitation error:', error)
    const message = error instanceof Error ? error.message : 'Failed to delete invitation'
    const status = /unauthor|forbidden/i.test(message) ? 401 : 500
    return NextResponse.json(
      { error: status === 401 ? message : 'Failed to delete invitation' },
      { status }
    )
  }
}
