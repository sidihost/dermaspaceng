-- ---------------------------------------------------------------------------
-- 213-per-event-reminders.sql
--
-- Adds the three "QStash one-off message id" columns we need so we can
-- cancel the matching scheduled message when a booking is cancelled, a
-- consultation is rescheduled, or a voucher is redeemed / deleted.
--
-- Each column is nullable (a row only ever has at most one outstanding
-- reminder at a time). We also add a `reminder_sent_at` timestamp on
-- bookings + consultations so the dispatch handler can be idempotent
-- against QStash redelivery.
-- ---------------------------------------------------------------------------

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS reminder_qstash_id TEXT,
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS reminder_qstash_id TEXT,
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

ALTER TABLE vouchers
  ADD COLUMN IF NOT EXISTS expiry_qstash_id TEXT,
  ADD COLUMN IF NOT EXISTS expiry_reminder_sent_at TIMESTAMPTZ;

-- Helpful for the dispatch handler when it's looking up "is there
-- already a reminder pending for this row?". These are tiny indexes
-- because the columns are mostly NULL.
CREATE INDEX IF NOT EXISTS idx_bookings_reminder_qstash_id
  ON bookings(reminder_qstash_id) WHERE reminder_qstash_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_consultations_reminder_qstash_id
  ON consultations(reminder_qstash_id) WHERE reminder_qstash_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vouchers_expiry_qstash_id
  ON vouchers(expiry_qstash_id) WHERE expiry_qstash_id IS NOT NULL;
