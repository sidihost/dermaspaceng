-- ============================================================================
-- 100-setup-admin-team.sql
--
-- One-time seed for the Dermaspace admin team.
--
--   * info@sidihost.sbs  → activated and flagged as the super admin
--                          (the developer / Sidihost dashboard).
--   * itunu@dermaspaceng.com  → admin (CEO). Avatar pulled from the
--                                public About page (/images/itunu.webp).
--   * franca@dermaspaceng.com → admin (COO + licensed esthetician).
--                                Avatar pulled from the About page
--                                (the same hosted blob URL the public
--                                page already uses).
--
-- Both Itunu and Franca are created with an UNGUESSABLE random
-- password and `must_change_password = true`. The intention is for the
-- super admin to issue real temporary passwords later; until then nobody
-- can sign in to those accounts. Re-running the script is safe — it
-- upserts on email and never overwrites an existing password.
--
-- Bcrypt hashes are generated through pgcrypto's `crypt()` with a `bf`
-- salt of cost 12. bcryptjs (used by lib/auth.ts) reads `$2a$` hashes
-- produced by pgcrypto without any compatibility shim.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Promote info@sidihost.sbs to super admin and ensure it's active.
-- ----------------------------------------------------------------------------
UPDATE users
SET
  role            = 'admin',
  is_super_admin  = TRUE,
  is_active       = TRUE,
  email_verified  = TRUE,
  updated_at      = NOW()
WHERE LOWER(email) = 'info@sidihost.sbs';

-- ----------------------------------------------------------------------------
-- 2. Seed Itunuoluwa Umar-Lawal (CEO) as a regular admin.
--    The avatar is the same /images/itunu.webp file the public About
--    page renders, so the admin sidebar shows her actual portrait
--    immediately on first sign-in.
-- ----------------------------------------------------------------------------
INSERT INTO users (
  id,
  email,
  password_hash,
  first_name,
  last_name,
  role,
  is_active,
  email_verified,
  avatar_url,
  is_super_admin,
  must_change_password,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid()::text,
  'itunu@dermaspaceng.com',
  crypt(gen_random_uuid()::text, gen_salt('bf', 12)),
  'Itunuoluwa',
  'Umar-Lawal',
  'admin',
  TRUE,
  TRUE,
  '/images/itunu.webp',
  FALSE,
  TRUE,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE
SET
  role           = 'admin',
  is_active      = TRUE,
  email_verified = TRUE,
  -- Only fill in the avatar/name when they're still blank so we don't
  -- clobber any tweaks the admin has made from the dashboard. The
  -- password_hash is intentionally NEVER overwritten on conflict.
  avatar_url     = COALESCE(NULLIF(users.avatar_url, ''), EXCLUDED.avatar_url),
  first_name     = COALESCE(NULLIF(users.first_name, ''), EXCLUDED.first_name),
  last_name      = COALESCE(NULLIF(users.last_name, ''), EXCLUDED.last_name),
  is_super_admin = COALESCE(users.is_super_admin, FALSE),
  updated_at     = NOW();

-- ----------------------------------------------------------------------------
-- 3. Seed Franca Ebuzome (COO, licensed esthetician).
--    Franca's portrait is hosted on the public Vercel Blob — same URL
--    used by /about. We store the absolute URL in avatar_url so it
--    renders without a runtime rewrite.
-- ----------------------------------------------------------------------------
INSERT INTO users (
  id,
  email,
  password_hash,
  first_name,
  last_name,
  role,
  is_active,
  email_verified,
  avatar_url,
  is_super_admin,
  must_change_password,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid()::text,
  'franca@dermaspaceng.com',
  crypt(gen_random_uuid()::text, gen_salt('bf', 12)),
  'Franca',
  'Ebuzome',
  'admin',
  TRUE,
  TRUE,
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/franca-1-ZLFTvxIeaKIywWjr4amphoEGwfmuOe.webp',
  FALSE,
  TRUE,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE
SET
  role           = 'admin',
  is_active      = TRUE,
  email_verified = TRUE,
  avatar_url     = COALESCE(NULLIF(users.avatar_url, ''), EXCLUDED.avatar_url),
  first_name     = COALESCE(NULLIF(users.first_name, ''), EXCLUDED.first_name),
  last_name      = COALESCE(NULLIF(users.last_name, ''), EXCLUDED.last_name),
  is_super_admin = COALESCE(users.is_super_admin, FALSE),
  updated_at     = NOW();

-- ----------------------------------------------------------------------------
-- 4. Final report — handy when running this from psql so we can eyeball
--    the team straight after the upsert.
-- ----------------------------------------------------------------------------
SELECT
  email,
  role,
  is_super_admin,
  is_active,
  must_change_password,
  first_name || ' ' || last_name AS full_name,
  avatar_url
FROM users
WHERE LOWER(email) IN (
  'info@sidihost.sbs',
  'itunu@dermaspaceng.com',
  'franca@dermaspaceng.com'
)
ORDER BY is_super_admin DESC, email;
