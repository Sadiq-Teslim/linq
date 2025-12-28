"""
Subscription and Access Code schemas for billing and activation
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from enum import Enum


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


# ===== Plan Details =====

class PlanDetails(BaseModel):
    """Details of a subscription plan"""
    id: SubscriptionPlan
    name: str
    price_monthly: int  # In cents/minor units
    price_yearly: Optional[int] = None
    currency: str = "USD"
    max_tracked_companies: int
    max_team_members: int
    max_contacts_per_company: int
    features: List[str] = []
    is_popular: bool = False


# ===== Subscription Schemas =====

class SubscriptionCreate(BaseModel):
    """Create a new subscription"""
    plan: SubscriptionPlan
    payment_method_token: Optional[str] = None  # Paystack token


class SubscriptionUpdate(BaseModel):
    """Update subscription (upgrade/downgrade)"""
    plan: SubscriptionPlan


class SubscriptionResponse(BaseModel):
    """Subscription response"""
    id: int
    plan: SubscriptionPlan
    status: SubscriptionStatus
    price_monthly: int = 0
    currency: str = "NGN"
    max_tracked_companies: int = 5
    max_team_members: int = 1
    max_contacts_per_company: int = 5
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    trial_ends_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    organization_id: Optional[int] = None

    class Config:
        from_attributes = True


# ===== Access Code Schemas =====

class AccessCodeCreate(BaseModel):
    """Generate a new access code"""
    expires_in_days: Optional[int] = 30  # Days until expiration, null for never


class AccessCodeValidate(BaseModel):
    """Validate an access code"""
    code: str


class AccessCodeActivate(BaseModel):
    """Activate an access code in the extension"""
    code: str


class AccessCodeResponse(BaseModel):
    """Access code response"""
    id: int
    code: str
    organization_id: int
    organization_name: str
    plan: SubscriptionPlan
    is_used: bool
    used_at: Optional[datetime]
    expires_at: Optional[datetime]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AccessCodeValidationResult(BaseModel):
    """Result of access code validation"""
    valid: bool
    organization_name: Optional[str] = None
    plan: Optional[SubscriptionPlan] = None
    expires_at: Optional[datetime] = None
    message: Optional[str] = None


class ActivationResult(BaseModel):
    """Result of access code activation"""
    success: bool
    access_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: Optional[int] = None
    user: Optional["UserResponse"] = None
    organization: Optional["OrganizationResponse"] = None
    message: Optional[str] = None


# ===== Paystack Webhook Schemas =====

class PaystackWebhookEvent(BaseModel):
    """Paystack webhook event"""
    event: str
    data: dict


# Forward references
from app.schemas.user import UserResponse
from app.schemas.organization import OrganizationResponse

ActivationResult.model_rebuild()
