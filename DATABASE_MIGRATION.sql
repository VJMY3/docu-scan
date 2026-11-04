-- ============================================================
-- Photo Gallery Management System - Database Migration Script
-- ============================================================
-- Run this script in your Supabase SQL Editor to add folder support
-- to your existing inventory_scans table.
--
-- This is safe to run multiple times (idempotent).
-- ============================================================

-- Add folder column to inventory_scans table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'inventory_scans' 
        AND column_name = 'folder'
    ) THEN
        ALTER TABLE public.inventory_scans 
        ADD COLUMN folder TEXT;
        
        RAISE NOTICE 'Successfully added folder column to inventory_scans table';
    ELSE
        RAISE NOTICE 'Column folder already exists in inventory_scans table';
    END IF;
END $$;

-- Verify the migration
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'inventory_scans'
ORDER BY ordinal_position;

-- ============================================================
-- Expected Output:
-- The query should show all columns including the new 'folder' column
-- ============================================================
