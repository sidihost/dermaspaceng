-- Read-only inspection: figure out what's in the users table for the
-- "staff" world so we can see why the admin Staff list looks empty.
-- We surface the raw counts (by role + by status) and the actual
-- rows so we can confirm whether the filter the API uses lines up
-- with what's persisted.

-- 1) Distinct roles + how many of each (incl. nulls).
SELECT COALESCE(role, '(null)') AS role, COUNT(*)::int AS n
FROM users
GROUP BY role
ORDER BY role NULLS FIRST;

-- 2) Staff-shaped rows by status. is_active drives the canonical
-- "active vs deactivated" badge in the admin list; email_verified
-- gates whether they can actually log in.
SELECT
  COALESCE(role, '(null)') AS role,
  is_active,
  email_verified,
  COUNT(*)::int AS n
FROM users
WHERE role IN ('staff', 'admin') OR role IS NULL
GROUP BY role, is_active, email_verified
ORDER BY role, is_active, email_verified;

-- 3) The actual staff rows (anything that looks like staff or is
-- clearly a pending invite — we surface email + flags so we can
-- compare against what the admin Staff page is showing).
SELECT
  id,
  email,
  username,
  first_name,
  last_name,
  role,
  is_active,
  email_verified,
  must_change_password,
  COALESCE(is_super_admin, FALSE) AS is_super_admin,
  created_at
FROM users
WHERE role IN ('staff', 'admin')
ORDER BY role, created_at DESC
LIMIT 100;
