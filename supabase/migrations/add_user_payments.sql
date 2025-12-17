-- =====================================================
-- Migration: Add User Payments (Payments to Team Members)
-- =====================================================

-- Create user_payments table for tracking payments issued to users
CREATE TABLE IF NOT EXISTS user_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    amount_aed DECIMAL(15,2),
    currency VARCHAR(3) NOT NULL DEFAULT 'AED',
    exchange_rate DECIMAL(12,6) DEFAULT 1.0,
    exchange_rate_date DATE,
    payment_date DATE NOT NULL,
    payment_type VARCHAR(30) NOT NULL DEFAULT 'salary'
        CHECK (payment_type IN ('salary', 'bonus', 'reimbursement', 'advance', 'commission', 'other')),
    payment_method VARCHAR(20)
        CHECK (payment_method IN ('bank_transfer', 'cash', 'cheque', 'credit_card', 'other')),
    reference_number VARCHAR(100),
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'completed'
        CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS on user_payments table
ALTER TABLE user_payments ENABLE ROW LEVEL SECURITY;

-- User payments policies - admins can view and manage
CREATE POLICY "Admins can view user payments" ON user_payments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can manage user payments" ON user_payments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Users can view their own payments
CREATE POLICY "Users can view own payments" ON user_payments
    FOR SELECT USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_payments_user_id ON user_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_payments_project_id ON user_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_user_payments_payment_date ON user_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_user_payments_status ON user_payments(status);
CREATE INDEX IF NOT EXISTS idx_user_payments_payment_type ON user_payments(payment_type);

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_user_payments_updated_at BEFORE UPDATE ON user_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
