import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/auth'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const actionType = searchParams.get('actionType') || ''
    const entityType = searchParams.get('entityType') || ''
    const offset = (page - 1) * limit

    const activities = await sql`
      SELECT 
        al.*,
        u.first_name as user_first_name,
        u.last_name as user_last_name,
        u.email as user_email,
        s.first_name as staff_first_name,
        s.last_name as staff_last_name
      FROM activity_log al
      LEFT JOIN users u ON u.id = al.user_id
      LEFT JOIN users s ON s.id = al.staff_id
      WHERE 
        (${actionType} = '' OR al.action_type = ${actionType || ''})
        AND (${entityType} = '' OR al.entity_type = ${entityType || ''})
      ORDER BY al.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const countResult = await sql`
      SELECT COUNT(*) as total FROM activity_log
      WHERE 
        (${actionType} = '' OR action_type = ${actionType || ''})
        AND (${entityType} = '' OR entity_type = ${entityType || ''})
    `

    // Get unique action types for filtering
    const actionTypes = await sql`
      SELECT DISTINCT action_type FROM activity_log WHERE action_type IS NOT NULL ORDER BY action_type
    `

    // Get unique entity types for filtering
    const entityTypes = await sql`
      SELECT DISTINCT entity_type FROM activity_log WHERE entity_type IS NOT NULL ORDER BY entity_type
    `

    return NextResponse.json({
      activities,
      pagination: {
        page,
        limit,
        total: Number(countResult[0].total),
        totalPages: Math.ceil(Number(countResult[0].total) / limit)
      },
      filters: {
        actionTypes: actionTypes.map(a => a.action_type),
        entityTypes: entityTypes.map(e => e.entity_type)
      }
    })
  } catch (error) {
    console.error('Get activity error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity log' },
      { status: 500 }
    )
  }
}
