"""
Organization and Team schemas for API requests/responses
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr
from enum import Enum


class MemberRole(str, Enum):
    """Team member roles"""
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"


# ===== Organization Schemas =====

class OrganizationCreate(BaseModel):
    """Create a new organization"""
    name: str
    industry: Optional[str] = None
    domain: Optional[str] = None


class OrganizationUpdate(BaseModel):
    """Update organization details"""
    name: Optional[str] = None
    industry: Optional[str] = None
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    default_update_frequency: Optional[str] = None


class OrganizationResponse(BaseModel):
    """Organization response"""
    id: int
    name: str
    domain: Optional[str]
    industry: Optional[str]
    logo_url: Optional[str]
    default_update_frequency: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrganizationWithSubscription(OrganizationResponse):
    """Organization response with subscription info"""
    subscription: Optional["SubscriptionResponse"] = None
    member_count: int = 0
    tracked_company_count: int = 0


# ===== Team Member Schemas =====

class TeamMemberInvite(BaseModel):
    """Invite a new team member"""
    email: EmailStr
    role: MemberRole = MemberRole.MEMBER


class TeamMemberUpdate(BaseModel):
    """Update team member role"""
    role: MemberRole


class TeamMemberResponse(BaseModel):
    """Team member response"""
    id: int
    user_id: int
    email: str
    full_name: Optional[str]
    role: MemberRole
    is_active: bool
    invitation_accepted_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# ===== Subscription Schemas (imported here for convenience) =====

class SubscriptionPlan(str, Enum):
    """Available subscription plans"""
    FREE_TRIAL = "free_trial"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class SubscriptionStatus(str, Enum):
    """Subscription status"""
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    PAST_DUE = "past_due"
    TRIALING = "trialing"


class SubscriptionResponse(BaseModel):
    """Subscription response"""
    id: int
    plan: SubscriptionPlan
    status: SubscriptionStatus
    price_monthly: int
    currency: str
    max_tracked_companies: int
    max_team_members: int
    max_contacts_per_company: int
    current_period_start: Optional[datetime]
    current_period_end: Optional[datetime]
    trial_ends_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# Update forward reference
OrganizationWithSubscription.model_rebuild()
