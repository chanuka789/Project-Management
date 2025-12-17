-- =====================================================
-- MIGRATION: Add client_name column to projects table
-- This fixes the "Could not find the 'client_name' column" error
-- =====================================================
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- =====================================================

-- Add client_name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'projects'
        AND column_name = 'client_name'
    ) THEN
        ALTER TABLE projects ADD COLUMN client_name VARCHAR(255);
        RAISE NOTICE 'Column client_name added to projects table';
    ELSE
        RAISE NOTICE 'Column client_name already exists';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;
