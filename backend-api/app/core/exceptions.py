"""
Custom exception handlers for the API
"""
from fastapi import HTTPException, status


class LinqException(HTTPException):
    """Base exception for LINQ API"""
    pass


class AuthenticationError(LinqException):
    """Raised when authentication fails"""
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class SessionConflictError(LinqException):
    """Raised when user tries to login from a second device (Netflix model)"""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail="Session active on another device. Previous session has been terminated.",
        )


class SubscriptionRequiredError(LinqException):
    """Raised when user subscription is invalid or expired"""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Valid subscription required to access this feature.",
        )


class RateLimitError(LinqException):
    """Raised when API rate limit is exceeded"""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later.",
        )


class CompanyNotFoundError(LinqException):
    """Raised when company search yields no results"""
    def __init__(self, company_name: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No data found for company: {company_name}",
        )


class ScrapingError(LinqException):
    """Raised when web scraping fails"""
    def __init__(self, detail: str = "Failed to retrieve data from source"):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail,
        )
