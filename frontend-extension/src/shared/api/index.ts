// Client
export { api } from './client';

// Types
export type {
  ApiError,
  ApiResponse,
  PaginatedResponse,
  // Subscription
  SubscriptionPlan,
  SubscriptionStatus,
  SubscriptionInfo,
  PlanDetails,
  // Organization
  Organization,
  TeamMember,
  // Tracked Companies
  TrackedCompany,
  CompanyContact,
  CompanyUpdate,
  TrackedCompanyDetails,
  // Industry Feed
  IndustryNews,
  IndustryFeedResponse,
  // Search
  CompanySearchResult,
  CompanySearchResponse,
  // Dashboard
  DashboardStats,
} from './types';

// Auth API
export { authApi } from './auth';
export type {
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  UserResponse,
  SessionStatus,
} from './auth';

// Companies API (new)
export { companiesApi } from './companies';

// Subscription API (new)
export { subscriptionApi, organizationApi, DEMO_PLANS } from './subscription';

// Feed API
export { feedApi } from './feed';
export type { ActivityFeedItem, FeedResponse, FeedStats, EventType } from './feed';

// Legacy search API (for backward compatibility)
export { searchApi } from './search';
export type {
  CompanyProfile,
  DecisionMaker,
  ContactInfo,
  CompanyIntelligence,
  CompanySearchRequest,
  ScoreFactor,
  RecentActivity,
} from './search';
