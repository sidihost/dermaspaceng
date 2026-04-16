-- Check if welcome_dismissed column exists in user_preferences table
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'user_preferences';
