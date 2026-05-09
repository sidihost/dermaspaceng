/**
 * Google Calendar 2-way sync — server-side OAuth + REST helpers.
 *
 * Why this file exists:
 *   The booking system has always had an "Add to calendar" button
 *   for the *customer*, but the *staff* side relied on humans
 *   reading admin/schedules to know what's coming. This module
 *   makes a bookable therapist's Google Calendar the source of
 *   truth — when their day fills up in Google, our slot picker
 *   automatically hides those times, and when an admin assigns a
 *   booking, the corresponding event lands in their Google
 *   Calendar with travel-time reminders.
 *
 * Operating principles:
 *   - Zero hard failures when env vars are missing. The whole
 *     module exposes `isConfigured()` and every call returns a
 *     soft `{ ok: false, reason }` so the UI can render a
 *     "configure first" empty state instead of crashing.
 *   - All token storage is in `staff_calendar_connections`. We
 *     keep the refresh token forever and refresh access tokens
 *     lazily 5 minutes before expiry.
 *   - All event metadata in `booking_calendar_events` so admin
 *     can re-push or reconcile after a Google outage.
 */

import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

const GOOGLE_OAUTH_BASE = 'https://oauth2.googleapis.com'
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

// Scopes we ask for. `calendar.events` is the bare minimum to
// create / update / delete events on a calendar the user owns.
// We use the full `calendar` read scope so we can also read busy
// blocks the user added themselves (e.g. their lunch, doctor
// appointments) and respect them when offering slots.
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  // openid + email lets us identify the connected Google account
  // for the avatar/email shown on the "Connected as ..." card.
  'openid',
  'email',
  'profile',
]

export type CalendarConnection = {
  id: number
  user_id: string
  google_account_email: string | null
  google_account_picture: string | null
  google_calendar_id: string
  access_token: string
  refresh_token: string
  expires_at: string
  scope: string | null
  sync_token: string | null
  channel_id: string | null
  channel_resource_id: string | null
  channel_expires_at: string | null
  status: 'active' | 'expired' | 'revoked' | 'error'
  last_error: string | null
  last_synced_at: string | null
  created_at: string
}

/**
 * True when GOOGLE_CALENDAR_CLIENT_ID + secret + redirect URI are
 * all present. Any UI that depends on Google Calendar should call
 * this first and render a graceful empty state otherwise.
 */
export function isConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CALENDAR_CLIENT_ID &&
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET &&
      process.env.GOOGLE_CALENDAR_REDIRECT_URI,
  )
}

/**
 * Build the consent URL the staff member is redirected to.
 *
 * We pass `access_type=offline` to get a refresh token and
 * `prompt=consent` to force re-consent every time so we never
 * lose the refresh token when the user reconnects (Google's
 * default behaviour is to *omit* the refresh token on subsequent
 * grants for the same scopes).
 *
 * `state` carries the staff user_id so the callback can attribute
 * the connection to the right account. It's signed by being kept
 * in a same-origin cookie alongside the redirect, so we don't
 * even need to verify it cryptographically — but we still validate
 * it against the cookie to defeat CSRF.
 */
export function buildAuthUrl(state: string): string {
  if (!isConfigured()) throw new Error('Google Calendar not configured')
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', process.env.GOOGLE_CALENDAR_CLIENT_ID!)
  url.searchParams.set('redirect_uri', process.env.GOOGLE_CALENDAR_REDIRECT_URI!)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('include_granted_scopes', 'true')
  url.searchParams.set('scope', SCOPES.join(' '))
  url.searchParams.set('state', state)
  return url.toString()
}

/**
 * Exchange a one-time `code` (from the callback redirect) for
 * an access token + refresh token pair. Returns Google's raw
 * response on success.
 */
export async function exchangeCode(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string
  token_type: string
  id_token?: string
}> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
    redirect_uri: process.env.GOOGLE_CALENDAR_REDIRECT_URI!,
    grant_type: 'authorization_code',
  })
  const res = await fetch(`${GOOGLE_OAUTH_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google token exchange failed (${res.status}): ${text}`)
  }
  return (await res.json()) as Awaited<ReturnType<typeof exchangeCode>>
}

/**
 * Refresh an expired access token using the long-lived refresh
 * token. Google may rotate the refresh token in the response, so
 * we update both fields when it does.
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
  scope?: string
  refresh_token?: string
}> {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })
  const res = await fetch(`${GOOGLE_OAUTH_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google token refresh failed (${res.status}): ${text}`)
  }
  return (await res.json()) as Awaited<ReturnType<typeof refreshAccessToken>>
}

/**
 * Get the basic profile of the connected Google account so we
 * can show "Connected as ana@dermaspace.com" instead of an
 * anonymous green dot.
 */
