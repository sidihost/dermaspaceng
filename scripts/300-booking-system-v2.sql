-- ---------------------------------------------------------------------------
-- 300-booking-system-v2.sql
--
-- Production-ready booking schema. Replaces the never-deployed
-- 034-create-bookings-table.sql, which declared `user_id UUID
-- REFERENCES users(id)` even though `users.id` is `VARCHAR(36)` —
-- the foreign-key type mismatch meant the table never created
-- successfully in any environment (production today still ships the
-- "Coming Soon" waitlist page).
--
-- Design decisions
-- ----------------
--   * `user_id VARCHAR(36)` — matches `users.id` so the FK is valid.
--   * Money is stored in **kobo** (smallest NGN unit) as INTEGER.
--     Naira at the UI layer; never use FLOAT for currency.
--   * `payment_status` is a separate column from `status` so the
--     business state ("confirmed", "completed") and the financial
--     state ("paid", "refunded") evolve independently — a confirmed
--     booking can still be refunded if the customer cancels in time.
--   * `reminder_qstash_id` / `reminder_sent_at` live on the table at
--     creation so the QStash reminders pipeline (213-per-event-
--     reminders) and lib/reminders.ts work the day this lands.
--   * `booking_locations` is its own table (not a TS constant) so
--     admins can flip a single branch off without a deploy when one
--     clinic is unavailable, AND so capacity (`slots_per_window`)
--     can be tuned per location as we learn real demand.
--   * `users.total_spent_kobo` / `users.bookings_count` are summary
--     columns updated transactionally when admin marks a booking
--     completed — phase 1 of the loyalty system tracks lifetime
--     spend; phase 2 will layer earn / redeem rules on top of it.
-- ---------------------------------------------------------------------------

BEGIN;

-- 1. Tear down the broken legacy schema if it ever managed to get
--    half-created. Safe to run repeatedly: every DROP is gated on
--    IF EXISTS, and CASCADE handles the booking_services FK.
DROP TABLE IF EXISTS booking_services CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;

-- 2. Locations directory. We keep this in Postgres (not a TS const)
--    so an admin can pause online booking at one branch without
--    redeploying. The frontend mirrors these rows verbatim so adding
--    a third clinic is a single INSERT, no code change.
CREATE TABLE IF NOT EXISTS booking_locations (
  id              VARCHAR(50) PRIMARY KEY,           -- e.g. 'vi', 'ikoyi'
  name            VARCHAR(100) NOT NULL,
  address         TEXT NOT NULL,
  phone           VARCHAR(30) NOT NULL,
  whatsapp        VARCHAR(30) NOT NULL,
  -- Working window. Stored as 24-h text ('09:00') so the UI never
  -- has to deal with timezone conversions for the *clinic's* hours.
  opens_at        VARCHAR(5) NOT NULL DEFAULT '09:00',
  closes_at       VARCHAR(5) NOT NULL DEFAULT '19:00',
  -- Comma-separated weekday numbers we accept bookings on (0 = Sun).
  -- Default Mon-Sat to match the LOCATIONS const in
  -- components/home/locations-section.tsx.
  open_days       VARCHAR(20) NOT NULL DEFAULT '1,2,3,4,5,6',
  -- Granularity of bookable slots, in minutes. 30 = half-hour slots.
  slot_minutes    INTEGER NOT NULL DEFAULT 30,
  -- Maximum concurrent appointments inside the same slot. Bumped per
  -- location as we hire more therapists.
  slots_per_window INTEGER NOT NULL DEFAULT 2,
  -- Per-branch on/off switch. Site-wide pause uses the `booking`
  -- feature flag in `feature_flags`; this is for "VI is closed for
  -- renovations next week".
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  image_url       TEXT,
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Bookings core. Each row is one customer's appointment at one
--    location for one or more services. The services themselves
--    live in `booking_services` so the catalog can grow without
--    schema changes here.
CREATE TABLE IF NOT EXISTS bookings (
  id                 VARCHAR(36) PRIMARY KEY,                 -- uuid v4 from app
  user_id            VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Human-friendly reference shown in emails, receipts, and the URL
  -- of the booking detail page (`/booking/DS-AB12CD34`). Generated
  -- by lib/booking.ts; UNIQUE so collisions surface as 409 not as
  -- a duplicate row.
  booking_reference  VARCHAR(20) UNIQUE NOT NULL,

  location_id        VARCHAR(50) NOT NULL REFERENCES booking_locations(id),
  -- Snapshot of name/address at booking time so a renamed/moved
  -- branch doesn't rewrite the customer's history.
  location_name      VARCHAR(100) NOT NULL,
  location_address   TEXT,

  appointment_date   DATE NOT NULL,
  appointment_time   VARCHAR(5) NOT NULL,                     -- '14:30'
  total_duration     INTEGER NOT NULL,                        -- minutes
  total_price_kobo   INTEGER NOT NULL CHECK (total_price_kobo >= 0),

  -- Customer-facing contact info. We snapshot from users at booking
  -- time so a phone-number change later doesn't desync the history.
  customer_name      VARCHAR(200) NOT NULL,
  customer_email     VARCHAR(255) NOT NULL,
  customer_phone     VARCHAR(30) NOT NULL,

  status             VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  -- Payment lifecycle, separate from booking lifecycle. A booking
  -- becomes `confirmed` only when payment_status flips to `paid`.
  payment_status     VARCHAR(20) NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'failed')),
  payment_method     VARCHAR(20)
    CHECK (payment_method IS NULL OR payment_method IN ('wallet', 'paystack')),
  -- Cross-references the `transactions.payment_reference` (DS_…) for
  -- both wallet and Paystack flows; carrying the same id end-to-end
  -- means the webhook can confirm bookings idempotently.
  payment_reference  VARCHAR(100),

  notes              TEXT,
  cancellation_reason TEXT,
  cancelled_at       TIMESTAMPTZ,
  completed_at       TIMESTAMPTZ,

  -- Reminder pipeline (matches 213-per-event-reminders.sql) so we
  -- don't need a follow-up migration after this lands.
  reminder_qstash_id TEXT,
  reminder_sent_at   TIMESTAMPTZ,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Services attached to each booking. Snapshot of catalog data so
