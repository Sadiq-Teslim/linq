"""
Authentication token schemas
"""
from typing import Optional
from pydantic import BaseModel, EmailStr

from app.schemas.user import UserResponse, SubscriptionInfo


class LoginRequest(BaseModel):
    """Login request payload"""
    email: EmailStr
    password: str
    device_info: Optional[str] = None  # Browser/device fingerprint


class Token(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until expiration


class LoginResponse(BaseModel):
    """Login response with user data and token"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class TokenPayload(BaseModel):
    """JWT token payload"""
    sub: str  # user email
    user_id: int
    session_id: int
    exp: int  # expiration timestamp
