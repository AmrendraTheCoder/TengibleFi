-- Clean up orphaned data and add foreign key relationships
-- This migration fixes orphaned records before adding foreign key constraints

-- Step 1: Clean up orphaned assets (assets with user_id that don't exist in profiles)
DELETE FROM assets 
WHERE user_id NOT IN (SELECT id FROM profiles WHERE id IS NOT NULL);

-- Step 2: Clean up orphaned transactions (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
        DELETE FROM transactions 
        WHERE user_id NOT IN (SELECT id FROM profiles WHERE id IS NOT NULL);
    END IF;
END $$;

-- Step 3: Clean up orphaned loans (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'loans') THEN
        DELETE FROM loans 
        WHERE user_id NOT IN (SELECT id FROM profiles WHERE id IS NOT NULL);
    END IF;
END $$;

-- Step 4: Add foreign key constraint linking assets.user_id to profiles.id
ALTER TABLE assets 
ADD CONSTRAINT fk_assets_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Step 5: Add foreign key constraints for other tables (if they exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'fk_transactions_user_id' 
                      AND table_name = 'transactions') THEN
            ALTER TABLE transactions 
            ADD CONSTRAINT fk_transactions_user_id 
            FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'loans') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'fk_loans_user_id' 
                      AND table_name = 'loans') THEN
            ALTER TABLE loans 
            ADD CONSTRAINT fk_loans_user_id 
            FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Step 6: Create indexes on foreign key columns for better performance
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
        CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'loans') THEN
        CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
    END IF;
END $$;

-- Step 7: Insert some sample data to test the relationships
-- First, ensure we have at least one profile for testing
INSERT INTO profiles (id, wallet_address, full_name, email, kyc_status, account_status, created_at, updated_at)
VALUES 
    ('fdfbc753-e956-4b6a-8c44-f25f9d428d6d', '0x1234567890123456789012345678901234567890', 'Test User', 'test@example.com', 'pending', 'active', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    wallet_address = EXCLUDED.wallet_address,
    updated_at = NOW();

-- Add a sample asset linked to this profile
INSERT INTO assets (id, user_id, name, symbol, asset_type, value, status, created_at, updated_at)
VALUES 
    (gen_random_uuid(), 'fdfbc753-e956-4b6a-8c44-f25f9d428d6d', 'Sample Real Estate Token', 'SRET', 'real_estate', 100000.00, 'pending', NOW(), NOW())
ON CONFLICT DO NOTHING; 