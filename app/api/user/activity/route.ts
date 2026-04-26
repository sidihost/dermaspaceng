import { NextResponse } from "next/server"
import { sql, query } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    // Detect whether sender_display_name has been added (migration 043)
    // so we can surface it to the customer when present, and silently
    // fall back to the staff member's real name if it hasn't.
    let hasDisplayName = false
    try {
      const probe = await sql`
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'admin_replies' AND column_name = 'sender_display_name'
        LIMIT 1
      `
      hasDisplayName = probe.length > 0
    } catch {
      hasDisplayName = false
    }

    // The display-name expression is identical across the three queries
    // below, so we build it once. We only inject the COALESCE when the
    // column actually exists; otherwise it'd be a SQL syntax error.
    const responderExpr = hasDisplayName
      ? `COALESCE(NULLIF(ar.sender_display_name, ''), u.first_name || ' ' || u.last_name)`
      : `u.first_name || ' ' || u.last_name`

    const giftCardSql = `
      SELECT
        gcr.id,
        'gift_card' as type,
        gcr.amount,
        gcr.recipient_name,
        gcr.status,
        gcr.created_at,
        gcr.processed_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ar.id,
              'message', ar.message,
              'responder_name', ${responderExpr},
              'created_at', ar.created_at
            ) ORDER BY ar.created_at DESC
          ) FILTER (WHERE ar.id IS NOT NULL),
          '[]'
        ) as replies
      FROM gift_card_requests gcr
      LEFT JOIN admin_replies ar ON ar.request_type = 'gift_card' AND ar.request_id = gcr.id
      LEFT JOIN users u ON u.id = ar.staff_id
      WHERE gcr.user_id = $1
      GROUP BY gcr.id
      ORDER BY gcr.created_at DESC
      LIMIT 10
    `
    const complaintsSql = `
      SELECT
        cm.id,
        'complaint' as type,
        cm.subject,
        cm.message,
        cm.status,
        cm.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ar.id,
              'message', ar.message,
              'responder_name', ${responderExpr},
              'created_at', ar.created_at
            ) ORDER BY ar.created_at DESC
          ) FILTER (WHERE ar.id IS NOT NULL),
          '[]'
        ) as replies
      FROM contact_messages cm
      LEFT JOIN admin_replies ar ON ar.request_type = 'contact' AND ar.request_id = cm.id
      LEFT JOIN users u ON u.id = ar.staff_id
      WHERE cm.user_id = $1
      GROUP BY cm.id
      ORDER BY cm.created_at DESC
      LIMIT 10
    `
    const consultationsSql = `
      SELECT
        c.id,
        'consultation' as type,
        c.concerns as concern_type,
        c.appointment_date as preferred_date,
        c.appointment_time as preferred_time,
        c.status,
        c.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ar.id,
              'message', ar.message,
              'responder_name', ${responderExpr},
              'created_at', ar.created_at
            ) ORDER BY ar.created_at DESC
          ) FILTER (WHERE ar.id IS NOT NULL),
          '[]'
        ) as replies
      FROM consultations c
      LEFT JOIN admin_replies ar ON ar.request_type = 'consultation' AND ar.request_id = c.id
      LEFT JOIN users u ON u.id = ar.staff_id
      WHERE c.user_id = $1
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT 10
    `

    const [giftCardRes, complaintsRes, consultationsRes] = await Promise.all([
      query(giftCardSql, [user.id]),
      query(complaintsSql, [user.id]),
      query(consultationsSql, [user.id]),
    ])
    const giftCardRequests = giftCardRes.rows
    const complaints = complaintsRes.rows
    const consultations = consultationsRes.rows

    // Get user's notifications
    const notifications = await sql`
      SELECT id, title, message, type, is_read, link, created_at
      FROM user_notifications
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 20
    `

    // Count unread notifications
    const unreadCount = await sql`
      SELECT COUNT(*) as count FROM user_notifications
      WHERE user_id = ${user.id} AND is_read = false
    `

    return NextResponse.json({
      success: true,
      activity: {
        giftCardRequests,
        complaints,
        consultations,
      },
      notifications,
      unreadCount: parseInt(unreadCount[0]?.count || "0"),
    })
  } catch (error) {
    console.error("User activity error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch activity" },
      { status: 500 }
    )
  }
}

// Mark notifications as read
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { notificationIds, referenceType, referenceId } = await request.json()

    if (notificationIds && notificationIds.length > 0) {
      await sql`
        UPDATE user_notifications 
        SET is_read = true 
        WHERE user_id = ${user.id} AND id = ANY(${notificationIds}::uuid[])
      `
    } else if (referenceType && referenceId !== undefined && referenceId !== null) {
      // Mark only the notifications that belong to a specific resource
      // (e.g. all unread replies for a given support ticket). Using ::text
      // on both sides so the comparison works whether reference_id is
      // stored as INTEGER or VARCHAR across migrations.
      await sql`
        UPDATE user_notifications
        SET is_read = true
        WHERE user_id = ${user.id}
          AND reference_type = ${String(referenceType)}
          AND reference_id::text = ${String(referenceId)}
      `
    } else {
      // Mark all as read
      await sql`
        UPDATE user_notifications 
        SET is_read = true 
        WHERE user_id = ${user.id}
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Mark notifications error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update notifications" },
      { status: 500 }
    )
  }
}
