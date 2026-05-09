-- 540 — Google Calendar 2-way sync + Mood Match recommendations
-- =================================================================
--
-- This migration adds three new capabilities:
--
-- 1. staff_calendar_connections
--    Per-staff Google Calendar OAuth credentials. Stores the
--    refresh token (long-lived) and the most recent access token
--    along with its expiry. We also keep a `sync_token` for
--    Google's incremental sync semantics, plus a push-channel id
--    so we can stop the channel when the user disconnects.
--    `provider` is varchar so we can extend to Outlook later
--    without a schema change.
--
-- 2. booking_calendar_events
--    Mapping between an internal booking and the calendar event
--    we created for the assigned therapist. Lets us update or
--    delete the remote event in lock-step with our DB.
--
-- 3. mood_match_recommendations
--    A lightweight log of every "Mood Match" suggestion we serve
--    to a client. Powers the admin "Pulse" card that shows what
--    moods are trending today, and lets us A/B which ritual
--    bundles convert best.
--
-- All tables use IF NOT EXISTS so re-running is safe.

BEGIN;

CREATE TABLE IF NOT EXISTS staff_calendar_connections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider         VARCHAR(32) NOT NULL DEFAULT 'google',
  -- Google account this is connected to (for display only). May
  -- differ from the staff user's primary email so we keep it
  -- separately rather than relying on users.email.
  account_email    VARCHAR(255) NOT NULL,
  -- Encrypted at the application layer using AES-GCM with a key
  -- derived from SESSION_SECRET. We never store plaintext OAuth
  -- material in the DB.
  refresh_token    TEXT NOT NULL,
  access_token     TEXT,
  access_expires_at TIMESTAMPTZ,
  -- Google `nextSyncToken` — opaque pagination cursor for
  -- incremental sync of remote events back into our DB.
  sync_token       TEXT,
  -- ID of the active push notifications channel (for Watch API).
  -- Stored so we can call channels.stop on disconnect.
  channel_id       TEXT,
  channel_resource_id TEXT,
  channel_expires_at TIMESTAMPTZ,
  -- The Google calendar we write/read events on. Defaults to
  -- the primary calendar of the connected account.
  calendar_id      TEXT NOT NULL DEFAULT 'primary',
  -- When false, we keep the row but skip all syncs. Lets the
  -- admin "pause" sync without losing the OAuth grant.
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  scopes           TEXT,
  last_sync_at     TIMESTAMPTZ,
  last_sync_error  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One active connection per (user, provider). To switch Google
  -- accounts a staff member must disconnect first.
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_staff_cal_connections_user
  ON staff_calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_cal_connections_channel
  ON staff_calendar_connections(channel_id)
  WHERE channel_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS booking_calendar_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  staff_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider     VARCHAR(32) NOT NULL DEFAULT 'google',
  -- Google event id. Combined with the calendar id this uniquely
  -- identifies the remote event.
  event_id     TEXT NOT NULL,
  calendar_id  TEXT NOT NULL DEFAULT 'primary',
  -- Etag for optimistic concurrency on updates. Google rejects
  -- writes whose etag doesn't match the latest version on its
  -- side, which surfaces 3rd-party edits as conflicts.
  etag         TEXT,
  html_link    TEXT,
  meet_link    TEXT,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One mapping per booking + provider. If we ever assign the
  -- same booking to multiple staff we'll relax this.
  UNIQUE(booking_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_booking_cal_events_staff
  ON booking_calendar_events(staff_id);

CREATE TABLE IF NOT EXISTS mood_match_recommendations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Anonymous traffic is fine — user_id may be NULL for guests
  -- browsing the booking flow before they create an account.
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id      TEXT,
  -- One of: stressed, glow, drained, celebrating, healing, focus.
  -- Validated at the API layer; kept as TEXT so we can ship new
  -- moods without migrations.
  mood            TEXT NOT NULL,
  -- The energy level the client picked on the slider, 1-5.
  energy          SMALLINT,
  -- Comma-separated treatment slugs we recommended.
  recommended     TEXT NOT NULL,
  -- If they ended up booking, we link the booking. Lets us
  -- compute a true conversion rate for each mood.
  booked_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mood_match_user
  ON mood_match_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_match_created
  ON mood_match_recommendations(created_at DESC);

COMMIT;
