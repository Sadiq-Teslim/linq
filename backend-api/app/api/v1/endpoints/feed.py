"""
Live Activity Feed endpoints (F2.1, F2.2)
Continuous stream of business events - now global and industry-specific
Using Supabase for database operations
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException, status

from app.db.supabase_client import get_supabase_client, SupabaseClient
from app.schemas.feed import ActivityFeedItemSchema, FeedResponse
from app.schemas.company import IndustryNewsResponse, IndustryNewsFeedResponse, BookmarkNewsRequest
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

    # Count high priority items (F2.2)
    high_priority_count = sum(1 for item in feed_items if item.is_high_priority)

    return FeedResponse(
        items=feed_items,
        total_count=total_count,
        page=page,
        page_size=page_size,
        has_more=(offset + len(items)) < total_count,
        last_updated=datetime.utcnow(),
        high_priority_count=high_priority_count,
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

            # Also add to industry_news table for industry-specific feeds
            # Determine industry from company or default to Technology
            industry = "Technology"  # Default
            if item.get("company_name"):
                # Try to get industry from tracked companies
                try:
                    company_result = supabase.table("tracked_companies")\
                        .select("industry")\
                        .ilike("company_name", f"%{item['company_name']}%")\
                        .limit(1)\
                        .execute()
                    if company_result.data and company_result.data[0].get("industry"):
                        industry = company_result.data[0]["industry"]
                except Exception:
                    pass

            # Check if news already exists in industry_news
            existing_news = supabase.table("industry_news")\
                .select("id")\
                .eq("headline", item["headline"])\
                .eq("source_name", item.get("source_name", ""))\
                .execute()

            if not existing_news.data:
                # Extract companies mentioned from headline/summary
                companies_mentioned = []
                if item.get("company_name"):
                    companies_mentioned.append(item["company_name"])

                news_data = {
                    "industry": industry,
                    "news_type": item.get("event_type", "news"),
                    "headline": item["headline"],
                    "summary": item.get("summary"),
                    "companies_mentioned": companies_mentioned,
                    "source_url": item.get("source_url"),
                    "source_name": item.get("source_name"),
                    "published_at": item["published_at"].isoformat() if item.get("published_at") else None,
                    "indexed_at": datetime.utcnow().isoformat(),
                }
                supabase.table("industry_news").insert(news_data).execute()

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


# =============================================================================
# INDUSTRY-SPECIFIC NEWS FEED
# =============================================================================

@router.get("/industry", response_model=IndustryNewsFeedResponse)
def get_industry_feed(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    industry: Optional[str] = Query(default=None, description="Filter by industry"),
    news_type: Optional[str] = Query(default=None, description="Filter by news type: funding, merger, product, etc."),
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Get industry-specific news feed
    Filtered by the user's organization industry if not specified
    """
    # Get user's industry if not specified
    if not industry:
        org_id = current_user.get("organization_id")
        if org_id:
            try:
                org_result = supabase.table("organizations").select("industry").eq("id", org_id).execute()
                if org_result.data:
                    industry = org_result.data[0].get("industry")
            except Exception:
                # Industry column might not exist, use default
                pass

    # Default to Technology if no industry found
    industry = industry or "Technology"

    # Get tracked companies for this organization to prioritize news about them
    org_id = current_user.get("organization_id")
    tracked_companies = []
    tracked_company_names = set()
    if org_id:
        try:
            tracked_result = supabase.table("tracked_companies").select("company_name, domain").eq("organization_id", org_id).eq("is_active", True).execute()
            if tracked_result.data:
                tracked_companies = tracked_result.data
                tracked_company_names = {c.get("company_name", "").lower() for c in tracked_companies if c.get("company_name")}
        except Exception:
            pass

    # Build query
    query = supabase.table("industry_news").select("*")
    query = query.ilike("industry", f"%{industry}%")

    if news_type:
        query = query.eq("news_type", news_type)

    # Get all items first to prioritize
    all_items_result = query.execute()
    all_items = all_items_result.data if all_items_result.data else []

    # Process and prioritize items
    news_items = []
    for item in all_items:
        # Handle companies_mentioned - could be JSONB array or string
        companies_mentioned = item.get("companies_mentioned") or []
        if isinstance(companies_mentioned, str):
            try:
                import json
                companies_mentioned = json.loads(companies_mentioned)
            except:
                companies_mentioned = []
        if not isinstance(companies_mentioned, list):
            companies_mentioned = []

        # Check if any tracked companies are mentioned
        is_tracked_company_news = False
        if tracked_company_names:
            for mentioned in companies_mentioned:
                if isinstance(mentioned, str) and mentioned.lower() in tracked_company_names:
                    is_tracked_company_news = True
                    break

        # Add priority flag
        item["_priority"] = 1 if is_tracked_company_news else 0
        item["companies_mentioned"] = companies_mentioned
        item["is_bookmarked"] = False

    # Sort: tracked company news first, then by published_at (handle None values)
    def get_sort_date(item):
        pub_date = item.get("published_at")
        idx_date = item.get("indexed_at")
        if pub_date:
            return pub_date
        if idx_date:
            return idx_date
        return "1970-01-01"  # Default to very old date if no date available

    all_items.sort(key=lambda x: (
        -x.get("_priority", 0),  # Tracked companies first (negative for descending)
        get_sort_date(x),  # Then by date
    ), reverse=True)

    # Apply pagination
    total = len(all_items)
    offset = (page - 1) * page_size
    paginated_items = all_items[offset:offset + page_size]

    # Remove temporary _priority field and validate
    validated_items = []
    for item in paginated_items:
        item.pop("_priority", None)
        try:
            validated_items.append(IndustryNewsResponse.model_validate(item))
        except Exception as e:
            # Skip invalid items
            continue

    return IndustryNewsFeedResponse(
        items=validated_items,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.post("/industry/bookmark")
def toggle_news_bookmark(
    data: BookmarkNewsRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Toggle bookmark on a news item
    """
    user_id = current_user["id"]
    news_id = data.news_id

    # Check if already bookmarked
    existing = supabase.table("user_news_bookmarks").select("id").eq("user_id", user_id).eq("news_id", news_id).execute()

    if existing.data:
        # Remove bookmark
        supabase.table("user_news_bookmarks").delete().eq("user_id", user_id).eq("news_id", news_id).execute()
        return {"bookmarked": False}
    else:
        # Add bookmark
        supabase.table("user_news_bookmarks").insert({
            "user_id": user_id,
            "news_id": news_id,
            "created_at": datetime.utcnow().isoformat(),
        }).execute()
        return {"bookmarked": True}


@router.get("/industry/bookmarks", response_model=List[IndustryNewsResponse])
def get_bookmarked_news(
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Get user's bookmarked news items
    """
    user_id = current_user["id"]

    # Get bookmark IDs
    bookmarks = supabase.table("user_news_bookmarks").select("news_id").eq("user_id", user_id).execute()
    news_ids = [b["news_id"] for b in (bookmarks.data or [])]

    if not news_ids:
        return []

    # Get news items
    result = supabase.table("industry_news").select("*").in_("id", news_ids).execute()
    items = result.data if result.data else []

    news_items = []
    for item in items:
        item["companies_mentioned"] = item.get("companies_mentioned") or []
        item["is_bookmarked"] = True
        news_items.append(IndustryNewsResponse.model_validate(item))

    return news_items


@router.get("/industry/news-types")
def get_industry_news_types():
    """
    Get available news type filters for industry feed
    """
    return {
        "news_types": [
            {"value": "funding", "label": "Funding", "description": "Investment and funding announcements"},
            {"value": "merger", "label": "M&A", "description": "Mergers and acquisitions"},
            {"value": "expansion", "label": "Expansion", "description": "Market expansion news"},
            {"value": "product", "label": "Product", "description": "Product launches and updates"},
            {"value": "partnership", "label": "Partnership", "description": "Strategic partnerships"},
            {"value": "regulation", "label": "Regulation", "description": "Regulatory changes and compliance"},
            {"value": "trend", "label": "Trends", "description": "Industry trends and analysis"},
        ]
    }


@router.get("/industry/industries")
def get_available_industries():
    """
    Get list of industries for filtering
    """
    return {
        "industries": [
            "Technology",
            "Financial Services",
            "Healthcare",
            "Manufacturing",
            "Retail",
            "Energy",
            "Real Estate",
            "Transportation",
            "Media & Entertainment",
            "Professional Services",
            "Education",
            "Agriculture",
            "Telecommunications",
            "Consumer Goods",
        ]
    }
