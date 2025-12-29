"""
User schemas for registration and profile
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    """User registration request"""
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    company_name: Optional[str] = None


class SubscriptionInfo(BaseModel):
    """Subscription information from organization"""
    plan: Optional[str] = "free_trial"
    status: Optional[str] = "trialing"
    max_tracked_companies: Optional[int] = 5
    max_team_members: Optional[int] = 1


class UserResponse(BaseModel):
    """User profile response"""
    id: int
    email: str
    full_name: Optional[str] = None
    role: Optional[str] = "member"
    organization_id: Optional[str] = None
    organization_name: Optional[str] = None
    industry: Optional[str] = None
    subscription: Optional[SubscriptionInfo] = None
    is_active: bool = True
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
