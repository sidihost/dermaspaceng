import { sql } from '@/lib/db'
import { invalidateAdminStats } from '@/lib/stats-cache'

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
}

export interface LiveChatMessage {
  id: string
  session_id: string
  sender_role: SenderRole
  sender_id: string | null
  body: string
  read_at: string | null
  created_at: string
}

// Curated pool of front-desk avatars. Female-only per the product brief.
// Keep this in sync with /lib/spa-avatars.ts (the f-prefixed entries).
export const FRONT_DESK_AVATAR_POOL = [
  'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11',
] as const

export function avatarUrlForSlug(slug: string | null | undefined): string {
  const s = slug && FRONT_DESK_AVATAR_POOL.includes(slug as (typeof FRONT_DESK_AVATAR_POOL)[number])
    ? slug
    : 'f1'
  return `/avatars/${s}.jpg`
}

// Deterministic avatar pick for a given staff user id. Hashes the id so
// every staff member gets a stable, distinct avatar without us having
// to seed the staff_profiles table eagerly.
export function pickDefaultAvatarSlug(userId: string): string {
  let acc = 0
  for (let i = 0; i < userId.length; i++) acc = (acc + userId.charCodeAt(i)) % 997
  return FRONT_DESK_AVATAR_POOL[acc % FRONT_DESK_AVATAR_POOL.length]
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
export async function touchStaffPresence(userId: string, status: 'online' | 'offline' | 'busy' = 'online') {
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
  const rows = await sql`
    SELECT * FROM live_chat_sessions
     WHERE user_id = ${userId}
       AND status IN ('waiting', 'active')
     ORDER BY created_at DESC
     LIMIT 1
  `
  return (rows[0] as LiveChatSession) || null
}

// Find a recently closed (last 30 minutes) session that hasn't been rated
// or skipped yet so the customer overlay prompts for post-chat feedback even
// if a staff member closed the session from their console.
export async function getRecentUnratedSessionForUser(userId: string): Promise<LiveChatSession | null> {
  const rows = await sql`
    SELECT * FROM live_chat_sessions
     WHERE user_id = ${userId}
       AND status = 'closed'
       AND rated_at IS NULL
       AND closed_at >= NOW() - INTERVAL '30 minutes'
     ORDER BY closed_at DESC
     LIMIT 1
  `
  return (rows[0] as LiveChatSession) || null
}

export async function getSessionById(id: string): Promise<LiveChatSession | null> {
  const rows = await sql`SELECT * FROM live_chat_sessions WHERE id = ${id}`
  return (rows[0] as LiveChatSession) || null
}

export async function escalateToHuman(
  userId: string,
  initialTopic: string | null,
  aiTranscript: unknown,
): Promise<LiveChatSession> {
  // Reuse an open session if one exists rather than racing two queues.
  const existing = await getOpenSessionForUser(userId)
  if (existing) return existing

  const rows = await sql`
    INSERT INTO live_chat_sessions (user_id, initial_topic, ai_transcript)
    VALUES (${userId}, ${initialTopic}, ${aiTranscript ? JSON.stringify(aiTranscript) : null})
    RETURNING *
  `
  const session = rows[0] as LiveChatSession

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
}): Promise<LiveChatSession> {
  const rows = await sql`
    INSERT INTO live_chat_sessions
      (initial_topic, guest_name, guest_email, guest_phone)
    VALUES
      (${input.initialTopic},
       ${input.name},
       ${input.email.toLowerCase()},
       ${input.phone})
    RETURNING *
  `
  const session = rows[0] as LiveChatSession

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
  return rows[0] as LiveChatMessage
}

export async function getMessages(sessionId: string, sinceIso?: string): Promise<LiveChatMessage[]> {
  const rows = sinceIso
    ? await sql`
        SELECT * FROM live_chat_messages
         WHERE session_id = ${sessionId} AND created_at > ${sinceIso}
         ORDER BY created_at ASC
      `
    : await sql`
        SELECT * FROM live_chat_messages
         WHERE session_id = ${sessionId}
         ORDER BY created_at ASC
      `
  return rows as LiveChatMessage[]
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
  user_first_name: string
  user_last_name: string
  user_avatar_url: string | null
  user_email: string | null
  user_phone: string | null
  is_guest: boolean
  unread_user_messages: number
}

export async function getStaffQueue(staffId: string): Promise<{
  waiting: QueueItem[]
  mine: QueueItem[]
}> {
  const waiting = await sql`
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
  `

  const mine = await sql`
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
     WHERE s.assigned_staff_id = ${staffId}
       AND s.status = 'active'
     ORDER BY s.last_activity_at DESC
     LIMIT 50
  `

  return {
    waiting: waiting as QueueItem[],
    mine: mine as QueueItem[],
  }
}

export interface AdminOversightItem extends LiveChatSession {
  user_first_name: string
  user_last_name: string
  user_email: string
  user_phone: string | null
  user_avatar_url: string | null
  is_guest: boolean
  staff_id: string | null
  staff_first_name: string | null
  staff_last_name: string | null
  staff_avatar_slug: string | null
  staff_avatar_url: string | null
  rating: number | null
  last_message_at: string | null
  unread_for_staff: number
  staff_response_seconds: number | null
  resolution_seconds: number | null
  message_count: number
}

export async function getAllSessions(
  filter: 'all' | 'open' | LiveChatStatus = 'all',
  days?: number,
): Promise<AdminOversightItem[]> {
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
                 sp.avatar_slug                                                        AS staff_avatar_slug,
                 CASE WHEN sp.avatar_slug IS NOT NULL
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
                   sp.avatar_slug                                                        AS staff_avatar_slug,
                   CASE WHEN sp.avatar_slug IS NOT NULL
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
                   sp.avatar_slug                                                        AS staff_avatar_slug,
                   CASE WHEN sp.avatar_slug IS NOT NULL
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
  return rows as AdminOversightItem[]
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

  const rows = await sql`
    SELECT
      u.id            AS staff_id,
      u.first_name    AS first_name,
      u.last_name     AS last_name,
      sp.avatar_slug  AS avatar_slug,
      CASE WHEN sp.avatar_slug IS NOT NULL
           THEN '/avatars/' || sp.avatar_slug || '.jpg'
           ELSE u.avatar_url END                                                       AS avatar_url,
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
  `
  return rows as StaffPerformanceRow[]
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
           sp.avatar_slug                                                        AS staff_avatar_slug,
           CASE WHEN sp.avatar_slug IS NOT NULL
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
     WHERE s.id = ${sessionId}
  `
  if (sessions.length === 0) return null

  const messages = await sql`
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
           END AS sender_last_name
      FROM live_chat_messages m
      JOIN live_chat_sessions s ON s.id = m.session_id
      LEFT JOIN users u ON u.id = m.sender_id
      LEFT JOIN staff_profiles sp ON sp.user_id = m.sender_id AND m.sender_role = 'staff'
     WHERE m.session_id = ${sessionId}
     ORDER BY m.created_at ASC
  `

  return {
    session: sessions[0] as AdminOversightItem,
    messages: messages as FullSessionMessage[],
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
