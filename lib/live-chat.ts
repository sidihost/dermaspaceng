import { sql } from '@/lib/db'
import { invalidateAdminStats } from '@/lib/stats-cache'
import { isPlaceholderEmail } from '@/lib/auth-onboarding'
import { sendLiveChatTranscriptEmail } from '@/lib/email'
import {
  generateLiveChatSupportId,
  normalizeSupportIdQuery,
  pickFrontDeskSlugForStaff,
  resolveStaffAvatarUrl,
  resolveSupportId,
} from '@/lib/support-and-chat'

// ---------------------------------------------------------------------------
// Live chat helpers
// ---------------------------------------------------------------------------
// Thin data layer shared by the user-facing widget, the staff queue, and the
// admin oversight pages. All raw SQL lives here so the route handlers stay
// declarative and so we have one place to enforce status-machine rules.
// ---------------------------------------------------------------------------

export type LiveChatStatus = 'waiting' | 'active' | 'closed' | 'abandoned'
export type SenderRole = 'user' | 'staff' | 'system'

export interface LiveChatSession {
  id: string
  support_code: string | null
  // Nullable: guest (not signed in) sessions identify themselves via the
  // pre-chat form fields below + an httpOnly cookie holding this row's id.
  user_id: string | null
  initial_topic: string | null
  status: LiveChatStatus
  assigned_staff_id: string | null
  service_rating: number | null
  staff_rating: number | null
  rating_comment: string | null
  escalated_at: string
  accepted_at: string | null
  first_reply_at: string | null
  closed_at: string | null
  rated_at: string | null
  last_activity_at: string
  closed_by: string | null
  created_at: string
  // Guest pre-chat fields. Always NULL when user_id is set.
  guest_name: string | null
  guest_email: string | null
  guest_phone: string | null
  visitor_location?: string | null
  visitor_ip?: string | null
  visitor_user_agent?: string | null
  visitor_browser?: string | null
  visitor_os?: string | null
  visitor_device?: string | null
  visitor_timezone?: string | null
  visitor_page_url?: string | null
  visitor_referrer?: string | null
  visitor_language?: string | null
  visitor_screen?: string | null
}

export interface LiveChatMessage {
  id: string
  session_id: string
  sender_role: SenderRole
  sender_id: string | null
  sender_name?: string | null
  sender_avatar_url?: string | null
  body: string
  read_at: string | null
  created_at: string
}

// Curated pool of front-desk avatars. Female-only per the product brief.
// Keep this in sync with /lib/spa-avatars.ts (the f-prefixed entries).
export const FRONT_DESK_AVATAR_POOL = [
  'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11',
] as const

export { resolveStaffAvatarUrl, resolveSupportId }

export function avatarUrlForSlug(
  slug: string | null | undefined,
  staffId?: string | null,
): string {
  return resolveStaffAvatarUrl({ avatarSlug: slug, staffId })
}

// Deterministic avatar pick for a given staff user id. Hashes the id so
// every staff member gets a stable, distinct avatar without us having
// to seed the staff_profiles table eagerly.
export function pickDefaultAvatarSlug(userId: string): string {
  return pickFrontDeskSlugForStaff(userId)
}

// Idempotently ensure `support_code` exists on `live_chat_sessions` so
// every live chat carries a persistent, searchable Support ID (e.g. DS-LC-7K4M9P)
// without breaking existing databases.
let ensureSupportCodePromise: Promise<void> | null = null

