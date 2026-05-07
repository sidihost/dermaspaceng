-- Clear the placeholder emails I seeded for Itunu and Franca. They
-- will set their own real email on first login from Settings -> Profile.
--
-- Strategy:
--   1) Try setting email to NULL. If the column is NOT NULL, fall back
--      to an obviously-fake sentinel they can replace. Either way,
--      email_verified is forced to FALSE so the verification cycle
--      kicks in the moment they save a real address.
--   2) Only touches rows where the email is still my seeded placeholder
--      (...@dermaspaceng.com) so no real user data ever gets clobbered.
--   3) Surfaces the resulting state so we can confirm.

DO $$
DECLARE
  is_email_nullable boolean;
BEGIN
  SELECT (is_nullable = 'YES') INTO is_email_nullable
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'users'
     AND column_name  = 'email';

  IF is_email_nullable THEN
    UPDATE users
       SET email          = NULL,
           email_verified = FALSE,
           updated_at     = NOW()
     WHERE username IN ('itunu', 'franca')
       AND email IN ('itunu@dermaspaceng.com', 'franca@dermaspaceng.com');
  ELSE
    -- NOT NULL column — use a clearly invalid sentinel keyed off the
    -- username so the unique constraint is preserved.
    UPDATE users
       SET email          = 'pending+' || username || '@dermaspaceng.invalid',
           email_verified = FALSE,
           updated_at     = NOW()
     WHERE username IN ('itunu', 'franca')
       AND email IN ('itunu@dermaspaceng.com', 'franca@dermaspaceng.com');
  END IF;
END $$;

SELECT username, email, email_verified, must_change_password, is_active, role
  FROM users
 WHERE username IN ('itunu', 'franca')
 ORDER BY username;
