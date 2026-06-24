-- ---------------------------------------------------------------------------
-- 670 — Consultation device / submission metadata
-- ---------------------------------------------------------------------------
-- Captures *how* a consultation was submitted so admins can tell whether
-- the request came from a signed-in customer or an anonymous visitor, and
-- which device / browser / location it originated from. All columns are
-- nullable and additive — existing rows and the existing INSERT path keep
-- working untouched.
-- ---------------------------------------------------------------------------

ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS user_agent   TEXT,
  ADD COLUMN IF NOT EXISTS browser      TEXT,
  ADD COLUMN IF NOT EXISTS os           TEXT,
  ADD COLUMN IF NOT EXISTS device_type  TEXT,
  ADD COLUMN IF NOT EXISTS ip_address   TEXT,
  ADD COLUMN IF NOT EXISTS geo_country  TEXT,
  ADD COLUMN IF NOT EXISTS geo_city     TEXT,
  ADD COLUMN IF NOT EXISTS geo_region   TEXT;

-- Backfill: any pre-existing row that already has a user_id was created by
-- a signed-in customer, so mark it non-anonymous. Rows without a user_id
-- keep the TRUE default.
UPDATE consultations
   SET is_anonymous = FALSE
 WHERE user_id IS NOT NULL;
