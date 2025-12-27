"""
Company intelligence schemas - PRD compliant output structures
Implements F1.1-F1.5 requirements + Monitor Board tracking features
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from enum import Enum
import re


# ===== Enums for Tracked Companies =====

class UpdateFrequency(str, Enum):
    """How often to fetch updates"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class UpdateType(str, Enum):
    """Types of company updates"""
    NEWS = "news"
    FUNDING = "funding"
    HIRING = "hiring"
    PRODUCT = "product"
    PARTNERSHIP = "partnership"
    EXPANSION = "expansion"
    LEADERSHIP = "leadership"
    CONTACT_CHANGE = "contact_change"
    OTHER = "other"


class CompanySearchRequest(BaseModel):
    """Request to search/analyze a company (F1.1)"""
    company_name: str = Field(..., min_length=2, max_length=255)
    country: str = Field(
        default="Nigeria",
        description="Target country: Nigeria or Ghana"
    )
    user_vertical: Optional[str] = Field(
        default=None,
        description="User's industry vertical for contextual AI synthesis (e.g., Fintech, Logistics)"
    )

    @field_validator('company_name')
    @classmethod
    def sanitize_company_name(cls, v: str) -> str:
        # Remove potentially dangerous characters
        sanitized = re.sub(r'[<>"\';(){}]', '', v.strip())
        if len(sanitized) < 2:
            raise ValueError('Company name must be at least 2 characters')
        return sanitized

    @field_validator('country')
    @classmethod
    def validate_country(cls, v: str) -> str:
        allowed = ['Nigeria', 'Ghana']
        if v not in allowed:
            raise ValueError(f'Country must be one of: {", ".join(allowed)}')
        return v


class ContactInfo(BaseModel):
    """
    Contact information with verification score (F1.3)
    Verification score based on source strength and cross-checking frequency
    """
    email: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    verification_score: int = Field(
        default=0,
        ge=0,
        le=100,
        description="0-100 score based on source strength and cross-checking"
    )
    verification_sources: List[str] = Field(
        default=[],
        description="Sources used to verify this contact"
    )
    last_verified: Optional[datetime] = None


class DecisionMaker(BaseModel):
    """
    Key executive/decision maker (F1.2)
    Must include: Name, Title, LinkedIn URL
    """
    name: str = Field(..., description="Full name of the decision maker")
    title: str = Field(..., description="Job title (e.g., CEO, CTO, Founder)")
    linkedin_url: Optional[str] = Field(
        None,
        description="LinkedIn profile URL"
    )
    contact: Optional[ContactInfo] = Field(
        None,
        description="Contact information with verification score"
    )
    is_founder: bool = Field(default=False)
    is_c_suite: bool = Field(default=False)


class RecentActivity(BaseModel):
    """Recent company activity for context"""
    event_type: str = Field(..., description="funding, partnership, hiring, expansion, news")
    headline: str
    date: Optional[str] = None
    source: Optional[str] = None
    url: Optional[str] = None


class CompanyProfile(BaseModel):
    """Basic company profile data"""
    name: str
    domain: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    headquarters: Optional[str] = None
    country: str = Field(default="Nigeria")
    employee_count: Optional[str] = None
    employee_range: Optional[str] = Field(
        None,
        description="e.g., 1-10, 11-50, 51-200"
    )
    founded_year: Optional[int] = None
    funding_stage: Optional[str] = Field(
        None,
        description="e.g., Seed, Series A, Series B"
    )
    total_funding: Optional[str] = None
    last_funding_date: Optional[str] = None
    website: Optional[str] = None
    linkedin_url: Optional[str] = None
    twitter_url: Optional[str] = None
    # Recent activities for context
    recent_activities: List[RecentActivity] = []


class ScoreFactor(BaseModel):
    """Factor contributing to conversion score"""
    factor: str
    impact: str = Field(..., description="positive, negative, or neutral")
    weight: int = Field(default=1, ge=1, le=10)


class CompanyIntelligence(BaseModel):
    """
    Complete company intelligence response (F1.1-F1.5)
    This is the main output displayed in the extension popup
    """
    # Basic profile (F1.1)
    profile: CompanyProfile

    # Decision makers (F1.2) - Founders, C-Suite
    decision_makers: List[DecisionMaker] = []

    # AI-generated insights (F1.4)
    ai_summary: str = Field(
        ...,
        description="AI-generated 'Why Now' summary - max 3 sentences, contextual to user's vertical",
        max_length=500
    )
    predicted_pain_points: List[str] = Field(
        default=[],
        description="Predicted business pain points based on local context"
    )
    why_now_factors: List[str] = Field(
        default=[],
        description="Key reasons why now is a good time to engage"
    )

    # Conversion Readiness Score (F1.5)
    conversion_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="AI-generated Conversion Readiness Score based on activity and growth trends"
    )
    score_factors: List[ScoreFactor] = Field(
        default=[],
        description="Detailed factors contributing to the score"
    )
    score_label: str = Field(
        default="",
        description="e.g., 'Ready for Funding', 'Expansion-Ready', 'Growth Stage'"
    )

    # Metadata
    data_freshness: datetime = Field(default_factory=datetime.utcnow)
    data_age_days: int = Field(
        default=0,
        description="Age of the data in days"
    )
    sources_used: List[str] = []
    processing_time_ms: Optional[int] = None
    confidence_level: str = Field(
        default="medium",
        description="low, medium, or high - based on data availability"
    )


