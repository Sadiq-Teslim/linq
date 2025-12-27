"""
TrackedCompany and related models for the Monitor Board feature
"""
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Integer, Float, JSON, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
import enum


class UpdateFrequency(enum.Enum):
    """How often to fetch updates for tracked companies"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class UpdateType(enum.Enum):
    """Types of company updates"""
    NEWS = "news"
    FUNDING = "funding"
    HIRING = "hiring"
    PRODUCT = "product"
    PARTNERSHIP = "partnership"
    EXPANSION = "expansion"
    LEADERSHIP = "leadership"
    CONTACT_CHANGE = "contact_change"
    OTHER = "other"


class TrackedCompany(Base):
    """
    Companies that an organization is actively tracking
    Core model for the Monitor Board feature
    """
    __tablename__ = "tracked_companies"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Organization link
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    added_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)

    # Company identification
    company_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    domain: Mapped[str] = mapped_column(String(255), nullable=True, index=True)
    linkedin_url: Mapped[str] = mapped_column(String(500), nullable=True)
    logo_url: Mapped[str] = mapped_column(String(500), nullable=True)

    # Company details
    industry: Mapped[str] = mapped_column(String(100), nullable=True)
    employee_count: Mapped[str] = mapped_column(String(50), nullable=True)  # "1-10", "11-50", etc.
    headquarters: Mapped[str] = mapped_column(String(255), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)

    # Tracking settings
    is_priority: Mapped[bool] = mapped_column(Boolean, default=False)
    update_frequency: Mapped[UpdateFrequency] = mapped_column(Enum(UpdateFrequency), default=UpdateFrequency.WEEKLY)
    notify_on_update: Mapped[bool] = mapped_column(Boolean, default=True)
    tags: Mapped[dict] = mapped_column(JSON, nullable=True)  # User-defined tags

    # Data freshness
    last_updated: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    next_update_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="tracked_companies")
    contacts: Mapped[list["CompanyContact"]] = relationship("CompanyContact", back_populates="company", cascade="all, delete-orphan")
    updates: Mapped[list["CompanyUpdate"]] = relationship("CompanyUpdate", back_populates="company", cascade="all, delete-orphan")


class CompanyContact(Base):
    """
    Key contacts/decision makers at tracked companies
    """
    __tablename__ = "company_contacts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Company link
    company_id: Mapped[int] = mapped_column(ForeignKey("tracked_companies.id", ondelete="CASCADE"), nullable=False, index=True)

    # Contact info
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=True)
    department: Mapped[str] = mapped_column(String(100), nullable=True)

    # Contact details
    email: Mapped[str] = mapped_column(String(255), nullable=True)
    phone: Mapped[str] = mapped_column(String(50), nullable=True)
    linkedin_url: Mapped[str] = mapped_column(String(500), nullable=True)

    # Status and source
    is_decision_maker: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str] = mapped_column(String(100), nullable=True)  # Where we found this contact
    confidence_score: Mapped[float] = mapped_column(Float, nullable=True)  # 0-1

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)  # May have left the company

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_verified_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Relationships
    company: Mapped["TrackedCompany"] = relationship("TrackedCompany", back_populates="contacts")


class CompanyUpdate(Base):
    """
    Updates/news about tracked companies
    Aggregated from various sources
    """
    __tablename__ = "company_updates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Company link
    company_id: Mapped[int] = mapped_column(ForeignKey("tracked_companies.id", ondelete="CASCADE"), nullable=False, index=True)

    # Update content
    update_type: Mapped[UpdateType] = mapped_column(Enum(UpdateType), default=UpdateType.NEWS)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=True)  # Full content if available

    # Source
    source_url: Mapped[str] = mapped_column(Text, nullable=True)
    source_name: Mapped[str] = mapped_column(String(255), nullable=True)

    # Relevance and importance
    relevance_score: Mapped[float] = mapped_column(Float, nullable=True)  # AI-generated
    is_important: Mapped[bool] = mapped_column(Boolean, default=False)

    # Read tracking (organization-wide)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    read_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)
    read_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Timestamps
    published_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    company: Mapped["TrackedCompany"] = relationship("TrackedCompany", back_populates="updates")


class IndustryNews(Base):
    """
    Industry-wide news feed items
    Filtered by organization's industry
    """
    __tablename__ = "industry_news"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Classification
    industry: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    news_type: Mapped[str] = mapped_column(String(50), index=True, nullable=True)  # funding, merger, product, etc.

    # Content
    headline: Mapped[str] = mapped_column(String(500), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=True)

    # Companies mentioned
    companies_mentioned: Mapped[dict] = mapped_column(JSON, nullable=True)  # List of company names

    # Source
    source_url: Mapped[str] = mapped_column(Text, nullable=True)
    source_name: Mapped[str] = mapped_column(String(255), nullable=True)

    # Relevance
    relevance_score: Mapped[float] = mapped_column(Float, nullable=True)

    # Timestamps
    published_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    indexed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# Forward references
from app.db.models.organization import Organization
