-- ----------------------------------------------------------------
-- Sets username + bcrypt-hashed temporary password for Itunu and
-- Franca, and forces must_change_password = TRUE so they're prompted
-- to pick their own password (and update their email) the moment
-- they sign in.
--
-- pgcrypto's crypt(...,gen_salt('bf', 12)) produces a $2a$12$...
-- bcrypt hash that bcryptjs.compare() in our Node code reads back
-- without any further translation, so we can hash directly in
-- Postgres and avoid shipping plaintext passwords through Node.
--
-- Temporary credentials (share privately, NOT via this file):
--   Itunu:  username = itunu     password = Itunu@Derma2026!
--   Franca: username = franca    password = Franca@Derma2026!
-- ----------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE users
   SET username             = 'itunu',
       password_hash        = crypt('Itunu@Derma2026!',  gen_salt('bf', 12)),
       must_change_password = TRUE,
       is_active            = TRUE,
       updated_at           = NOW()
 WHERE LOWER(email) = 'itunu@dermaspaceng.com';

UPDATE users
   SET username             = 'franca',
       password_hash        = crypt('Franca@Derma2026!', gen_salt('bf', 12)),
       must_change_password = TRUE,
       is_active            = TRUE,
       updated_at           = NOW()
 WHERE LOWER(email) = 'franca@dermaspaceng.com';

-- Read-back so the run log confirms each row was updated correctly
-- and the username / role / super-admin flag look right.
SELECT id,
       email,
       username,
       role,
       is_super_admin,
       must_change_password,
       LEFT(password_hash, 7) AS hash_prefix
  FROM users
 WHERE username IN ('itunu', 'franca')
 ORDER BY username;
