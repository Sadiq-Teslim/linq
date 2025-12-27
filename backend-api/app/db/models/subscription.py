"""
Subscription and Access Code models for billing and activation
"""
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer, Float, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
import enum


class SubscriptionPlan(enum.Enum):
    """Available subscription plans"""
    FREE_TRIAL = "free_trial"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class SubscriptionStatus(enum.Enum):
    """Subscription status"""
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    PAST_DUE = "past_due"
    TRIALING = "trialing"


class Subscription(Base):
    """
    Subscription model for organization billing
    Integrates with Paystack for payment processing
    """
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Plan details
    plan: Mapped[SubscriptionPlan] = mapped_column(Enum(SubscriptionPlan), default=SubscriptionPlan.FREE_TRIAL)
    status: Mapped[SubscriptionStatus] = mapped_column(Enum(SubscriptionStatus), default=SubscriptionStatus.TRIALING)

    # Pricing (in minor units, e.g., kobo for NGN)
    price_monthly: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(3), default="USD")

    # Plan limits
    max_tracked_companies: Mapped[int] = mapped_column(Integer, default=5)
    max_team_members: Mapped[int] = mapped_column(Integer, default=1)
    max_contacts_per_company: Mapped[int] = mapped_column(Integer, default=10)

    # Billing dates
    current_period_start: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    current_period_end: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    trial_ends_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Paystack integration
    paystack_customer_code: Mapped[str] = mapped_column(String(255), nullable=True, index=True)
    paystack_subscription_code: Mapped[str] = mapped_column(String(255), nullable=True, index=True)
    paystack_plan_code: Mapped[str] = mapped_column(String(255), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    cancelled_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="subscription", uselist=False)


class AccessCode(Base):
    """
    Access codes for activating the Chrome extension
    Generated after successful payment on the web platform
    """
    __tablename__ = "access_codes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # The access code itself (format: LINQ-XXXX-XXXX-XXXX)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)

    # Links
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)

    # Usage tracking
    is_used: Mapped[bool] = mapped_column(Boolean, default=False)
    used_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)
    used_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Validity
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)  # Null = never expires
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="access_codes")


# Forward references
from app.db.models.organization import Organization
