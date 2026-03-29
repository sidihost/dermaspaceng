import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: NextRequest) {
  try {
    const { token, firstName, lastName, password } = await request.json()

    if (!token || !firstName || !lastName || !password) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }

    // Find and validate the invitation
    const invitations = await sql`
      SELECT id, email, role, expires_at, accepted_at
      FROM staff_invitations
      WHERE token = ${token}
    `

    if (invitations.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid invitation" },
        { status: 400 }
      )
    }

    const invitation = invitations[0]

    if (invitation.accepted_at) {
      return NextResponse.json(
        { success: false, error: "Invitation already accepted" },
        { status: 400 }
      )
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: "Invitation expired" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUsers = await sql`SELECT id FROM users WHERE email = ${invitation.email}`
    if (existingUsers.length > 0) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 12)

    const newUsers = await sql`
      INSERT INTO users (email, first_name, last_name, password_hash, role, email_verified, is_active)
      VALUES (${invitation.email}, ${firstName}, ${lastName}, ${hashedPassword}, ${invitation.role}, true, true)
      RETURNING id
    `

    const userId = newUsers[0].id

    // Mark invitation as accepted
    await sql`
      UPDATE staff_invitations 
      SET accepted_at = NOW() 
      WHERE id = ${invitation.id}
    `

    // Create session
    const sessionToken = uuidv4()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await sql`
      INSERT INTO sessions (user_id, token, expires_at)
      VALUES (${userId}, ${sessionToken}, ${expiresAt})
    `

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    })

    // Log activity
    await sql`
      INSERT INTO activity_log (actor_id, action, entity_type, entity_id, details)
      VALUES (${userId}, 'create', 'user', ${userId}, 'Staff account created via invitation')
    `

    return NextResponse.json({
      success: true,
      role: invitation.role,
    })
  } catch (error) {
    console.error("Accept invite error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to accept invitation" },
      { status: 500 }
    )
  }
}
