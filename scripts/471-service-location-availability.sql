-- ---------------------------------------------------------------------------
-- 471-service-location-availability.sql
--
-- Adds per-location availability to admin-managed treatments.
--
-- A treatment can now be restricted to a subset of clinics (e.g. "Laser
-- Hair Removal — Ikoyi only" or "Hollywood Peel — VI only"). Storage
-- is intentionally simple: a NULL / empty array means "available
-- everywhere" (default), preserving the existing behaviour for every
-- code-defined and admin-defined treatment without a data migration.
-- A non-empty array is an allow-list of `booking_locations.id` values
-- (e.g. ['vi'], ['ikoyi'], or ['vi','ikoyi']).
--
-- The same column lives on `service_treatments_ext` only — code-defined
-- treatments without an override row are implicitly "available
-- everywhere", and the admin UI creates an override row the moment
-- the manager restricts a code treatment to one clinic.
-- ---------------------------------------------------------------------------

ALTER TABLE service_treatments_ext
  ADD COLUMN IF NOT EXISTS available_locations TEXT[];

COMMENT ON COLUMN service_treatments_ext.available_locations IS
  'Allow-list of booking_locations.id this treatment is bookable at. NULL or empty = all locations.';
