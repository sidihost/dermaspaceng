-- ============================================================================
-- 140-reset-itunu-account.sql
--
-- Refresh Itunuoluwa Umar-Lawal's admin row so it behaves like a brand
-- new sign-in:
--
--   * Sets a known temporary password — Itunu@Derma2026!
--   * Forces must_change_password = TRUE so the next sign-in lands her
--     on the welcome flow that prompts her to pick a new password
--     (with a Skip option) and then to enter her real email address.
--   * Clears the email back to a placeholder so the welcome flow knows
--     to ask for a real one.
--   * Wipes any active session for that user — if a previous test
--     session is still in the cookie jar, the next page load now goes
--     straight back to /signin instead of staying logged in with the
--     stale credential set.
--
-- Re-running the script is safe — every statement is keyed on the
-- username 'itunu' and is idempotent.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Reset password + flags. Same temp password the original 110- script
--    set (so we don't have to coordinate a new one), and the email is
--    pushed back to the placeholder sentinel so the welcome flow's
--    compulsory email step fires.
-- ---------------------------------------------------------------------------
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
       SET password_hash        = crypt('Itunu@Derma2026!', gen_salt('bf', 12)),
           must_change_password = TRUE,
           email                = NULL,
           email_verified       = FALSE,
           is_active            = TRUE,
           updated_at           = NOW()
     WHERE LOWER(username) = 'itunu';
  ELSE
    UPDATE users
       SET password_hash        = crypt('Itunu@Derma2026!', gen_salt('bf', 12)),
           must_change_password = TRUE,
           email                = 'pending+itunu@dermaspaceng.invalid',
           email_verified       = FALSE,
           is_active            = TRUE,
           updated_at           = NOW()
     WHERE LOWER(username) = 'itunu';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Drop any active sessions so the next visit forces a fresh sign-in
--    (rather than picking up the previous test session that authenticated
--    against the old password).
-- ---------------------------------------------------------------------------
DELETE FROM sessions
 WHERE user_id IN (SELECT id FROM users WHERE LOWER(username) = 'itunu');

-- ---------------------------------------------------------------------------
-- 3. Read-back so the run log confirms the reset took.
-- ---------------------------------------------------------------------------
SELECT id,
       email,
       username,
       role,
       is_super_admin,
       must_change_password,
       email_verified,
       LEFT(password_hash, 7) AS hash_prefix,
       updated_at
  FROM users
 WHERE LOWER(username) = 'itunu';
