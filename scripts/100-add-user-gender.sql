-- Add an optional `gender` column to users so we can serve
-- gender-appropriate default avatars and limit what each user sees
-- in the avatar picker. It's nullable because existing users haven't
-- picked one yet — they'll be prompted from the settings page.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS gender VARCHAR(20);

-- Constrain the allowed values. We only surface Men / Women avatars
-- today; if we add more in the future we'll extend this check.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_gender_check'
      AND table_name = 'users'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_gender_check
      CHECK (gender IS NULL OR gender IN ('male', 'female'));
  END IF;
END $$;
