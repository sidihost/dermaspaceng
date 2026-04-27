// ---------------------------------------------------------------------------
// /api/admin/preferences
//
//   GET  — current admin notification + email preferences (admin only)
//   POST — update preferences (admin only)
//
// Body for POST mirrors the GET payload shape exactly:
//
//   {
//     notifications: {
//       emailNotifications: boolean,
//       newUserAlerts: boolean,
//       complaintAlerts: boolean,
//       giftCardAlerts: boolean,
//       consultationAlerts: boolean,
//     },
//     email: {
//       supportEmail: string,
//       notificationEmail: string,
//       emailSignature: string,
//     },
//   }
//
// We persist into the same `app_settings` JSONB key/value table that
// already backs maintenance mode — no migrations needed. Two keys are
// used so the two cards on the Settings page can be hydrated /
// invalidated independently:
//
//   - admin.notifications
//   - admin.email
//
// The Save button on `/admin/settings` calls this endpoint to persist
// state. Previously it ran a fake 900ms timer and threw away the
// changes — multiple admins reported "saving doesn't actually save"
// and that was why.
// ---------------------------------------------------------------------------

import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { sql } from '@/lib/db'

interface NotificationPrefs {
  emailNotifications: boolean
  newUserAlerts: boolean
  complaintAlerts: boolean
  giftCardAlerts: boolean
  consultationAlerts: boolean
}

interface EmailPrefs {
  supportEmail: string
  notificationEmail: string
  emailSignature: string
}

interface PrefsPayload {
  notifications: NotificationPrefs
  email: EmailPrefs
}

const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  emailNotifications: true,
  newUserAlerts: true,
  complaintAlerts: true,
  giftCardAlerts: true,
  consultationAlerts: true,
}

const DEFAULT_EMAIL: EmailPrefs = {
  supportEmail: 'support@dermaspaceng.com',
  notificationEmail: 'notifications@dermaspaceng.com',
  emailSignature: 'Best regards,\nThe Dermaspace Team',
}

async function readKey<T>(key: string, fallback: T): Promise<T> {
  try {
    const rows = (await sql`
      SELECT value FROM app_settings WHERE key = ${key} LIMIT 1
    `) as Array<{ value: unknown }>
    const value = rows[0]?.value as T | undefined
    return value ?? fallback
  } catch (err) {
    console.warn(`[admin/preferences] read failed for ${key}:`, err)
    return fallback
  }
}

async function writeKey<T>(key: string, value: T, updatedBy: string): Promise<void> {
  await sql`
    INSERT INTO app_settings (key, value, updated_by, updated_at)
    VALUES (${key}, ${JSON.stringify(value)}::jsonb, ${updatedBy}, NOW())
    ON CONFLICT (key) DO UPDATE
      SET value      = EXCLUDED.value,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
  `
}

// Coerce + validate an unknown blob into a NotificationPrefs. Anything
// missing falls back to the existing default. We do NOT throw on bad
// input — admin tooling should never crash because of a single bad
// field; we silently coerce to the safest (default) value instead.
function normaliseNotifications(input: unknown): NotificationPrefs {
  const o = (input ?? {}) as Record<string, unknown>
  const bool = (key: keyof NotificationPrefs) =>
    typeof o[key] === 'boolean' ? (o[key] as boolean) : DEFAULT_NOTIFICATIONS[key]
  return {
    emailNotifications: bool('emailNotifications'),
    newUserAlerts: bool('newUserAlerts'),
    complaintAlerts: bool('complaintAlerts'),
    giftCardAlerts: bool('giftCardAlerts'),
    consultationAlerts: bool('consultationAlerts'),
  }
}

function normaliseEmail(input: unknown): EmailPrefs {
  const o = (input ?? {}) as Record<string, unknown>
  const str = (key: keyof EmailPrefs, max: number) => {
    if (typeof o[key] !== 'string') return DEFAULT_EMAIL[key]
    const v = (o[key] as string).trim()
    return v === '' ? DEFAULT_EMAIL[key] : v.slice(0, max)
  }
  return {
    supportEmail: str('supportEmail', 200),
    notificationEmail: str('notificationEmail', 200),
    // Signatures get a longer cap — multiline is fine.
    emailSignature: str('emailSignature', 2000),
  }
}

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const [notifications, email] = await Promise.all([
    readKey<NotificationPrefs>('admin.notifications', DEFAULT_NOTIFICATIONS),
    readKey<EmailPrefs>('admin.email', DEFAULT_EMAIL),
  ])
  // Defensive coerce on the way out too — old rows written before this
  // route shipped may have unrelated shapes.
  const payload: PrefsPayload = {
    notifications: normaliseNotifications(notifications),
    email: normaliseEmail(email),
  }
  return NextResponse.json({ preferences: payload })
}

export async function POST(req: NextRequest) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { notifications?: unknown; email?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const notifications = normaliseNotifications(body.notifications)
  const email = normaliseEmail(body.email)

  await Promise.all([
    writeKey('admin.notifications', notifications, admin.id),
    writeKey('admin.email', email, admin.id),
  ])

  const payload: PrefsPayload = { notifications, email }
  return NextResponse.json({ preferences: payload })
}
