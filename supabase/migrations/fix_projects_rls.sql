-- =====================================================
-- MIGRATION: Fix RLS policies for projects table
-- This fixes the "Unable to update project" error when
-- admin tries to edit project details after creation.
-- =====================================================
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- =====================================================

-- Drop existing "Admins can manage projects" policy
DROP POLICY IF EXISTS "Admins can manage projects" ON projects;

-- Recreate with proper WITH CHECK clause
CREATE POLICY "Admins can manage projects" ON projects
    FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'projects';
