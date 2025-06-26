-- Add risk_score column to assets table (collateral_ratio already exists)
-- This migration adds the missing risk_score column to the assets table

-- Only add risk_score if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='assets' AND column_name='risk_score') THEN
        ALTER TABLE public.assets ADD COLUMN risk_score NUMERIC DEFAULT 0;
    END IF;
END $$;

-- Add comment to document the column
COMMENT ON COLUMN public.assets.risk_score IS 'Risk assessment score for the asset (0-100 scale)'; 