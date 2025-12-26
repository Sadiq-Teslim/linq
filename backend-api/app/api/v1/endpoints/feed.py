"""
Live Activity Feed endpoints (F2.1, F2.2)
Continuous stream of business events from Nigeria/Ghana
Using Supabase for database operations
"""
from typing import Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, Query

from app.db.supabase_client import get_supabase_client, SupabaseClient
from app.schemas.feed import ActivityFeedItemSchema, FeedResponse
from app.services.scraper.news import NewsAggregatorService
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=FeedResponse)
def get_activity_feed(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    event_type: Optional[str] = Query(
        default=None,
        description="Filter by event type: funding, partnership, hiring, expansion",
    ),
    country: Optional[str] = Query(
        default=None,
        description="Filter by country: Nigeria or Ghana",
    ),
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Get the live activity feed (F2.1)

    Returns a paginated stream of recent business events
    from Nigeria and Ghana, including:
    - Funding announcements
    - Partnerships
    - Hiring spikes
    - Market expansions
    """
    # Build query
    query = supabase.table("activity_feed").select("*", count="exact")

    # Apply filters
    if event_type:
        query = query.eq("event_type", event_type)
    if country:
        query = query.eq("country", country)

    # Order by indexed_at descending
    query = query.order("indexed_at", desc=True)

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.range(offset, offset + page_size - 1)

    result = query.execute()

    items = result.data or []
    total_count = result.count or 0

    # Parse items into schema
    feed_items = []
    for item in items:
        # Parse datetime fields
        if item.get("published_at") and isinstance(item["published_at"], str):
            item["published_at"] = datetime.fromisoformat(item["published_at"].replace("Z", "+00:00"))
        if item.get("indexed_at") and isinstance(item["indexed_at"], str):
            item["indexed_at"] = datetime.fromisoformat(item["indexed_at"].replace("Z", "+00:00"))
        feed_items.append(ActivityFeedItemSchema.model_validate(item))

    return FeedResponse(
        items=feed_items,
        total_count=total_count,
        page=page,
        page_size=page_size,
        has_more=(offset + len(items)) < total_count,
        last_updated=datetime.utcnow(),
    )


@router.get("/refresh")
async def refresh_feed(
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Trigger a feed refresh from external sources

    Note: In production, this would be a background job
    running every hour (F2.1 requirement)
    """
    news_service = NewsAggregatorService()

    try:
        # Fetch fresh news items
        new_items = await news_service.fetch_all_feeds()

        # Store in database
        items_added = 0
        for item in new_items:
            # Check if already exists (by headline + source)
            existing = supabase.table("activity_feed")\
                .select("id")\
                .eq("headline", item["headline"])\
                .eq("source_name", item.get("source_name", ""))\
                .execute()

            if existing.data:
                continue

            # Prepare data for insert
            feed_data = {
                "event_type": item.get("event_type", "news"),
                "headline": item["headline"],
                "summary": item.get("summary"),
                "company_name": item.get("company_name"),
                "country": item.get("country"),
                "source_url": item.get("source_url"),
                "source_name": item.get("source_name"),
                "published_at": item["published_at"].isoformat() if item.get("published_at") else None,
                "indexed_at": datetime.utcnow().isoformat(),
            }

            supabase.table("activity_feed").insert(feed_data).execute()
            items_added += 1

        return {
            "status": "success",
            "items_added": items_added,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "timestamp": datetime.utcnow().isoformat(),
        }


@router.get("/stats")
def get_feed_stats(
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Get feed statistics by event type and country
    """
    # Get all items
    result = supabase.table("activity_feed").select("event_type, country").execute()
    items = result.data or []

    event_counts = {}
    country_counts = {}

    for item in items:
        # Event type counts
        event_type = item.get("event_type") or "other"
        event_counts[event_type] = event_counts.get(event_type, 0) + 1

        # Country counts
        country = item.get("country") or "Unknown"
        country_counts[country] = country_counts.get(country, 0) + 1

    return {
        "total_items": len(items),
        "by_event_type": event_counts,
        "by_country": country_counts,
    }


@router.get("/event-types")
def get_event_types():
    """
    Get available event type filters
    """
    return {
        "event_types": [
            {"value": "funding", "label": "Funding", "description": "Investment rounds and funding announcements"},
            {"value": "partnership", "label": "Partnership", "description": "Business partnerships and collaborations"},
            {"value": "hiring", "label": "Hiring", "description": "Job openings and talent acquisition"},
            {"value": "expansion", "label": "Expansion", "description": "Market expansion and new launches"},
            {"value": "news", "label": "General", "description": "Other business news"},
        ]
    }
