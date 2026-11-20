import { sql } from './db'
import { isPlaceholderEmail } from './auth-onboarding'
import { buildEmailUrl } from './email-url'
import {
  buildAppealUrl,
  createAppealToken,
  normalizeAppealRole,
} from './suspension-appeals'
import {
  sendAccountReinstatedEmail,
  sendAccountSuspendedEmail,
} from './email'

let ensureTablePromise: Promise<void> | null = null

export function ensureAccountAppealsTable(): Promise<void> {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS account_appeals (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          user_email TEXT NOT NULL,
          user_name TEXT,
          user_role TEXT NOT NULL DEFAULT 'user',
          suspension_reason TEXT,
          appeal_message TEXT NOT NULL,
          contact_email TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          reviewed_by TEXT,
          review_note TEXT,
          reviewed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `
      await sql`
        CREATE INDEX IF NOT EXISTS idx_account_appeals_user_status
        ON account_appeals (user_id, status, created_at DESC)
      `
    })().catch((err) => {
      ensureTablePromise = null
      throw err
    })
  }
  return ensureTablePromise
}

export async function dispatchSuspensionNotification(args: {
  userId: string
  reason?: string | null
}): Promise<boolean> {
  try {
    const rows = (await sql`
      SELECT id, email, first_name, last_name, role
      FROM users
      WHERE id = ${args.userId}
      LIMIT 1
    `) as Array<{
      id: string
      email: string | null
      first_name: string | null
      last_name: string | null
      role: string | null
    }>

    const target = rows[0]
    if (!target || !target.email || isPlaceholderEmail(target.email)) {
      return false
    }

    const role = normalizeAppealRole(target.role)
    let appealUrl: string
    try {
      const token = createAppealToken({
        userId: String(target.id),
        email: target.email,
        role,
        reason: args.reason ?? null,
      })
      appealUrl = buildAppealUrl(token)
    } catch (tokenErr) {
      console.error('[suspension-appeals] appeal token signing failed, using contact fallback:', tokenErr)
      appealUrl = buildEmailUrl('/contact')
    }

    return await sendAccountSuspendedEmail({
      email: target.email,
      firstName: target.first_name,
      role,
      reason: args.reason ?? null,
      appealUrl,
    })
  } catch (err) {
    console.error('[suspension-appeals] failed to send suspension email:', err)
    return false
  }
}

export async function dispatchReinstatementNotification(args: {
  userId: string
}): Promise<boolean> {
  try {
    const rows = (await sql`
      SELECT id, email, first_name, role
      FROM users
      WHERE id = ${args.userId}
      LIMIT 1
    `) as Array<{
      id: string
      email: string | null
      first_name: string | null
      role: string | null
    }>

    const target = rows[0]
    if (!target || !target.email || isPlaceholderEmail(target.email)) {
      return false
    }

    return await sendAccountReinstatedEmail({
      email: target.email,
      firstName: target.first_name,
      role: normalizeAppealRole(target.role),
    })
  } catch (err) {
    console.error('[suspension-appeals] failed to send reinstatement email:', err)
    return false
  }
}
