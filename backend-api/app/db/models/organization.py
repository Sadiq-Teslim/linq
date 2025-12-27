"""
Organization and Team models for B2B multi-tenant support
"""
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Integer, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
import enum


class MemberRole(enum.Enum):
    """Team member roles within an organization"""
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"


class Organization(Base):
    """
    Organization/Company account for B2B multi-tenant support
    Each organization can have multiple team members
    """
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Organization info
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[str] = mapped_column(String(255), nullable=True, index=True)  # Company domain for auto-joining
    industry: Mapped[str] = mapped_column(String(100), nullable=True)
    logo_url: Mapped[str] = mapped_column(String(500), nullable=True)

    # Subscription reference
    subscription_id: Mapped[int] = mapped_column(ForeignKey("subscriptions.id"), nullable=True)

    # Settings
    default_update_frequency: Mapped[str] = mapped_column(String(20), default="weekly")  # daily, weekly, monthly

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    members: Mapped[list["TeamMember"]] = relationship("TeamMember", back_populates="organization", cascade="all, delete-orphan")
    subscription: Mapped["Subscription"] = relationship("Subscription", back_populates="organization")
    access_codes: Mapped[list["AccessCode"]] = relationship("AccessCode", back_populates="organization", cascade="all, delete-orphan")
    tracked_companies: Mapped[list["TrackedCompany"]] = relationship("TrackedCompany", back_populates="organization", cascade="all, delete-orphan")


class TeamMember(Base):
    """
    Team members within an organization
    Links users to organizations with specific roles
    """
    __tablename__ = "team_members"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Links
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Role and permissions
    role: Mapped[MemberRole] = mapped_column(Enum(MemberRole), default=MemberRole.MEMBER)

    # Invitation tracking
    invited_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)
    invitation_accepted_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="members")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])


# Forward references for type hints
from app.db.models.subscription import Subscription, AccessCode
from app.db.models.tracked_company import TrackedCompany
from app.db.models.user import User
