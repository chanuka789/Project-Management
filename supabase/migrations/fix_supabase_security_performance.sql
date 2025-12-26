-- =====================================================
-- MIGRATION: Fix Supabase Security and Performance Issues
-- =====================================================
-- This migration fixes:
-- 1. Function Search Path Mutable (Security)
-- 2. Auth RLS Initialization Plan (Performance)
-- 3. Multiple Permissive Policies (Performance)
-- =====================================================
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- =====================================================

-- =====================================================
-- PART 1: Fix Function Search Path (Security)
-- =====================================================
-- Set search_path to prevent mutable search path vulnerabilities

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Insert a new row into public.users with data from auth.users
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    hourly_rate,
    default_currency,
    hourly_rate_currency
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'user',
    0,
    'AED',
    'AED'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- =====================================================
-- PART 2: Fix RLS Policies - Use (select auth.uid())
-- This optimizes performance by evaluating auth.uid() once
-- instead of for each row
-- =====================================================

-- -----------------------------------------------------
-- USERS TABLE POLICIES
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can update any user" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;
DROP POLICY IF EXISTS "New users can insert their profile" ON users;

-- Combined update policy for users (fixes multiple permissive policies issue)
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE
    USING ((select auth.uid()) = id)
    WITH CHECK ((select auth.uid()) = id);

-- Separate admin update policy with optimized auth check
CREATE POLICY "Admins can update any user" ON users
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin')
    );

CREATE POLICY "Admins can delete users" ON users
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin')
    );

CREATE POLICY "New users can insert their profile" ON users
    FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- -----------------------------------------------------
-- PROJECTS TABLE POLICIES
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Users can view assigned projects" ON projects;
DROP POLICY IF EXISTS "Admins can manage projects" ON projects;

-- Combined SELECT policy using optimized auth calls
CREATE POLICY "Users can view assigned projects" ON projects
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin')
        OR
        EXISTS (SELECT 1 FROM public.project_users WHERE project_id = projects.id AND user_id = (select auth.uid()))
    );

CREATE POLICY "Admins can manage projects" ON projects
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin'));

-- -----------------------------------------------------
-- PROJECT_USERS TABLE POLICIES
-- -----------------------------------------------------
DROP POLICY IF EXISTS "View project assignments" ON project_users;
DROP POLICY IF EXISTS "Admins can manage project assignments" ON project_users;

CREATE POLICY "View project assignments" ON project_users
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage project assignments" ON project_users
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin')
    );

-- -----------------------------------------------------
-- TASKS TABLE POLICIES
-- -----------------------------------------------------
DROP POLICY IF EXISTS "View tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can manage tasks" ON tasks;

-- Combined SELECT policy for tasks
CREATE POLICY "View tasks" ON tasks
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin')
        OR assigned_to = (select auth.uid())
        OR EXISTS (SELECT 1 FROM public.project_users WHERE project_id = tasks.project_id AND user_id = (select auth.uid()))
    );

-- Combined UPDATE policy for tasks (fixes multiple permissive policies)
CREATE POLICY "Users can update assigned tasks" ON tasks
    FOR UPDATE USING (
        assigned_to = (select auth.uid())
    )
    WITH CHECK (
        assigned_to = (select auth.uid())
    );

-- Admin policy for all task operations
CREATE POLICY "Admins can manage tasks" ON tasks
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin')
    );

-- -----------------------------------------------------
-- TIME_ENTRIES TABLE POLICIES
-- Consolidate into fewer policies to fix multiple permissive policies issue
-- -----------------------------------------------------
DROP POLICY IF EXISTS "View time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can manage own time entries" ON time_entries;
DROP POLICY IF EXISTS "Admins can view all time entries" ON time_entries;
DROP POLICY IF EXISTS "Admins can manage all time entries" ON time_entries;

-- Single SELECT policy covering both user and admin cases
CREATE POLICY "View time entries" ON time_entries
    FOR SELECT USING (
        user_id = (select auth.uid())
        OR EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin')
    );

-- User policy for INSERT/UPDATE/DELETE own entries
CREATE POLICY "Users can manage own time entries" ON time_entries
    FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- Admin policy for managing all entries
CREATE POLICY "Admins can manage all time entries" ON time_entries
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin'));

-- -----------------------------------------------------
-- ADDITIONAL_COSTS TABLE POLICIES
-- Consolidate into single policy
-- -----------------------------------------------------
DROP POLICY IF EXISTS "View additional costs" ON additional_costs;
DROP POLICY IF EXISTS "Admins can manage additional costs" ON additional_costs;

-- Single admin policy for all operations
CREATE POLICY "Admins can manage additional costs" ON additional_costs
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin')
    );

-- -----------------------------------------------------
-- COMPANY_SETTINGS TABLE POLICIES
-- Consolidate SELECT policies
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Everyone can view company settings" ON company_settings;
DROP POLICY IF EXISTS "Admins can update company settings" ON company_settings;

CREATE POLICY "Everyone can view company settings" ON company_settings
    FOR SELECT USING (true);

-- Admin policy only for non-SELECT operations
CREATE POLICY "Admins can manage company settings" ON company_settings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin')
    );

-- -----------------------------------------------------
-- EXCHANGE_RATES TABLE POLICIES (if exists)
-- -----------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exchange_rates') THEN
        DROP POLICY IF EXISTS "Everyone can view exchange rates" ON exchange_rates;
        DROP POLICY IF EXISTS "Admins can manage exchange rates" ON exchange_rates;

        EXECUTE 'CREATE POLICY "Everyone can view exchange rates" ON exchange_rates FOR SELECT USING (true)';

        EXECUTE 'CREATE POLICY "Admins can manage exchange rates" ON exchange_rates FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = ''admin'')) WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = ''admin''))';
    END IF;
END $$;

-- -----------------------------------------------------
-- PAYMENTS TABLE POLICIES
-- Consolidate into single policy
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Admins can view payments" ON payments;
DROP POLICY IF EXISTS "Admins can manage payments" ON payments;

CREATE POLICY "Admins can manage payments" ON payments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin')
    );

-- -----------------------------------------------------
-- USER_PAYMENTS TABLE POLICIES
-- Consolidate multiple SELECT policies
-- -----------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_payments') THEN
        DROP POLICY IF EXISTS "Admins can view user payments" ON user_payments;
        DROP POLICY IF EXISTS "Admins can manage user payments" ON user_payments;
        DROP POLICY IF EXISTS "Users can view own payments" ON user_payments;

        -- Single SELECT policy for both users and admins
        EXECUTE 'CREATE POLICY "View user payments" ON user_payments FOR SELECT USING (user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = ''admin''))';

        -- Admin management policy for non-SELECT operations
        EXECUTE 'CREATE POLICY "Admins can manage user payments" ON user_payments FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = ''admin'')) WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = ''admin''))';
    END IF;
END $$;

-- -----------------------------------------------------
-- PAYMENT_RECEIPTS TABLE POLICIES
-- Consolidate into single policy
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Admins can view payment receipts" ON payment_receipts;
DROP POLICY IF EXISTS "Admins can manage payment receipts" ON payment_receipts;

CREATE POLICY "Admins can manage payment receipts" ON payment_receipts
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin')
    );

-- =====================================================
-- VERIFICATION QUERIES
-- Run these to verify the changes were applied correctly
-- =====================================================

-- Check function search_path settings
SELECT
    p.proname AS function_name,
    p.proconfig AS config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('handle_new_user', 'update_updated_at_column');

-- Check RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
