"""
Application configuration loaded from environment variables
Supports both development and production environments automatically
"""
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

    # =============================================================================
    # ENVIRONMENT
    # =============================================================================
    ENVIRONMENT: str = "development"  # development, staging, production

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    # =============================================================================
    # SUPABASE
    # =============================================================================
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # =============================================================================
    # JWT / AUTH
    # =============================================================================
    SECRET_KEY: str = "your-super-secret-key-min-32-chars-long"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # =============================================================================
    # EXTERNAL APIS
    # =============================================================================
    # Google Gemini AI
    GEMINI_API_KEY: str = ""

    # SerpAPI for company search and contact discovery
    SERP_API_KEY: str = ""
    
    # Additional contact discovery APIs
    CLEARBIT_API_KEY: str = ""  # For company enrichment
    HUNTER_API_KEY: str = ""  # For email finding and verification
    APOLLO_API_KEY: str = ""  # For contact discovery
    CRUNCHBASE_API_KEY: str = ""  # For company leadership and funding data
    LINKEDIN_API_KEY: str = ""  # LinkedIn API (if available)
    LINKEDIN_SESSION_COOKIE: str = ""  # Alternative: LinkedIn session cookie for scraping
    
    # Proxy and anti-detection
    SCRAPERAPI_KEY: str = ""  # ScraperAPI for proxy, CAPTCHA, JS rendering
    
    # Redis for caching and Celery
    REDIS_URL: str = "redis://localhost:6379/0"  # Default Redis URL
    REDIS_CACHE_TTL: int = 3600  # Cache TTL in seconds (1 hour default)
    
    # Celery configuration
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"  # Celery broker
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"  # Celery results

    # Paystack for payments
    PAYSTACK_SECRET_KEY: str = ""
    PAYSTACK_PUBLIC_KEY: str = ""

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"

    # =============================================================================
    # CORS
    # =============================================================================
    # Format: comma-separated string "http://localhost:5173,http://localhost:3000"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def allowed_origins(self) -> List[str]:
        """Get CORS origins - parses comma-separated string"""
        if self.CORS_ORIGINS:
            return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
        return ["http://localhost:5173", "http://localhost:3000"]

    # =============================================================================
    # DATABASE
    # =============================================================================
    DATABASE_URL: str = ""

    # =============================================================================
    # API URLS (for frontend configuration)
    # =============================================================================
    API_BASE_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:5173"

    @property
    def callback_url(self) -> str:
        """Paystack callback URL"""
        return f"{self.FRONTEND_URL}/payment/callback"

    @property
    def webhook_url(self) -> str:
        """Paystack webhook URL"""
        return f"{self.API_BASE_URL}/api/v1/subscription/paystack/webhook"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()


# =============================================================================
# HELPER FUNCTION FOR RENDER DEPLOYMENT
# =============================================================================
def get_port() -> int:
    """Get port from environment (Render sets PORT env var)"""
    return int(os.environ.get("PORT", 8000))
