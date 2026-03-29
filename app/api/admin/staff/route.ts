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

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
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
    const existingUser = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`
    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      )
    }

    // Check for existing pending invitation
    const existingInvite = await sql`
      SELECT id FROM staff_invitations 
      WHERE email = ${email.toLowerCase()} AND used_at IS NULL AND expires_at > NOW()
    `
    if (existingInvite.length > 0) {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email' },
        { status: 400 }
      )
    }

    // Create invitation token
    const token = uuidv4()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await sql`
      INSERT INTO staff_invitations (email, role, invited_by, token, expires_at)
      VALUES (${email.toLowerCase()}, ${role}, ${admin.id}, ${token}, ${expiresAt})
    `

    // TODO: Send invitation email
    // For now, return the invitation link
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite/${token}`

    return NextResponse.json({ 
      success: true, 
      inviteUrl,
      message: 'Invitation created successfully'
    })
  } catch (error) {
    console.error('Create invitation error:', error)
    return NextResponse.json(
      { error: 'Failed to create invitation' },
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
