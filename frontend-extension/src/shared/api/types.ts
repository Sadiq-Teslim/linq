/**
 * LINQ B2B Sales Intelligence Platform - Core Types
 */

// ============== Base API Types ==============

export interface ApiError {
  detail: string;
  status: number;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
  has_prev: boolean;
}

// ============== Subscription & Billing ==============

export type SubscriptionPlan =
  | "free_trial"
  | "starter"
  | "professional"
  | "enterprise";
export type SubscriptionStatus =
  | "active"
  | "cancelled"
  | "past_due"
  | "trialing";

export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  max_tracked_companies: number;
  max_team_members: number;
  // Optional fields that may or may not be returned
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
  trial_ends_at?: string;
  features?: string[];
}

export interface PlanDetails {
  id: SubscriptionPlan;
  name: string;
  price_monthly: number;
  price_yearly: number;
  max_tracked_companies: number;
  max_team_members: number;
  features: string[];
  is_popular?: boolean;
}

// ============== Organization & Team ==============

export interface Organization {
  id: string;
  name: string;
  industry: string;
  website?: string;
  logo_url?: string;
  subscription: SubscriptionInfo;
  created_at: string;
}

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "member";
  avatar_url?: string;
  is_active: boolean;
  last_login?: string;
  invited_at: string;
  joined_at?: string;
}

// ============== Tracked Companies (Monitor Board) ==============

export interface TrackedCompany {
  id: string;
  company_name: string;
  domain?: string;
  industry?: string;
  headquarters?: string;
  logo_url?: string;
  website?: string;
  employee_count?: string;
  description?: string;
  linkedin_url?: string;
  added_at: string;
  added_by: string;
  last_updated: string;
  update_frequency: "daily" | "weekly" | "monthly";
  is_priority: boolean;
  tags: string[];
  notes?: string;
}

export interface CompanyContact {
  id: string;
  company_id: string;
  full_name: string; // Backend uses 'full_name', not 'name'
  name?: string; // Keep for backward compatibility, map from full_name
  title: string;
  department:
    | "sales"
    | "marketing"
    | "executive"
    | "operations"
    | "finance"
    | "hr"
    | "engineering"
    | "other";
  email?: string;
  phone?: string;
  linkedin_url?: string;
  is_decision_maker: boolean;
  is_verified?: boolean; // Optional, backend may not always provide
  verification_score?: number; // Backend uses 'confidence_score', mapped below
  confidence_score?: number; // Backend field name
  last_verified?: string;
  source?: string; // Backend provides source (e.g., "crunchbase", "hunter.io")
  is_active?: boolean; // Backend field
  previous_positions?: {
    title: string;
    company: string;
    end_date: string;
  }[];
}

export interface CompanyUpdate {
  id: string;
  company_id: string;
  update_type:
    | "funding"
    | "hiring"
    | "expansion"
    | "partnership"
    | "product_launch"
    | "leadership_change"
    | "news"
    | "contact_change";
  headline: string;
  summary: string;
  source_url?: string;
  source_name?: string;
  importance: "low" | "medium" | "high" | "critical";
  detected_at: string;
  is_read: boolean;
  affected_contacts?: string[];
}

export interface TrackedCompanyDetails extends TrackedCompany {
  contacts: CompanyContact[];
  recent_updates: CompanyUpdate[];
  ai_insights?: string;
  next_update_at: string;
  unread_update_count?: number;
  created_at?: string; // Backend uses created_at, frontend uses added_at
}

// ============== Industry Feed ==============

export interface IndustryNews {
  id: string;
  headline: string;
  summary: string;
  industry: string;
  companies_mentioned: string[];
  news_type:
    | "funding"
    | "merger"
    | "expansion"
    | "product"
    | "partnership"
    | "market_trend"
    | "regulation";
  source_url: string;
  source_name: string;
  published_at: string;
  relevance_score: number;
  is_bookmarked: boolean;
}

export interface IndustryFeedResponse {
  items: IndustryNews[];
  total_count: number;
  page: number;
  has_more: boolean;
}

// ============== Company Search ==============

export interface CompanySearchResult {
  name: string;
  domain?: string;
  industry?: string;
  headquarters?: string;
  logo_url?: string;
  employee_count?: string;
  description?: string;
  linkedin_url?: string;
  website?: string;
  is_already_tracked: boolean;
}

export interface CompanySearchResponse {
  results: CompanySearchResult[];
  total: number;
  // Optional fields for backward compatibility
  query?: string;
  total_found?: number;
}

// ============== Dashboard Stats ==============

export interface DashboardStats {
  tracked_companies: number;
  total_contacts: number;
  unread_updates: number;
  updates_this_week: number;
  contact_changes_this_week: number;
  high_priority_updates: number;
}
