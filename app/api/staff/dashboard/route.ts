import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminOrStaff } from "@/lib/auth"

export async function GET() {
  try {
    await requireAdminOrStaff()

    // Get pending gift card requests count
    const giftCardsResult = await sql`
      SELECT COUNT(*) as count FROM gift_card_requests 
      WHERE status = 'pending'
    `

    // Get open complaints count
    const complaintsResult = await sql`
      SELECT COUNT(*) as count FROM contact_messages 
      WHERE category = 'complaint' AND status IN ('pending', 'open', 'in_progress')
    `

    // Get pending consultations count
    const consultationsResult = await sql`
      SELECT COUNT(*) as count FROM consultations 
      WHERE status = 'pending'
    `

    // Get recent surveys count (last 7 days)
    const surveysResult = await sql`
      SELECT COUNT(*) as count FROM survey_responses 
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `

    // Get recent items requiring attention
    const recentItems = await sql`
      (
        SELECT 
          id::text,
          'Gift Card' as type,
          CONCAT('Gift card request - $', amount) as title,
          status,
          created_at
        FROM gift_card_requests 
        WHERE status = 'pending'
        ORDER BY created_at DESC
        LIMIT 3
      )
      UNION ALL
      (
        SELECT 
          id::text,
          'Complaint' as type,
          COALESCE(subject, 'Customer complaint') as title,
          status,
          created_at
        FROM contact_messages 
        WHERE category = 'complaint' AND status IN ('pending', 'open')
        ORDER BY created_at DESC
        LIMIT 3
      )
      UNION ALL
      (
        SELECT 
          id::text,
          'Consultation' as type,
          CONCAT('Consultation - ', concern_type) as title,
          status,
          created_at
        FROM consultations 
        WHERE status = 'pending'
        ORDER BY created_at DESC
        LIMIT 3
      )
      ORDER BY created_at DESC
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      stats: {
        pendingGiftCards: parseInt(giftCardsResult[0]?.count || "0"),
        pendingComplaints: parseInt(complaintsResult[0]?.count || "0"),
        pendingConsultations: parseInt(consultationsResult[0]?.count || "0"),
        recentSurveys: parseInt(surveysResult[0]?.count || "0"),
      },
      recentItems,
    })
  } catch (error) {
    console.error("Staff dashboard error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard data" },
      { status: 500 }
    )
  }
}