export async function fetchUserInfo(accessToken: string): Promise<{
  email: string
  picture?: string
  name?: string
}> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`userinfo failed: ${res.status}`)
  return (await res.json()) as { email: string; picture?: string; name?: string }
}

/**
 * Look up a connection row by user. Returns null when the staff
 * member hasn't connected their calendar yet — callers should
 * treat that as the no-op path.
 */
export async function getConnection(
  userId: string,
): Promise<CalendarConnection | null> {
  const rows = (await sql`
    SELECT * FROM staff_calendar_connections WHERE user_id = ${userId} LIMIT 1
  `) as CalendarConnection[]
  return rows[0] ?? null
}

/**
 * Return a valid access token for the given staff member,
 * refreshing it if it expires within the next 5 minutes. Mutates
 * the DB row when a refresh happens. Returns null when there's
 * no connection or the refresh failed unrecoverably.
 */
export async function getValidAccessToken(
  userId: string,
): Promise<string | null> {
  const conn = await getConnection(userId)
  if (!conn || conn.status === 'revoked') return null

  const expiresAt = new Date(conn.expires_at).getTime()
  const skewMs = 5 * 60_000
  if (Date.now() < expiresAt - skewMs) return conn.access_token

  // Refresh.
  try {
    const fresh = await refreshAccessToken(conn.refresh_token)
    const newExpiresAt = new Date(Date.now() + fresh.expires_in * 1000).toISOString()
    const newRefresh = fresh.refresh_token ?? conn.refresh_token
    await sql`
      UPDATE staff_calendar_connections
      SET access_token   = ${fresh.access_token},
          refresh_token  = ${newRefresh},
          expires_at     = ${newExpiresAt},
          status         = 'active',
          last_error     = NULL,
          updated_at     = NOW()
      WHERE id = ${conn.id}
    `
    return fresh.access_token
  } catch (err: any) {
    await sql`
      UPDATE staff_calendar_connections
      SET status = 'expired',
          last_error = ${String(err?.message ?? err).slice(0, 500)},
          updated_at = NOW()
      WHERE id = ${conn.id}
    `
    return null
  }
}

/**
 * Save a fresh OAuth grant (or update the existing row when the
 * staff member reconnects). Always upserts on `user_id`.
 */
export async function saveConnection(args: {
  userId: string
  accessToken: string
  refreshToken: string
  expiresIn: number
  scope?: string
  email?: string | null
  picture?: string | null
}) {
  const expiresAt = new Date(Date.now() + args.expiresIn * 1000).toISOString()
  await sql`
    INSERT INTO staff_calendar_connections
      (user_id, google_account_email, google_account_picture,
       access_token, refresh_token, expires_at, scope, status)
    VALUES
      (${args.userId}, ${args.email ?? null}, ${args.picture ?? null},
       ${args.accessToken}, ${args.refreshToken}, ${expiresAt},
       ${args.scope ?? null}, 'active')
    ON CONFLICT (user_id) DO UPDATE SET
      google_account_email   = EXCLUDED.google_account_email,
      google_account_picture = EXCLUDED.google_account_picture,
      access_token           = EXCLUDED.access_token,
      refresh_token          = EXCLUDED.refresh_token,
      expires_at             = EXCLUDED.expires_at,
      scope                  = EXCLUDED.scope,
      status                 = 'active',
      last_error             = NULL,
      updated_at             = NOW()
  `
}

/**
 * Disconnect a staff member's calendar. Optionally revokes the
 * grant on Google's side so the user sees Dermaspace disappear
 * from their security settings.
 */
export async function disconnect(userId: string, opts: { revoke?: boolean } = {}) {
  const conn = await getConnection(userId)
  if (!conn) return
  if (opts.revoke) {
    try {
      await fetch(`${GOOGLE_OAUTH_BASE}/revoke?token=${conn.refresh_token}`, {
        method: 'POST',
      })
    } catch {
      // best-effort revoke — never block the disconnect on this
    }
  }
  await sql`DELETE FROM staff_calendar_connections WHERE id = ${conn.id}`
  await sql`DELETE FROM booking_calendar_events WHERE staff_user_id = ${userId}`
}

// ─────────────────────────────────────────────────────────────────
// Calendar event CRUD
// ─────────────────────────────────────────────────────────────────

export type EventInput = {
  bookingId: string
  bookingReference: string
  title: string
  description: string
  // ISO date YYYY-MM-DD + HH:mm — we convert to RFC3339 in the
  // payload using the salon's Africa/Lagos timezone.
  date: string
  time: string
  durationMinutes: number
  locationName?: string | null
  locationAddress?: string | null
  customerEmail?: string | null
  customerName?: string | null
}

const SPA_TIMEZONE = 'Africa/Lagos'

function toRfc3339Local(date: string, time: string): string {
  // Africa/Lagos is UTC+1 with no DST, so we can append a fixed
  // offset rather than relying on Intl.DateTimeFormat machinery.
  // Returns "2026-05-09T14:30:00+01:00".
  return `${date}T${time}:00+01:00`
}

