-- ---------------------------------------------------------------------------
-- 630-activity-log-defaults.sql
--
-- Make activity_log inserts work from every admin/staff write path.
--
-- Before this migration, the activity_log table was created with:
--   * `id`     character varying NOT NULL, no default
--   * `action` character varying NOT NULL, no default
--
-- A later schema cleanup added a parallel `action_type` column that
-- most newer code paths use (e.g. consultations PUT, bookings PUT,
-- broadcasts, gift cards). Those routes write:
--   INSERT INTO activity_log
--     (staff_id, action_type, entity_type, entity_id, description)
--   VALUES (...)
-- ...which fails the NOT NULL constraints on `id` and `action`,
-- which in turn causes the route's outer catch to return
-- "Failed to update consultation" / "Failed to update booking" /
-- "Failed to send reply" etc. The original failure is masked.
--
-- Fix:
--   1. Generate `id` automatically via gen_random_uuid()::text so app
--      code never has to mint a UUID just to log an admin action.
--   2. Drop the NOT NULL on `action` — its role has been superseded
--      by `action_type` and most call sites no longer set it.
--
-- This migration is idempotent: re-running it is a no-op. Safe to
-- include in any future schema rebuild.
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE activity_log
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE activity_log
  ALTER COLUMN action DROP NOT NULL;
