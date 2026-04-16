-- Check current user_preferences data
SELECT user_id, welcome_dismissed, created_at, updated_at 
FROM user_preferences 
ORDER BY updated_at DESC 
LIMIT 10;
