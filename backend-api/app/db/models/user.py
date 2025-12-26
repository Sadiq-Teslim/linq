"""
User and Session database models
Implements the Netflix single-session model (F3.2)
"""
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class User(Base):
    """User account table"""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=True)
    company_name: Mapped[str] = mapped_column(String(255), nullable=True)

    # Subscription status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    subscription_tier: Mapped[str] = mapped_column(String(50), default="free")  # free, pro, enterprise
    subscription_expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    sessions: Mapped[list["UserSession"]] = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")


class UserSession(Base):
    """
    Active session tracking for single-session enforcement (Netflix model)
    Only ONE active session allowed per user at any time
    """
    __tablename__ = "user_sessions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Session identification
    session_token: Mapped[str] = mapped_column(String(500), unique=True, index=True, nullable=False)
    device_info: Mapped[str] = mapped_column(Text, nullable=True)  # Browser/Device fingerprint
    ip_address: Mapped[str] = mapped_column(String(45), nullable=True)  # IPv4 or IPv6

    # Session state
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_activity: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    revoked_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    revoked_reason: Mapped[str] = mapped_column(String(100), nullable=True)  # "new_login", "logout", "expired"

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="sessions")
