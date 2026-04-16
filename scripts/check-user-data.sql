-- Check all user preferences with welcome_dismissed status
SELECT 
  u.id, 
  u.email, 
  u.first_name,
  up.welcome_dismissed,
  up.skin_type,
  up.updated_at
FROM users u
LEFT JOIN user_preferences up ON u.id = up.user_id
ORDER BY u.created_at DESC
LIMIT 10;