class LeadExportData(BaseModel):
    """Data structure for CSV export (F3.3)"""
    company_name: str
    industry: Optional[str]
    country: str
    website: Optional[str]
    decision_maker_name: Optional[str]
    decision_maker_title: Optional[str]
    decision_maker_email: Optional[str]
    decision_maker_phone: Optional[str]
    decision_maker_linkedin: Optional[str]
    contact_verification_score: int
    ai_summary: str
    pain_points: str  # Comma-separated
    conversion_score: int
    score_label: str
    exported_at: datetime = Field(default_factory=datetime.utcnow)


# =============================================================================
# MONITOR BOARD - Tracked Companies Schemas
# =============================================================================

class GlobalCompanySearchQuery(BaseModel):
    """Search for companies globally to track"""
    query: str = Field(..., min_length=2, max_length=255)
    limit: int = Field(default=10, ge=1, le=50)


class GlobalCompanySearchResult(BaseModel):
    """Global company search result"""
    name: str
    domain: Optional[str] = None
    industry: Optional[str] = None
    employee_count: Optional[str] = None
    headquarters: Optional[str] = None
    logo_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    description: Optional[str] = None


class GlobalCompanySearchResponse(BaseModel):
    """Search results response"""
    results: List[GlobalCompanySearchResult]
    total: int


# ===== Tracked Company Schemas =====

class TrackedCompanyCreate(BaseModel):
    """Start tracking a company"""
    company_name: str = Field(..., min_length=2, max_length=255)
    domain: Optional[str] = None
    linkedin_url: Optional[str] = None
    logo_url: Optional[str] = None
    industry: Optional[str] = None
    employee_count: Optional[str] = None
    headquarters: Optional[str] = None
    description: Optional[str] = None
    is_priority: bool = False
    update_frequency: UpdateFrequency = UpdateFrequency.WEEKLY
    notify_on_update: bool = True
    tags: List[str] = []


class TrackedCompanyUpdate(BaseModel):
    """Update tracking settings"""
    is_priority: Optional[bool] = None
    update_frequency: Optional[UpdateFrequency] = None
    notify_on_update: Optional[bool] = None
    tags: Optional[List[str]] = None


class TrackedCompanyResponse(BaseModel):
    """Tracked company response"""
    id: int
    company_name: str
    domain: Optional[str]
    linkedin_url: Optional[str]
    logo_url: Optional[str]
    industry: Optional[str]
    employee_count: Optional[str]
    headquarters: Optional[str]
    description: Optional[str]
    is_priority: bool
    update_frequency: UpdateFrequency
    notify_on_update: bool
    tags: List[str]
    last_updated: datetime
    next_update_at: Optional[datetime]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TrackedCompanyWithDetails(TrackedCompanyResponse):
    """Tracked company with contacts and recent updates"""
    contacts: List["TrackedCompanyContactResponse"] = []
    recent_updates: List["TrackedCompanyUpdateResponse"] = []
    unread_update_count: int = 0


# ===== Company Contact Schemas =====

class TrackedCompanyContactCreate(BaseModel):
    """Add a contact to a tracked company"""
    full_name: str
    title: Optional[str] = None
    department: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    is_decision_maker: bool = False


class TrackedCompanyContactUpdate(BaseModel):
    """Update contact info"""
    full_name: Optional[str] = None
    title: Optional[str] = None
    department: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    is_decision_maker: Optional[bool] = None
    is_active: Optional[bool] = None


class TrackedCompanyContactResponse(BaseModel):
    """Contact response"""
    id: int
    company_id: int
    full_name: str
    title: Optional[str]
    department: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    linkedin_url: Optional[str]
    is_decision_maker: bool
    source: Optional[str]
    confidence_score: Optional[float]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_verified_at: Optional[datetime]

    class Config:
        from_attributes = True


# ===== Company Update Schemas =====

class TrackedCompanyUpdateResponse(BaseModel):
    """Company update/news item"""
    id: int
    company_id: int
    update_type: UpdateType
    title: str
    summary: Optional[str]
    source_url: Optional[str]
    source_name: Optional[str]
    relevance_score: Optional[float]
    is_important: bool
    is_read: bool
    read_at: Optional[datetime]
    published_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class MarkUpdatesReadRequest(BaseModel):
    """Mark updates as read"""
    update_ids: List[int]


# ===== Industry News Schemas =====

class IndustryNewsResponse(BaseModel):
    """Industry news item"""
    id: int
    industry: str
    news_type: Optional[str]
    headline: str
    summary: Optional[str]
    companies_mentioned: List[str] = []
    source_url: Optional[str]
    source_name: Optional[str]
    relevance_score: Optional[float]
    published_at: Optional[datetime]
    is_bookmarked: bool = False

    class Config:
        from_attributes = True


class IndustryNewsFeedResponse(BaseModel):
    """Paginated industry news feed"""
    items: List[IndustryNewsResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


class BookmarkNewsRequest(BaseModel):
    """Toggle bookmark on news item"""
    news_id: int


# ===== Pagination =====

class PaginatedTrackedCompanies(BaseModel):
    """Paginated tracked companies"""
    items: List[TrackedCompanyResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


class PaginatedCompanyUpdates(BaseModel):
    """Paginated company updates"""
    items: List[TrackedCompanyUpdateResponse]
    total: int
    page: int
    page_size: int
    has_more: bool
    unread_count: int


class TrackedCompanyFilter(BaseModel):
    """Filter options for tracked companies"""
    is_priority: Optional[bool] = None
    industry: Optional[str] = None
    tags: Optional[List[str]] = None


class CompanyUpdatesFilter(BaseModel):
    """Filter options for company updates"""
    company_id: Optional[int] = None
    update_type: Optional[UpdateType] = None
    is_read: Optional[bool] = None
    is_important: Optional[bool] = None


# Update forward references
TrackedCompanyWithDetails.model_rebuild()
