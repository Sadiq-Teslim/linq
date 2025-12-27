"""Pydantic schemas (DTOs) for request/response validation"""
from .token import Token, TokenPayload, LoginRequest
from .company import (
    # Legacy search schemas
    CompanySearchRequest,
    CompanyProfile,
    DecisionMaker,
    ContactInfo,
    CompanyIntelligence,
    LeadExportData,
    # Enums
    UpdateFrequency,
    UpdateType,
    # Global company search
    GlobalCompanySearchQuery,
    GlobalCompanySearchResult,
    GlobalCompanySearchResponse,
    # Tracked companies
    TrackedCompanyCreate,
    TrackedCompanyUpdate,
    TrackedCompanyResponse,
    TrackedCompanyWithDetails,
    TrackedCompanyFilter,
    PaginatedTrackedCompanies,
    # Contacts
    TrackedCompanyContactCreate,
    TrackedCompanyContactUpdate,
    TrackedCompanyContactResponse,
    # Updates
    TrackedCompanyUpdateResponse,
    MarkUpdatesReadRequest,
    PaginatedCompanyUpdates,
    CompanyUpdatesFilter,
    # Industry news
    IndustryNewsResponse,
    IndustryNewsFeedResponse,
    BookmarkNewsRequest,
)
from .feed import ActivityFeedItemSchema, FeedResponse
from .user import UserCreate, UserResponse
from .organization import (
    MemberRole,
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationResponse,
    OrganizationWithSubscription,
    TeamMemberInvite,
    TeamMemberUpdate,
    TeamMemberResponse,
)
from .subscription import (
    SubscriptionPlan,
    SubscriptionStatus,
    PlanDetails,
    SubscriptionCreate,
    SubscriptionUpdate,
    SubscriptionResponse,
    AccessCodeCreate,
    AccessCodeValidate,
    AccessCodeActivate,
    AccessCodeResponse,
    AccessCodeValidationResult,
    ActivationResult,
    PaystackWebhookEvent,
)

__all__ = [
    # Token
    "Token",
    "TokenPayload",
    "LoginRequest",
    # Legacy company search
    "CompanySearchRequest",
    "CompanyProfile",
    "DecisionMaker",
    "ContactInfo",
    "CompanyIntelligence",
    "LeadExportData",
    # Enums
    "UpdateFrequency",
    "UpdateType",
    # Global company search
    "GlobalCompanySearchQuery",
    "GlobalCompanySearchResult",
    "GlobalCompanySearchResponse",
    # Tracked companies
    "TrackedCompanyCreate",
    "TrackedCompanyUpdate",
    "TrackedCompanyResponse",
    "TrackedCompanyWithDetails",
    "TrackedCompanyFilter",
    "PaginatedTrackedCompanies",
    # Contacts
    "TrackedCompanyContactCreate",
    "TrackedCompanyContactUpdate",
    "TrackedCompanyContactResponse",
    # Updates
    "TrackedCompanyUpdateResponse",
    "MarkUpdatesReadRequest",
    "PaginatedCompanyUpdates",
    "CompanyUpdatesFilter",
    # Industry news
    "IndustryNewsResponse",
    "IndustryNewsFeedResponse",
    "BookmarkNewsRequest",
    # Feed
    "ActivityFeedItemSchema",
    "FeedResponse",
    # User
    "UserCreate",
    "UserResponse",
    # Organization
    "MemberRole",
    "OrganizationCreate",
    "OrganizationUpdate",
    "OrganizationResponse",
    "OrganizationWithSubscription",
    "TeamMemberInvite",
    "TeamMemberUpdate",
    "TeamMemberResponse",
    # Subscription
    "SubscriptionPlan",
    "SubscriptionStatus",
    "PlanDetails",
    "SubscriptionCreate",
    "SubscriptionUpdate",
    "SubscriptionResponse",
    "AccessCodeCreate",
    "AccessCodeValidate",
    "AccessCodeActivate",
    "AccessCodeResponse",
    "AccessCodeValidationResult",
    "ActivationResult",
    "PaystackWebhookEvent",
]
