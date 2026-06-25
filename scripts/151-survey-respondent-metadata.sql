-- Respondent metadata for survey_responses
--
-- The /survey page is reachable anonymously (post-visit email links,
-- QR codes in the spa) as well as by signed-in customers. To give the
-- admin survey detail page real context about *who* and *how* a
-- response was submitted — browser, device, operating system,
-- approximate location and whether the respondent was anonymous — we
-- capture a small metadata envelope on submit.
--
-- All columns are nullable / default-safe so the route still works on
-- environments where geo headers or a user agent aren't available, and
-- the migration is idempotent (IF NOT EXISTS) so it can be re-run.

ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS is_anonymous        BOOLEAN DEFAULT TRUE;

ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS respondent_user_agent TEXT;

ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS respondent_browser  VARCHAR(120);

ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS respondent_os       VARCHAR(120);

ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS respondent_device   VARCHAR(120);

ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS respondent_ip       VARCHAR(64);

ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS respondent_city     VARCHAR(160);

ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS respondent_region   VARCHAR(160);

ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS respondent_country  VARCHAR(8);

-- Precise (GPS) coordinates only present when the visitor granted the
-- browser geolocation permission; otherwise we fall back to the
-- approximate city/region/country derived from the request IP.
ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS respondent_lat      DOUBLE PRECISION;

ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS respondent_lng      DOUBLE PRECISION;

-- 'gps' when coordinates came from the browser geolocation API,
-- 'ip' when derived from the request IP, or NULL when unknown.
ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS respondent_geo_source VARCHAR(12);
