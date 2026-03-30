-- Final verification: Show all tables and their column counts
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Verify critical columns exist for authentication
SELECT 
  'users' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verify sessions table
SELECT 
  'sessions' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'sessions' AND table_schema = 'public'
ORDER BY ordinal_position;
