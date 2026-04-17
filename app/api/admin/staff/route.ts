import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdmin, getCurrentUser } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    await requireAdmin()

    // Get all staff and admin users
    const staff = await sql`
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.phone, 
        u.role, u.is_active, u.created_at,
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
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `

    // Get pending invitations
    const invitations = await sql`
      SELECT 
        si.id, si.email, si.role, si.created_at, si.expires_at,
        u.first_name as invited_by_name, u.last_name as invited_by_last
      FROM staff_invitations si
      LEFT JOIN users u ON u.id = si.invited_by
      WHERE si.used_at IS NULL AND si.expires_at > NOW()
      ORDER BY si.created_at DESC
    `

    return NextResponse.json({ staff, invitations })
  } catch (error) {
    console.error('Get staff error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch staff' },
      { status: 500 }
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

    return NextResponse.json({
      success: true,
      inviteUrl,
      message: 'Invitation created successfully',
    })
  } catch (error) {
    // Log the full error so we can tell a DB issue from an auth issue from
    // the client-side "failed to send invitation" banner.
    console.error('[v0] Create invitation error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to create invitation: ${message}` },
      { status: 500 }
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
    return NextResponse.json(
      { error: 'Failed to delete invitation' },
      { status: 500 }
    )
  }
}
