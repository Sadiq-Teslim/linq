-- LINQ AI Supabase Database Schema
-- Run this in your Supabase SQL Editor to create the required tables

-- =============================================
-- USERS TABLE
-- Stores user accounts and subscription info
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    company_name VARCHAR(255),

    -- Subscription status
    is_active BOOLEAN DEFAULT TRUE,
    subscription_tier VARCHAR(50) DEFAULT 'free', -- free, pro, enterprise
    subscription_expires_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =============================================
-- USER SESSIONS TABLE
-- Tracks active sessions for Netflix-model enforcement
-- Only ONE active session per user at any time
-- =============================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Session identification
    session_token TEXT UNIQUE NOT NULL,
    device_info TEXT,
    ip_address VARCHAR(45), -- IPv4 or IPv6

    -- Session state
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revoked_reason VARCHAR(100) -- 'new_login', 'logout', 'expired'
);

-- Indexes for session lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(user_id, is_active) WHERE is_active = TRUE;

-- =============================================
-- COMPANY CACHE TABLE
-- Caches company intelligence to reduce API calls
-- =============================================
CREATE TABLE IF NOT EXISTS company_cache (
    id BIGSERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    company_domain VARCHAR(255),
    country VARCHAR(100),

    -- Company profile data (JSON for flexibility)
    profile_data JSONB,

    -- Decision makers found
    decision_makers JSONB, -- Array of executives

    -- AI-generated insights
    ai_summary TEXT,
    conversion_score INTEGER CHECK (conversion_score >= 0 AND conversion_score <= 100),
    predicted_pain_points JSONB, -- Array of strings

    -- Data freshness
    data_sources JSONB, -- Array of sources used
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Indexes for company lookups
CREATE INDEX IF NOT EXISTS idx_company_cache_name ON company_cache(company_name);
CREATE INDEX IF NOT EXISTS idx_company_cache_domain ON company_cache(company_domain);
CREATE INDEX IF NOT EXISTS idx_company_cache_updated ON company_cache(updated_at);

-- =============================================
-- ACTIVITY FEED TABLE
-- Live feed items for continuous activity stream
-- =============================================
CREATE TABLE IF NOT EXISTS activity_feed (
    id BIGSERIAL PRIMARY KEY,

    -- Event classification
    event_type VARCHAR(50) NOT NULL, -- funding, partnership, hiring, expansion, news
    headline VARCHAR(500) NOT NULL,
    summary TEXT,

    -- Company association
    company_name VARCHAR(255),
    company_domain VARCHAR(255),

    -- Location
    country VARCHAR(100), -- Nigeria, Ghana
    region VARCHAR(100), -- Lagos, Accra, etc.

    -- Source tracking
    source_url TEXT,
    source_name VARCHAR(255),
    source_language VARCHAR(20) DEFAULT 'en', -- en, fr, pidgin

    -- Relevance scoring
    relevance_score FLOAT,

    -- Timestamps
    published_at TIMESTAMPTZ,
    indexed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for feed queries
CREATE INDEX IF NOT EXISTS idx_feed_event_type ON activity_feed(event_type);
CREATE INDEX IF NOT EXISTS idx_feed_country ON activity_feed(country);
CREATE INDEX IF NOT EXISTS idx_feed_indexed ON activity_feed(indexed_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_company ON activity_feed(company_name);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS for secure access
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything (for backend API)
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Service role full access on users" ON users;
DROP POLICY IF EXISTS "Service role full access on sessions" ON user_sessions;
DROP POLICY IF EXISTS "Service role full access on company_cache" ON company_cache;
DROP POLICY IF EXISTS "Service role full access on activity_feed" ON activity_feed;

CREATE POLICY "Service role full access on users" ON users
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on sessions" ON user_sessions
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on company_cache" ON company_cache
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on activity_feed" ON activity_feed
    FOR ALL
    USING (auth.role() = 'service_role');

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_cache_updated_at
    BEFORE UPDATE ON company_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================

-- Uncomment to insert sample data:
/*
INSERT INTO activity_feed (event_type, headline, summary, company_name, country, source_name, indexed_at)
VALUES
    ('funding', 'Paystack raises $200M Series C', 'Nigerian fintech giant Paystack announced a massive Series C round led by Stripe.', 'Paystack', 'Nigeria', 'TechCrunch', NOW()),
    ('partnership', 'Flutterwave partners with Visa for African expansion', 'Pan-African payments company expands its partnership with Visa.', 'Flutterwave', 'Nigeria', 'Disrupt Africa', NOW()),
    ('hiring', 'Andela opens 500 new engineering positions', 'Talent marketplace Andela announces major hiring push across West Africa.', 'Andela', 'Nigeria', 'TechCabal', NOW()),
    ('expansion', 'Jumia launches same-day delivery in Accra', 'E-commerce leader expands logistics capabilities to Ghana.', 'Jumia', 'Ghana', 'TechPoint Africa', NOW());
*/
