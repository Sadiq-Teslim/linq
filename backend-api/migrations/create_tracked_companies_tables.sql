-- Migration: Create tracked_companies, company_contacts, company_updates, and industry_news tables
-- Run this in Supabase SQL Editor

-- ============================================================================
-- 1. Tracked Companies Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tracked_companies (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    added_by_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    
    -- Company identification
    company_name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    linkedin_url VARCHAR(500),
    logo_url VARCHAR(500),
    website VARCHAR(500),
    
    -- Company details
    industry VARCHAR(100),
    employee_count VARCHAR(50),
    headquarters VARCHAR(255),
    description TEXT,
    
    -- Tracking settings
    is_priority BOOLEAN DEFAULT FALSE,
    update_frequency VARCHAR(20) DEFAULT 'weekly' CHECK (update_frequency IN ('daily', 'weekly', 'monthly')),
    notify_on_update BOOLEAN DEFAULT TRUE,
    tags JSONB,
    
    -- Data freshness
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_update_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for tracked_companies
CREATE INDEX IF NOT EXISTS idx_tracked_companies_organization_id ON public.tracked_companies(organization_id);
CREATE INDEX IF NOT EXISTS idx_tracked_companies_company_name ON public.tracked_companies(company_name);
CREATE INDEX IF NOT EXISTS idx_tracked_companies_domain ON public.tracked_companies(domain);
CREATE INDEX IF NOT EXISTS idx_tracked_companies_is_active ON public.tracked_companies(is_active);
CREATE INDEX IF NOT EXISTS idx_tracked_companies_is_priority ON public.tracked_companies(is_priority);

-- ============================================================================
-- 2. Company Contacts Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.company_contacts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES public.tracked_companies(id) ON DELETE CASCADE,
    
    -- Contact info
    full_name VARCHAR(255) NOT NULL, -- Backend schema uses 'full_name'
    title VARCHAR(255),
    department VARCHAR(100),
    
    -- Contact details
    email VARCHAR(255),
    phone VARCHAR(50),
    linkedin_url VARCHAR(500),
    
    -- Status and source
    is_decision_maker BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_score FLOAT,
    source VARCHAR(100),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_verified TIMESTAMP WITH TIME ZONE
);

-- Indexes for company_contacts
CREATE INDEX IF NOT EXISTS idx_company_contacts_company_id ON public.company_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_company_contacts_is_active ON public.company_contacts(is_active);
CREATE INDEX IF NOT EXISTS idx_company_contacts_is_decision_maker ON public.company_contacts(is_decision_maker);

-- ============================================================================
-- 3. Company Updates Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.company_updates (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES public.tracked_companies(id) ON DELETE CASCADE,
    
    -- Update content
    update_type VARCHAR(50) DEFAULT 'news' CHECK (update_type IN ('funding', 'hiring', 'expansion', 'partnership', 'product_launch', 'leadership_change', 'news', 'contact_change')),
    title VARCHAR(500) NOT NULL, -- Backend model and schema use 'title'
    summary TEXT,
    content TEXT,
    
    -- Source
    source_url TEXT,
    source_name VARCHAR(255),
    
    -- Relevance and importance
    importance VARCHAR(20) DEFAULT 'medium' CHECK (importance IN ('low', 'medium', 'high', 'critical')),
    relevance_score FLOAT,
    is_important BOOLEAN DEFAULT FALSE,
    
    -- Read tracking
    is_read BOOLEAN DEFAULT FALSE,
    read_by_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for company_updates
CREATE INDEX IF NOT EXISTS idx_company_updates_company_id ON public.company_updates(company_id);
CREATE INDEX IF NOT EXISTS idx_company_updates_is_read ON public.company_updates(is_read);
CREATE INDEX IF NOT EXISTS idx_company_updates_detected_at ON public.company_updates(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_company_updates_importance ON public.company_updates(importance);

-- ============================================================================
-- 4. Industry News Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.industry_news (
    id SERIAL PRIMARY KEY,
    
    -- Classification
    industry VARCHAR(100) NOT NULL,
    news_type VARCHAR(50),
    
    -- Content
    headline VARCHAR(500) NOT NULL,
    summary TEXT,
    
    -- Companies mentioned
    companies_mentioned JSONB,
    
    -- Source
    source_url TEXT,
    source_name VARCHAR(255),
    
    -- Relevance
    relevance_score FLOAT,
    
    -- Timestamps
    published_at TIMESTAMP WITH TIME ZONE,
    indexed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for industry_news
CREATE INDEX IF NOT EXISTS idx_industry_news_industry ON public.industry_news(industry);
CREATE INDEX IF NOT EXISTS idx_industry_news_news_type ON public.industry_news(news_type);
CREATE INDEX IF NOT EXISTS idx_industry_news_published_at ON public.industry_news(published_at DESC);

-- ============================================================================
-- Enable Row Level Security (RLS) - Allow service role access
-- ============================================================================

-- Enable RLS on tracked_companies
ALTER TABLE public.tracked_companies ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything (for backend API)
DROP POLICY IF EXISTS "Service role full access on tracked_companies" ON public.tracked_companies;
CREATE POLICY "Service role full access on tracked_companies" ON public.tracked_companies
    FOR ALL
    USING (auth.role() = 'service_role');

-- Enable RLS on company_contacts
ALTER TABLE public.company_contacts ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything (for backend API)
DROP POLICY IF EXISTS "Service role full access on company_contacts" ON public.company_contacts;
CREATE POLICY "Service role full access on company_contacts" ON public.company_contacts
    FOR ALL
    USING (auth.role() = 'service_role');

-- Enable RLS on company_updates
ALTER TABLE public.company_updates ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything (for backend API)
DROP POLICY IF EXISTS "Service role full access on company_updates" ON public.company_updates;
CREATE POLICY "Service role full access on company_updates" ON public.company_updates
    FOR ALL
    USING (auth.role() = 'service_role');

-- Enable RLS on industry_news
ALTER TABLE public.industry_news ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything (for backend API)
DROP POLICY IF EXISTS "Service role full access on industry_news" ON public.industry_news;
CREATE POLICY "Service role full access on industry_news" ON public.industry_news
    FOR ALL
    USING (auth.role() = 'service_role');

