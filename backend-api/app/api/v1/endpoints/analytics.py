"""
Analytics and Usage Statistics endpoints
Provides dashboard metrics and usage data
Optimized for scalability with proper indexing and query limits
"""
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.db.supabase_client import get_supabase_client, SupabaseClient
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


def parse_time_range(time_range: str) -> int:
    """Convert time range string to days"""
    if time_range == "7d":
        return 7
    elif time_range == "90d":
        return 90
    return 30  # Default to 30 days


@router.get("/usage")
def get_usage_statistics(
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Get usage statistics for the current user's organization
    Returns metrics for dashboard display
    """
    org_id = current_user.get("organization_id")
    if not org_id:
        return {
            "total_companies": 0,
            "total_contacts": 0,
            "updates_last_30_days": 0,
            "feed_items_last_30_days": 0,
            "usage_by_day": [],
        }

    try:
        # Get tracked companies count
        companies_result = supabase.table("tracked_companies").select("id", count="exact").eq("organization_id", org_id).execute()
        companies_count = companies_result.count if hasattr(companies_result, 'count') and companies_result.count else len(companies_result.data or [])
    except Exception:
        companies_count = 0

    try:
        # Get contacts count
        contacts_result = supabase.table("tracked_company_contacts").select("id", count="exact").eq("organization_id", org_id).execute()
        contacts_count = contacts_result.count if hasattr(contacts_result, 'count') and contacts_result.count else len(contacts_result.data or [])
    except Exception:
        contacts_count = 0

    try:
        # Get updates count (last 30 days)
        thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
        updates_result = supabase.table("company_updates").select("id", count="exact").eq("organization_id", org_id).gte("created_at", thirty_days_ago).execute()
        updates_count = updates_result.count if hasattr(updates_result, 'count') and updates_result.count else len(updates_result.data or [])
    except Exception:
        updates_count = 0

    try:
        # Get feed items count (last 30 days)
        feed_result = supabase.table("feed_items").select("id", count="exact").eq("organization_id", org_id).gte("created_at", thirty_days_ago).execute()
        feed_count = feed_result.count if hasattr(feed_result, 'count') and feed_result.count else len(feed_result.data or [])
    except Exception:
        feed_count = 0

    # Get usage over time (last 7 days) - simplified query
    usage_by_day = []
    for i in range(6, -1, -1):
        day = datetime.utcnow() - timedelta(days=i)
        usage_by_day.append({
            "date": day.strftime("%b %d"),
            "companies": companies_count,  # Simplified for now
        })

    return {
        "total_companies": companies_count,
        "total_contacts": contacts_count,
        "updates_last_30_days": updates_count,
        "feed_items_last_30_days": feed_count,
        "usage_by_day": usage_by_day,
    }


@router.get("/subscription-status")
def get_subscription_status(
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Get subscription status and feature access
    """
    org_id = current_user.get("organization_id")
    if not org_id:
        return {
            "has_subscription": False,
            "plan": "free_trial",
            "status": "inactive",
            "is_active": False,
            "features_locked": True,
        }

    try:
        # Get organization with subscription_id
        org_result = supabase.table("organizations").select("id, subscription_id").eq("id", org_id).execute()
        
        if not org_result.data:
            return {
                "has_subscription": False,
                "plan": "free_trial",
                "status": "inactive",
                "is_active": False,
                "features_locked": True,
            }

        org = org_result.data[0]
        subscription_id = org.get("subscription_id")
        
        # If no subscription_id on org, also check subscriptions table by organization_id
        subscription = None
        if subscription_id:
            sub_result = supabase.table("subscriptions").select("*").eq("id", subscription_id).execute()
            if sub_result.data:
                subscription = sub_result.data[0]
        
        if not subscription:
            # Fallback: check if there's a subscription with this organization_id
            sub_result = supabase.table("subscriptions").select("*").eq("organization_id", org_id).order("created_at", desc=True).limit(1).execute()
            if sub_result.data:
                subscription = sub_result.data[0]
        
        if not subscription:
            return {
                "has_subscription": False,
                "plan": "free_trial",
                "status": "inactive",
                "is_active": False,
                "features_locked": True,
            }

        # Check if subscription is active
        status_value = subscription.get("status", "inactive")
        current_period_end = subscription.get("current_period_end")
        
        is_active = status_value in ["active", "trialing"]
        if current_period_end:
            try:
                end_date = datetime.fromisoformat(current_period_end.replace("Z", "+00:00"))
                if end_date < datetime.utcnow().replace(tzinfo=end_date.tzinfo):
                    is_active = False
            except Exception:
                pass

        return {
            "has_subscription": True,
            "plan": subscription.get("plan", "free_trial"),
            "status": status_value,
            "is_active": is_active,
            "features_locked": not is_active,
            "current_period_end": current_period_end,
            "max_tracked_companies": subscription.get("max_tracked_companies"),
            "max_team_members": subscription.get("max_team_members"),
        }
    except Exception as e:
        import logging
        logging.error(f"Error getting subscription status: {e}")
        return {
            "has_subscription": False,
            "plan": "free_trial",
            "status": "inactive",
            "is_active": False,
            "features_locked": True,
        }


@router.get("/breakdown")
def get_full_breakdown(
    time_range: str = Query("30d", regex="^(7d|30d|90d)$"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Get full analytics breakdown for the Analytics page
    Returns comprehensive usage data with charts
    
    Optimized for scalability:
    - Uses indexed queries
    - Limits result sets
    - Aggregates data server-side
    """
    org_id = current_user.get("organization_id")
    days = parse_time_range(time_range)
    start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
    
    # Initialize default response
    response_data = {
        "total_searches": 0,
        "companies_tracked": 0,
        "api_calls_today": 0,
        "api_calls_this_month": 0,
        "daily_usage": [],
        "search_breakdown": [],
        "top_companies": [],
        "response_times": [],
    }
    
    if not org_id:
        return response_data

    try:
        # Get total companies tracked
        companies_result = supabase.table("tracked_companies").select("id", count="exact").eq("organization_id", org_id).execute()
        response_data["companies_tracked"] = companies_result.count if hasattr(companies_result, 'count') and companies_result.count else 0
    except Exception:
        pass

    try:
        # Get search/API call counts from usage_logs if exists
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        
        # Try to get usage logs (graceful failure if table doesn't exist)
        try:
            today_logs = supabase.table("usage_logs").select("id", count="exact").eq("organization_id", org_id).gte("created_at", today_start).execute()
            response_data["api_calls_today"] = today_logs.count if hasattr(today_logs, 'count') and today_logs.count else 0
            
            month_logs = supabase.table("usage_logs").select("id", count="exact").eq("organization_id", org_id).gte("created_at", month_start).execute()
            response_data["api_calls_this_month"] = month_logs.count if hasattr(month_logs, 'count') and month_logs.count else 0
            
            total_logs = supabase.table("usage_logs").select("id", count="exact").eq("organization_id", org_id).gte("created_at", start_date).execute()
            response_data["total_searches"] = total_logs.count if hasattr(total_logs, 'count') and total_logs.count else 0
        except Exception:
            # usage_logs table might not exist yet
            pass
    except Exception:
        pass

    try:
        # Generate daily usage data (simplified for now)
        daily_usage = []
        for i in range(min(days, 30), -1, -1):  # Limit to 30 data points for performance
            day = datetime.utcnow() - timedelta(days=i)
            daily_usage.append({
                "date": day.strftime("%b %d"),
                "searches": 0,  # Would be populated from actual usage_logs
                "api_calls": 0,
            })
        response_data["daily_usage"] = daily_usage
    except Exception:
        pass

    try:
        # Get top tracked companies (limit to 10)
        top_companies_result = supabase.table("tracked_companies").select("name").eq("organization_id", org_id).limit(10).execute()
        if top_companies_result.data:
            response_data["top_companies"] = [
                {"name": c.get("name", "Unknown"), "searches": 0}
                for c in top_companies_result.data
            ]
    except Exception:
        pass

    # Search breakdown by type (placeholder - would come from actual search logs)
    response_data["search_breakdown"] = [
        {"type": "Company Info", "count": 0},
        {"type": "Contacts", "count": 0},
        {"type": "News", "count": 0},
        {"type": "Financials", "count": 0},
    ]

    # Response times (placeholder - would come from actual metrics)
    response_data["response_times"] = [
        {"date": (datetime.utcnow() - timedelta(days=i)).strftime("%b %d"), "avg_ms": 0}
        for i in range(6, -1, -1)
    ]

    return response_data


@router.get("/activity")
def get_activity_log(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Get recent activity log for the organization
    
    Paginated for scalability
    """
    org_id = current_user.get("organization_id")
    
    if not org_id:
        return {"activities": [], "total": 0}

    try:
        # Try to get from activity_logs table
        result = supabase.table("activity_logs").select("*", count="exact").eq("organization_id", org_id).order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        
        return {
            "activities": result.data or [],
            "total": result.count if hasattr(result, 'count') and result.count else 0,
        }
    except Exception:
        # Table might not exist
        return {"activities": [], "total": 0}
