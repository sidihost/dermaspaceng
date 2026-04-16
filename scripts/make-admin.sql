-- Make a user an admin by their email
-- Replace 'your-email@example.com' with your actual email address

UPDATE users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';

-- Verify the update
SELECT id, email, first_name, last_name, role 
FROM users 
WHERE email = 'your-email@example.com';
