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

    // Get users with pagination.
    //
    // We project a few computed columns alongside the raw row so the
    // admin UI doesn't need to re-derive them per user:
    //
    //   - profile_complete : did they finish the /complete-profile flow?
    //   - signup_step      : highest wizard step they reached (0..4)
    //   - is_new           : created within the last 7 days — drives
    //                        the "NEW" pill on the users table so admins
    //                        can spot fresh signups at a glance instead
    //                        of scanning the join date column.
    //   - last_seen_at     : updated_at fall-through to created_at, so
    //                        the table can show recency without adding
    //                        another column on the users row.
    const users = await sql`
      SELECT 
        id, email, first_name, last_name, phone, 
        email_verified, role, is_active, created_at,
        profile_complete,
        COALESCE(signup_step, 0) AS signup_step,
        (created_at > NOW() - INTERVAL '7 days') AS is_new,
        COALESCE(updated_at, created_at) AS last_seen_at
      FROM users
      WHERE 
        (${search} = '' OR LOWER(email) LIKE LOWER(${'%' + search + '%'}) OR LOWER(first_name) LIKE LOWER(${'%' + search + '%'}) OR LOWER(last_name) LIKE LOWER(${'%' + search + '%'}))
        AND (${role} = '' OR role = ${role || 'user'})
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    // Get aggregate counts in a single round-trip.
    //
    // The Clients list page uses these to render a headline metric
    // strip (Total / Active / Verified / New this week) so the team
    // can see at a glance how the customer base is doing without
    // counting rows. We compute everything respecting the *current
    // filter* (search + role) so the tiles reflect the table the
    // admin is actually looking at — the same way most CRM list
    // pages behave. Using FILTER (...) means it's still one query,
    // not five.
    const stats = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE is_active = TRUE)::int AS active,
        COUNT(*) FILTER (WHERE is_active = FALSE)::int AS suspended,
        COUNT(*) FILTER (WHERE email_verified = TRUE)::int AS verified,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS new_this_week,
        COUNT(*) FILTER (WHERE COALESCE(profile_complete, FALSE) = TRUE)::int AS completed_onboarding
      FROM users
      WHERE
        (${search} = '' OR LOWER(email) LIKE LOWER(${'%' + search + '%'}) OR LOWER(first_name) LIKE LOWER(${'%' + search + '%'}) OR LOWER(last_name) LIKE LOWER(${'%' + search + '%'}))
        AND (${role} = '' OR role = ${role || 'user'})
    `

    const total = Number(stats[0]?.total ?? 0)

    return NextResponse.json({
      users,
      stats: {
        total,
        active: Number(stats[0]?.active ?? 0),
        suspended: Number(stats[0]?.suspended ?? 0),
        verified: Number(stats[0]?.verified ?? 0),
        newThisWeek: Number(stats[0]?.new_this_week ?? 0),
        completedOnboarding: Number(stats[0]?.completed_onboarding ?? 0),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
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
        // Suspending a user must take effect immediately on THEIR
        // device — until now we only flipped the column, which left
        // suspended customers with a perfectly valid session cookie
        // and no visible change in the app. We now wipe every active
        // session for the affected user, so the next request they
        // make 401s and their UI redirects to /signin (or shows the
        // "account suspended" message on signin). Reactivating
        // doesn't need session work — the user just signs back in.
        if (value === false) {
          await sql`DELETE FROM sessions WHERE user_id = ${userId}`
        }
        break
      case 'change_role':
        if (!['user', 'staff', 'admin'].includes(value)) {
          return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
        }
        await sql`UPDATE users SET role = ${value} WHERE id = ${userId}`
        // Role changes need a fresh session so the user's cached
        // client-side `useAuth` payload picks up the new role and
        // route guards (e.g. /staff, /admin) gate correctly. Without
        // this, a freshly-promoted staff member couldn't open the
        // staff console until they manually logged out, and a
        // freshly-revoked admin could keep reading admin pages until
        // their cookie expired. Wiping sessions is the simplest
        // reliable invalidation.
        await sql`DELETE FROM sessions WHERE user_id = ${userId}`
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
