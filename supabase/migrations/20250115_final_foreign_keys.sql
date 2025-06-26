-- Clean up orphaned data and add foreign key relationships
-- This migration fixes orphaned records before adding foreign key constraints
-- Uses correct table structure matching the actual users table

-- Step 1: Clean up orphaned assets (assets with user_id that don't exist in users)
DELETE FROM assets 
WHERE user_id NOT IN (SELECT id FROM users WHERE id IS NOT NULL);

-- Step 2: Clean up orphaned loans (if any loans reference non-existent users)
DELETE FROM loans 
WHERE user_id NOT IN (SELECT id FROM users WHERE id IS NOT NULL);

-- Step 3: Clean up orphaned payments (if any payments reference non-existent users)
DELETE FROM payments 
WHERE user_id NOT IN (SELECT id FROM users WHERE id IS NOT NULL);

-- Step 4: Clean up orphaned cross_chain_positions (if any reference non-existent users)
DELETE FROM cross_chain_positions 
WHERE user_id NOT IN (SELECT id FROM users WHERE id IS NOT NULL);

-- Step 5: Drop existing foreign key constraints if they exist (in case of previous failed attempts)
DO $$ 
BEGIN
    -- Drop constraints if they exist
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'fk_assets_user_id' AND table_name = 'assets') THEN
        ALTER TABLE assets DROP CONSTRAINT fk_assets_user_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'fk_loans_user_id' AND table_name = 'loans') THEN
        ALTER TABLE loans DROP CONSTRAINT fk_loans_user_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'fk_payments_user_id' AND table_name = 'payments') THEN
        ALTER TABLE payments DROP CONSTRAINT fk_payments_user_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'fk_cross_chain_positions_user_id' AND table_name = 'cross_chain_positions') THEN
        ALTER TABLE cross_chain_positions DROP CONSTRAINT fk_cross_chain_positions_user_id;
    END IF;
END $$;

-- Step 6: Add foreign key constraints linking to the 'users' table
ALTER TABLE assets 
ADD CONSTRAINT fk_assets_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE loans 
ADD CONSTRAINT fk_loans_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE payments 
ADD CONSTRAINT fk_payments_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE cross_chain_positions 
ADD CONSTRAINT fk_cross_chain_positions_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 7: Create indexes on foreign key columns for better performance
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_cross_chain_positions_user_id ON cross_chain_positions(user_id);

-- Step 8: Insert sample data using the correct column structure
-- First, ensure we have at least one user for testing
INSERT INTO users (
    id, 
    email, 
    full_name, 
    wallet_address,
    token_identifier,
    created_at, 
    updated_at
)
VALUES (
    'fdfbc753-e956-4b6a-8c44-f25f9d428d6d', 
    'test@example.com', 
    'Test User', 
    '0x1234567890123456789012345678901234567890',
    'TEST_TOKEN_001',
    NOW(), 
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    wallet_address = EXCLUDED.wallet_address,
    token_identifier = EXCLUDED.token_identifier,
    updated_at = NOW();

-- Add sample assets linked to this user
INSERT INTO assets (
    id, 
    user_id, 
    name, 
    asset_type, 
    description, 
    current_value, 
    original_value, 
    verification_status, 
    collateralization_status, 
    location, 
    blockchain
)
VALUES 
    (
        gen_random_uuid(), 
        'fdfbc753-e956-4b6a-8c44-f25f9d428d6d', 
        'Sample Real Estate Token', 
        'real_estate', 
        'Test property for admin demo', 
        100000.00, 
        95000.00, 
        'pending', 
        'available', 
        'San Francisco, CA', 
        'ethereum'
    ),
    (
        gen_random_uuid(), 
        'fdfbc753-e956-4b6a-8c44-f25f9d428d6d', 
        'Commercial Building Token', 
        'commercial_real_estate', 
        'Office building in downtown', 
        250000.00, 
        240000.00, 
        'pending', 
        'available', 
        'New York, NY', 
        'polygon'
    )
ON CONFLICT DO NOTHING; 