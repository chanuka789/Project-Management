-- =====================================================
-- QS Consultancy Project Management System
-- Database Schema for Supabase
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    birthday DATE,
    location VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================================
-- PROJECTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255),
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    contract_value DECIMAL(15,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'planning'
        CHECK (status IN ('planning', 'in_progress', 'on_hold', 'completed', 'cancelled')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add client_name column if not exists (migration for existing databases)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'projects' AND column_name = 'client_name') THEN
        ALTER TABLE projects ADD COLUMN client_name VARCHAR(255);
    END IF;
END $$;

-- Add location column if not exists (migration for existing databases)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'projects' AND column_name = 'location') THEN
        ALTER TABLE projects ADD COLUMN location TEXT;
    END IF;
END $$;

-- =====================================================
-- PROJECT_USERS TABLE (Many-to-Many)
-- =====================================================
CREATE TABLE IF NOT EXISTS project_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(project_id, user_id)
);

-- =====================================================
-- TASKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority VARCHAR(10) NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high')),
    due_date DATE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================================
-- TIME_ENTRIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    hours DECIMAL(4,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================================
-- ADDITIONAL_COSTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS additional_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
    date DATE NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================================
-- COMPANY_SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL DEFAULT 'QS Consultancy',
    logo_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================================
-- CLIENTS TABLE (For client contact details)
-- =====================================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    emails TEXT[] DEFAULT '{}',
    phones TEXT[] DEFAULT '{}',
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================================
-- PAYMENTS TABLE (For tracking client payments)
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'AED'
        CHECK (currency IN ('AED', 'USD', 'QAR', 'SAR', 'LKR')),
    payment_date DATE NOT NULL,
    due_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),
    payment_method VARCHAR(20)
        CHECK (payment_method IN ('bank_transfer', 'cash', 'cheque', 'credit_card', 'other')),
    reference_number VARCHAR(100),
    invoice_number VARCHAR(100),
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add currency column if not exists (migration for existing databases)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'payments' AND column_name = 'currency') THEN
        ALTER TABLE payments ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'AED'
            CHECK (currency IN ('AED', 'USD', 'QAR', 'SAR', 'LKR'));
    END IF;
END $$;

-- =====================================================
-- PAYMENT_RECEIPTS TABLE (For storing uploaded receipt files)
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER NOT NULL,
    description TEXT,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_project_users_user_id ON project_users(user_id);
CREATE INDEX IF NOT EXISTS idx_additional_costs_project_id ON additional_costs(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_project_id ON payments(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_project_id ON payment_receipts(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_payment_id ON payment_receipts(payment_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE additional_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;

-- USERS POLICIES
CREATE POLICY "Users can view all users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE
    USING ((select auth.uid()) = id)
    WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Admins can update any user" ON users
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
    );

CREATE POLICY "Admins can delete users" ON users
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
    );

CREATE POLICY "New users can insert their profile" ON users
    FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- PROJECTS POLICIES
CREATE POLICY "Users can view assigned projects" ON projects
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
        OR
        EXISTS (SELECT 1 FROM project_users WHERE project_id = projects.id AND user_id = (select auth.uid()))
    );

CREATE POLICY "Admins can manage projects" ON projects
    FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin'));

-- PROJECT_USERS POLICIES
CREATE POLICY "View project assignments" ON project_users
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage project assignments" ON project_users
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
    );

-- TASKS POLICIES
CREATE POLICY "View tasks" ON tasks
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
        OR assigned_to = (select auth.uid())
        OR EXISTS (SELECT 1 FROM project_users WHERE project_id = tasks.project_id AND user_id = (select auth.uid()))
    );

CREATE POLICY "Users can update assigned tasks" ON tasks
    FOR UPDATE USING (
        assigned_to = (select auth.uid())
    )
    WITH CHECK (
        assigned_to = (select auth.uid())
    );

CREATE POLICY "Admins can manage tasks" ON tasks
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
    );

-- TIME_ENTRIES POLICIES
CREATE POLICY "View time entries" ON time_entries
    FOR SELECT USING (
        user_id = (select auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
    );

CREATE POLICY "Users can manage own time entries" ON time_entries
    FOR ALL USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- Admin policy with explicit WITH CHECK for INSERT operations
CREATE POLICY "Admins can manage all time entries" ON time_entries
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
    );

-- =====================================================
-- MIGRATION: Fix RLS policies for existing databases
-- Run these commands in Supabase SQL Editor if admin
-- cannot insert time entries for other users:
-- =====================================================
-- DROP POLICY IF EXISTS "Users can manage own time entries" ON time_entries;
-- DROP POLICY IF EXISTS "Admins can manage all time entries" ON time_entries;
--
-- CREATE POLICY "Users can manage own time entries" ON time_entries
--     FOR ALL USING (user_id = auth.uid())
--     WITH CHECK (user_id = auth.uid());
--
-- CREATE POLICY "Admins can manage all time entries" ON time_entries
--     FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
--     WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
-- =====================================================

-- ADDITIONAL_COSTS POLICIES (consolidated into single policy)
CREATE POLICY "Admins can manage additional costs" ON additional_costs
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
    );

-- COMPANY_SETTINGS POLICIES
CREATE POLICY "Everyone can view company settings" ON company_settings
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage company settings" ON company_settings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
    );

-- CLIENTS POLICIES (consolidated into single policy)
CREATE POLICY "Admins can manage clients" ON clients
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
    );

-- PAYMENTS POLICIES (consolidated into single policy)
CREATE POLICY "Admins can manage payments" ON payments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
    );

-- PAYMENT_RECEIPTS POLICIES (consolidated into single policy)
CREATE POLICY "Admins can manage payment receipts" ON payment_receipts
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
    );

-- =====================================================
-- FUNCTIONS FOR AUTOMATIC TIMESTAMPS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
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

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_receipts_updated_at BEFORE UPDATE ON payment_receipts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INSERT DEFAULT COMPANY SETTINGS
-- =====================================================
INSERT INTO company_settings (company_name, logo_url)
VALUES ('QS Consultancy', NULL)
ON CONFLICT DO NOTHING;

-- =====================================================
-- STORAGE BUCKET FOR COMPANY ASSETS (Run in Supabase Dashboard)
-- =====================================================
-- NOTE: Create storage bucket 'company-assets' manually in Supabase Dashboard
-- Settings > Storage > New bucket > Name: company-assets, Public: true
