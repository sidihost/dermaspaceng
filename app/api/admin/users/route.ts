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
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const offset = (page - 1) * limit

    // Build query conditions
    let whereClause = 'WHERE 1=1'
    if (search) {
      whereClause += ` AND (LOWER(email) LIKE LOWER('%${search}%') OR LOWER(first_name) LIKE LOWER('%${search}%') OR LOWER(last_name) LIKE LOWER('%${search}%'))`
    }
    if (role) {
      whereClause += ` AND role = '${role}'`
    }

    // Get users with pagination
    const users = await sql`
      SELECT 
        id, email, first_name, last_name, phone, 
        email_verified, role, is_active, created_at
      FROM users
      WHERE 
        (${search} = '' OR LOWER(email) LIKE LOWER(${'%' + search + '%'}) OR LOWER(first_name) LIKE LOWER(${'%' + search + '%'}) OR LOWER(last_name) LIKE LOWER(${'%' + search + '%'}))
        AND (${role} = '' OR role = ${role || 'user'})
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total FROM users
      WHERE 
        (${search} = '' OR LOWER(email) LIKE LOWER(${'%' + search + '%'}) OR LOWER(first_name) LIKE LOWER(${'%' + search + '%'}) OR LOWER(last_name) LIKE LOWER(${'%' + search + '%'}))
        AND (${role} = '' OR role = ${role || 'user'})
    `

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: Number(countResult[0].total),
        totalPages: Math.ceil(Number(countResult[0].total) / limit)
      }
    })
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin()

    const { userId, action, value } = await request.json()

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'toggle_active':
        await sql`UPDATE users SET is_active = ${value} WHERE id = ${userId}`
        break
      case 'change_role':
        if (!['user', 'staff', 'admin'].includes(value)) {
          return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
        }
        await sql`UPDATE users SET role = ${value} WHERE id = ${userId}`
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}
