-- Add hourly_rate_currency column to users table
-- This allows admin to set the currency for each user's hourly rate

-- Add the hourly_rate_currency column
ALTER TABLE users ADD COLUMN IF NOT EXISTS hourly_rate_currency VARCHAR(3) DEFAULT 'AED';

-- Update any existing users to have AED as default hourly rate currency
UPDATE users SET hourly_rate_currency = 'AED' WHERE hourly_rate_currency IS NULL;
