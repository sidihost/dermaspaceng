import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getOrCreateWalletSettings, updateWalletSettings } from '@/lib/wallet'

// GET /api/wallet/settings - Get wallet settings
export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const settings = await getOrCreateWalletSettings(user.id)
    
    return NextResponse.json({
      success: true,
      settings,
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
      'low_balance_alert',
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
    
    return NextResponse.json({
      success: true,
      settings: updatedSettings,
    })
  } catch (error) {
    console.error('Update wallet settings error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
