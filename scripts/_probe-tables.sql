-- Read-only probe so we can see exactly which database DATABASE_URL points at
-- and which tables exist in it. Throwaway file — safe to delete after use.
SELECT current_database() AS database, current_schema() AS schema;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
