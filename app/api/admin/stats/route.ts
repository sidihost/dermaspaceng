import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/auth'

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    await requireAdmin()

    // Get total users count and recent count (last 7 days)
    const usersResult = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as recent,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as this_month,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days') as last_month
      FROM users WHERE role = 'user'
    `

    // Get consultations stats
    const consultationsResult = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as this_week
      FROM consultations
    `

    // Complaints + support tickets share the admin inbox, so the dashboard
    // counter has to include both sources. Using a UNION ALL sub-select so
    // the outer aggregate is a single row.
    const complaintsResult = await sql`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status IN ('open', 'pending', 'in_progress')) AS open,
        COUNT(*) FILTER (WHERE status = 'resolved') AS resolved
      FROM (
        SELECT COALESCE(status, 'open') AS status FROM contact_messages
        UNION ALL
        SELECT COALESCE(status, 'open') AS status FROM support_tickets
      ) combined
    `

    // Get gift card requests stats
    const giftCardsResult = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as total_value
      FROM gift_card_requests
    `

    // Get survey responses stats
    const surveysResult = await sql`
      SELECT 
        COUNT(*) as total,
        AVG(overall_rating) as avg_rating,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as this_week
      FROM survey_responses
    `

    // Get recent user registrations for chart (last 30 days)
    const userTrendResult = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM users 
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    // Get staff count
    const staffResult = await sql`
      SELECT COUNT(*) as total FROM users WHERE role IN ('staff', 'admin')
    `

    // Calculate user growth percentage
    const users = usersResult[0]
    const userGrowth = users.last_month > 0 
      ? Math.round(((Number(users.this_month) - Number(users.last_month)) / Number(users.last_month)) * 100)
      : 100

    return NextResponse.json({
      stats: {
        users: {
          total: Number(users.total),
          recent: Number(users.recent),
          growth: userGrowth
        },
        consultations: {
          total: Number(consultationsResult[0].total),
          pending: Number(consultationsResult[0].pending),
          thisWeek: Number(consultationsResult[0].this_week)
        },
        complaints: {
          total: Number(complaintsResult[0].total),
          open: Number(complaintsResult[0].open),
          resolved: Number(complaintsResult[0].resolved)
        },
        giftCards: {
          total: Number(giftCardsResult[0].total),
          pending: Number(giftCardsResult[0].pending),
          totalValue: Number(giftCardsResult[0].total_value) || 0
        },
        surveys: {
          total: Number(surveysResult[0].total),
          avgRating: Number(surveysResult[0].avg_rating) || 0,
          thisWeek: Number(surveysResult[0].this_week)
        },
        staff: {
          total: Number(staffResult[0].total)
        }
      },
      charts: {
        userTrend: userTrendResult.map(row => ({
          date: row.date,
          count: Number(row.count)
        }))
      }
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    )
  }
}
