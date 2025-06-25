-- =============================================
-- TangibleFi Security Fixes Migration
-- Fixes: RLS policies, Function search paths, Password protection, MFA
-- =============================================

-- 1. ENSURE REQUIRED COLUMNS EXIST AND ENABLE RLS
-- =============================================

-- Add missing columns to users table if they don't exist
DO $$ 
BEGIN
    -- Add wallet_address column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'wallet_address') THEN
        ALTER TABLE public.users ADD COLUMN wallet_address text UNIQUE;
    END IF;
    
    -- Add wallet_signature column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'wallet_signature') THEN
        ALTER TABLE public.users ADD COLUMN wallet_signature text;
    END IF;
END $$;

-- Enable RLS on all tables if not already enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Check if other tables exist before enabling RLS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assets') THEN
        ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'loans') THEN
        ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
        ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cross_chain_positions') THEN
        ALTER TABLE public.cross_chain_positions ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Create profiles table if it doesn't exist (for wallet integration)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_address text UNIQUE,
    wallet_signature text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. CREATE COMPREHENSIVE RLS POLICIES
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;

DROP POLICY IF EXISTS "Users can manage their own assets" ON public.assets;
DROP POLICY IF EXISTS "Users can manage their own loans" ON public.loans;
DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can manage their own positions" ON public.cross_chain_positions;

-- PROFILES TABLE POLICIES (This fixes the wallet saving error)
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
ON public.profiles FOR DELETE
USING (auth.uid() = id);

-- USERS TABLE POLICIES
CREATE POLICY "Users can view own data"
ON public.users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
ON public.users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own data"
ON public.users FOR INSERT
WITH CHECK (auth.uid() = id);

-- ASSETS TABLE POLICIES (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assets') THEN
        DROP POLICY IF EXISTS "Users can manage their own assets" ON public.assets;
        CREATE POLICY "Users can manage their own assets"
        ON public.assets FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- LOANS TABLE POLICIES (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'loans') THEN
        DROP POLICY IF EXISTS "Users can manage their own loans" ON public.loans;
        CREATE POLICY "Users can manage their own loans"
        ON public.loans FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- PAYMENTS TABLE POLICIES (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
        DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;
        CREATE POLICY "Users can manage their own payments"
        ON public.payments FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- CROSS CHAIN POSITIONS TABLE POLICIES (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cross_chain_positions') THEN
        DROP POLICY IF EXISTS "Users can manage their own positions" ON public.cross_chain_positions;
        CREATE POLICY "Users can manage their own positions"
        ON public.cross_chain_positions FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- ADMIN POLICIES (for admin users to view all data)
DO $$
BEGIN
    -- Admin policy for users table
    DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
    CREATE POLICY "Admins can view all users"
    ON public.users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND (
                wallet_address = ANY(ARRAY[
                    '0x742d35Cc6634C0532925a3b8D4C5fD7E492c0b17',  -- Admin wallet 1
                    '0x8ba1f109551bD432803012645Hac136c8c34DDD',   -- Admin wallet 2
                    -- Add more admin wallet addresses as needed
                    lower(COALESCE(current_setting('app.admin_wallet', true), ''))
                ])
            )
        )
    );

    -- Admin policy for assets table (only if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assets') THEN
        DROP POLICY IF EXISTS "Admins can manage all assets" ON public.assets;
        CREATE POLICY "Admins can manage all assets"
        ON public.assets FOR ALL
        USING (
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE id = auth.uid() 
                AND (
                    wallet_address = ANY(ARRAY[
                        '0x742d35Cc6634C0532925a3b8D4C5fD7E492c0b17',
                        '0x8ba1f109551bD432803012645Hac136c8c34DDD',
                        lower(COALESCE(current_setting('app.admin_wallet', true), ''))
                    ])
                )
            )
        );
    END IF;
END $$;

-- 3. FIX FUNCTION SEARCH PATH ISSUES
-- =============================================

-- Create or replace handle_new_user function with secure search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
    );
    
    -- Also create a profile entry
    INSERT INTO public.profiles (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- Create or replace handle_user_update function with secure search_path
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.users
    SET
        email = NEW.email,
        full_name = COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        updated_at = timezone('utc'::text, now())
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$;

-- Create triggers for the functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- 4. CREATE WALLET ADDRESS SAVE FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION public.save_wallet_address(
    user_id uuid,
    wallet_addr text,
    signature text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
    current_user_id uuid;
BEGIN
    -- Get current authenticated user ID
    current_user_id := auth.uid();
    
    -- Check if user is authenticated and owns this ID
    IF current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    IF current_user_id != user_id THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Unauthorized: Cannot update another user''s wallet address'
        );
    END IF;

    -- Validate wallet address format (basic validation)
    IF wallet_addr !~ '^0x[a-fA-F0-9]{40}$' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid wallet address format'
        );
    END IF;

    -- Insert or update the profile
    INSERT INTO public.profiles (id, wallet_address, wallet_signature, updated_at)
    VALUES (user_id, wallet_addr, signature, timezone('utc'::text, now()))
    ON CONFLICT (id)
    DO UPDATE SET
        wallet_address = EXCLUDED.wallet_address,
        wallet_signature = EXCLUDED.wallet_signature,
        updated_at = EXCLUDED.updated_at;

    -- Also update the users table
    UPDATE public.users
    SET 
        wallet_address = wallet_addr,
        wallet_signature = signature,
        updated_at = timezone('utc'::text, now())
    WHERE id = user_id;

    RETURN json_build_object(
        'success', true,
        'message', 'Wallet address saved successfully'
    );

EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Wallet address already exists for another user'
        );
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Failed to save wallet address: ' || SQLERRM
        );
END;
$$;

-- 5. CREATE INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_profiles_wallet_address ON public.profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON public.users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 6. GRANT PROPER PERMISSIONS
-- =============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant permissions on tables (only if they exist)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assets') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'loans') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.loans TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cross_chain_positions') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.cross_chain_positions TO authenticated;
    END IF;
END $$;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.save_wallet_address TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_user_update TO authenticated;

-- 7. SECURITY FUNCTION FOR ADMIN CHECK
-- =============================================

CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    target_user_id uuid;
BEGIN
    -- Use provided user_id or current authenticated user
    target_user_id := COALESCE(check_user_id, auth.uid());
    
    -- Return false if no user ID
    IF target_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    RETURN EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = target_user_id 
        AND (
            wallet_address = ANY(ARRAY[
                '0x742d35Cc6634C0532925a3b8D4C5fD7E492c0b17',
                '0x8ba1f109551bD432803012645Hac136c8c34DDD',
                COALESCE(current_setting('app.admin_wallet', true), '')
            ])
            OR 
            email = ANY(ARRAY[
                'admin@tangiblefi.com',
                COALESCE(current_setting('app.admin_email', true), '')
            ])
        )
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;

-- 8. CREATE AUDIT LOG TABLE FOR ADMIN ACTIONS
-- =============================================

CREATE TABLE IF NOT EXISTS public.admin_actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type text NOT NULL,
    target_id text,
    target_type text,
    details jsonb DEFAULT '{}',
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Drop existing admin actions policies if they exist
DROP POLICY IF EXISTS "Admins can view all admin actions" ON public.admin_actions;
DROP POLICY IF EXISTS "Admins can create admin actions" ON public.admin_actions;

-- Admin actions policies
CREATE POLICY "Admins can view all admin actions"
ON public.admin_actions FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins can create admin actions"
ON public.admin_actions FOR INSERT
WITH CHECK (public.is_admin() AND auth.uid() = admin_id);

-- Grant permissions
GRANT SELECT, INSERT ON public.admin_actions TO authenticated;

-- Create index
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON public.admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON public.admin_actions(created_at);

-- 9. FINAL VERIFICATION QUERIES
-- =============================================

-- Verify RLS is enabled on all tables
DO $$
DECLARE
    tbl text;
    rls_enabled boolean;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('SELECT relrowsecurity FROM pg_class WHERE relname = %L', tbl) INTO rls_enabled;
        IF NOT rls_enabled THEN
            RAISE NOTICE 'RLS is NOT enabled on table: %', tbl;
        ELSE
            RAISE NOTICE 'RLS is enabled on table: %', tbl;
        END IF;
    END LOOP;
END $$;

-- 10. CREATE ADDITIONAL POLICIES FOR ASSETS TABLE ACCESS
-- =============================================

-- Create assets table if it doesn't exist (basic structure)
CREATE TABLE IF NOT EXISTS public.assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    asset_type text NOT NULL,
    description text,
    current_value numeric(15,2) NOT NULL DEFAULT 0,
    original_value numeric(15,2) NOT NULL DEFAULT 0,
    verification_status text NOT NULL DEFAULT 'pending',
    collateralization_status text NOT NULL DEFAULT 'available',
    collateral_ratio numeric(5,2) DEFAULT 0,
    location text,
    documents jsonb DEFAULT '[]',
    blockchain text DEFAULT 'ethereum',
    token_address text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on assets table
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.assets;
DROP POLICY IF EXISTS "Users can read all assets" ON public.assets;
DROP POLICY IF EXISTS "Authenticated users can read assets" ON public.assets;
DROP POLICY IF EXISTS "Users can manage their own assets" ON public.assets;
DROP POLICY IF EXISTS "Admins can manage all assets" ON public.assets;

