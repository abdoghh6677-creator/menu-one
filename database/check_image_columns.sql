-- Check which tables have image columns
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name LIKE '%image%'
ORDER BY table_name;