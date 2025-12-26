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


class UserResponse(BaseModel):
    """User profile response"""
    id: int
    email: str
    full_name: Optional[str]
    company_name: Optional[str]
    subscription_tier: str
    subscription_expires_at: Optional[datetime]
    is_active: bool

    class Config:
        from_attributes = True
