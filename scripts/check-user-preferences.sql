-- Check current preferences for user info@sidihost.sbs
SELECT 
  u.id as user_id,
  u.email,
  up.*
FROM users u
LEFT JOIN user_preferences up ON u.id = up.user_id
WHERE u.email = 'info@sidihost.sbs';
