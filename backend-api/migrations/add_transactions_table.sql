-- Add transactions table for payment history
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    
    -- Paystack transaction details
    paystack_reference VARCHAR(255) UNIQUE NOT NULL,
    paystack_customer_code VARCHAR(255),
    paystack_authorization_code VARCHAR(255),
    
    -- Transaction details
    amount INTEGER NOT NULL, -- Amount in kobo/minor units
    currency VARCHAR(3) DEFAULT 'NGN',
    plan VARCHAR(50), -- Subscription plan purchased
    
    -- Status
    status VARCHAR(50) NOT NULL, -- success, pending, failed
    gateway_response TEXT,
    
    -- Metadata
    metadata JSONB, -- Additional transaction metadata
    
    -- Timestamps
    transaction_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_transactions_org_id ON transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC);

-- RLS Policy
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on transactions" ON transactions;

CREATE POLICY "Service role full access on transactions" ON transactions
    FOR ALL
    USING (auth.role() = 'service_role');

-- Trigger for updated_at
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

