"""
Activity feed schemas for the Live Feed feature (F2.1)
"""
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ActivityFeedItemSchema(BaseModel):
    """Single feed item in the activity stream"""
    id: int
    event_type: str = Field(..., description="funding, partnership, hiring, expansion")
    headline: str
    summary: Optional[str] = None

    # Company info
    company_name: Optional[str] = None
    company_domain: Optional[str] = None

    # Location
    country: Optional[str] = None
    region: Optional[str] = None

    # Source
    source_url: Optional[str] = None
    source_name: Optional[str] = None

    # Timestamps
    published_at: Optional[datetime] = None
    indexed_at: datetime

    class Config:
        from_attributes = True


class FeedResponse(BaseModel):
    """Paginated feed response"""
    items: List[ActivityFeedItemSchema]
    total_count: int
    page: int = 1
    page_size: int = 20
    has_more: bool = False
    last_updated: datetime = Field(default_factory=datetime.utcnow)
