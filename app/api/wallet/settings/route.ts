import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getOrCreateWalletSettings, updateWalletSettings } from '@/lib/wallet'
import { sql } from '@/lib/db'

// The /dashboard/settings "Promotional Emails" toggle historically read and
// wrote `wallet_settings.promotional_emails`, which nothing else consumed.
// The newsletter broadcast recipient query keys its opt-out off
// `user_preferences.notification_promotions`, so flipping the toggle had no
// effect on marketing mail. We treat `user_preferences.notification_promotions`
// as the single source of truth here: GET projects it onto the toggle, PUT
// mirrors the toggle back onto it. Wallet settings stay untouched so the
// wallet surfaces that also read the row keep working.

// GET /api/wallet/settings - Get wallet settings
export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const settings = await getOrCreateWalletSettings(user.id)

    // Project the authoritative marketing opt-out onto the toggle. Fall back
    // to the wallet column when there's no preferences row yet (legacy users
    // who have never opened settings), preserving the existing value. Wrapped
    // defensively: if migration 730 hasn't run the table is absent and we
    // must not take the whole settings page down over a cosmetic toggle.
    let promotions = settings.promotional_emails
    try {
      const prefRows = await sql`
        SELECT notification_promotions
        FROM user_preferences
        WHERE user_id = ${user.id}
        LIMIT 1
      `
      if (prefRows.length > 0 && prefRows[0].notification_promotions !== null) {
        promotions = Boolean(prefRows[0].notification_promotions)
      }
    } catch {
      // user_preferences not migrated yet — keep the wallet value.
    }

    return NextResponse.json({
      success: true,
      settings: { ...settings, promotional_emails: promotions },
    })
  } catch (error) {
    console.error('Get wallet settings error:', error)
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    )
  }
}

// PUT /api/wallet/settings - Update wallet settings
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()

    // Strict whitelist of accepted columns. Any other key on the
    // payload is silently dropped — defence against a malicious client
    // tacking on (e.g.) `is_admin` or trying to flip another user's
    // settings through a column we never meant to expose. The list
    // mirrors the four toggles the /dashboard/settings UI ships
    // (Email Notifications, Transaction Alerts, Budget Alerts,
    // Promotional Emails) plus the legacy auto-fund / budget rows.
    const allowedFields = [
      'monthly_budget',
      'budget_alert_threshold',
      'low_balance_alert',
      'email_notifications',
      'push_notifications',
      'transaction_alerts',
      'budget_alerts',
      'promotional_emails',
      'auto_reload_enabled',
      'auto_reload_amount',
      'auto_reload_threshold',
    ]

    // Per-field type coercion. We never want a string like "true"
    // to land in a BOOLEAN column or a NaN to bypass a numeric range.
    const booleanFields = new Set([
      'email_notifications',
      'push_notifications',
      'transaction_alerts',
      'budget_alerts',
      'promotional_emails',
      'auto_reload_enabled',
    ])
    const numericFields = new Set([
      'monthly_budget',
      'budget_alert_threshold',
      'low_balance_alert',
      'auto_reload_amount',
      'auto_reload_threshold',
    ])

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] === undefined) continue
      const value = body[field]
      if (booleanFields.has(field)) {
        updates[field] = value === true
      } else if (numericFields.has(field)) {
        if (value === null) {
          updates[field] = null
        } else {
          const n = Number(value)
          if (Number.isFinite(n) && n >= 0 && n < 1_000_000_000) {
            updates[field] = n
          }
        }
      } else {
        updates[field] = value
      }
    }
    
    const updatedSettings = await updateWalletSettings(user.id, updates)
    
    if (!updatedSettings) {
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      )
    }

    // Mirror the marketing toggle onto the authoritative preferences column
    // the newsletter broadcast filters on, so opting out here actually stops
    // "all registered users" campaigns. The upsert preserves any other
    // preferences already stored for this user. Non-fatal: if migration 730
    // hasn't run, the wallet save itself should still succeed.
    if (updates.promotional_emails !== undefined) {
      try {
        await sql`
          INSERT INTO user_preferences (user_id, notification_promotions)
          VALUES (${user.id}, ${updates.promotional_emails})
          ON CONFLICT (user_id) DO UPDATE SET
            notification_promotions = ${updates.promotional_emails},
            updated_at = NOW()
        `
      } catch (err) {
        console.error('[wallet/settings] failed to mirror promo opt-out', err)
      }
    }

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
    })
  } catch (error) {
    console.error('Update wallet settings error:', error)
    const msg = error instanceof Error ? error.message : 'Failed to update settings'
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    )
  }
}
