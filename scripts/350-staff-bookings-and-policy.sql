-- 350-staff-bookings-and-policy.sql
-- ----------------------------------------------------------------------------
-- 1. Per-booking staff assignment + admin price override
-- 2. Per-staff "booking access" grants so an admin can give a specific
--    staff member access to a particular booking (without making them
--    a global booking-handler)
-- 3. Short-form staff policy acknowledgement (separate from the
--    customer-facing legal pack)
-- ----------------------------------------------------------------------------

-- 1. Booking columns ---------------------------------------------------------
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS assigned_staff_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS price_override_kobo INTEGER,
  ADD COLUMN IF NOT EXISTS price_override_reason TEXT,
  ADD COLUMN IF NOT EXISTS price_override_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS price_override_by VARCHAR REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_assigned_staff
  ON bookings(assigned_staff_id);

-- 2. Per-booking staff access ------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_booking_access (
  id           VARCHAR PRIMARY KEY DEFAULT (
                  'sba_' || replace(gen_random_uuid()::text, '-', '')
                ),
  booking_id   VARCHAR NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  staff_id     VARCHAR NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  granted_by   VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  granted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT staff_booking_access_unique UNIQUE (booking_id, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_booking_access_staff
  ON staff_booking_access(staff_id);

-- 3. Staff policy acknowledgement -------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS staff_policy_accepted_version TEXT,
  ADD COLUMN IF NOT EXISTS staff_policy_accepted_at      TIMESTAMPTZ;

-- 4. Make sure the user_notifications table exists.
-- The /api/notifications routes assume `user_notifications` (NOT
-- the empty `notifications` table) — recreate idempotently so a
-- fresh database also works without manual setup.
CREATE TABLE IF NOT EXISTS user_notifications (
  id              VARCHAR PRIMARY KEY DEFAULT (
                    'ntf_' || replace(gen_random_uuid()::text, '-', '')
                  ),
  user_id         VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  type            VARCHAR(32) NOT NULL DEFAULT 'system',
  reference_type  VARCHAR(32),
  reference_id    VARCHAR(64),
  action_url      TEXT,
  priority        VARCHAR(16) NOT NULL DEFAULT 'normal',
  broadcast_id    VARCHAR(64),
  "read"          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread
  ON user_notifications(user_id, "read", created_at DESC);
