-- =====================================================
-- MIGRATION: Fix RLS policies for time_entries table
-- This fixes the "Failed to add time entry" error when
-- admin tries to book hours for other users.
-- =====================================================
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage own time entries" ON time_entries;
DROP POLICY IF EXISTS "Admins can manage all time entries" ON time_entries;

-- Recreate with proper WITH CHECK clauses
CREATE POLICY "Users can manage own time entries" ON time_entries
    FOR ALL USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all time entries" ON time_entries
    FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'time_entries';
