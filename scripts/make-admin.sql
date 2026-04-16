-- Make a user an admin by their email

UPDATE users 
SET role = 'admin' 
WHERE email = 'info@sidihost.sbs';

-- Verify the update
SELECT id, email, first_name, last_name, role 
FROM users 
WHERE email = 'info@sidihost.sbs';
