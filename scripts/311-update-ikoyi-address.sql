-- 311 - Refresh the Ikoyi branch address.
--
-- Why this isn't just a `300` re-seed:
--   `300-booking-system-v2.sql` uses `INSERT ... ON CONFLICT (id) DO NOTHING`
--   so once the row exists, future seed re-runs leave it alone (by design,
--   so admins can edit branch metadata in the dashboard without losing it
--   on every deploy). That means an outdated address sits in the live DB
--   indefinitely until we explicitly UPDATE it.
--
-- Idempotency:
--   The UPDATE is guarded so it ONLY rewrites the row when the address is
--   still the old "Awolowo Road" value. If an admin has already changed
--   it through the dashboard (or this migration has run), we leave their
--   value alone.

BEGIN;

UPDATE booking_locations
   SET address = '9 Agbeke Rotinwa Cl, Dolphin Extension Estate, Ikoyi, Lagos 106104'
 WHERE id = 'ikoyi'
   AND address LIKE '%Awolowo%';

COMMIT;
