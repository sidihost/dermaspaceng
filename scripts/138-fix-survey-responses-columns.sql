-- Backfill missing columns on survey_responses
--
-- The /api/surveys route writes user_email, appointment_delay and
-- comments, but the live table was an older schema that only had
-- `feedback` (no comments), no appointment_delay, and no user_email.
-- That mismatch caused:
--   column "user_email" of relation "survey_responses" does not exist
-- when a customer submitted the public /survey page. Adding the
-- columns with IF NOT EXISTS is safe to re-run on any environment.

ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS user_email        VARCHAR(255);

ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS appointment_delay VARCHAR(50);

ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS comments          TEXT;
