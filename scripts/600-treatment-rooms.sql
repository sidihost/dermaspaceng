-- ---------------------------------------------------------------------------
-- 600-treatment-rooms.sql
--
-- Proper treatment-room management. Before this script the staff
-- front-desk derived "rooms" from booking metadata on the fly —
-- usable for a tiny clinic but no good for capacity planning,
-- maintenance scheduling, or per-room service permissions.
--
-- Two tables:
--
--   1. treatment_rooms    — directory of physical rooms an admin
--                           curates from /admin/rooms. Soft-delete
--                           via is_active so historical sessions
--                           keep their FK target.
--
--   2. room_sessions      — every check-in / check-out. The staff
--                           live board reads the most recent
--                           non-closed row per room as "what's
--                           happening right now"; the admin
--                           room-history view reads the full table
--                           ordered by created_at.
--
-- All tables are CREATE … IF NOT EXISTS so the script is safe to
-- re-run during deploys.
-- ---------------------------------------------------------------------------

BEGIN;

CREATE TABLE IF NOT EXISTS treatment_rooms (
  id               VARCHAR PRIMARY KEY DEFAULT (
                     'rm_' || replace(gen_random_uuid()::text, '-', '')
                   ),
  -- Location (VI / Ikoyi) the room belongs to. Re-uses the existing
  -- booking_locations directory so a single source of truth keeps
  -- branch labels consistent across the product.
  location_id      VARCHAR(50) NOT NULL REFERENCES booking_locations(id),
  -- Operator-set display name — "Room 1", "Suite A", "Steam Room".
  -- Free text so admins aren't forced into a numeric schema we don't
  -- own.
  name             VARCHAR(100) NOT NULL,
  -- Concurrent capacity. For a 1-person treatment suite this is 1;
  -- shared spa-rooms (couples massage, etc.) may seat 2-3.
  capacity         INTEGER NOT NULL DEFAULT 1 CHECK (capacity > 0),
  -- Operational status, controlled from the admin UI. The staff
  -- live-board surfaces this so a "maintenance" room is greyed out
  -- and can't accept a check-in.
  status           VARCHAR(20) NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'maintenance', 'closed')),
  -- JSON array of category_id strings the room can host (mirrors
  -- booking_services.category_id). NULL means "any service" — the
  -- common case for spa rooms that aren't service-locked.
  allowed_categories JSONB,
  notes            TEXT,
  display_order    INTEGER NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treatment_rooms_location
  ON treatment_rooms(location_id);
CREATE INDEX IF NOT EXISTS idx_treatment_rooms_active
  ON treatment_rooms(is_active, location_id, display_order);

CREATE TABLE IF NOT EXISTS room_sessions (
  id               VARCHAR PRIMARY KEY DEFAULT (
                     'rs_' || replace(gen_random_uuid()::text, '-', '')
                   ),
  room_id          VARCHAR NOT NULL REFERENCES treatment_rooms(id) ON DELETE RESTRICT,
  -- The booking this room session is fulfilling, when there is one.
  -- NULL for walk-ins that haven't been promoted to a booking yet —
  -- staff can still check the customer into a room and book them
  -- post-treatment.
  booking_id       VARCHAR(36) REFERENCES bookings(id) ON DELETE SET NULL,
  client_user_id   VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  client_name      VARCHAR(200) NOT NULL,
  staff_id         VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  service_label    VARCHAR(200),
  -- Estimated duration in minutes — used by the live board to render
  -- the "ends at" timestamp. Defaults to the booking duration when a
  -- booking is attached; otherwise the operator types it in.
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at         TIMESTAMPTZ,
  status           VARCHAR(20) NOT NULL DEFAULT 'in_progress'
                     CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_sessions_room_active
  ON room_sessions(room_id, status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_room_sessions_booking
  ON room_sessions(booking_id);

COMMIT;
