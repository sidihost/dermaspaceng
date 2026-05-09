-- Staff "Service Editor" permission.
--
-- Adds a single boolean perm — `can_manage_services` — to the users
-- and staff_invitations tables. Admins can grant this to trusted
-- staff so they can edit the catalog (categories, treatments, prices)
-- without being elevated all the way to admin.
--
-- Why a column instead of a roles table:
--   • The admin team is small and the perm matrix is currently
--     just "admin / staff with X / staff without X".
--   • Wiring a full RBAC system (roles + role_permissions +
--     user_roles) would be over-engineering for a 1-perm decision.
--   • Adding more perms later is a single ALTER TABLE per perm,
--     which is fine for the volume here.
--
-- Idempotent: `IF NOT EXISTS` guards both columns so this script
-- can be re-run safely.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS can_manage_services BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE staff_invitations
  ADD COLUMN IF NOT EXISTS can_manage_services BOOLEAN NOT NULL DEFAULT FALSE;

-- Existing admins implicitly have this perm (the API checks
-- `role='admin' OR can_manage_services=true`), so we don't need to
-- backfill them. New invitees default to FALSE; admins flip it on
-- per-staff from /admin/staff or at invite time.
