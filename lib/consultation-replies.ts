/**
 * Consultation conversation & schema helpers.
 *
 * Ensures `admin_replies` and `consultations` carry the additive columns needed
 * for two-way consultation threads (anonymous tracking tokens, `is_staff`,
 * `sender_display_name`, and optional JSONB `attachments`) and provides shared
 * read/write queries used by both `/api/consultation/track/[token]` and
 * `/api/user/consultations/[id]`.
 */

import { randomBytes } from 'crypto'
import { sql } from './db'
import { resolveAdminAvatar, STAFF_DEFAULT_AVATAR } from './admin-avatars'
import { sanitizeReplyAttachments, type ReplyAttachment } from './attachments'

export interface PublicConsultationReply {
  id: string
  message: string
  isStaff: boolean
  senderName: string
  senderAvatarUrl: string | null
  attachments: ReplyAttachment[]
  createdAt: string
}

let schemaPatched = false
let schemaPatchInflight: Promise<void> | null = null

export async function ensureConsultationRepliesSchema(): Promise<void> {
  if (schemaPatched) return
  if (schemaPatchInflight) return schemaPatchInflight

  schemaPatchInflight = (async () => {
    try {
      await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`
      await sql`ALTER TABLE admin_replies ALTER COLUMN id SET DEFAULT gen_random_uuid()::text`
      await sql`ALTER TABLE admin_replies ADD COLUMN IF NOT EXISTS sender_display_name TEXT`
      await sql`ALTER TABLE admin_replies ADD COLUMN IF NOT EXISTS is_staff BOOLEAN NOT NULL DEFAULT TRUE`
      await sql`ALTER TABLE admin_replies ADD COLUMN IF NOT EXISTS attachments JSONB`
      await sql`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'admin_replies'
              AND column_name = 'request_id'
              AND data_type = 'integer'
          ) THEN
            ALTER TABLE admin_replies ALTER COLUMN request_id TYPE TEXT USING request_id::text;
          END IF;
        END$$
      `
      await sql`ALTER TABLE consultations ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT TRUE`
      await sql`ALTER TABLE consultations ADD COLUMN IF NOT EXISTS track_token TEXT`
      await sql`ALTER TABLE consultations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`
      schemaPatched = true
    } catch (err) {
      console.error('[consultation-replies] schema patch failed', err)
    } finally {
      schemaPatchInflight = null
    }
  })()

  return schemaPatchInflight
}

export function generateConsultationTrackToken(): string {
  return randomBytes(32).toString('hex')
}

export async function ensureConsultationTrackToken(
  consultationId: string,
  existingToken: string | null | undefined,
): Promise<string> {
  const cleaned = typeof existingToken === 'string' ? existingToken.trim() : ''
  if (cleaned) return cleaned
  const token = generateConsultationTrackToken()
  try {
    await ensureConsultationRepliesSchema()
    await sql`
      UPDATE consultations
      SET track_token = COALESCE(NULLIF(track_token, ''), ${token}),
          updated_at = NOW()
      WHERE id = ${consultationId}
    `
    const rows = (await sql`
      SELECT track_token FROM consultations WHERE id = ${consultationId} LIMIT 1
    `) as unknown as Array<{ track_token: string | null }>
    return rows[0]?.track_token || token
  } catch (err) {
    console.error('[consultation-replies] ensureConsultationTrackToken failed', err)
    return token
  }
}

export async function listPublicConsultationReplies(
  consultationId: string,
): Promise<PublicConsultationReply[]> {
  await ensureConsultationRepliesSchema()

  const rows = (await sql`
    SELECT
      ar.id::text AS id,
      ar.reply_text AS message,
      COALESCE(ar.is_staff, TRUE) AS is_staff,
      ar.sender_display_name,
      ar.attachments,
      ar.created_at,
      u.first_name AS staff_first_name,
      u.last_name AS staff_last_name,
      u.avatar_url AS staff_avatar_url,
      u.role AS staff_role
    FROM admin_replies ar
    LEFT JOIN users u ON u.id::text = ar.staff_id::text
    WHERE ar.request_type = 'consultation'
      AND ar.request_id = ${String(consultationId)}
      AND COALESCE(ar.is_internal, FALSE) = FALSE
    ORDER BY ar.created_at ASC
  `) as unknown as Array<{
    id: string
    message: string
    is_staff: boolean
    sender_display_name: string | null
    attachments: unknown
    created_at: string | Date
    staff_first_name: string | null
    staff_last_name: string | null
    staff_avatar_url: string | null
    staff_role: string | null
  }>

  return rows.map((row) => {
    const isStaff = row.is_staff !== false
    const staffFullName = `${row.staff_first_name || ''} ${row.staff_last_name || ''}`.trim()
    const senderName = isStaff
      ? row.sender_display_name?.trim() || staffFullName || 'Dermaspace Team'
      : row.sender_display_name?.trim() || 'You'
    const senderAvatarUrl = isStaff
      ? resolveAdminAvatar(row.staff_avatar_url, row.staff_role) ?? STAFF_DEFAULT_AVATAR
      : null

    let parsedAttachments: ReplyAttachment[] = []
    if (Array.isArray(row.attachments)) {
      parsedAttachments = sanitizeReplyAttachments(row.attachments)
    } else if (typeof row.attachments === 'string') {
      try {
        parsedAttachments = sanitizeReplyAttachments(JSON.parse(row.attachments))
      } catch {
        parsedAttachments = []
      }
    }

    return {
      id: String(row.id),
      message: String(row.message || ''),
      isStaff,
      senderName,
      senderAvatarUrl,
      attachments: parsedAttachments,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
    }
  })
}

export async function insertCustomerConsultationReply(args: {
  consultationId: string
  userEmail: string | null | undefined
  customerName: string
  message: string
  attachments?: unknown
}): Promise<PublicConsultationReply> {
  await ensureConsultationRepliesSchema()

  const cleanMessage = args.message.trim()
  const cleanName = args.customerName.trim() || 'Customer'
  const cleanAttachments = sanitizeReplyAttachments(args.attachments)

  const inserted = (await sql`
    INSERT INTO admin_replies (
      request_type,
      request_id,
      user_email,
      staff_id,
      reply_text,
      is_internal,
      is_staff,
      sender_display_name,
      attachments
    )
    VALUES (
      'consultation',
      ${String(args.consultationId)},
      ${args.userEmail || ''},
      NULL,
      ${cleanMessage},
      FALSE,
      FALSE,
      ${cleanName},
      ${cleanAttachments.length > 0 ? JSON.stringify(cleanAttachments) : null}::jsonb
    )
    RETURNING id::text AS id, reply_text AS message, created_at
  `) as unknown as Array<{
    id: string
    message: string
    created_at: string | Date
  }>

  await sql`
    UPDATE consultations
    SET updated_at = NOW()
    WHERE id = ${args.consultationId}
  `

  const row = inserted[0]
  return {
    id: String(row.id),
    message: String(row.message),
    isStaff: false,
    senderName: cleanName,
    senderAvatarUrl: null,
    attachments: cleanAttachments,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  }
}
