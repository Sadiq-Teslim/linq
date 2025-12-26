"""
Intelligence data cache models
Stores company profiles and activity feed items
"""
from datetime import datetime
from sqlalchemy import String, Integer, Float, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class CompanyCache(Base):
    """
    Cached company intelligence profiles
    Reduces API calls by storing previously researched companies
    """
    __tablename__ = "company_cache"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    company_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    company_domain: Mapped[str] = mapped_column(String(255), index=True, nullable=True)
    country: Mapped[str] = mapped_column(String(100), nullable=True)  # Nigeria, Ghana, etc.

    # Company profile data (JSON for flexibility)
    profile_data: Mapped[dict] = mapped_column(JSON, nullable=True)

    # Decision makers found
    decision_makers: Mapped[dict] = mapped_column(JSON, nullable=True)  # List of executives

    # AI-generated insights
    ai_summary: Mapped[str] = mapped_column(Text, nullable=True)  # "Why Now" summary
    conversion_score: Mapped[int] = mapped_column(Integer, nullable=True)  # 0-100 score
    predicted_pain_points: Mapped[dict] = mapped_column(JSON, nullable=True)

    # Data freshness
    data_sources: Mapped[dict] = mapped_column(JSON, nullable=True)  # Sources used
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)  # Cache expiration


class ActivityFeedItem(Base):
    """
    Live feed items for the continuous activity stream (F2.1)
    Aggregated from multiple sources across Nigeria/Ghana
    """
    __tablename__ = "activity_feed"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Event classification
    event_type: Mapped[str] = mapped_column(String(50), index=True, nullable=False)  # funding, partnership, hiring, expansion
    headline: Mapped[str] = mapped_column(String(500), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=True)

    # Company association
    company_name: Mapped[str] = mapped_column(String(255), index=True, nullable=True)
    company_domain: Mapped[str] = mapped_column(String(255), nullable=True)

    # Location
    country: Mapped[str] = mapped_column(String(100), index=True, nullable=True)  # Nigeria, Ghana
    region: Mapped[str] = mapped_column(String(100), nullable=True)  # Lagos, Accra, etc.

    # Source tracking
    source_url: Mapped[str] = mapped_column(Text, nullable=True)
    source_name: Mapped[str] = mapped_column(String(255), nullable=True)  # TechCrunch, Disrupt Africa, etc.
    source_language: Mapped[str] = mapped_column(String(20), default="en")  # en, fr, pidgin

    # Relevance scoring
    relevance_score: Mapped[float] = mapped_column(Float, nullable=True)  # AI-generated relevance

    # Timestamps
    published_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    indexed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
