-- Add Foreign Key Relationships
-- This migration adds the missing foreign key constraint between assets and profiles tables
-- to fix the "Could not find a relationship between 'assets' and 'profiles'" error

-- Add foreign key constraint linking assets.user_id to profiles.id
ALTER TABLE assets 
ADD CONSTRAINT fk_assets_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add foreign key constraint linking transactions.user_id to profiles.id (if transactions table exists)
-- This prevents future similar issues
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

-- Add foreign key constraint linking loans.user_id to profiles.id (if loans table exists)
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

-- Create indexes on foreign key columns for better performance
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);

-- Refresh the Supabase schema cache
NOTIFY pgrst, 'reload schema'; 