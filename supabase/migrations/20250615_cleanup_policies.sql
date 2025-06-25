-- =============================================
-- TangibleFi Policy Cleanup Script
-- Run this BEFORE the main security migration if you get policy conflicts
-- =============================================

-- Drop all existing policies to prevent conflicts
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on public schema tables
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      pol.policyname, pol.schemaname, pol.tablename);
        RAISE NOTICE 'Dropped policy: % on %.%', pol.policyname, pol.schemaname, pol.tablename;
    END LOOP;
END $$;

-- Verify all policies are removed
SELECT 
    'Remaining policies after cleanup' as status,
    count(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public';

SELECT 'Policy cleanup completed - you can now run the main migration!' as result; 