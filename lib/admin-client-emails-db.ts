import crypto from 'crypto'
import { sql } from './db'
import {
  mergeAdminEmailsWithLegacyActivity,
  type AdminClientEmailRecord,
  type LegacyEmailActivityRow,
} from './admin-email-history'

let ensureTablePromise: Promise<void> | null = null

export function ensureAdminClientEmailsTable(): Promise<void> {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS admin_client_emails (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          recipient_email TEXT NOT NULL,
          subject TEXT NOT NULL,
          message TEXT NOT NULL,
          sent_by_id TEXT,
          sent_by_name TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `
      await sql`
        CREATE INDEX IF NOT EXISTS idx_admin_client_emails_user_created
        ON admin_client_emails (user_id, created_at DESC)
      `
    })().catch((err) => {
      ensureTablePromise = null
      throw err
    })
  }
  return ensureTablePromise
}

export async function recordAdminClientEmail(args: {
  userId: string
  recipientEmail: string
  subject: string
  message: string
  sentById: string | null
  sentByName: string | null
}): Promise<AdminClientEmailRecord> {
  await ensureAdminClientEmailsTable()
  const id = `eml_${crypto.randomBytes(8).toString('hex')}`
  const rows = (await sql`
    INSERT INTO admin_client_emails (
      id,
      user_id,
      recipient_email,
      subject,
      message,
      sent_by_id,
      sent_by_name
    )
    VALUES (
      ${id},
      ${args.userId},
      ${args.recipientEmail},
      ${args.subject},
      ${args.message},
      ${args.sentById},
      ${args.sentByName}
    )
    RETURNING id, user_id, recipient_email, subject, message, sent_by_id, sent_by_name, created_at
  `) as Array<{
    id: string
    user_id: string
    recipient_email: string
    subject: string
    message: string
    sent_by_id: string | null
    sent_by_name: string | null
    created_at: string | Date
  }>

  const row = rows[0]
  return {
    id: row?.id || id,
    userId: String(row?.user_id || args.userId),
    recipientEmail: row?.recipient_email || args.recipientEmail,
    subject: row?.subject || args.subject,
    message: row?.message ?? args.message,
    sentById: row?.sent_by_id ?? args.sentById,
    sentByName: row?.sent_by_name ?? args.sentByName,
    createdAt:
      row?.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row?.created_at || new Date().toISOString()),
  }
}

export async function listAdminClientEmails(
  userId: string,
  fallbackRecipientEmail = '',
  limit = 50,
): Promise<AdminClientEmailRecord[]> {
  await ensureAdminClientEmailsTable()

  const storedRows = (await sql`
    SELECT
      id,
      user_id,
      recipient_email,
      subject,
      message,
      sent_by_id,
      sent_by_name,
      created_at
    FROM admin_client_emails
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as Array<{
    id: string
    user_id: string
    recipient_email: string
    subject: string
    message: string
    sent_by_id: string | null
    sent_by_name: string | null
    created_at: string | Date
  }>

  const stored: AdminClientEmailRecord[] = storedRows.map((row) => ({
    id: String(row.id),
    userId: String(row.user_id),
    recipientEmail: row.recipient_email,
    subject: row.subject,
    message: row.message,
    sentById: row.sent_by_id ? String(row.sent_by_id) : null,
    sentByName: row.sent_by_name || null,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  }))

  let legacyRows: LegacyEmailActivityRow[] = []
  try {
    const actRows = (await sql`
      SELECT
        a.id,
        a.description,
        a.staff_id,
        a.created_at,
        u.first_name AS staff_first_name,
        u.last_name AS staff_last_name
      FROM activity_log a
      LEFT JOIN users u ON CAST(u.id AS TEXT) = CAST(a.staff_id AS TEXT)
      WHERE CAST(a.user_id AS TEXT) = ${userId}
        AND a.action_type = 'email_sent'
      ORDER BY a.created_at DESC
      LIMIT ${limit}
    `) as Array<{
      id: string | number
      description: string | null
      staff_id: string | null
      created_at: string | Date
      staff_first_name: string | null
      staff_last_name: string | null
    }>

    legacyRows = actRows.map((row) => ({
      id: row.id,
      description: row.description,
      staffId: row.staff_id ? String(row.staff_id) : null,
      staffName:
        [row.staff_first_name, row.staff_last_name].filter(Boolean).join(' ').trim() ||
        null,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
    }))
  } catch (err) {
    console.warn('[admin-client-emails] legacy activity_log lookup skipped:', err)
  }

  return mergeAdminEmailsWithLegacyActivity(
    stored,
    legacyRows,
    fallbackRecipientEmail,
    userId,
  ).slice(0, limit)
}
