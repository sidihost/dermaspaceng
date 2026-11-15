import { NextResponse } from "next/server"
import { sql, query } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { ensureNotificationsSchema, resolveReadColumn } from "@/lib/notifications-column"

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
        gcr.occasion,
        gcr.design,
        gcr.design_name,
        gcr.font_name,
        gcr.status,
        gcr.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ar.id,
              'message', ar.reply_text,
              'responder_name', ${responderExpr},
              'created_at', ar.created_at
            ) ORDER BY ar.created_at DESC
          ) FILTER (WHERE ar.id IS NOT NULL),
          '[]'
        ) as replies
      FROM gift_card_requests gcr
      LEFT JOIN admin_replies ar ON ar.request_type = 'gift_card' AND ar.request_id = gcr.id::text
      LEFT JOIN users u ON u.id::text = ar.staff_id::text
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
              'message', ar.reply_text,
              'responder_name', ${responderExpr},
              'created_at', ar.created_at
            ) ORDER BY ar.created_at DESC
          ) FILTER (WHERE ar.id IS NOT NULL),
          '[]'
        ) as replies
      FROM contact_messages cm
      LEFT JOIN admin_replies ar ON ar.request_type = 'contact' AND ar.request_id = cm.id::text
      LEFT JOIN users u ON u.id::text = ar.staff_id::text
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
        TO_CHAR(c.appointment_date, 'YYYY-MM-DD') as preferred_date,
        c.appointment_time as preferred_time,
        c.status,
        c.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ar.id,
              'message', ar.reply_text,
              'responder_name', ${responderExpr},
              'created_at', ar.created_at
            ) ORDER BY ar.created_at DESC
          ) FILTER (WHERE ar.id IS NOT NULL),
          '[]'
        ) as replies
      FROM consultations c
      LEFT JOIN admin_replies ar
        ON ar.request_type = 'consultation'
       AND ar.request_id = c.id::text
       AND COALESCE(ar.is_internal, false) = false
      LEFT JOIN users u ON u.id::text = ar.staff_id::text
      WHERE c.user_id = $1
         OR (c.user_id IS NULL AND LOWER(c.email) = LOWER($2))
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT 10
    `

    const [giftCardRes, complaintsRes, consultationsRes] = await Promise.all([
      query(giftCardSql, [user.id]),
      query(complaintsSql, [user.id]),
      query(consultationsSql, [user.id, user.email || '']),
    ])
    const giftCardRequests = giftCardRes.rows
    const complaints = complaintsRes.rows
    const consultations = consultationsRes.rows

    await ensureNotificationsSchema()
    const readCol = await resolveReadColumn()

    const [notifRes, unreadRes] = await Promise.all([
      query(
        `SELECT id, title, message, type, "${readCol}" AS is_read, action_url AS link, created_at
         FROM user_notifications
         WHERE user_id = $1 AND COALESCE(audience, 'customer') = 'customer'
         ORDER BY created_at DESC
         LIMIT 20`,
        [user.id],
      ),
      query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM user_notifications
         WHERE user_id = $1 AND "${readCol}" = false AND COALESCE(audience, 'customer') = 'customer'`,
        [user.id],
      ),
    ])

    return NextResponse.json({
      success: true,
      activity: {
        giftCardRequests,
        complaints,
        consultations,
      },
      notifications: notifRes.rows,
      unreadCount: unreadRes.rows[0]?.count ?? 0,
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

    await ensureNotificationsSchema()
    const readCol = await resolveReadColumn()
    const { notificationIds, referenceType, referenceId } = await request.json()

    if (notificationIds && notificationIds.length > 0) {
      await query(
        `UPDATE user_notifications
         SET "${readCol}" = true
         WHERE user_id = $1 AND id::text = ANY($2::text[])`,
        [user.id, notificationIds.map(String)],
      )
    } else if (referenceType && referenceId !== undefined && referenceId !== null) {
      await query(
        `UPDATE user_notifications
         SET "${readCol}" = true
         WHERE user_id = $1
           AND reference_type = $2
           AND reference_id::text = $3`,
        [user.id, String(referenceType), String(referenceId)],
      )
    } else {
      // Mark all as read
      await query(
        `UPDATE user_notifications
         SET "${readCol}" = true
         WHERE user_id = $1 AND COALESCE(audience, 'customer') = 'customer'`,
        [user.id],
      )
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
