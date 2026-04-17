import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { v4 as uuidv4 } from "uuid"

/**
 * Accept a staff invitation and create the account + session.
 *
 * Two critical bugs fixed here that were breaking the entire staff-invite
 * flow in production:
 *
 * 1. Schema drift on `staff_invitations`: this route previously wrote to
 *    `accepted_at` but the column defined in scripts/021-staff-invitations.sql
 *    is `used_at`. The UPDATE succeeded silently (0 rows affected) so the
 *    invite was never marked used — and worse, the SELECT also queried a
 *    non-existent column and blew up. We now consistently use `used_at`.
 *
 * 2. Session schema mismatch: this route wrote
 *       INSERT INTO sessions (user_id, token, expires_at)
 *    and set cookie `session_token`, but lib/auth.ts (which every other
 *    protected page / API uses) reads
 *       SELECT * FROM sessions WHERE id = session_id
 *    with cookie `session_id` against a schema of
 *       sessions(id, user_id, device_info, ip_address, expires_at)
 *    The new staff member would get a "successful" signup but land on a page
 *    that immediately saw them as logged out. We now write the session in
 *    the exact shape lib/auth expects.
 *
 * Also: the `activity_log` insert is best-effort — one column-drift issue
 * there shouldn't break staff onboarding.
 */
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

    // Find the invitation by token.
    const invitations = await sql`
      SELECT id, email, role, expires_at, used_at
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

    if (invitation.used_at) {
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

    // Don't allow a duplicate account if someone signed up in the meantime.
    const existingUsers = await sql`SELECT id FROM users WHERE email = ${invitation.email}`
    if (existingUsers.length > 0) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password and create user. We generate the UUID on the app side
    // because the users table uses VARCHAR(36) ids set by the app (see
    // lib/auth.ts -> createUser), not a DB-side default.
    const hashedPassword = await bcrypt.hash(password, 12)
    const userId = uuidv4()

    await sql`
      INSERT INTO users (id, email, first_name, last_name, password_hash, role, email_verified, is_active)
      VALUES (
        ${userId},
        ${invitation.email},
        ${firstName},
        ${lastName},
        ${hashedPassword},
        ${invitation.role},
        true,
        true
      )
    `

    // Mark the invitation as used. Using `used_at` to match the migration
    // and the GET /api/admin/staff query.
    await sql`
      UPDATE staff_invitations
      SET used_at = NOW()
      WHERE id = ${invitation.id}
    `

    // Create a session in the exact shape lib/auth.ts expects so the new
    // staff member is actually logged in when they land on /admin or /staff.
    const sessionId = uuidv4()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    const userAgent = request.headers.get("user-agent") ?? "unknown"
    const forwardedFor = request.headers.get("x-forwarded-for") ?? ""
    const ipAddress = forwardedFor.split(",")[0]?.trim() || "unknown"

    await sql`
      INSERT INTO sessions (id, user_id, device_info, ip_address, expires_at)
      VALUES (${sessionId}, ${userId}, ${userAgent}, ${ipAddress}, ${expiresAt})
    `

    const cookieStore = await cookies()
    cookieStore.set("session_id", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    })

    // Best-effort activity logging. Schema drift on `activity_log` across
    // migrations has historically broken signup here; swallow errors so a
    // successful invite acceptance isn't reported as a failure to the user.
    try {
      await sql`
        INSERT INTO activity_log (actor_id, action, entity_type, entity_id, details)
        VALUES (${userId}, 'create', 'user', ${userId}, 'Staff account created via invitation')
      `
    } catch (logError) {
      console.warn("[v0] activity_log insert failed (non-fatal):", logError)
    }

    return NextResponse.json({
      success: true,
      role: invitation.role,
    })
  } catch (error) {
    console.error("[v0] Accept invite error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: `Failed to accept invitation: ${message}` },
      { status: 500 }
    )
  }
}
