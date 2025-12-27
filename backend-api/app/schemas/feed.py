"""
Activity feed schemas for the Live Feed feature (F2.1-F2.3)
Hourly refresh, push notifications, relevance scoring
"""
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ActivityFeedItemSchema(BaseModel):
    """
    Single feed item in the activity stream (F2.1)
    Includes relevance scoring (F2.3) and local signal interpretation
    """
    id: int
    event_type: str = Field(..., description="funding, partnership, hiring, expansion, news")
    headline: str
    summary: Optional[str] = None

    # Company info
    company_name: Optional[str] = None
    company_domain: Optional[str] = None
    company_industry: Optional[str] = None

    # Location
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None

    # Source
    source_url: Optional[str] = None
    source_name: Optional[str] = None

    # Relevance scoring (F2.3)
    relevance_score: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="AI-scored relevance 0.0-1.0 based on user's vertical"
    )
    is_high_priority: bool = Field(
        default=False,
        description="True if relevance_score >= 0.8 (buying signal)"
    )

    # Local signal interpretation (F2.3)
    local_context: Optional[str] = Field(
        None,
        description="Interpreted local language/context if applicable"
    )
    signal_type: Optional[str] = Field(
        None,
        description="growth, hiring, distress, expansion, partnership"
    )

    # Timestamps
    published_at: Optional[datetime] = None
    indexed_at: datetime

    class Config:
        from_attributes = True


class FeedResponse(BaseModel):
    """Paginated feed response with metadata"""
    items: List[ActivityFeedItemSchema]
    total_count: int
    page: int = 1
    page_size: int = 20
    has_more: bool = False
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    # High priority items for push notifications (F2.2)
    high_priority_count: int = Field(
        default=0,
        description="Count of items with relevance_score >= 0.8"
    )


class FeedFilterOptions(BaseModel):
    """Available filter options for feed"""
    event_types: List[str] = ["funding", "partnership", "hiring", "expansion", "news"]
    countries: List[str] = ["Nigeria", "Ghana"]
    industries: List[str] = [
        "Fintech", "Banking", "Logistics", "E-commerce",
        "AgriTech", "HealthTech", "EdTech", "Other"
    ]


class PushNotificationPayload(BaseModel):
    """Push notification for high-relevance events (F2.2)"""
    feed_item_id: int
    headline: str
    company_name: Optional[str]
    event_type: str
    relevance_score: float
    action_url: str = Field(
        ...,
        description="Deep link to view full details"
    )