--    a price change today never rewrites yesterday's invoice.
CREATE TABLE IF NOT EXISTS booking_services (
  id              VARCHAR(36) PRIMARY KEY,
  booking_id      VARCHAR(36) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  category_id     VARCHAR(50) NOT NULL,         -- e.g. 'facial-treatments'
  category_name   VARCHAR(100) NOT NULL,
  treatment_id    VARCHAR(50) NOT NULL,         -- e.g. 'hydra-facial'
  treatment_name  VARCHAR(200) NOT NULL,
  duration        INTEGER NOT NULL,             -- minutes
  price_kobo      INTEGER NOT NULL CHECK (price_kobo >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Indexes for the hot paths.
--    - User lookups (booking history): `user_id` + `appointment_date`.
--    - Slot availability check: `location_id` + `appointment_date` +
--      `status` (we exclude cancelled rows from the count).
--    - Webhook lookup: `payment_reference` (uses LIMIT 1 + index).
CREATE INDEX IF NOT EXISTS idx_bookings_user_id
  ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_date
  ON bookings(user_id, appointment_date DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_status
  ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_slot
  ON bookings(location_id, appointment_date, appointment_time)
  WHERE status IN ('pending', 'confirmed', 'completed');
CREATE INDEX IF NOT EXISTS idx_bookings_payment_reference
  ON bookings(payment_reference)
  WHERE payment_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_reminder_qstash_id
  ON bookings(reminder_qstash_id)
  WHERE reminder_qstash_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_services_booking_id
  ON booking_services(booking_id);

-- 6. Lifetime-spend rollup on users. Phase 1: just track the totals.
--    Phase 2 will define the earn/redeem rules and a points ledger;
--    we already have the spend signal we need to retroactively
--    award points the day those rules ship.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS total_spent_kobo BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bookings_count   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_booking_at  TIMESTAMPTZ;

-- 7. Seed the two real branches. ON CONFLICT keeps any admin tweaks
--    intact across re-runs; we only set immutable defaults here.
INSERT INTO booking_locations (id, name, address, phone, whatsapp, image_url, display_order)
VALUES
  ('vi',    'Victoria Island', '237B Muri Okunola Street, VI, Lagos', '+234 906 183 6625', '+2349061836625',
   'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2812%29-0e2hkjlXHNekO1q892JaoQdIUJgYqf.jpg', 1),
  ('ikoyi', 'Ikoyi',           '9 Agbeke Rotinwa Cl, Dolphin Extension Estate, Ikoyi, Lagos 106104', '+234 901 313 4945', '+2349013134945',
   'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3360.JPG-bJ57ZV3Wl1GImeuHYSeNTlnS0GUCVs.jpeg', 2)
ON CONFLICT (id) DO NOTHING;

COMMIT;
