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
--      one booking; we don't hard-cap re-issues but `sent_count`
--      lets us show "Sent 3 times" in the admin UI.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_bookings_payment_failed_at
  ON bookings (payment_failed_at DESC)
  WHERE payment_status = 'failed';

CREATE TABLE IF NOT EXISTS booking_recovery_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  -- Public token used in the recovery URL. Stored hashed so a leaked
  -- DB dump can't be replayed; the unhashed value lives only in the
  -- email body. SHA-256 hex => 64 chars.
  token_hash CHAR(64) NOT NULL UNIQUE,
  -- Free-form note about why we sent this — "cancelled by user",
  -- "payment failed", "abandoned" — purely for admin reporting.
  reason TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  sent_count INTEGER NOT NULL DEFAULT 1,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_recovery_booking
  ON booking_recovery_tokens (booking_id, created_at DESC);
