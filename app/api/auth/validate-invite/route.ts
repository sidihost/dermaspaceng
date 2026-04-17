import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

/**
 * Validate a staff invitation token.
 *
 * Fixed: the schema column is `used_at` (see scripts/021-staff-invitations.sql),
 * but this route was querying a non-existent `accepted_at` column — every
 * validation request was throwing a DB error and the client silently fell
 * through to "Invalid invitation". We now read `used_at` which matches both
 * the migration and the staff list API's `WHERE used_at IS NULL` filter.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token")

    if (!token) {
      return NextResponse.json({ valid: false, error: "Token required" })
    }

    const invitations = await sql`
      SELECT
        si.email,
        si.role,
        si.expires_at,
        si.used_at,
        COALESCE(u.first_name || ' ' || u.last_name, 'Dermaspace Team') AS inviter_name
      FROM staff_invitations si
      LEFT JOIN users u ON u.id = si.invited_by
      WHERE si.token = ${token}
    `

    if (invitations.length === 0) {
      return NextResponse.json({ valid: false, error: "Invalid invitation" })
    }

    const invitation = invitations[0]

    if (invitation.used_at) {
      return NextResponse.json({ valid: false, error: "Invitation already accepted" })
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: "Invitation expired" })
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        inviter_name: invitation.inviter_name,
      },
    })
  } catch (error) {
    console.error("[v0] Validate invite error:", error)
    return NextResponse.json({ valid: false, error: "Failed to validate invitation" })
  }
}
