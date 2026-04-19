-- Add date_of_birth to the users table so we can wish customers happy birthday
-- and (eventually) tailor age-appropriate treatment recommendations.
--
-- `last_birthday_email_sent_at` is the date (not timestamp) we last sent the
-- birthday email. The cron job uses this as an idempotency key so retries on
-- the same day can't double-send, and so a user who updates their DOB mid-year
-- still gets a wish the following year.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS last_birthday_email_sent_at DATE;

-- Functional index on (month, day) so the birthday cron's lookup stays O(log n)
-- even as the user table grows. We deliberately index EXTRACT results because
-- we never want to compare against the birth-year, only the month+day.
CREATE INDEX IF NOT EXISTS idx_users_birthday_month_day
  ON users (
    (EXTRACT(MONTH FROM date_of_birth)),
    (EXTRACT(DAY   FROM date_of_birth))
  )
  WHERE date_of_birth IS NOT NULL;
