-- =============================================
-- TangibleFi Database Structure Check
-- Run this first to see what's currently in your database
-- =============================================

-- Check if users table exists and its columns
SELECT 
    'users table structure' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- Check what tables exist in public schema
SELECT 
    'existing tables' as check_type,
    table_name,
    NULL as column_name,
    NULL as data_type,
    NULL as is_nullable
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

-- Check if RLS is enabled on any tables
SELECT 
    'rls status' as check_type,
    CONCAT(schemaname, '.', tablename) as table_name,
    CASE WHEN rowsecurity = true THEN 'ENABLED' ELSE 'DISABLED' END as column_name,
    NULL as data_type,
    NULL as is_nullable
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public';

-- Check existing policies
SELECT 
    'existing policies' as check_type,
    tablename as table_name,
    policyname as column_name,
    NULL as data_type,
    NULL as is_nullable
FROM pg_policies 
WHERE schemaname = 'public';

-- Check if auth.users table has any users
SELECT 
    'auth users count' as check_type,
    CAST(count(*) AS text) as table_name,
    NULL as column_name,
    NULL as data_type,
    NULL as is_nullable
FROM auth.users; 