export function ensureLiveChatSupportCodeColumn(): Promise<void> {
  if (!ensureSupportCodePromise) {
    ensureSupportCodePromise = (async () => {
      await sql`
        ALTER TABLE live_chat_sessions
        ADD COLUMN IF NOT EXISTS support_code TEXT
      `
      await sql`
        ALTER TABLE live_chat_sessions
        ADD COLUMN IF NOT EXISTS transcript_sent_at TIMESTAMPTZ
      `
      await sql`
        ALTER TABLE live_chat_sessions
        ADD COLUMN IF NOT EXISTS visitor_location TEXT
      `
      await sql`
        ALTER TABLE live_chat_sessions
        ADD COLUMN IF NOT EXISTS visitor_ip TEXT
      `
      await sql`
        ALTER TABLE live_chat_sessions
        ADD COLUMN IF NOT EXISTS visitor_user_agent TEXT
      `
      await sql`
        ALTER TABLE live_chat_sessions
        ADD COLUMN IF NOT EXISTS visitor_browser TEXT
      `
      await sql`
        ALTER TABLE live_chat_sessions
        ADD COLUMN IF NOT EXISTS visitor_os TEXT
      `
      await sql`
        ALTER TABLE live_chat_sessions
        ADD COLUMN IF NOT EXISTS visitor_device TEXT
      `
      await sql`
        ALTER TABLE live_chat_sessions
        ADD COLUMN IF NOT EXISTS visitor_timezone TEXT
      `
      await sql`
        ALTER TABLE live_chat_sessions
        ADD COLUMN IF NOT EXISTS visitor_page_url TEXT
      `
      await sql`
        ALTER TABLE live_chat_sessions
        ADD COLUMN IF NOT EXISTS visitor_referrer TEXT
      `
      await sql`
        ALTER TABLE live_chat_sessions
        ADD COLUMN IF NOT EXISTS visitor_language TEXT
      `
      await sql`
        ALTER TABLE live_chat_sessions
        ADD COLUMN IF NOT EXISTS visitor_screen TEXT
      `
      // Backfill any pre-existing sessions so every row in Postgres has a real,
      // searchable Support ID stored in the database (collision-safe).
      await sql`
        WITH candidates AS (
          SELECT
            id,
            'DS-LC-' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 6)) AS base_code,
            'DS-LC-' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 8)) AS long_code,
            ROW_NUMBER() OVER (
              PARTITION BY UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 6))
              ORDER BY created_at ASC, id ASC
            ) AS rn
          FROM live_chat_sessions
          WHERE support_code IS NULL
        )
        UPDATE live_chat_sessions s
           SET support_code = CASE
             WHEN c.rn = 1 AND NOT EXISTS (
               SELECT 1 FROM live_chat_sessions existing
                WHERE existing.support_code = c.base_code
             ) THEN c.base_code
             ELSE c.long_code
           END
          FROM candidates c
         WHERE s.id = c.id
           AND s.support_code IS NULL
      `
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_live_chat_sessions_support_code
        ON live_chat_sessions (support_code)
        WHERE support_code IS NOT NULL
      `
    })().catch((err) => {
      ensureSupportCodePromise = null
      console.error('[live-chat] ensure support_code column failed:', err)
    })
  }
  return ensureSupportCodePromise
}

function withResolvedSupportCode<T extends { id: string; support_code?: string | null }>(
  row: T,
): T & { support_code: string } {
  return {
    ...row,
    support_code: resolveSupportId(row.support_code, row.id),
  }
}

async function allocateUniqueSupportCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateLiveChatSupportId()
    const existing = await sql`
      SELECT id FROM live_chat_sessions WHERE support_code = ${candidate} LIMIT 1
    `
    if (existing.length === 0) return candidate
  }
  return generateLiveChatSupportId()
}

// Ensure every staff/admin has a row in staff_profiles. Lazy-creates one
// with a deterministic avatar slug + display name so the very first time
// a staff member touches a chat they immediately have an identity.
export async function ensureStaffProfile(userId: string, fallbackName: string) {
  const slug = pickDefaultAvatarSlug(userId)
  await sql`
    INSERT INTO staff_profiles (user_id, avatar_slug, display_name)
    VALUES (${userId}, ${slug}, ${fallbackName})
    ON CONFLICT (user_id) DO NOTHING
  `
}

export interface StaffProfile {
  user_id: string
  avatar_slug: string
  display_name: string | null
  status: 'online' | 'offline' | 'busy'
  last_seen_at: string | null
}

export async function getStaffProfile(userId: string): Promise<StaffProfile | null> {
  const rows = await sql`
    SELECT user_id, avatar_slug, display_name, status, last_seen_at
    FROM staff_profiles WHERE user_id = ${userId}
  `
  return (rows[0] as StaffProfile) || null
}

// Mark the staff member as online. Called from the queue page on mount
// and again every 30s while the page is focused so the admin's view of
// "who's manning the desk" stays roughly accurate.
export async function touchStaffPresence(
  userId: string,
  status: 'online' | 'offline' | 'busy' = 'online',
) {
  await sql`
    UPDATE staff_profiles
       SET status = ${status},
           last_seen_at = NOW(),
           updated_at = NOW()
     WHERE user_id = ${userId}
  `
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

// Find the user's most recent OPEN (waiting / active) session. We keep at
// most one open session per user — when they ask to connect again
// we return the existing row.
export async function getOpenSessionForUser(userId: string): Promise<LiveChatSession | null> {
  await ensureLiveChatSupportCodeColumn()
  const rows = await sql`
    SELECT * FROM live_chat_sessions
     WHERE user_id = ${userId}
       AND status IN ('waiting', 'active')
     ORDER BY created_at DESC
     LIMIT 1
  `
  const row = rows[0] as LiveChatSession | undefined
  if (!row) return null
  if (!row.support_code) {
    const code = resolveSupportId(null, row.id)
    await sql`
      UPDATE live_chat_sessions
         SET support_code = ${code}
       WHERE id = ${row.id} AND support_code IS NULL
    `.catch(() => {})
    return { ...row, support_code: code }
  }
  return withResolvedSupportCode(row)
}

// Find a recently closed (last 30 minutes) session that hasn't been rated
// or skipped yet so the customer overlay prompts for post-chat feedback even
// if a staff member closed the session from their console.
export async function getRecentUnratedSessionForUser(
  userId: string,
): Promise<LiveChatSession | null> {
  await ensureLiveChatSupportCodeColumn()
  const rows = await sql`
    SELECT * FROM live_chat_sessions
     WHERE user_id = ${userId}
       AND status = 'closed'
       AND rated_at IS NULL
       AND closed_at >= NOW() - INTERVAL '30 minutes'
     ORDER BY closed_at DESC
     LIMIT 1
  `
  const row = rows[0] as LiveChatSession | undefined
  return row ? withResolvedSupportCode(row) : null
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getSessionById(idOrCode: string): Promise<LiveChatSession | null> {
  await ensureLiveChatSupportCodeColumn()
  const raw = (idOrCode || '').trim()
  if (!raw) return null

  if (UUID_RE.test(raw)) {
    const rows = await sql`SELECT * FROM live_chat_sessions WHERE id = ${raw} LIMIT 1`
    const row = rows[0] as LiveChatSession | undefined
    return row ? withResolvedSupportCode(row) : null
  }

  const normalized = normalizeSupportIdQuery(raw)
  if (!normalized) return null

  const byCode = await sql`
    SELECT * FROM live_chat_sessions
     WHERE UPPER(COALESCE(support_code, '')) = ${normalized}
     ORDER BY created_at DESC
     LIMIT 1
  `
  if (byCode.length > 0) {
    return withResolvedSupportCode(byCode[0] as LiveChatSession)
  }

  // Fallback for legacy sessions whose Support ID was derived from UUID prefix.
  const suffix = normalized.replace(/^DS-LC-/, '')
  if (suffix.length >= 6) {
    const byPrefix = await sql`
      SELECT * FROM live_chat_sessions
       WHERE UPPER(REPLACE(id::text, '-', '')) LIKE ${`${suffix}%`}
       ORDER BY created_at DESC
       LIMIT 1
    `
    if (byPrefix.length > 0) {
      return withResolvedSupportCode(byPrefix[0] as LiveChatSession)
    }
  }

  return null
}

export interface VisitorSessionMetaInput {
  location?: string | null
  ip?: string | null
  userAgent?: string | null
  browser?: string | null
  os?: string | null
  device?: string | null
  timezone?: string | null
  pageUrl?: string | null
  referrer?: string | null
  language?: string | null
  screen?: string | null
}

export async function escalateToHuman(
  userId: string,
  initialTopic: string | null,
  aiTranscript: unknown,
  visitor?: VisitorSessionMetaInput | null,
): Promise<LiveChatSession> {
  await ensureLiveChatSupportCodeColumn()
  // Reuse an open session if one exists rather than racing two queues.
  const existing = await getOpenSessionForUser(userId)
  if (existing) {
    if (visitor && (!existing.visitor_browser || !existing.visitor_location)) {
      await sql`
        UPDATE live_chat_sessions
           SET visitor_location   = COALESCE(visitor_location, ${visitor.location ?? null}),
               visitor_ip         = COALESCE(visitor_ip, ${visitor.ip ?? null}),
               visitor_user_agent = COALESCE(visitor_user_agent, ${visitor.userAgent ?? null}),
               visitor_browser    = COALESCE(visitor_browser, ${visitor.browser ?? null}),
               visitor_os         = COALESCE(visitor_os, ${visitor.os ?? null}),
               visitor_device     = COALESCE(visitor_device, ${visitor.device ?? null}),
               visitor_timezone   = COALESCE(visitor_timezone, ${visitor.timezone ?? null}),
               visitor_page_url   = COALESCE(visitor_page_url, ${visitor.pageUrl ?? null}),
               visitor_referrer   = COALESCE(visitor_referrer, ${visitor.referrer ?? null}),
               visitor_language   = COALESCE(visitor_language, ${visitor.language ?? null}),
               visitor_screen     = COALESCE(visitor_screen, ${visitor.screen ?? null})
         WHERE id = ${existing.id}
      `.catch(() => {})
    }
    return existing
  }

  const supportCode = await allocateUniqueSupportCode()
  const rows = await sql`
    INSERT INTO live_chat_sessions (
      user_id,
      initial_topic,
      ai_transcript,
      support_code,
      visitor_location,
      visitor_ip,
      visitor_user_agent,
      visitor_browser,
      visitor_os,
      visitor_device,
      visitor_timezone,
      visitor_page_url,
      visitor_referrer,
      visitor_language,
      visitor_screen
    )
    VALUES (
      ${userId},
      ${initialTopic},
      ${aiTranscript ? JSON.stringify(aiTranscript) : null},
      ${supportCode},
      ${visitor?.location ?? null},
      ${visitor?.ip ?? null},
      ${visitor?.userAgent ?? null},
      ${visitor?.browser ?? null},
      ${visitor?.os ?? null},
      ${visitor?.device ?? null},
      ${visitor?.timezone ?? null},
      ${visitor?.pageUrl ?? null},
      ${visitor?.referrer ?? null},
      ${visitor?.language ?? null},
      ${visitor?.screen ?? null}
    )
    RETURNING *
  `
  const session = withResolvedSupportCode(rows[0] as LiveChatSession)

  await sql`
    INSERT INTO live_chat_messages (session_id, sender_role, body)
    VALUES (
      ${session.id},
      'system',
      'One of our customer care reps will be with you shortly. Stay tuned!'
    )
  `

  await invalidateAdminStats().catch(() => {})
  return session
}

// Create a session for an anonymous visitor.
export async function escalateAsGuest(input: {
  name: string
  email: string
  phone: string | null
  initialTopic: string | null
  visitor?: VisitorSessionMetaInput | null
}): Promise<LiveChatSession> {
  await ensureLiveChatSupportCodeColumn()
  const supportCode = await allocateUniqueSupportCode()
  const rows = await sql`
    INSERT INTO live_chat_sessions (
      initial_topic,
      guest_name,
      guest_email,
      guest_phone,
      support_code,
      visitor_location,
      visitor_ip,
      visitor_user_agent,
      visitor_browser,
      visitor_os,
      visitor_device,
      visitor_timezone,
      visitor_page_url,
      visitor_referrer,
      visitor_language,
      visitor_screen
    )
    VALUES (
      ${input.initialTopic},
      ${input.name},
      ${input.email.toLowerCase()},
      ${input.phone},
      ${supportCode},
      ${input.visitor?.location ?? null},
      ${input.visitor?.ip ?? null},
      ${input.visitor?.userAgent ?? null},
      ${input.visitor?.browser ?? null},
      ${input.visitor?.os ?? null},
      ${input.visitor?.device ?? null},
      ${input.visitor?.timezone ?? null},
      ${input.visitor?.pageUrl ?? null},
      ${input.visitor?.referrer ?? null},
      ${input.visitor?.language ?? null},
      ${input.visitor?.screen ?? null}
    )
    RETURNING *
  `
  const session = withResolvedSupportCode(rows[0] as LiveChatSession)

  await sql`
    INSERT INTO live_chat_messages (session_id, sender_role, body)
    VALUES (
      ${session.id},
      'system',
      'One of our customer care reps will be with you shortly. Stay tuned!'
    )
  `

  await invalidateAdminStats().catch(() => {})
  return session
}

// Returns whether THIS call performed the accept.
export async function acceptSession(sessionId: string, staffId: string): Promise<boolean> {
  const rows = await sql`
    UPDATE live_chat_sessions
       SET status = 'active',
           assigned_staff_id = ${staffId},
           accepted_at = NOW(),
           last_activity_at = NOW()
     WHERE id = ${sessionId}
       AND status = 'waiting'
     RETURNING id
  `
  if (rows.length > 0) {
    await invalidateAdminStats().catch(() => {})
  }
  return rows.length > 0
}

export interface TakeoverResult {
  sessionId: string
  supportCode: string
  previousStaffId: string | null
  previousStaffName: string | null
  alreadyAssigned: boolean
  staff: {
    id: string
    displayName: string
    avatarUrl: string
  }
}

export async function takeoverSession(
  sessionId: string,
  newStaffId: string,
): Promise<TakeoverResult | null> {
  await ensureLiveChatSupportCodeColumn()
  const session = await getSessionById(sessionId)
  if (!session) return null

  const newStaffRows = (await sql`
    SELECT u.first_name, u.last_name, u.avatar_url, sp.display_name, sp.avatar_slug
      FROM users u
      LEFT JOIN staff_profiles sp ON sp.user_id = u.id
     WHERE u.id = ${newStaffId}
     LIMIT 1
  `) as Array<{
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
    display_name: string | null
    avatar_slug: string | null
  }>

  const newStaffRow = newStaffRows[0]
  const fallbackFullName = `${newStaffRow?.first_name || ''} ${newStaffRow?.last_name || ''}`.trim() || 'Customer Care'
  await ensureStaffProfile(newStaffId, fallbackFullName)

  const newStaffName = staffDisplayName({
    display_name: newStaffRow?.display_name,
    first_name: newStaffRow?.first_name,
    last_name: newStaffRow?.last_name,
  })
  const newStaffAvatarUrl = resolveStaffAvatarUrl({
    avatarUrl: newStaffRow?.avatar_url,
    avatarSlug: newStaffRow?.avatar_slug,
    staffId: newStaffId,
  })

  const supportCode = resolveSupportId(session.support_code, session.id)
  const previousStaffId = session.assigned_staff_id

  if (previousStaffId === newStaffId && session.status === 'active') {
    return {
      sessionId: session.id,
      supportCode,
      previousStaffId,
      previousStaffName: newStaffName,
      alreadyAssigned: true,
      staff: {
        id: newStaffId,
        displayName: newStaffName,
        avatarUrl: newStaffAvatarUrl,
      },
    }
  }

  let previousStaffName: string | null = null
  if (previousStaffId && previousStaffId !== newStaffId) {
    const prevRows = (await sql`
      SELECT u.first_name, u.last_name, sp.display_name
        FROM users u
        LEFT JOIN staff_profiles sp ON sp.user_id = u.id
       WHERE u.id = ${previousStaffId}
       LIMIT 1
    `) as Array<{
      first_name: string | null
      last_name: string | null
      display_name: string | null
    }>
    if (prevRows[0]) {
      previousStaffName = staffDisplayName(prevRows[0])
    }
  }

  const wasClosed = session.status === 'closed' || session.status === 'abandoned'

  await sql`
    UPDATE live_chat_sessions
       SET assigned_staff_id = ${newStaffId},
           status = 'active',
           accepted_at = COALESCE(accepted_at, NOW()),
           closed_at = NULL,
           closed_by = NULL,
           last_activity_at = NOW(),
           support_code = COALESCE(support_code, ${supportCode})
     WHERE id = ${session.id}
  `

  const systemText = wasClosed
    ? `${newStaffName} reopened and joined the chat (${supportCode})`
    : previousStaffName
      ? `${newStaffName} joined and took over the chat from ${previousStaffName}`
      : `${newStaffName} joined the chat`

  await addMessage(session.id, 'system', null, systemText)
  await invalidateAdminStats().catch(() => {})

  return {
    sessionId: session.id,
    supportCode,
    previousStaffId,
    previousStaffName,
    alreadyAssigned: false,
    staff: {
      id: newStaffId,
      displayName: newStaffName,
      avatarUrl: newStaffAvatarUrl,
    },
  }
}

export async function closeSession(sessionId: string, closedBy: 'user' | 'staff' | 'admin') {
  await sql`
    UPDATE live_chat_sessions
       SET status = 'closed',
           closed_at = NOW(),
           closed_by = ${closedBy},
           last_activity_at = NOW()
     WHERE id = ${sessionId}
       AND status IN ('waiting', 'active')
  `
  await invalidateAdminStats().catch(() => {})
}

export async function addMessage(
  sessionId: string,
  senderRole: SenderRole,
  senderId: string | null,
  body: string,
): Promise<LiveChatMessage> {
  const rows = await sql`
    INSERT INTO live_chat_messages (session_id, sender_role, sender_id, body)
    VALUES (${sessionId}, ${senderRole}, ${senderId}, ${body})
    RETURNING *
  `
  if (senderRole === 'staff') {
    await sql`
      UPDATE live_chat_sessions
         SET last_activity_at = NOW(),
             first_reply_at = COALESCE(first_reply_at, NOW())
       WHERE id = ${sessionId}
    `
  } else {
    await sql`
      UPDATE live_chat_sessions
         SET last_activity_at = NOW()
       WHERE id = ${sessionId}
    `
  }

  const inserted = rows[0] as LiveChatMessage

  if (senderRole === 'staff' && senderId) {
    const staffRows = (await sql`
      SELECT u.first_name, u.last_name, u.avatar_url, sp.display_name, sp.avatar_slug
        FROM users u
        LEFT JOIN staff_profiles sp ON sp.user_id = u.id
       WHERE u.id = ${senderId}
       LIMIT 1
    `) as Array<{
      first_name: string | null
      last_name: string | null
      avatar_url: string | null
      display_name: string | null
      avatar_slug: string | null
    }>
    const s = staffRows[0]
    return {
      ...inserted,
      sender_name: staffDisplayName({
        display_name: s?.display_name,
        first_name: s?.first_name,
        last_name: s?.last_name,
      }),
      sender_avatar_url: resolveStaffAvatarUrl({
        avatarUrl: s?.avatar_url,
        avatarSlug: s?.avatar_slug,
        staffId: senderId,
      }),
    }
  }

  return inserted
}

export async function getMessages(
  sessionId: string,
  sinceIso?: string,
): Promise<LiveChatMessage[]> {
  const rows = (
    sinceIso
      ? await sql`
          SELECT m.*,
                 u.first_name      AS u_first_name,
                 u.last_name       AS u_last_name,
                 u.avatar_url      AS u_avatar_url,
                 sp.display_name   AS sp_display_name,
                 sp.avatar_slug    AS sp_avatar_slug
            FROM live_chat_messages m
            LEFT JOIN users u ON u.id = m.sender_id
            LEFT JOIN staff_profiles sp ON sp.user_id = m.sender_id AND m.sender_role = 'staff'
           WHERE m.session_id = ${sessionId} AND m.created_at > ${sinceIso}
           ORDER BY m.created_at ASC
        `
      : await sql`
          SELECT m.*,
                 u.first_name      AS u_first_name,
                 u.last_name       AS u_last_name,
                 u.avatar_url      AS u_avatar_url,
                 sp.display_name   AS sp_display_name,
                 sp.avatar_slug    AS sp_avatar_slug
            FROM live_chat_messages m
            LEFT JOIN users u ON u.id = m.sender_id
            LEFT JOIN staff_profiles sp ON sp.user_id = m.sender_id AND m.sender_role = 'staff'
           WHERE m.session_id = ${sessionId}
           ORDER BY m.created_at ASC
        `
  ) as Array<
    LiveChatMessage & {
      u_first_name: string | null
      u_last_name: string | null
      u_avatar_url: string | null
      sp_display_name: string | null
      sp_avatar_slug: string | null
    }
  >

  return rows.map((r) => {
    const base: LiveChatMessage = {
      id: r.id,
      session_id: r.session_id,
      sender_role: r.sender_role,
      sender_id: r.sender_id,
      body: r.body,
      read_at: r.read_at,
      created_at: r.created_at,
    }
    if (r.sender_role === 'staff') {
      base.sender_name = staffDisplayName({
        display_name: r.sp_display_name,
        first_name: r.u_first_name,
        last_name: r.u_last_name,
      })
      base.sender_avatar_url = resolveStaffAvatarUrl({
        avatarUrl: r.u_avatar_url,
        avatarSlug: r.sp_avatar_slug,
        staffId: r.sender_id,
      })
    } else if (r.sender_role === 'user') {
      base.sender_name = [r.u_first_name, r.u_last_name].filter(Boolean).join(' ').trim() || null
      base.sender_avatar_url = r.u_avatar_url || null
    }
    return base
  })
}

export async function markStaffMessagesRead(sessionId: string) {
  await sql`
    UPDATE live_chat_messages
       SET read_at = NOW()
     WHERE session_id = ${sessionId}
       AND sender_role = 'staff'
       AND read_at IS NULL
  `
}

export async function markUserMessagesRead(sessionId: string) {
  await sql`
    UPDATE live_chat_messages
       SET read_at = NOW()
     WHERE session_id = ${sessionId}
       AND sender_role = 'user'
       AND read_at IS NULL
  `
}

export async function rateSession(
  sessionId: string,
  serviceRating: number,
  staffRating: number,
  comment: string | null,
) {
  await sql`
    UPDATE live_chat_sessions
       SET service_rating = ${serviceRating},
           staff_rating = ${staffRating},
           rating_comment = ${comment},
           rated_at = NOW(),
           status = CASE WHEN status IN ('waiting', 'active') THEN 'closed' ELSE status END,
           closed_at = COALESCE(closed_at, NOW())
     WHERE id = ${sessionId}
  `
}

export async function skipSessionRating(sessionId: string) {
  await sql`
    UPDATE live_chat_sessions
       SET rated_at = COALESCE(rated_at, NOW())
     WHERE id = ${sessionId}
  `
}

// ---------------------------------------------------------------------------
// Queue & oversight helpers
// ---------------------------------------------------------------------------

export interface QueueItem extends LiveChatSession {
  support_code: string
  user_first_name: string
  user_last_name: string
  user_avatar_url: string | null
  user_email: string | null
  user_phone: string | null
  is_guest: boolean
  unread_user_messages: number
  assigned_staff_name?: string | null
  assigned_staff_avatar_url?: string | null
}

type RawQueueRow = QueueItem & {
  staff_first_name?: string | null
  staff_last_name?: string | null
  staff_user_avatar_url?: string | null
  staff_display_name?: string | null
  staff_avatar_slug?: string | null
}

function mapQueueRow(r: RawQueueRow): QueueItem {
  const resolvedCode = resolveSupportId(r.support_code, r.id)
  const hasStaff = Boolean(r.assigned_staff_id)
  return {
    ...r,
    support_code: resolvedCode,
    assigned_staff_name: hasStaff
      ? staffDisplayName({
          display_name: r.staff_display_name,
          first_name: r.staff_first_name,
          last_name: r.staff_last_name,
        })
      : null,
    assigned_staff_avatar_url: hasStaff
      ? resolveStaffAvatarUrl({
          avatarUrl: r.staff_user_avatar_url,
          avatarSlug: r.staff_avatar_slug,
          staffId: r.assigned_staff_id,
        })
      : null,
  }
}

export async function getStaffQueue(
  staffId: string,
  searchQuery?: string | null,
): Promise<{
  waiting: QueueItem[]
  mine: QueueItem[]
  others: QueueItem[]
  searchResults: QueueItem[]
}> {
  await ensureLiveChatSupportCodeColumn()

  const waiting = (await sql`
    SELECT s.*,
           COALESCE(u.first_name, split_part(s.guest_name, ' ', 1), 'Guest')           AS user_first_name,
           COALESCE(u.last_name,
                    NULLIF(regexp_replace(s.guest_name, '^\\S+\\s*', ''), ''),
                    '')                                                                AS user_last_name,
           u.avatar_url                                                                AS user_avatar_url,
           COALESCE(u.email, s.guest_email)                                            AS user_email,
           COALESCE(u.phone, s.guest_phone)                                            AS user_phone,
           (s.user_id IS NULL)                                                         AS is_guest,
           (SELECT COUNT(*) FROM live_chat_messages m
              WHERE m.session_id = s.id AND m.sender_role = 'user' AND m.read_at IS NULL)::int
             AS unread_user_messages
      FROM live_chat_sessions s
      LEFT JOIN users u ON u.id = s.user_id
     WHERE s.status = 'waiting'
     ORDER BY s.escalated_at ASC
     LIMIT 50
  `) as RawQueueRow[]

  const mine = (await sql`
    SELECT s.*,
           COALESCE(u.first_name, split_part(s.guest_name, ' ', 1), 'Guest')           AS user_first_name,
           COALESCE(u.last_name,
                    NULLIF(regexp_replace(s.guest_name, '^\\S+\\s*', ''), ''),
                    '')                                                                AS user_last_name,
           u.avatar_url                                                                AS user_avatar_url,
           COALESCE(u.email, s.guest_email)                                            AS user_email,
           COALESCE(u.phone, s.guest_phone)                                            AS user_phone,
           (s.user_id IS NULL)                                                         AS is_guest,
           st.first_name                                                               AS staff_first_name,
           st.last_name                                                                AS staff_last_name,
           st.avatar_url                                                               AS staff_user_avatar_url,
           sp.display_name                                                             AS staff_display_name,
           sp.avatar_slug                                                              AS staff_avatar_slug,
           (SELECT COUNT(*) FROM live_chat_messages m
              WHERE m.session_id = s.id AND m.sender_role = 'user' AND m.read_at IS NULL)::int
             AS unread_user_messages
      FROM live_chat_sessions s
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN users st ON st.id = s.assigned_staff_id
      LEFT JOIN staff_profiles sp ON sp.user_id = s.assigned_staff_id
     WHERE s.assigned_staff_id = ${staffId}
       AND s.status = 'active'
     ORDER BY s.last_activity_at DESC
     LIMIT 50
  `) as RawQueueRow[]

  const others = (await sql`
    SELECT s.*,
           COALESCE(u.first_name, split_part(s.guest_name, ' ', 1), 'Guest')           AS user_first_name,
           COALESCE(u.last_name,
                    NULLIF(regexp_replace(s.guest_name, '^\\S+\\s*', ''), ''),
                    '')                                                                AS user_last_name,
           u.avatar_url                                                                AS user_avatar_url,
           COALESCE(u.email, s.guest_email)                                            AS user_email,
           COALESCE(u.phone, s.guest_phone)                                            AS user_phone,
           (s.user_id IS NULL)                                                         AS is_guest,
           st.first_name                                                               AS staff_first_name,
           st.last_name                                                                AS staff_last_name,
           st.avatar_url                                                               AS staff_user_avatar_url,
           sp.display_name                                                             AS staff_display_name,
           sp.avatar_slug                                                              AS staff_avatar_slug,
           (SELECT COUNT(*) FROM live_chat_messages m
              WHERE m.session_id = s.id AND m.sender_role = 'user' AND m.read_at IS NULL)::int
             AS unread_user_messages
      FROM live_chat_sessions s
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN users st ON st.id = s.assigned_staff_id
      LEFT JOIN staff_profiles sp ON sp.user_id = s.assigned_staff_id
     WHERE s.assigned_staff_id IS NOT NULL
       AND s.assigned_staff_id <> ${staffId}
       AND s.status = 'active'
     ORDER BY s.last_activity_at DESC
     LIMIT 50
  `) as RawQueueRow[]

  let searchResults: QueueItem[] = []
  const trimmedQ = (searchQuery ?? '').trim()
  if (trimmedQ.length >= 2) {
    const likePattern = `%${trimmedQ}%`
    const normalizedCode = normalizeSupportIdQuery(trimmedQ)
    const strippedSuffix = normalizedCode.replace(/^DS-LC-/, '')
    const codeLike = `%${normalizedCode}%`
    const suffixLike = strippedSuffix.length >= 3 ? `${strippedSuffix}%` : '__no_match__'

    const found = (await sql`
      SELECT s.*,
             COALESCE(u.first_name, split_part(s.guest_name, ' ', 1), 'Guest')           AS user_first_name,
             COALESCE(u.last_name,
                      NULLIF(regexp_replace(s.guest_name, '^\\S+\\s*', ''), ''),
                      '')                                                                AS user_last_name,
             u.avatar_url                                                                AS user_avatar_url,
             COALESCE(u.email, s.guest_email)                                            AS user_email,
             COALESCE(u.phone, s.guest_phone)                                            AS user_phone,
             (s.user_id IS NULL)                                                         AS is_guest,
             st.first_name                                                               AS staff_first_name,
             st.last_name                                                                AS staff_last_name,
             st.avatar_url                                                               AS staff_user_avatar_url,
             sp.display_name                                                             AS staff_display_name,
             sp.avatar_slug                                                              AS staff_avatar_slug,
             (SELECT COUNT(*) FROM live_chat_messages m
                WHERE m.session_id = s.id AND m.sender_role = 'user' AND m.read_at IS NULL)::int
               AS unread_user_messages
        FROM live_chat_sessions s
        LEFT JOIN users u ON u.id = s.user_id
        LEFT JOIN users st ON st.id = s.assigned_staff_id
        LEFT JOIN staff_profiles sp ON sp.user_id = s.assigned_staff_id
       WHERE UPPER(COALESCE(s.support_code, '')) LIKE ${codeLike}
          OR UPPER(REPLACE(s.id::text, '-', '')) LIKE ${suffixLike}
          OR COALESCE(u.first_name, '') ILIKE ${likePattern}
          OR COALESCE(u.last_name, '') ILIKE ${likePattern}
          OR COALESCE(u.email, '') ILIKE ${likePattern}
          OR COALESCE(s.guest_name, '') ILIKE ${likePattern}
          OR COALESCE(s.guest_email, '') ILIKE ${likePattern}
          OR COALESCE(s.initial_topic, '') ILIKE ${likePattern}
       ORDER BY
         CASE WHEN UPPER(COALESCE(s.support_code, '')) = ${normalizedCode} THEN 0 ELSE 1 END ASC,
         s.last_activity_at DESC
       LIMIT 20
    `) as RawQueueRow[]
    searchResults = found.map(mapQueueRow)
  }

  return {
    waiting: waiting.map(mapQueueRow),
    mine: mine.map(mapQueueRow),
    others: others.map(mapQueueRow),
    searchResults,
  }
}

export interface AdminOversightItem extends LiveChatSession {
  support_code: string
  user_first_name: string
  user_last_name: string
  user_email: string
  user_phone: string | null
  user_avatar_url: string | null
  is_guest: boolean
  staff_id: string | null
  staff_first_name: string | null
  staff_last_name: string | null
  staff_display_name?: string | null
  staff_avatar_slug: string | null
  staff_avatar_url: string | null
  rating: number | null
  last_message_at: string | null
  unread_for_staff: number
  staff_response_seconds: number | null
  resolution_seconds: number | null
  message_count: number
}

function hydrateAdminOversightRow(
  row: AdminOversightItem & { staff_user_avatar_url?: string | null },
): AdminOversightItem {
  return {
    ...row,
    support_code: resolveSupportId(row.support_code, row.id),
    staff_avatar_url: row.staff_id
      ? resolveStaffAvatarUrl({
          avatarUrl: row.staff_user_avatar_url || row.staff_avatar_url,
          avatarSlug: row.staff_avatar_slug,
          staffId: row.staff_id,
        })
      : null,
  }
}

export async function getAllSessions(
  filter: 'all' | 'open' | LiveChatStatus = 'all',
  days?: number,
): Promise<AdminOversightItem[]> {
  await ensureLiveChatSupportCodeColumn()
  const safeDays =
    typeof days === 'number' && Number.isFinite(days) && days > 0
      ? Math.min(Math.floor(days), 365)
      : null

  const rows =
    filter === 'open'
      ? await sql`
          SELECT s.*,
                 s.assigned_staff_id                                                   AS staff_id,
                 COALESCE(u.first_name, split_part(s.guest_name, ' ', 1), 'Guest')     AS user_first_name,
                 COALESCE(u.last_name,
                          NULLIF(regexp_replace(s.guest_name, '^\\S+\\s*', ''), ''),
                          '')                                                           AS user_last_name,
                 COALESCE(u.email, s.guest_email)                                      AS user_email,
                 COALESCE(u.phone, s.guest_phone)                                      AS user_phone,
                 u.avatar_url                                                          AS user_avatar_url,
                 (s.user_id IS NULL)                                                   AS is_guest,
                 st.first_name                                                         AS staff_first_name,
                 st.last_name                                                          AS staff_last_name,
                 sp.display_name                                                       AS staff_display_name,
                 st.avatar_url                                                         AS staff_user_avatar_url,
                 sp.avatar_slug                                                        AS staff_avatar_slug,
                 CASE WHEN NULLIF(TRIM(st.avatar_url), '') IS NOT NULL
                      THEN TRIM(st.avatar_url)
                      WHEN sp.avatar_slug IS NOT NULL
                      THEN '/avatars/' || sp.avatar_slug || '.jpg'
                      ELSE NULL END                                                    AS staff_avatar_url,
                 s.service_rating                                                      AS rating,
                 s.last_activity_at                                                    AS last_message_at,
                 (SELECT COUNT(*) FROM live_chat_messages m
                    WHERE m.session_id = s.id AND m.sender_role = 'user' AND m.read_at IS NULL)::int
                   AS unread_for_staff,
                 EXTRACT(EPOCH FROM (s.first_reply_at - COALESCE(s.accepted_at, s.escalated_at)))::float
                   AS staff_response_seconds,
                 EXTRACT(EPOCH FROM (s.closed_at - s.escalated_at))::float
                   AS resolution_seconds,
                 (SELECT COUNT(*) FROM live_chat_messages m WHERE m.session_id = s.id)::int
                   AS message_count
            FROM live_chat_sessions s
            LEFT JOIN users u ON u.id = s.user_id
            LEFT JOIN users st ON st.id = s.assigned_staff_id
            LEFT JOIN staff_profiles sp ON sp.user_id = s.assigned_staff_id
           WHERE s.status IN ('waiting', 'active')
           ORDER BY
             CASE WHEN s.status = 'waiting' THEN 0 ELSE 1 END ASC,
             s.last_activity_at DESC
           LIMIT 100
        `
      : filter === 'all'
        ? await sql`
            SELECT s.*,
                   s.assigned_staff_id                                                   AS staff_id,
                   COALESCE(u.first_name, split_part(s.guest_name, ' ', 1), 'Guest')     AS user_first_name,
                   COALESCE(u.last_name,
                            NULLIF(regexp_replace(s.guest_name, '^\\S+\\s*', ''), ''),
                            '')                                                           AS user_last_name,
                   COALESCE(u.email, s.guest_email)                                      AS user_email,
                   COALESCE(u.phone, s.guest_phone)                                      AS user_phone,
                   u.avatar_url                                                          AS user_avatar_url,
                   (s.user_id IS NULL)                                                   AS is_guest,
                   st.first_name                                                         AS staff_first_name,
                   st.last_name                                                          AS staff_last_name,
                   sp.display_name                                                       AS staff_display_name,
                   st.avatar_url                                                         AS staff_user_avatar_url,
                   sp.avatar_slug                                                        AS staff_avatar_slug,
                   CASE WHEN NULLIF(TRIM(st.avatar_url), '') IS NOT NULL
                        THEN TRIM(st.avatar_url)
                        WHEN sp.avatar_slug IS NOT NULL
                        THEN '/avatars/' || sp.avatar_slug || '.jpg'
                        ELSE NULL END                                                    AS staff_avatar_url,
                   s.service_rating                                                      AS rating,
                   s.last_activity_at                                                    AS last_message_at,
                   (SELECT COUNT(*) FROM live_chat_messages m
                      WHERE m.session_id = s.id AND m.sender_role = 'user' AND m.read_at IS NULL)::int
                     AS unread_for_staff,
                   EXTRACT(EPOCH FROM (s.first_reply_at - COALESCE(s.accepted_at, s.escalated_at)))::float
                     AS staff_response_seconds,
                   EXTRACT(EPOCH FROM (s.closed_at - s.escalated_at))::float
                     AS resolution_seconds,
                   (SELECT COUNT(*) FROM live_chat_messages m WHERE m.session_id = s.id)::int
                     AS message_count
              FROM live_chat_sessions s
              LEFT JOIN users u ON u.id = s.user_id
              LEFT JOIN users st ON st.id = s.assigned_staff_id
              LEFT JOIN staff_profiles sp ON sp.user_id = s.assigned_staff_id
             WHERE (${safeDays}::int IS NULL OR s.created_at >= NOW() - make_interval(days => COALESCE(${safeDays}::int, 30)))
             ORDER BY s.last_activity_at DESC
             LIMIT 100
          `
        : await sql`
            SELECT s.*,
                   s.assigned_staff_id                                                   AS staff_id,
                   COALESCE(u.first_name, split_part(s.guest_name, ' ', 1), 'Guest')     AS user_first_name,
                   COALESCE(u.last_name,
                            NULLIF(regexp_replace(s.guest_name, '^\\S+\\s*', ''), ''),
                            '')                                                           AS user_last_name,
                   COALESCE(u.email, s.guest_email)                                      AS user_email,
                   COALESCE(u.phone, s.guest_phone)                                      AS user_phone,
                   u.avatar_url                                                          AS user_avatar_url,
                   (s.user_id IS NULL)                                                   AS is_guest,
                   st.first_name                                                         AS staff_first_name,
                   st.last_name                                                          AS staff_last_name,
                   sp.display_name                                                       AS staff_display_name,
                   st.avatar_url                                                         AS staff_user_avatar_url,
                   sp.avatar_slug                                                        AS staff_avatar_slug,
                   CASE WHEN NULLIF(TRIM(st.avatar_url), '') IS NOT NULL
                        THEN TRIM(st.avatar_url)
                        WHEN sp.avatar_slug IS NOT NULL
                        THEN '/avatars/' || sp.avatar_slug || '.jpg'
                        ELSE NULL END                                                    AS staff_avatar_url,
                   s.service_rating                                                      AS rating,
                   s.last_activity_at                                                    AS last_message_at,
                   (SELECT COUNT(*) FROM live_chat_messages m
                      WHERE m.session_id = s.id AND m.sender_role = 'user' AND m.read_at IS NULL)::int
                     AS unread_for_staff,
                   EXTRACT(EPOCH FROM (s.first_reply_at - COALESCE(s.accepted_at, s.escalated_at)))::float
                     AS staff_response_seconds,
                   EXTRACT(EPOCH FROM (s.closed_at - s.escalated_at))::float
                     AS resolution_seconds,
                   (SELECT COUNT(*) FROM live_chat_messages m WHERE m.session_id = s.id)::int
                     AS message_count
              FROM live_chat_sessions s
              LEFT JOIN users u ON u.id = s.user_id
              LEFT JOIN users st ON st.id = s.assigned_staff_id
              LEFT JOIN staff_profiles sp ON sp.user_id = s.assigned_staff_id
             WHERE s.status = ${filter}
               AND (${safeDays}::int IS NULL OR s.created_at >= NOW() - make_interval(days => COALESCE(${safeDays}::int, 30)))
             ORDER BY s.last_activity_at DESC
             LIMIT 100
          `
  return (rows as Array<AdminOversightItem & { staff_user_avatar_url?: string | null }>).map(
    hydrateAdminOversightRow,
  )
}

export interface StaffPerformanceRow {
  staff_id: string
  first_name: string
  last_name: string
  avatar_slug: string | null
  avatar_url: string | null
  status: string | null
  handled: number
  active_now: number
  total_chats: number
  active_chats: number
  closed_chats: number
  avg_accept_seconds: number | null
  avg_response_seconds: number | null
  avg_resolution_seconds: number | null
  avg_handle_seconds: number | null
  avg_service_rating: number | null
  avg_staff_rating: number | null
  avg_rating: number | null
  rated_count: number
  ratings_count: number
}

export async function getStaffPerformance(days = 30): Promise<StaffPerformanceRow[]> {
  const safeDays =
    typeof days === 'number' && Number.isFinite(days) && days > 0
      ? Math.min(Math.floor(days), 365)
      : 30

  const rows = (await sql`
    SELECT
      u.id            AS staff_id,
      u.first_name    AS first_name,
      u.last_name     AS last_name,
      sp.avatar_slug  AS avatar_slug,
      CASE WHEN NULLIF(TRIM(u.avatar_url), '') IS NOT NULL
           THEN TRIM(u.avatar_url)
           WHEN sp.avatar_slug IS NOT NULL
           THEN '/avatars/' || sp.avatar_slug || '.jpg'
           ELSE NULL END                                                               AS avatar_url,
      sp.status       AS status,
      COUNT(s.id)::int                                                                 AS handled,
      COUNT(s.id) FILTER (WHERE s.status = 'active')::int                              AS active_now,
      COUNT(s.id)::int                                                                 AS total_chats,
      COUNT(s.id) FILTER (WHERE s.status = 'active')::int                              AS active_chats,
      COUNT(s.id) FILTER (WHERE s.status = 'closed')::int                              AS closed_chats,
      AVG(EXTRACT(EPOCH FROM (s.accepted_at - s.escalated_at)))::float                 AS avg_accept_seconds,
      AVG(EXTRACT(EPOCH FROM (s.first_reply_at - COALESCE(s.accepted_at, s.escalated_at))))::float AS avg_response_seconds,
      AVG(EXTRACT(EPOCH FROM (s.closed_at - s.escalated_at)))::float                   AS avg_resolution_seconds,
      AVG(EXTRACT(EPOCH FROM (s.closed_at - s.accepted_at)))::float                    AS avg_handle_seconds,
      AVG(s.service_rating)::float                                                     AS avg_service_rating,
      AVG(s.staff_rating)::float                                                       AS avg_staff_rating,
      AVG(s.staff_rating)::float                                                       AS avg_rating,
      COUNT(s.id) FILTER (WHERE s.staff_rating IS NOT NULL)::int                       AS rated_count,
      COUNT(s.id) FILTER (WHERE s.staff_rating IS NOT NULL)::int                       AS ratings_count
    FROM users u
    LEFT JOIN staff_profiles sp ON sp.user_id = u.id
    LEFT JOIN live_chat_sessions s
      ON s.assigned_staff_id = u.id
     AND s.created_at >= NOW() - make_interval(days => ${safeDays})
   WHERE u.role IN ('staff', 'admin')
   GROUP BY u.id, u.avatar_url, sp.avatar_slug, sp.status
   ORDER BY handled DESC, u.first_name ASC
  `) as StaffPerformanceRow[]

  return rows.map((r) => ({
    ...r,
    avatar_url: resolveStaffAvatarUrl({
      avatarUrl: r.avatar_url,
      avatarSlug: r.avatar_slug,
      staffId: r.staff_id,
    }),
  }))
}

export interface FullSessionMessage extends LiveChatMessage {
  sender_first_name: string | null
  sender_last_name: string | null
}

export interface FullSessionView {
  session: AdminOversightItem
  messages: FullSessionMessage[]
}

export async function getFullSessionView(sessionId: string): Promise<FullSessionView | null> {
  await ensureLiveChatSupportCodeColumn()
  const resolved = await getSessionById(sessionId)
  if (!resolved) return null

  const sessions = await sql`
    SELECT s.*,
           s.assigned_staff_id                                                   AS staff_id,
           COALESCE(u.first_name, split_part(s.guest_name, ' ', 1), 'Guest')     AS user_first_name,
           COALESCE(u.last_name,
                    NULLIF(regexp_replace(s.guest_name, '^\\S+\\s*', ''), ''),
                    '')                                                           AS user_last_name,
           COALESCE(u.email, s.guest_email)                                      AS user_email,
           COALESCE(u.phone, s.guest_phone)                                      AS user_phone,
           u.avatar_url                                                          AS user_avatar_url,
           (s.user_id IS NULL)                                                   AS is_guest,
           st.first_name                                                         AS staff_first_name,
           st.last_name                                                          AS staff_last_name,
           sp.display_name                                                       AS staff_display_name,
           st.avatar_url                                                         AS staff_user_avatar_url,
           sp.avatar_slug                                                        AS staff_avatar_slug,
           CASE WHEN NULLIF(TRIM(st.avatar_url), '') IS NOT NULL
                THEN TRIM(st.avatar_url)
                WHEN sp.avatar_slug IS NOT NULL
                THEN '/avatars/' || sp.avatar_slug || '.jpg'
                ELSE NULL END                                                    AS staff_avatar_url,
           s.service_rating                                                      AS rating,
           s.last_activity_at                                                    AS last_message_at,
           (SELECT COUNT(*) FROM live_chat_messages m
              WHERE m.session_id = s.id AND m.sender_role = 'user' AND m.read_at IS NULL)::int
             AS unread_for_staff,
           EXTRACT(EPOCH FROM (s.first_reply_at - COALESCE(s.accepted_at, s.escalated_at)))::float
             AS staff_response_seconds,
           EXTRACT(EPOCH FROM (s.closed_at - s.escalated_at))::float
             AS resolution_seconds,
           (SELECT COUNT(*) FROM live_chat_messages m WHERE m.session_id = s.id)::int
             AS message_count
      FROM live_chat_sessions s
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN users st ON st.id = s.assigned_staff_id
      LEFT JOIN staff_profiles sp ON sp.user_id = s.assigned_staff_id
     WHERE s.id = ${resolved.id}
  `
  if (sessions.length === 0) return null

  const messages = (await sql`
    SELECT m.*,
           CASE
             WHEN m.sender_role = 'user' THEN COALESCE(u.first_name, split_part(s.guest_name, ' ', 1), 'Guest')
             WHEN m.sender_role = 'staff' THEN COALESCE(NULLIF(TRIM(sp.display_name), ''), u.first_name, 'Rep')
             ELSE NULL
           END AS sender_first_name,
           CASE
             WHEN m.sender_role = 'user' THEN COALESCE(u.last_name, '')
             WHEN m.sender_role = 'staff' AND NULLIF(TRIM(sp.display_name), '') IS NOT NULL THEN NULL
             WHEN m.sender_role = 'staff' THEN u.last_name
             ELSE NULL
           END AS sender_last_name,
           u.avatar_url AS u_avatar_url,
           sp.avatar_slug AS sp_avatar_slug
      FROM live_chat_messages m
      JOIN live_chat_sessions s ON s.id = m.session_id
      LEFT JOIN users u ON u.id = m.sender_id
      LEFT JOIN staff_profiles sp ON sp.user_id = m.sender_id AND m.sender_role = 'staff'
     WHERE m.session_id = ${resolved.id}
     ORDER BY m.created_at ASC
  `) as Array<
    FullSessionMessage & { u_avatar_url: string | null; sp_avatar_slug: string | null }
  >

  return {
    session: hydrateAdminOversightRow(
      sessions[0] as AdminOversightItem & { staff_user_avatar_url?: string | null },
    ),
    messages: messages.map((m) => ({
      id: m.id,
      session_id: m.session_id,
      sender_role: m.sender_role,
      sender_id: m.sender_id,
      body: m.body,
      read_at: m.read_at,
      created_at: m.created_at,
      sender_first_name: m.sender_first_name,
      sender_last_name: m.sender_last_name,
      sender_name:
        [m.sender_first_name, m.sender_last_name].filter(Boolean).join(' ').trim() || null,
      sender_avatar_url:
        m.sender_role === 'staff'
          ? resolveStaffAvatarUrl({
              avatarUrl: m.u_avatar_url,
              avatarSlug: m.sp_avatar_slug,
              staffId: m.sender_id,
            })
          : m.u_avatar_url || null,
    })),
  }
}

// Resolve a friendly display label for a staff member. We prefer the
// staff_profiles.display_name override if set, then fall back to
// "First L." (so we never expose a full surname to a customer).
export function staffDisplayName(opts: {
  display_name?: string | null
  first_name?: string | null
  last_name?: string | null
}): string {
  if (opts.display_name && opts.display_name.trim()) return opts.display_name.trim()
  const first = (opts.first_name || '').trim()
  const last = (opts.last_name || '').trim()
  if (first && last) return `${first} ${last.charAt(0)}.`
  return first || 'Customer Care'
}

/**
 * Emails a clean, styled Dermaspace transcript of a live chat session to the
 * customer (logged-in or guest) once the conversation ends. Idempotent via
 * `transcript_sent_at` unless `options.force` is explicitly true.
 */
export async function dispatchLiveChatTranscriptEmail(
  sessionId: string,
  options?: { force?: boolean },
): Promise<boolean> {
  try {
    await ensureLiveChatSupportCodeColumn()
    const view = await getFullSessionView(sessionId)
    if (!view) return false

    const recipientEmail = (view.session.user_email || view.session.guest_email || '').trim()
    if (!recipientEmail || isPlaceholderEmail(recipientEmail)) {
      return false
    }

    const meaningfulMessages = view.messages.filter(
      (m) => m.sender_role === 'user' || m.sender_role === 'staff',
    )
    if (meaningfulMessages.length === 0) {
      return false
    }

    if (!options?.force) {
      const sentCheck = (await sql`
        SELECT transcript_sent_at
          FROM live_chat_sessions
         WHERE id = ${view.session.id}
         LIMIT 1
      `) as Array<{ transcript_sent_at: string | null }>
      if (sentCheck[0]?.transcript_sent_at) {
        return false
      }
    }

    const representatives: string[] = []
    for (const m of view.messages) {
      if (m.sender_role === 'staff' && m.sender_name) {
        representatives.push(m.sender_name)
      }
    }
    if (view.session.staff_display_name) {
      representatives.push(view.session.staff_display_name)
    } else if (view.session.staff_first_name) {
      representatives.push(
        staffDisplayName({
          first_name: view.session.staff_first_name,
          last_name: view.session.staff_last_name,
        }),
      )
    }

    const supportCode = resolveSupportId(view.session.support_code, view.session.id)
    const filteredMessages = view.messages
      .filter(
        (m) =>
          !(
            m.sender_role === 'system' &&
            /will be with you shortly/i.test(m.body)
          ),
      )
      .map((m) => ({
        senderRole: m.sender_role,
        senderName: m.sender_name,
        body: m.body,
        createdAt: m.created_at,
      }))

    const sent = await sendLiveChatTranscriptEmail({
      email: recipientEmail,
      firstName: view.session.user_first_name || 'there',
      supportCode,
      topic: view.session.initial_topic,
      startedAt: view.session.escalated_at || view.session.created_at,
      closedAt: view.session.closed_at || new Date().toISOString(),
      representatives,
      messages: filteredMessages,
    })

    if (sent) {
      await sql`
        UPDATE live_chat_sessions
           SET transcript_sent_at = NOW()
         WHERE id = ${view.session.id}
      `.catch(() => {})
    }

    return sent
  } catch (err) {
    console.error('[live-chat] dispatchLiveChatTranscriptEmail failed:', err)
    return false
  }
}
