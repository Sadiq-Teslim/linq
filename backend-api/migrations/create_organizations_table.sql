-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    industry VARCHAR(100),
    logo_url TEXT,
    default_update_frequency VARCHAR(20) DEFAULT 'weekly',
    subscription_id INTEGER REFERENCES public.subscriptions(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscriptions table (if not exists)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id SERIAL PRIMARY KEY,
    plan VARCHAR(50) NOT NULL DEFAULT 'free_trial',
    status VARCHAR(50) NOT NULL DEFAULT 'trialing',
    price_monthly INTEGER DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'NGN',
    max_tracked_companies INTEGER DEFAULT 5,
    max_team_members INTEGER DEFAULT 1,
    max_contacts_per_company INTEGER DEFAULT 5,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    paystack_customer_code VARCHAR(255),
    paystack_subscription_code VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add organization_id to users table if not exists
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES public.organizations(id);

-- Create transactions table for payment history
CREATE TABLE IF NOT EXISTS public.transactions (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES public.organizations(id),
    user_id INTEGER REFERENCES public.users(id),
    paystack_reference VARCHAR(255) UNIQUE,
    paystack_customer_code VARCHAR(255),
    paystack_authorization_code VARCHAR(255),
    amount INTEGER NOT NULL,
    currency VARCHAR(10) DEFAULT 'NGN',
    plan VARCHAR(50),
    status VARCHAR(50) NOT NULL,
    gateway_response TEXT,
    metadata JSONB,
    transaction_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create access_codes table
CREATE TABLE IF NOT EXISTS public.access_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    organization_id INTEGER REFERENCES public.organizations(id),
    created_by_id INTEGER REFERENCES public.users(id),
    is_used BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_transactions_organization_id ON public.transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON public.transactions(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON public.access_codes(code);
CREATE INDEX IF NOT EXISTS idx_access_codes_organization_id ON public.access_codes(organization_id);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users (adjust as needed for your RLS policies)
-- For development, you can use service role key which bypasses RLS

