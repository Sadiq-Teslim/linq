"""
Application configuration loaded from environment variables
"""
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",  # Ignore extra fields in .env
    )

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # JWT Settings (Supabase JWT secret for verification)
    SUPABASE_JWT_SECRET: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Google Gemini AI
    GEMINI_API_KEY: str = ""

    # SerpAPI
    SERP_API_KEY: str = ""

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]

    # Environment
    ENVIRONMENT: str = "development"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
