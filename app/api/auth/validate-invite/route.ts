import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token")

    if (!token) {
      return NextResponse.json({ valid: false, error: "Token required" })
    }

    // Find the invitation
    const invitations = await sql`
      SELECT 
        si.email, 
        si.role, 
        si.expires_at,
        si.accepted_at,
        u.first_name || ' ' || u.last_name as inviter_name
      FROM staff_invitations si
      LEFT JOIN users u ON u.id = si.invited_by
      WHERE si.token = ${token}
    `

    if (invitations.length === 0) {
      return NextResponse.json({ valid: false, error: "Invalid invitation" })
    }

    const invitation = invitations[0]

    // Check if already accepted
    if (invitation.accepted_at) {
      return NextResponse.json({ valid: false, error: "Invitation already accepted" })
    }

    // Check if expired
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
    console.error("Validate invite error:", error)
    return NextResponse.json({ valid: false, error: "Failed to validate invitation" })
  }
}
