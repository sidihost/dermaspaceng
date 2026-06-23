import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/auth'

const sql = neon(process.env.DATABASE_URL!)

// GET /api/admin/users/[userId]
// Returns the user profile plus lightweight activity summaries so the admin
// user-detail page can render everything in a single round-trip without
// N+1 fetches on the client.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin()
    const { userId } = await params

    // Only select columns that are guaranteed to exist across every
    // environment. Optional columns (username, avatar_url, OAuth ids,
    // password_hash) are pulled separately and merged in, so a missing
    // migration can't break the whole page with a cryptic "Failed to
    // fetch user" error.
    // `last_login_at` and `bio` were dropped entirely — no migration
    // adds them and the previous code was silently 500-ing on production.
    const userRows = await sql`
      SELECT
        id, email, first_name, last_name, phone,
        email_verified, role, is_active, created_at,
        deleted_at, deletion_reason,
        profile_complete,
        COALESCE(signup_step, 0) AS signup_step,
        -- Membership block (script 480). Each column is nullable
        -- so legacy customer rows that never subscribed still
        -- come back cleanly — the client treats null tier as
        -- "not a member" and skips the membership card.
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
      WHERE id = ${userId}
      LIMIT 1
    `
    if (userRows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const user = userRows[0] as Record<string, unknown>

    // Try to hydrate the optional `username` and `avatar_url` columns.
    // If the Google OAuth / username migrations have been applied this
    // succeeds; if not, we silently fall back to null so the detail page
    // still renders.
    try {
      const extra = await sql`
        SELECT username, avatar_url
        FROM users
        WHERE id = ${userId}
        LIMIT 1
      `
      if (extra.length > 0) {
        user.username = extra[0].username ?? null
        user.avatar_url = extra[0].avatar_url ?? null
      }
    } catch {
      user.username = null
      user.avatar_url = null
    }

    // Derive the signup method so the admin can see how this account
    // was originally created (Google, X, or email + password). We use
    // the *presence* of the OAuth id columns plus whether the user has
    // a password_hash to infer the method without storing a separate
    // enum that could drift out of sync. Linked accounts (signed up
    // with Google AND set a password later) get a multi-method label.
    //
    // We wrap the lookup in try/catch so a missing OAuth migration
    // (older environments) silently degrades to "email" instead of
    // 500ing the whole page.
    let signupMethod: string = 'email'
    let signupMethods: string[] = []
    try {
      const idRows = await sql`
        SELECT
          (password_hash IS NOT NULL AND password_hash <> '') AS has_password,
          google_id,
          x_id
        FROM users
        WHERE id = ${userId}
        LIMIT 1
      `
      if (idRows.length > 0) {
        const r = idRows[0] as {
          has_password: boolean
          google_id: string | null
          x_id: string | null
        }
        if (r.google_id) signupMethods.push('google')
        if (r.x_id) signupMethods.push('x')
        if (r.has_password) signupMethods.push('email')
        if (signupMethods.length === 0) signupMethods = ['email']
        // Primary method: prefer the OAuth provider over email so the
        // detail card shows what the user actually clicks at sign-in.
        signupMethod = signupMethods[0]
      }
    } catch {
      signupMethod = 'email'
      signupMethods = ['email']
    }
    user.signup_method = signupMethod
    user.signup_methods = signupMethods

    // Fire related queries in parallel. Each is wrapped so one missing
    // table (older environments) doesn't wipe out the whole response.
    const safe = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn() } catch { return fallback }
    }

    const [
      tickets,
      consultations,
      complaints,
      notifications,
      sessions,
      pageViews,
      aiChats,
      twoFa,
      passkeys,
      // ─── Cross-product surface ───
      // The user-detail page is the single "everything about this
      // person" view, so we hydrate the full Google-style picture:
      // wallet, bookings, transactions, vouchers, gift cards,
      // favorites, and the skin profile. Each query is `safe()`-d so
      // an older environment that hasn't run a migration still
      // renders the page.
      wallet,
      bookings,
      bookingTotals,
      txTotals,
      voucherCount,
      giftCardsSent,
      favoritesCount,
      preferences,
      clientErrors,
      profileChanges,
      legalState,
      legalAcceptanceLog,
      deletionRequests,
      exportRequests,
    ] = await Promise.all([
      safe(() => sql`
        SELECT id, ticket_id, subject, status, priority, category, created_at
        FROM support_tickets
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 10
      `, [] as Record<string, unknown>[]),
      safe(() => sql`
        SELECT id, location, status, created_at
        FROM consultations
        WHERE email = ${user.email as string}
        ORDER BY created_at DESC
        LIMIT 10
      `, [] as Record<string, unknown>[]),
      safe(() => sql`
        SELECT id, subject, status, priority, created_at
        FROM contact_messages
        WHERE email = ${user.email as string}
        ORDER BY created_at DESC
        LIMIT 10
      `, [] as Record<string, unknown>[]),
      safe(() => sql`
        SELECT id, title, type, is_read, created_at
        FROM user_notifications
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 5
      `, [] as Record<string, unknown>[]),
      safe(() => sql`
        SELECT id, device_info, ip_address, created_at, expires_at
        FROM sessions
        WHERE user_id = ${userId} AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 5
      `, [] as Record<string, unknown>[]),
      // Last 25 pages this user visited. Only available once
      // migration 043 is applied; older environments return [].
      safe(() => sql`
        SELECT id, path, title, referrer, created_at
        FROM page_views
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 25
      `, [] as Record<string, unknown>[]),
      // Recent Derma AI conversations the user kicked off, plus the
      // running totals for the snapshot card.
      safe(() => sql`
        SELECT id, prompt_preview, message_count, created_at
        FROM ai_chat_logs
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 10
      `, [] as Record<string, unknown>[]),
      // 2FA settings live in user_2fa_settings (migration 029). Old
      // environments without that table fall back to "disabled".
      safe(() => sql`
        SELECT
          totp_enabled,
          passkey_enabled,
          backup_codes_generated_at,
          last_2fa_prompt_at
        FROM user_2fa_settings
        WHERE user_id = ${userId}
        LIMIT 1
      `, [] as Record<string, unknown>[]),
      safe(() => sql`
        SELECT COUNT(*)::int AS count FROM passkey_credentials WHERE user_id = ${userId}
      `, [{ count: 0 }] as Record<string, unknown>[]),
      // Wallet snapshot. Most users won't have a row until they top
      // up — that's fine, we render "Not set up" client-side.
      safe(() => sql`
        SELECT
          id, balance, currency,
          monthly_budget, budget_alert_threshold,
          is_active, updated_at
        FROM wallets
        WHERE user_id = ${userId}
        LIMIT 1
      `, [] as Record<string, unknown>[]),
      // Last 6 bookings (status snapshot + amount). Enough to fill
      // the panel without forcing a second fetch when the admin
      // jumps to the bookings page.
      safe(() => sql`
        SELECT
          id, booking_reference, location_name, appointment_date,
          appointment_time, total_price_kobo, status, payment_status,
          created_at
        FROM bookings
        WHERE user_id = ${userId} OR customer_email = ${user.email as string}
        ORDER BY appointment_date DESC NULLS LAST, created_at DESC
        LIMIT 6
      `, [] as Record<string, unknown>[]),
      // Booking totals — separate so the panel header can show
      // "X bookings · ₦Y lifetime" without dragging every row.
      safe(() => sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
          COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
          COALESCE(SUM(
            CASE
              WHEN payment_status = 'paid' THEN COALESCE(total_price_kobo, 0)
              ELSE 0
            END
          ), 0)::bigint AS spent_kobo
        FROM bookings
        WHERE user_id = ${userId} OR customer_email = ${user.email as string}
      `, [{ total: 0, completed: 0, cancelled: 0, spent_kobo: 0 }]),
      // Transaction totals — successful credits = top-ups,
      // successful debits = spend. Anything pending/failed ignored.
      safe(() => sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'success')::int AS successful,
          COALESCE(SUM(
            CASE
              WHEN status = 'success' AND type = 'credit' THEN amount
              ELSE 0
            END
          ), 0)::numeric AS topped_up,
          COALESCE(SUM(
            CASE
              WHEN status = 'success' AND type = 'debit' THEN amount
              ELSE 0
            END
          ), 0)::numeric AS spent
        FROM transactions
        WHERE user_id = ${userId}
      `, [{ successful: 0, topped_up: '0', spent: '0' }]),
      safe(() => sql`
        SELECT COUNT(*)::int AS count FROM voucher_redemptions WHERE user_id = ${userId}
      `, [{ count: 0 }]),
      safe(() => sql`
        SELECT COUNT(*)::int AS count FROM gift_card_requests
        WHERE user_id = ${userId} OR sender_email = ${user.email as string}
      `, [{ count: 0 }]),
      safe(() => sql`
        SELECT COUNT(*)::int AS count FROM user_favorites WHERE user_id = ${userId}
      `, [{ count: 0 }]),
      safe(() => sql`
        SELECT skin_type, skin_concerns, allergies
        FROM user_preferences
        WHERE user_id = ${userId}
        LIMIT 1
      `, [] as Record<string, unknown>[]),
      // Last 25 client-side errors this user hit. The client-errors
      // sink populates this table whenever window.onerror /
      // unhandledrejection fires on a page where we could resolve
      // the session. Surfacing it here lets the admin see exactly
      // what error the customer ran into when they reported "the
      // page broke" — instead of asking them for a screenshot.
      safe(() => sql`
        SELECT id, source, message, url, user_agent, created_at
        FROM client_errors
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 25
      `, [] as Record<string, unknown>[]),
      // Profile change history (script 650). Scoped to the most
      // recent 50 rows — the admin doesn't need to scroll past
      // years of tweaks to see "this user changed their email
      // last Tuesday". If they ever do, we'll add a "Show all"
      // link on the detail page.
      safe(() => sql`
        SELECT id, field, old_value, new_value, surface, changed_by, ip_address, created_at
        FROM profile_change_log
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 50
      `, [] as Record<string, unknown>[]),
      // Legal acceptance state (script 221). The two columns on
      // `users` answer "have they accepted at least once?" and
      // "have they accepted the current pack?". The audit log
      // gives admins the full timeline so they can see exactly
      // when the user agreed to which version.
      safe(() => sql`
        SELECT legal_accepted_version, legal_accepted_at
        FROM users
        WHERE id = ${userId}
        LIMIT 1
      `, [] as Record<string, unknown>[]),
      safe(() => sql`
        SELECT version, surface, accepted_at, ip_address
        FROM legal_acceptance_log
        WHERE user_id = ${userId}
        ORDER BY accepted_at DESC
        LIMIT 10
      `, [] as Record<string, unknown>[]),
      // Account-state requests (script 650): currently pending
      // deletion (if any) and most-recent export. We only surface
      // the rows the admin actually needs to render the cards —
      // full history can be wired up later if compliance asks.
      safe(() => sql`
        SELECT id, status, reason, requested_at, deletion_scheduled_for,
               cancelled_at, completed_at
        FROM account_deletion_requests
        WHERE user_id = ${userId}
        ORDER BY requested_at DESC
        LIMIT 5
      `, [] as Record<string, unknown>[]),
      safe(() => sql`
        SELECT id, status, requested_at, ready_at, expires_at, download_url
        FROM data_export_requests
        WHERE user_id = ${userId}
        ORDER BY requested_at DESC
        LIMIT 5
      `, [] as Record<string, unknown>[]),
    ])

    // Aggregate totals in one round-trip via UNION of counts. Wrapped
    // separately for AI chats / page views because those are on newer
    // tables that may not exist yet.
    const counts = await safe(() => sql`
      SELECT
        (SELECT COUNT(*)::int FROM support_tickets WHERE user_id = ${userId}) AS tickets,
        (SELECT COUNT(*)::int FROM consultations WHERE email = ${user.email as string}) AS consultations,
        (SELECT COUNT(*)::int FROM contact_messages WHERE email = ${user.email as string}) AS complaints
    `, [{ tickets: 0, consultations: 0, complaints: 0 }])

    const aiChatCounts = await safe(() => sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS this_week
      FROM ai_chat_logs
      WHERE user_id = ${userId}
    `, [{ total: 0, this_week: 0 }])

    const pageViewCounts = await safe(() => sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(DISTINCT path)::int AS unique_paths,
        MAX(created_at) AS last_visit
      FROM page_views
      WHERE user_id = ${userId}
    `, [{ total: 0, unique_paths: 0, last_visit: null }])

    const twoFaRow = (twoFa[0] as Record<string, unknown>) || {}
    const security = {
      totpEnabled: Boolean(twoFaRow.totp_enabled),
      passkeyEnabled: Boolean(twoFaRow.passkey_enabled),
      passkeyCount: Number((passkeys[0] as { count?: number })?.count ?? 0),
      backupCodesGeneratedAt: twoFaRow.backup_codes_generated_at ?? null,
      // The user is "2FA-protected" if either TOTP or a passkey is
      // active. We expose both booleans so the UI can show a
      // breakdown badge.
      twoFactorEnabled:
        Boolean(twoFaRow.totp_enabled) ||
        Boolean(twoFaRow.passkey_enabled) ||
        Number((passkeys[0] as { count?: number })?.count ?? 0) > 0,
    }

    // Shape the wallet/preferences rows into stable objects so the
    // client doesn't have to handle "first row of an array" each
    // time. Nullable when the user has never opened a wallet.
    const walletRow = (wallet[0] as Record<string, unknown>) || null
    const prefRow = (preferences[0] as Record<string, unknown>) || null
    const totals = bookingTotals[0] as {
      total: number
      completed: number
      cancelled: number
      spent_kobo: number
    }
    const txRow = txTotals[0] as {
      successful: number
      topped_up: string | number
      spent: string | number
    }

    return NextResponse.json({
      user,
      stats: counts[0] || { tickets: 0, consultations: 0, complaints: 0 },
      tickets,
      consultations,
      complaints,
      notifications,
      sessions,
      pageViews,
      aiChats,
      security,
      activity: {
        aiChats: aiChatCounts[0] || { total: 0, this_week: 0 },
        pageViews: pageViewCounts[0] || { total: 0, unique_paths: 0, last_visit: null },
      },
      // Cross-product slice. `wallet` is null when the user has no
      // wallet row; the page handles that case explicitly.
      wallet: walletRow
        ? {
            balance: Number(walletRow.balance ?? 0),
            currency: String(walletRow.currency ?? 'NGN'),
            monthlyBudget: walletRow.monthly_budget == null
              ? null
              : Number(walletRow.monthly_budget),
            alertThreshold: Number(walletRow.budget_alert_threshold ?? 0),
            isActive: walletRow.is_active !== false,
            updatedAt: walletRow.updated_at ?? null,
          }
        : null,
      bookings,
      bookingTotals: {
        total: Number(totals.total ?? 0),
        completed: Number(totals.completed ?? 0),
        cancelled: Number(totals.cancelled ?? 0),
        // Kobo (1/100 NGN) — match the bookings table's storage so
        // the client formats once.
        spentKobo: Number(totals.spent_kobo ?? 0),
      },
      transactionTotals: {
        successful: Number(txRow.successful ?? 0),
        // `amount` is naira-denominated (numeric), not kobo, in this
        // table. Convert to kobo client-side by multiplying.
        toppedUp: Number(txRow.topped_up ?? 0),
        spent: Number(txRow.spent ?? 0),
      },
      counts: {
        vouchersUsed: Number((voucherCount[0] as { count?: number })?.count ?? 0),
        giftCardsSent: Number((giftCardsSent[0] as { count?: number })?.count ?? 0),
        favorites: Number((favoritesCount[0] as { count?: number })?.count ?? 0),
      },
      preferences: prefRow
        ? {
            skinType: (prefRow.skin_type as string) ?? null,
            concerns: Array.isArray(prefRow.skin_concerns)
              ? (prefRow.skin_concerns as string[])
              : [],
            allergies: Array.isArray(prefRow.allergies)
              ? (prefRow.allergies as string[])
              : [],
          }
        : null,
      clientErrors,
      // Audit + lifecycle surfaces (scripts 221 + 650). The admin
      // user-detail page renders these as small cards beneath the
      // main profile so admins can see, at a glance, the user's
      // full identity-management history without leaving the
      // page.
      profileChanges,
      legal: {
        acceptedVersion: ((legalState[0] as Record<string, unknown> | undefined)?.legal_accepted_version as string | null) ?? null,
        acceptedAt:      ((legalState[0] as Record<string, unknown> | undefined)?.legal_accepted_at      as string | null) ?? null,
        history: legalAcceptanceLog,
      },
      accountDeletion: {
        pending:
          (deletionRequests as Record<string, unknown>[]).find(
            (r) => r.status === 'pending',
          ) ?? null,
        history: deletionRequests,
      },
      dataExport: {
        pending:
          (exportRequests as Record<string, unknown>[]).find(
            (r) => r.status === 'pending',
          ) ?? null,
        history: exportRequests,
      },
    })
  } catch (error) {
    console.error('[v0] Get user detail error:', error)
    // Surface the real message so we can see why the query failed in
    // the network panel instead of a generic "Failed to fetch user".
    const message = error instanceof Error ? error.message : 'Failed to fetch user'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
