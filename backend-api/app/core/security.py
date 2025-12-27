"""
JWT handling, password hashing, and security utilities
Industry-standard security practices
"""
import time
import re
from datetime import datetime, timedelta
from typing import Optional, Dict
from collections import defaultdict
from jose import JWTError, jwt
from passlib.context import CryptContext
import secrets
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware

from .config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Use Supabase JWT secret if available, otherwise generate one
JWT_SECRET = settings.SUPABASE_JWT_SECRET or secrets.token_urlsafe(32)
JWT_ALGORITHM = "HS256"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


# ============================================================
# Rate Limiting
# ============================================================

class RateLimiter:
    """
    Simple in-memory rate limiter
    In production, use Redis for distributed rate limiting
    """

    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.requests: Dict[str, list] = defaultdict(list)

    def is_allowed(self, client_ip: str) -> bool:
        """Check if request is allowed for this IP"""
        current_time = time.time()
        minute_ago = current_time - 60

        # Clean old requests
        self.requests[client_ip] = [
            req_time for req_time in self.requests[client_ip]
            if req_time > minute_ago
        ]

        # Check limit
        if len(self.requests[client_ip]) >= self.requests_per_minute:
            return False

        # Record this request
        self.requests[client_ip].append(current_time)
        return True

    def get_remaining(self, client_ip: str) -> int:
        """Get remaining requests for this IP"""
        current_time = time.time()
        minute_ago = current_time - 60

        recent_requests = [
            req_time for req_time in self.requests[client_ip]
            if req_time > minute_ago
        ]

        return max(0, self.requests_per_minute - len(recent_requests))


# Global rate limiter instance
rate_limiter = RateLimiter(requests_per_minute=60)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware
    Limits requests per IP per minute
    """

    async def dispatch(self, request: Request, call_next):
        # Get client IP (handle proxies)
        client_ip = request.client.host if request.client else "unknown"
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()

        # Skip rate limiting for health checks
        if request.url.path == "/health":
            return await call_next(request)

        # Check rate limit
        if not rate_limiter.is_allowed(client_ip):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please wait before making more requests."
            )

        response = await call_next(request)

        # Add rate limit headers
        remaining = rate_limiter.get_remaining(client_ip)
        response.headers["X-RateLimit-Limit"] = str(rate_limiter.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(remaining)

        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all responses
    """

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Remove server header
        if "server" in response.headers:
            del response.headers["server"]

        return response


# ============================================================
# Input Sanitization
# ============================================================

def sanitize_input(value: str, max_length: int = 255) -> str:
    """
    Sanitize user input to prevent injection attacks
    """
    if not value:
        return ""

    # Trim and limit length
    sanitized = value.strip()[:max_length]

    # Remove potentially dangerous characters
    dangerous_chars = ['<', '>', '"', "'", ';', '(', ')', '{', '}', '\\']
    for char in dangerous_chars:
        sanitized = sanitized.replace(char, '')

    return sanitized


def validate_email(email: str) -> bool:
    """Basic email validation"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def mask_sensitive_data(data: str, visible_chars: int = 4) -> str:
    """Mask sensitive data for logging"""
    if not data or len(data) <= visible_chars:
        return "*" * len(data) if data else ""

    return data[:visible_chars] + "*" * (len(data) - visible_chars)
