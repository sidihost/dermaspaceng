-- Check the users table schema
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Check sample user data (first 5 users)
SELECT id, first_name, last_name, username, email, created_at
FROM users
LIMIT 5;

-- Count users with and without usernames
SELECT 
  COUNT(*) as total_users,
  COUNT(username) as users_with_username,
  COUNT(*) - COUNT(username) as users_without_username
FROM users;
