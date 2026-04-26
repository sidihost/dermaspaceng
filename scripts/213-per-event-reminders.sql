-- ---------------------------------------------------------------------------
-- 213-per-event-reminders.sql
--
-- Adds the "QStash one-off message id" columns we need so we can cancel
-- the matching scheduled message when a booking is cancelled, a
-- consultation is rescheduled, or a voucher is redeemed / deleted.
--
-- Each column is nullable (a row only ever has at most one outstanding
-- reminder at a time). We also add a `reminder_sent_at` timestamp so
-- the dispatch handler can be idempotent against QStash redelivery.
--
-- The whole script is wrapped in DO blocks that gate on `to_regclass`
-- so it's safe to run against an environment where one of the target
-- tables doesn't exist yet (e.g. production today, where `bookings`
-- hasn't shipped). The DDL is deferred via EXECUTE because static
-- statements inside PL/pgSQL get parsed at compile time and would
-- still fail on a missing table even when the IF branch isn't taken.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  -- ---- bookings (may not exist yet in this environment) ----------------
  IF to_regclass('public.bookings') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE bookings
               ADD COLUMN IF NOT EXISTS reminder_qstash_id TEXT,
               ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_bookings_reminder_qstash_id
               ON bookings(reminder_qstash_id)
               WHERE reminder_qstash_id IS NOT NULL';
  END IF;

  -- ---- consultations ---------------------------------------------------
  IF to_regclass('public.consultations') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE consultations
               ADD COLUMN IF NOT EXISTS reminder_qstash_id TEXT,
               ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_consultations_reminder_qstash_id
               ON consultations(reminder_qstash_id)
               WHERE reminder_qstash_id IS NOT NULL';
  END IF;

  -- ---- vouchers --------------------------------------------------------
  IF to_regclass('public.vouchers') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE vouchers
               ADD COLUMN IF NOT EXISTS expiry_qstash_id TEXT,
               ADD COLUMN IF NOT EXISTS expiry_reminder_sent_at TIMESTAMPTZ';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_vouchers_expiry_qstash_id
               ON vouchers(expiry_qstash_id)
               WHERE expiry_qstash_id IS NOT NULL';
  END IF;
END $$;
