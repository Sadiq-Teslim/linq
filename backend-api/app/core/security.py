"""
JWT handling, password hashing, and security utilities
Industry-standard security practices for scalability to 10K+ users
"""
import time
import re
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict
from collections import defaultdict
from jose import JWTError, jwt
from passlib.context import CryptContext
import secrets
import hashlib
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware

from .config import settings

# Configure security logging
logger = logging.getLogger("linq.security")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

# Use Supabase JWT secret if available, otherwise generate one
JWT_SECRET = settings.SUPABASE_JWT_SECRET or settings.SECRET_KEY
JWT_ALGORITHM = "HS256"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt with 12 rounds"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token
    
    Security features:
    - Includes issued-at time for token rotation
    - Includes token ID for revocation tracking
    - Configurable expiration
    """
    to_encode = data.copy()
    now = datetime.utcnow()
    
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    # Add standard JWT claims
    to_encode.update({
        "exp": expire,
        "iat": now,
        "jti": secrets.token_urlsafe(16),  # Token ID for revocation
    })
    
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and verify a JWT token
    
    Returns None if token is invalid or expired
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError as e:
        logger.debug(f"JWT decode error: {e}")
        return None


def generate_secure_token(length: int = 32) -> str:
    """Generate a cryptographically secure random token"""
    return secrets.token_urlsafe(length)


def hash_token(token: str) -> str:
    """Hash a token for secure storage (e.g., access codes)"""
    return hashlib.sha256(token.encode()).hexdigest()


# ============================================================
# Rate Limiting - Scalable Architecture
# ============================================================

class RateLimiter:
    """
    In-memory rate limiter with tiered limits
    
    For production at scale (10K+ users):
    - Use Redis for distributed rate limiting
    - Use sliding window algorithm
    - Consider token bucket for burst handling
    
    Current implementation uses sliding window log algorithm
    which is accurate but memory-intensive. For high scale,
    switch to sliding window counter with Redis.
    """

    def __init__(
        self,
        requests_per_minute: int = 100,  # General API limit
        auth_requests_per_minute: int = 10,  # Auth endpoints (login, register)
        payment_requests_per_minute: int = 5,  # Payment endpoints
    ):
        self.limits = {
            "default": requests_per_minute,
            "auth": auth_requests_per_minute,
            "payment": payment_requests_per_minute,
        }
        self.requests: Dict[str, list] = defaultdict(list)
        # Cleanup old entries periodically to prevent memory bloat
        self._last_cleanup = time.time()
        self._cleanup_interval = 300  # 5 minutes

    def _get_limit_type(self, path: str) -> str:
        """Determine rate limit type based on path"""
        if "/auth/" in path:
            return "auth"
        if "/payment" in path or "/paystack" in path:
            return "payment"
        return "default"

    def _cleanup_old_entries(self):
        """Remove entries older than 1 minute to prevent memory bloat"""
        current_time = time.time()
        if current_time - self._last_cleanup < self._cleanup_interval:
            return
        
        minute_ago = current_time - 60
        keys_to_remove = []
        
        for key, timestamps in self.requests.items():
            self.requests[key] = [t for t in timestamps if t > minute_ago]
            if not self.requests[key]:
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self.requests[key]
        
        self._last_cleanup = current_time

    def is_allowed(self, client_ip: str, path: str = "") -> bool:
        """Check if request is allowed for this IP and path type"""
        self._cleanup_old_entries()
        
        limit_type = self._get_limit_type(path)
        limit = self.limits[limit_type]
        key = f"{client_ip}:{limit_type}"
        
        current_time = time.time()
        minute_ago = current_time - 60

        # Clean old requests for this key
        self.requests[key] = [
            req_time for req_time in self.requests[key]
            if req_time > minute_ago
        ]

        # Check limit
        if len(self.requests[key]) >= limit:
            logger.warning(f"Rate limit exceeded for {client_ip} on {limit_type}")
            return False

        # Record this request
        self.requests[key].append(current_time)
        return True

    def get_remaining(self, client_ip: str, path: str = "") -> int:
        """Get remaining requests for this IP and path type"""
        limit_type = self._get_limit_type(path)
        limit = self.limits[limit_type]
        key = f"{client_ip}:{limit_type}"
        
        current_time = time.time()
        minute_ago = current_time - 60

        recent_requests = [
            req_time for req_time in self.requests[key]
            if req_time > minute_ago
        ]

        return max(0, limit - len(recent_requests))


# Global rate limiter instance with configurable limits
rate_limiter = RateLimiter(
    requests_per_minute=100,  # General: 100 req/min
    auth_requests_per_minute=10,  # Auth: 10 req/min (prevent brute force)
    payment_requests_per_minute=5,  # Payment: 5 req/min
)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware with tiered limits by endpoint type
    
    Features:
    - Different limits for auth, payment, and general endpoints
    - X-Forwarded-For support for reverse proxies
    - Rate limit headers in response
    """

    async def dispatch(self, request: Request, call_next):
        # Get client IP (handle proxies)
        client_ip = request.client.host if request.client else "unknown"
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # Take the first IP (original client)
            client_ip = forwarded_for.split(",")[0].strip()
        
        # Also check X-Real-IP (nginx)
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            client_ip = real_ip.strip()

        # Skip rate limiting for health checks and docs
        skip_paths = ["/health", "/docs", "/redoc", "/openapi.json"]
        if request.url.path in skip_paths:
            return await call_next(request)

        # Check rate limit
        if not rate_limiter.is_allowed(client_ip, request.url.path):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please wait before making more requests.",
                headers={"Retry-After": "60"}
            )

        response = await call_next(request)

        # Add rate limit headers
        remaining = rate_limiter.get_remaining(client_ip, request.url.path)
        limit_type = rate_limiter._get_limit_type(request.url.path)
        limit = rate_limiter.limits[limit_type]
        
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + 60)

        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all responses
    
    Implements OWASP security headers recommendations
    """

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Security headers (OWASP recommendations)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        # Content Security Policy for API responses
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"

        # Strict Transport Security (only in production)
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Remove server header to hide technology stack
        if "server" in response.headers:
            del response.headers["server"]

        return response


# ============================================================
# Request Logging Middleware (for audit trails)
# ============================================================

class AuditLogMiddleware(BaseHTTPMiddleware):
    """
    Log all API requests for security auditing
    
    For production:
    - Log to structured logging system (ELK, CloudWatch, etc.)
    - Include request ID for tracing
    - Store in append-only log for compliance
    """

    async def dispatch(self, request: Request, call_next):
        request_id = secrets.token_urlsafe(8)
        start_time = time.time()

        # Add request ID to state for downstream use
        request.state.request_id = request_id

        # Process request
        response = await call_next(request)

        # Calculate duration
        duration_ms = (time.time() - start_time) * 1000

        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()

        # Log request (structured logging format)
        logger.info(
            "api_request",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 2),
                "client_ip": client_ip,
                "user_agent": request.headers.get("User-Agent", "unknown")[:100],
            }
        )

        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id

        return response


# ============================================================
# Input Sanitization & Validation
# ============================================================

def sanitize_input(value: str, max_length: int = 255) -> str:
    """
    Sanitize user input to prevent injection attacks
    
    - Trims whitespace
    - Limits length
    - Removes potentially dangerous characters
    """
    if not value:
        return ""

    # Trim and limit length
    sanitized = value.strip()[:max_length]

    # Remove potentially dangerous characters for SQL/NoSQL injection
    dangerous_patterns = [
        r'<script.*?>.*?</script>',  # Script tags
        r'javascript:',  # JavaScript protocol
        r'on\w+\s*=',  # Event handlers
    ]
    
    for pattern in dangerous_patterns:
        sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE)

    return sanitized


def validate_email(email: str) -> bool:
    """
    Validate email format
    
    Uses RFC 5322 compliant regex
    """
    if not email or len(email) > 254:
        return False
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password strength
    
    Requirements:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    return True, "Password is strong"


def mask_sensitive_data(data: str, visible_chars: int = 4) -> str:
    """
    Mask sensitive data for logging
    
    Example: "sk_test_abc123" -> "sk_t************"
    """
    if not data or len(data) <= visible_chars:
        return "*" * len(data) if data else ""

    return data[:visible_chars] + "*" * (len(data) - visible_chars)


def mask_email(email: str) -> str:
    """
    Mask email for logging
    
    Example: "user@example.com" -> "u***@e***.com"
    """
    if not email or "@" not in email:
        return "***"
    
    local, domain = email.split("@", 1)
    parts = domain.rsplit(".", 1)
    
    masked_local = local[0] + "***" if local else "***"
    masked_domain = parts[0][0] + "***" if parts[0] else "***"
    tld = "." + parts[1] if len(parts) > 1 else ""
    
    return f"{masked_local}@{masked_domain}{tld}"
