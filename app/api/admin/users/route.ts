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
    // Archived (soft-deleted) clients are hidden from the main list by
    // default. Pass ?archived=true to review the archive and restore them.
    const includeArchived = searchParams.get('archived') === 'true'
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
        deleted_at,
        (deleted_at IS NOT NULL) AS is_archived,
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
        AND (${includeArchived} OR deleted_at IS NULL)
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total FROM users
      WHERE 
        (${search} = '' OR LOWER(email) LIKE LOWER(${'%' + search + '%'}) OR LOWER(first_name) LIKE LOWER(${'%' + search + '%'}) OR LOWER(last_name) LIKE LOWER(${'%' + search + '%'}))
        AND (${role} = '' OR role = ${role || 'user'})
        AND (${includeArchived} OR deleted_at IS NULL)
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
    const admin = await requireAdmin()

    const { userId, action, value } = await request.json()

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'update_profile': {
        // Admin-edits core profile fields. `value` is an object with any
        // of: first_name, last_name, email, phone, username, email_verified.
        // We treat empty strings for nullable fields (phone/username) as
        // NULL so the admin can clear them.
        const v = (value ?? {}) as {
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          username?: string | null
          email_verified?: boolean
        }

        const firstName = (v.first_name ?? '').trim()
        const lastName = (v.last_name ?? '').trim()
        const email = (v.email ?? '').trim().toLowerCase()
        const phone = (v.phone ?? '').trim() || null
        const username = (v.username ?? '').trim() || null

        if (!firstName || !lastName) {
          return NextResponse.json(
            { error: 'First and last name are required.' },
            { status: 400 },
          )
        }
        // Minimal but real email validation — must look like an address.
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return NextResponse.json(
            { error: 'Please enter a valid email address.' },
            { status: 400 },
          )
        }

        // Email must stay unique — block if another account already owns it.
        const dupe = await sql`
          SELECT id FROM users
          WHERE LOWER(email) = ${email} AND id <> ${userId}
          LIMIT 1
        `
        if (dupe.length > 0) {
          return NextResponse.json(
            { error: 'Another account is already using that email address.' },
            { status: 409 },
          )
        }

        // Update the guaranteed columns in one statement. `email_verified`
        // is only changed when the caller explicitly sends a boolean, so a
        // plain name/phone edit never silently flips verification.
        if (typeof v.email_verified === 'boolean') {
          await sql`
            UPDATE users SET
              first_name = ${firstName},
              last_name = ${lastName},
              email = ${email},
              phone = ${phone},
              email_verified = ${v.email_verified},
              updated_at = NOW()
            WHERE id = ${userId}
          `
        } else {
          await sql`
            UPDATE users SET
              first_name = ${firstName},
              last_name = ${lastName},
              email = ${email},
              phone = ${phone},
              updated_at = NOW()
            WHERE id = ${userId}
          `
        }

        // `username` lives behind an optional migration — update it in a
        // separate best-effort statement so environments without the
        // column don't fail the whole edit.
        try {
          // Guard uniqueness only when a username is actually set.
          if (username) {
            const dupeUsername = await sql`
              SELECT id FROM users
              WHERE LOWER(username) = LOWER(${username}) AND id <> ${userId}
              LIMIT 1
            `
            if (dupeUsername.length > 0) {
              return NextResponse.json(
                { error: 'That username is already taken.' },
                { status: 409 },
              )
            }
          }
          await sql`UPDATE users SET username = ${username} WHERE id = ${userId}`
        } catch {
          // Column missing in this environment — silently skip username.
        }
        break
      }
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
      case 'delete_user':
        // Soft-delete a user account: change role to 'user', deactivate,
        // clear sessions, revoke special flags. Creates an approval request
        // so another admin has to review and approve the deletion.
        {
          if (userId === admin.id) {
            return NextResponse.json(
              { error: 'You cannot delete your own account.' },
              { status: 400 },
            )
          }

          const before = (await sql`
            SELECT email, first_name, COALESCE(is_super_admin, FALSE) AS is_super_admin
              FROM users WHERE id = ${userId} LIMIT 1
          `) as Array<{ email: string; first_name: string; is_super_admin: boolean }>

          if (!before.length) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
          }

          const user = before[0]
          if (user.is_super_admin) {
            return NextResponse.json(
              { error: 'Super admins cannot be deleted. Transfer the super admin role first.' },
              { status: 409 },
            )
          }

          // Create an approval request. The approver will see this and
          // either approve (demotion + deactivation executes) or reject it.
          await sql`
            INSERT INTO admin_approval_requests (
              action_type,
              target_user_id,
              payload,
              requested_by,
              status
            ) VALUES (
              'delete_user',
              ${userId},
              jsonb_build_object('target_name', ${user.first_name}, 'target_email', ${user.email}),
              ${admin.id},
              'pending'
            )
          `
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

      case 'archive_user':
        // Recoverable soft-delete. The client is hidden from the default
        // Clients list, signed out everywhere, and blocked from signing
        // in (is_active = FALSE), but ALL their data/history is kept and
        // an admin can Restore them later. This is intentionally an
        // IMMEDIATE action (no second-admin approval) — distinct from the
        // `delete_user` request flow above.
        {
          if (userId === admin.id) {
            return NextResponse.json(
              { error: 'You cannot archive your own account.' },
              { status: 400 },
            )
          }

          const before = (await sql`
            SELECT COALESCE(is_super_admin, FALSE) AS is_super_admin
              FROM users WHERE id = ${userId} LIMIT 1
          `) as Array<{ is_super_admin: boolean }>

          if (!before.length) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
          }
          if (before[0].is_super_admin) {
            return NextResponse.json(
              { error: 'Super admins cannot be archived. Transfer the super admin role first.' },
              { status: 409 },
            )
          }

          const reason = typeof value === 'string' && value.trim() ? value.trim() : null
          await sql`
            UPDATE users SET
              deleted_at = NOW(),
              deletion_reason = ${reason},
              is_active = FALSE,
              updated_at = NOW()
            WHERE id = ${userId}
          `
          // Revoke sessions so the archived client can't keep using the app.
          await sql`DELETE FROM sessions WHERE user_id = ${userId}`
        }
        break

      case 'restore_user':
        // Reverse an archive: clear the soft-delete marker and re-enable
        // the account. The client can sign back in immediately.
        await sql`
          UPDATE users SET
            deleted_at = NULL,
            deletion_reason = NULL,
            is_active = TRUE,
            updated_at = NOW()
          WHERE id = ${userId}
        `
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
