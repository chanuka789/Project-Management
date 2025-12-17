-- =====================================================
-- Migration: Add Multi-Currency Support
-- =====================================================

-- Add currency column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'AED';

-- Add exchange rate columns to projects table
-- contract_value_aed stores the AED equivalent at time of creation/update
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contract_value_aed DECIMAL(15,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(12,6) DEFAULT 1.0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS exchange_rate_date DATE;

-- Update existing projects to have AED as currency and set contract_value_aed
UPDATE projects SET
    currency = 'AED',
    contract_value_aed = contract_value,
    exchange_rate = 1.0,
    exchange_rate_date = CURRENT_DATE
WHERE currency IS NULL OR contract_value_aed IS NULL;

-- Create exchange_rates table to store historical exchange rates
CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL DEFAULT 'AED',
    rate DECIMAL(12,6) NOT NULL,
    rate_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(from_currency, to_currency, rate_date)
);

-- Enable RLS on exchange_rates table
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Exchange rates policies - everyone can view
CREATE POLICY "Everyone can view exchange rates" ON exchange_rates
    FOR SELECT USING (true);

-- Only admins can manage exchange rates
CREATE POLICY "Admins can manage exchange rates" ON exchange_rates
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Create index for faster exchange rate lookups
CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup ON exchange_rates(from_currency, to_currency, rate_date DESC);

-- Insert default exchange rates (approximate rates as of 2024)
-- These will be used as fallback rates
INSERT INTO exchange_rates (from_currency, to_currency, rate, rate_date) VALUES
    ('AED', 'AED', 1.000000, CURRENT_DATE),
    ('USD', 'AED', 3.672500, CURRENT_DATE),
    ('QAR', 'AED', 1.009000, CURRENT_DATE),
    ('SAR', 'AED', 0.979330, CURRENT_DATE),
    ('LKR', 'AED', 0.012500, CURRENT_DATE)
ON CONFLICT (from_currency, to_currency, rate_date) DO NOTHING;