-- Policy 1: Allow authenticated users to read all assets (public data)
CREATE POLICY "Enable read for authenticated users"
ON public.assets FOR SELECT
TO authenticated
USING (true);

-- Policy 2: Users can manage their own assets
CREATE POLICY "Users can manage their own assets"
ON public.assets FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Admins can manage all assets
CREATE POLICY "Admins can manage all assets"
ON public.assets FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Grant permissions on assets table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON public.assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_verification_status ON public.assets(verification_status);
CREATE INDEX IF NOT EXISTS idx_assets_asset_type ON public.assets(asset_type);

-- 11. CREATE OTHER ESSENTIAL TABLES AND POLICIES
-- =============================================

-- Create loans table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.loans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_id uuid REFERENCES public.assets(id) ON DELETE CASCADE,
    loan_amount numeric(15,2) NOT NULL,
    outstanding_balance numeric(15,2) NOT NULL,
    interest_rate numeric(5,2) NOT NULL,
    loan_term_months integer NOT NULL,
    monthly_payment numeric(15,2) NOT NULL,
    next_payment_date date NOT NULL,
    loan_status text NOT NULL DEFAULT 'active',
    blockchain text DEFAULT 'ethereum',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable RLS and create policies for loans
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own loans" ON public.loans;
DROP POLICY IF EXISTS "Admins can manage all loans" ON public.loans;

CREATE POLICY "Users can manage their own loans"
ON public.loans FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all loans"
ON public.loans FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Create cross_chain_positions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.cross_chain_positions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    blockchain text NOT NULL,
    asset_address text NOT NULL,
    asset_symbol text NOT NULL,
    balance numeric(20,8) NOT NULL DEFAULT 0,
    usd_value numeric(15,2) NOT NULL DEFAULT 0,
    position_type text NOT NULL DEFAULT 'asset',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable RLS and create policies for cross_chain_positions
ALTER TABLE public.cross_chain_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own positions" ON public.cross_chain_positions;
DROP POLICY IF EXISTS "Admins can manage all positions" ON public.cross_chain_positions;

CREATE POLICY "Users can manage their own positions"
ON public.cross_chain_positions FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all positions"
ON public.cross_chain_positions FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Grant permissions on all tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cross_chain_positions TO authenticated;

-- Create additional indexes
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON public.loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_asset_id ON public.loans(asset_id);
CREATE INDEX IF NOT EXISTS idx_cross_chain_positions_user_id ON public.cross_chain_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_cross_chain_positions_blockchain ON public.cross_chain_positions(blockchain);

-- Set configuration variables
SELECT set_config('app.admin_wallet', '0x742d35Cc6634C0532925a3b8D4C5fD7E492c0b17', false);
SELECT set_config('app.admin_email', 'admin@tangiblefi.com', false);

-- Success message
SELECT 'TangibleFi Security Migration Completed Successfully!' as status;

-- =============================================
-- INSTRUCTIONS FOR MANUAL SUPABASE SETTINGS
-- =============================================

/*
IMPORTANT: Some settings need to be configured manually in Supabase Dashboard:

1. ENABLE LEAKED PASSWORD PROTECTION:
   - Go to: Authentication > Settings > Security
   - Toggle ON "Enable leaked password protection"

2. CONFIGURE MFA OPTIONS:
   - Go to: Authentication > Settings > Multi-Factor Authentication
   - Enable the following MFA methods:
     ✅ TOTP (Time-based One-Time Password)
     ✅ SMS (if you have Twilio configured)
     ✅ Email OTP
   
3. SET ADMIN WALLET ADDRESSES:
   - Go to: Settings > API > Configuration
   - Add these settings:
     - Key: app.admin_wallet
     - Value: 0x742d35Cc6634C0532925a3b8D4C5fD7E492c0b17
   - Add another for admin email:
     - Key: app.admin_email  
     - Value: admin@tangiblefi.com

4. VERIFY POLICIES:
   - Go to: Authentication > Policies
   - Ensure all tables have appropriate policies listed

5. TEST THE WALLET CONNECTION:
   - After running this migration, test wallet connection in your app
   - Check browser console for success message: "Wallet address saved successfully"

If you still get errors, check the Supabase logs:
- Go to: Logs > Database
- Look for any RLS policy violations or permission errors
*/

-- Run this in your SQL Editor after the migration
SELECT set_config('app.admin_wallet', '0x742d35Cc6634C0532925a3b8D4C5fD7E492c0b17', false);
SELECT set_config('app.admin_email', 'admin@tangiblefi.com', false); 