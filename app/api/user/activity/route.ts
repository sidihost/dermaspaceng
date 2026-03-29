import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    // Get user's gift card requests with replies
    const giftCardRequests = await sql`
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
              'responder_name', u.first_name || ' ' || u.last_name,
              'created_at', ar.created_at
            ) ORDER BY ar.created_at DESC
          ) FILTER (WHERE ar.id IS NOT NULL),
          '[]'
        ) as replies
      FROM gift_card_requests gcr
      LEFT JOIN admin_replies ar ON ar.entity_type = 'gift_card' AND ar.entity_id = gcr.id::text
      LEFT JOIN users u ON u.id = ar.responder_id
      WHERE gcr.user_id = ${user.id}
      GROUP BY gcr.id
      ORDER BY gcr.created_at DESC
      LIMIT 10
    `

    // Get user's complaints/contact messages with replies
    const complaints = await sql`
      SELECT 
        cm.id,
        'complaint' as type,
        cm.subject,
        cm.message,
        cm.status,
        cm.priority,
        cm.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ar.id,
              'message', ar.message,
              'responder_name', u.first_name || ' ' || u.last_name,
              'created_at', ar.created_at
            ) ORDER BY ar.created_at DESC
          ) FILTER (WHERE ar.id IS NOT NULL),
          '[]'
        ) as replies
      FROM contact_messages cm
      LEFT JOIN admin_replies ar ON ar.entity_type = 'complaint' AND ar.entity_id = cm.id::text
      LEFT JOIN users u ON u.id = ar.responder_id
      WHERE cm.user_id = ${user.id}
      GROUP BY cm.id
      ORDER BY cm.created_at DESC
      LIMIT 10
    `

    // Get user's consultations with replies
    const consultations = await sql`
      SELECT 
        c.id,
        'consultation' as type,
        c.concern_type,
        c.preferred_date,
        c.preferred_time,
        c.status,
        c.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ar.id,
              'message', ar.message,
              'responder_name', u.first_name || ' ' || u.last_name,
              'created_at', ar.created_at
            ) ORDER BY ar.created_at DESC
          ) FILTER (WHERE ar.id IS NOT NULL),
          '[]'
        ) as replies
      FROM consultations c
      LEFT JOIN admin_replies ar ON ar.entity_type = 'consultation' AND ar.entity_id = c.id::text
      LEFT JOIN users u ON u.id = ar.responder_id
      WHERE c.user_id = ${user.id}
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT 10
    `

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

    const { notificationIds } = await request.json()

    if (notificationIds && notificationIds.length > 0) {
      await sql`
        UPDATE user_notifications 
        SET is_read = true 
        WHERE user_id = ${user.id} AND id = ANY(${notificationIds}::uuid[])
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
