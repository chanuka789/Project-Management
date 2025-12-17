-- =====================================================
-- Migration: Add Default Currency to Users
-- =====================================================

-- Add default_currency column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_currency VARCHAR(3) DEFAULT 'AED';

-- Update existing users to have AED as default
UPDATE users SET default_currency = 'AED' WHERE default_currency IS NULL;
