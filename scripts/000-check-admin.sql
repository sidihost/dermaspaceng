-- Inspect current admin/staff users to confirm super admin presence
SELECT id, email, first_name, last_name, role, is_active, created_at
FROM users
WHERE role IN ('admin', 'staff')
   OR email ILIKE '%itunu%'
   OR email ILIKE '%franca%'
   OR email ILIKE '%sidihost%'
ORDER BY role, email;

-- Show users table columns so we know if super-admin / display-name fields already exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
