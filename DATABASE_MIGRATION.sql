-- ============================================================
-- Photo Gallery Management System - Database Migration Script
-- ============================================================
-- Run this script in your Supabase SQL Editor to add folder support
-- to your existing inventory_scans table.
--
-- This is safe to run multiple times (idempotent).
-- ============================================================

-- 1. Add folder column to inventory_scans table if it doesn't exist
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

-- 2. Create folders table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS) on folders table
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- 4. Allow Public Full Access on folders table
DROP POLICY IF EXISTS "Allow public all folders" ON public.folders;
CREATE POLICY "Allow public all folders" 
ON public.folders 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- 5. Create index on folder name for faster lookups
CREATE INDEX IF NOT EXISTS idx_folders_name ON public.folders(name);

-- Verify the migration
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'inventory_scans'
ORDER BY ordinal_position;

SELECT * FROM public.folders ORDER BY name;

-- ============================================================
-- Expected Output:
-- 1. The first query should show all columns including the new 'folder' column
-- 2. The second query should show all folders (may be empty initially)
-- ============================================================