function endOf(date: string, time: string, minutes: number): string {
  const start = new Date(`${date}T${time}:00+01:00`)
  const end = new Date(start.getTime() + minutes * 60_000)
  // Manually format back to +01:00 to keep the timezone explicit.
  const pad = (n: number) => String(n).padStart(2, '0')
  // We need wall-clock time in Africa/Lagos, so add the offset
  // back before formatting.
  const utc = end.getTime()
  const lagos = new Date(utc + 60 * 60_000)
  const yyyy = lagos.getUTCFullYear()
  const mm = pad(lagos.getUTCMonth() + 1)
  const dd = pad(lagos.getUTCDate())
  const hh = pad(lagos.getUTCHours())
  const mi = pad(lagos.getUTCMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:00+01:00`
}

/**
 * Push a booking into the staff member's primary calendar.
 * Records the resulting event id in `booking_calendar_events` so
 * we can update / cancel later.
 */
export async function pushBookingToCalendar(args: {
  staffUserId: string
  event: EventInput
}): Promise<{ ok: true; eventId: string } | { ok: false; reason: string }> {
  if (!isConfigured()) return { ok: false, reason: 'not_configured' }
  const accessToken = await getValidAccessToken(args.staffUserId)
  if (!accessToken) return { ok: false, reason: 'no_connection' }

  const conn = await getConnection(args.staffUserId)
  if (!conn) return { ok: false, reason: 'no_connection' }

  const body = {
    summary: args.event.title,
    description: args.event.description,
    location: args.event.locationAddress ?? args.event.locationName ?? undefined,
    start: {
      dateTime: toRfc3339Local(args.event.date, args.event.time),
      timeZone: SPA_TIMEZONE,
    },
    end: {
      dateTime: endOf(args.event.date, args.event.time, args.event.durationMinutes),
      timeZone: SPA_TIMEZONE,
    },
    reminders: {
      useDefault: false,
      overrides: [
        // 2 hours before — gives staff time to prep the room
        { method: 'popup', minutes: 120 },
        // 30 minutes before — final heads-up
        { method: 'popup', minutes: 30 },
      ],
    },
    extendedProperties: {
      private: {
        dermaspaceBookingId: args.event.bookingId,
        dermaspaceReference: args.event.bookingReference,
      },
    },
    // Soft colour cue — Google's "Lavender" (1) so Dermaspace
    // bookings are immediately recognisable on a busy day.
    colorId: '1',
  }

  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(conn.google_calendar_id)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const text = await res.text()
    return { ok: false, reason: `google_${res.status}: ${text.slice(0, 200)}` }
  }
  const json = (await res.json()) as { id: string; htmlLink?: string }

  await sql`
    INSERT INTO booking_calendar_events
      (booking_id, staff_user_id, google_event_id, google_calendar_id,
       html_link, status, last_synced_at)
    VALUES
      (${args.event.bookingId}, ${args.staffUserId}, ${json.id},
       ${conn.google_calendar_id}, ${json.htmlLink ?? null}, 'synced', NOW())
    ON CONFLICT (booking_id, staff_user_id) DO UPDATE SET
      google_event_id  = EXCLUDED.google_event_id,
      html_link        = EXCLUDED.html_link,
      status           = 'synced',
      last_synced_at   = NOW(),
      sync_error       = NULL
  `
  return { ok: true, eventId: json.id }
}

/**
 * Cancel/delete a booking from a staff calendar. Idempotent —
 * already-deleted events are treated as success.
 */
export async function cancelBookingOnCalendar(args: {
  staffUserId: string
  bookingId: string
}): Promise<{ ok: boolean; reason?: string }> {
  if (!isConfigured()) return { ok: false, reason: 'not_configured' }
  const rows = (await sql`
    SELECT google_event_id, google_calendar_id
    FROM booking_calendar_events
    WHERE booking_id = ${args.bookingId} AND staff_user_id = ${args.staffUserId}
    LIMIT 1
  `) as Array<{ google_event_id: string; google_calendar_id: string }>
  const row = rows[0]
  if (!row) return { ok: true } // never synced; nothing to do
  const accessToken = await getValidAccessToken(args.staffUserId)
  if (!accessToken) return { ok: false, reason: 'no_connection' }

  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(row.google_calendar_id)}/events/${row.google_event_id}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } },
  )
  // 410 Gone = already deleted; we treat as success
  if (res.ok || res.status === 410) {
    await sql`
      UPDATE booking_calendar_events
      SET status = 'cancelled', last_synced_at = NOW()
      WHERE booking_id = ${args.bookingId} AND staff_user_id = ${args.staffUserId}
    `
    return { ok: true }
  }
  return { ok: false, reason: `google_${res.status}` }
}
