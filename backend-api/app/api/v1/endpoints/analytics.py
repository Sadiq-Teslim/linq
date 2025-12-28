"""
Analytics and Usage Statistics endpoints
Provides dashboard metrics and usage data
"""
from typing import Dict, Any, List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status

from app.db.supabase_client import get_supabase_client, SupabaseClient
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


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
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with an organization"
        )

    # Get tracked companies count
    companies_result = supabase.table("tracked_companies").select("id", count="exact").eq("organization_id", org_id).execute()
    companies_count = companies_result.count if hasattr(companies_result, 'count') else len(companies_result.data or [])

    # Get contacts count
    contacts_result = supabase.table("tracked_company_contacts").select("id", count="exact").eq("organization_id", org_id).execute()
    contacts_count = contacts_result.count if hasattr(contacts_result, 'count') else len(contacts_result.data or [])

    # Get updates count (last 30 days)
    thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
    updates_result = supabase.table("company_updates").select("id", count="exact").eq("organization_id", org_id).gte("created_at", thirty_days_ago).execute()
    updates_count = updates_result.count if hasattr(updates_result, 'count') else len(updates_result.data or [])

    # Get feed items count (last 30 days)
    feed_result = supabase.table("feed_items").select("id", count="exact").eq("organization_id", org_id).gte("created_at", thirty_days_ago).execute()
    feed_count = feed_result.count if hasattr(feed_result, 'count') else len(feed_result.data or [])

    # Get usage over time (last 7 days)
    usage_by_day = []
    for i in range(6, -1, -1):
        day = datetime.utcnow() - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        day_end = day.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
        
        day_companies = supabase.table("tracked_companies").select("id", count="exact").eq("organization_id", org_id).lte("created_at", day_end).execute()
        day_companies_count = day_companies.count if hasattr(day_companies, 'count') else len(day_companies.data or [])
        
        usage_by_day.append({
            "date": day.strftime("%Y-%m-%d"),
            "companies": day_companies_count,
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
            "features_locked": True,
        }

    # Get organization with subscription
    org_result = supabase.table("organizations").select("*, subscriptions(*)").eq("id", org_id).execute()
    
    if not org_result.data:
        return {
            "has_subscription": False,
            "plan": "free_trial",
            "status": "inactive",
            "features_locked": True,
        }

    org = org_result.data[0]
    subscription = org.get("subscriptions")
    
    if not subscription:
        return {
            "has_subscription": False,
            "plan": "free_trial",
            "status": "inactive",
            "features_locked": True,
        }

    # Check if subscription is active
    status_value = subscription.get("status", "inactive")
    current_period_end = subscription.get("current_period_end")
    
    is_active = status_value == "active"
    if current_period_end:
        end_date = datetime.fromisoformat(current_period_end.replace("Z", "+00:00"))
        if end_date < datetime.utcnow().replace(tzinfo=end_date.tzinfo):
            is_active = False

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

