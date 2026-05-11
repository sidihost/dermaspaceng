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
    // Membership columns added by script 480 — surfaced to the
    // admin so the Clients table can render a "Membership" column
    // (Silver / Gold / Platinum chip + expiry date) without a
    // second round-trip per row. We deliberately do NOT join the
    // `wallets` table here — the membership state lives on the
    // user row itself, and the wallet balance is shown on the
    // detail page where it has space to breathe.
    //
    // `is_member_active` is a small server-derived flag that lets
    // the UI tell "active member" from "expired" at a glance
    // without each row having to parse the expires_at timestamp.
    // It's true iff:
    //   - status is the literal string 'active', AND
    //   - expires_at is in the future (or NULL — legacy/admin-set
    //     memberships without an explicit term are treated as
    //     still active).
    const users = await sql`
      SELECT 
        id, email, first_name, last_name, phone, avatar_url,
        email_verified, role, is_active, created_at,
        profile_complete,
        COALESCE(signup_step, 0) AS signup_step,
        (created_at > NOW() - INTERVAL '7 days') AS is_new,
        COALESCE(updated_at, created_at) AS last_seen_at,
        membership_tier,
        membership_status,
        membership_started_at,
        membership_expires_at,
        membership_funded_amount,
        membership_balance,
        (
          membership_status = 'active'
          AND (membership_expires_at IS NULL OR membership_expires_at > NOW())
        ) AS is_member_active
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
