-- 461 — Payment-failure visibility + recovery links for bookings.
--
-- Two things ship together here because they share the same goal
-- (make abandoned/failed bookings actionable instead of silently
-- dying):
--
--   1) Per-booking failure metadata so admin pages can answer the
--      first question that always gets asked when a booking goes
--      sideways: "WHY didn't it pay?". We pull the gateway response
--      from Paystack into `payment_failure_reason`, stamp
--      `payment_failed_at` for sorting, and bump `failed_attempts`
--      every time we log a failure (so a flaky card → multiple
--      retries shows up as `failed_attempts > 1`). All columns are
--      nullable / default-zero so old rows keep working.
--
--   2) A short-lived `booking_recovery_tokens` table that backs the
--      "send recovery link" magic link flow. An admin (or a future
--      automated job) can mint a token tied to a specific booking;
--      the customer clicks the email, lands on a route that resolves
--      the token to a session-scoped redirect, and resumes either a
--      retry-payment flow (if the booking is salvageable) or a
--      pre-filled new booking (if it was cancelled). One token =
--      one booking; the token row gets stamped `consumed_at` on use
--      so the same magic link can't be replayed.
--
-- Type note: `bookings.id` and `users.id` are VARCHAR(36) (legacy
-- UUID-as-string columns, see the very early migrations), NOT native
-- UUID. The recovery table FKs HAVE to match those types or the
-- migration aborts with "foreign key constraint cannot be implemented"
-- (which is exactly what was blowing up the build before this rev).

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_bookings_payment_failed_at
  ON bookings (payment_failed_at DESC)
  WHERE payment_status = 'failed';

-- Column names here are intentionally `token` / `consumed_at` so they
-- line up 1:1 with `createBookingRecoveryToken` /
-- `consumeBookingRecoveryToken` in `lib/booking.ts`. If you rename
-- one, rename both — otherwise the helper INSERTs a column the table
-- doesn't have and recovery silently breaks.
CREATE TABLE IF NOT EXISTS booking_recovery_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- bookings.id is VARCHAR(36), not UUID. Match exactly.
  booking_id VARCHAR(36) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  -- URL-safe random token (base64url, ~43 chars). Stored verbatim
  -- because the recovery endpoint receives the token from the URL
  -- and looks it up directly — no separate hashing step.
  token TEXT NOT NULL UNIQUE,
  -- Free-form note about why we sent this — "cancelled by user",
  -- "payment failed", "abandoned" — purely for admin reporting.
  reason TEXT,
  -- users.id is VARCHAR(36) like bookings.id; keep the FK happy.
  created_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  -- Stamped on first successful use. NULL while the link is still
  -- live; once set, the helper refuses to resolve it again.
  consumed_at TIMESTAMPTZ,
  sent_count INTEGER NOT NULL DEFAULT 1,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_recovery_booking
  ON booking_recovery_tokens (booking_id, created_at DESC);
