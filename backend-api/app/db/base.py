"""
SQLAlchemy declarative base for database models
Used by Alembic for migrations
"""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models"""
    pass
