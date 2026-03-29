import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/auth'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const rating = searchParams.get('rating') || ''
    const offset = (page - 1) * limit

    const surveys = await sql`
      SELECT sr.*, u.first_name, u.last_name
      FROM survey_responses sr
      LEFT JOIN users u ON u.id = sr.user_id
      WHERE (${rating} = '' OR sr.overall_rating = ${parseInt(rating) || 0})
      ORDER BY sr.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const countResult = await sql`
      SELECT COUNT(*) as total FROM survey_responses
      WHERE (${rating} = '' OR overall_rating = ${parseInt(rating) || 0})
    `

    // Get rating distribution
    const ratingDistribution = await sql`
      SELECT overall_rating, COUNT(*) as count
      FROM survey_responses
      WHERE overall_rating IS NOT NULL
      GROUP BY overall_rating
      ORDER BY overall_rating DESC
    `

    // Get average rating
    const avgResult = await sql`
      SELECT AVG(overall_rating) as avg_rating
      FROM survey_responses
      WHERE overall_rating IS NOT NULL
    `

    // Get satisfaction metrics
    const satisfactionMetrics = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE aesthetics IN ('Strongly Agree', 'Agree')) * 100.0 / NULLIF(COUNT(*), 0) as aesthetics_positive,
        COUNT(*) FILTER (WHERE ambiance IN ('Strongly Agree', 'Agree')) * 100.0 / NULLIF(COUNT(*), 0) as ambiance_positive,
        COUNT(*) FILTER (WHERE front_desk IN ('Strongly Agree', 'Agree')) * 100.0 / NULLIF(COUNT(*), 0) as front_desk_positive,
        COUNT(*) FILTER (WHERE staff_professional IN ('Strongly Agree', 'Agree')) * 100.0 / NULLIF(COUNT(*), 0) as staff_positive,
        COUNT(*) FILTER (WHERE visit_again = 'Yes') * 100.0 / NULLIF(COUNT(*), 0) as would_return
      FROM survey_responses
    `

    return NextResponse.json({
      surveys,
      pagination: {
        page,
        limit,
        total: Number(countResult[0].total),
        totalPages: Math.ceil(Number(countResult[0].total) / limit)
      },
      analytics: {
        avgRating: Number(avgResult[0].avg_rating) || 0,
        ratingDistribution: ratingDistribution.map(r => ({
          rating: r.overall_rating,
          count: Number(r.count)
        })),
        satisfaction: {
          aesthetics: Number(satisfactionMetrics[0].aesthetics_positive) || 0,
          ambiance: Number(satisfactionMetrics[0].ambiance_positive) || 0,
          frontDesk: Number(satisfactionMetrics[0].front_desk_positive) || 0,
          staff: Number(satisfactionMetrics[0].staff_positive) || 0,
          wouldReturn: Number(satisfactionMetrics[0].would_return) || 0,
        }
      }
    })
  } catch (error) {
    console.error('Get surveys error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch surveys' },
      { status: 500 }
    )
  }
}
