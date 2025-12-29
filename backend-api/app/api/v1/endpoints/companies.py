"""
Tracked Companies endpoints for the Monitor Board feature
Handles company tracking, contacts, and updates
"""
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.db.supabase_client import get_supabase_client, SupabaseClient
from app.api.v1.endpoints.auth import get_current_user
from app.services.company_search_service import company_search_service
from app.schemas.company import (
    GlobalCompanySearchQuery,
    GlobalCompanySearchResult,
    GlobalCompanySearchResponse,
    TrackedCompanyCreate,
    TrackedCompanyUpdate,
    TrackedCompanyResponse,
    TrackedCompanyWithDetails,
    PaginatedTrackedCompanies,
    TrackedCompanyContactCreate,
    TrackedCompanyContactUpdate,
    TrackedCompanyContactResponse,
    TrackedCompanyUpdateResponse,
    MarkUpdatesReadRequest,
    PaginatedCompanyUpdates,
    UpdateFrequency,
)

router = APIRouter()


def get_user_organization_id(user: Dict[str, Any]) -> int:
    """Get the organization ID for a user"""
    org_id = user.get("organization_id")
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with an organization"
        )
    return org_id


def calculate_next_update(frequency: UpdateFrequency) -> datetime:
    """Calculate next update time based on frequency"""
    now = datetime.utcnow()
    if frequency == UpdateFrequency.DAILY:
        return now + timedelta(days=1)
    elif frequency == UpdateFrequency.WEEKLY:
        return now + timedelta(weeks=1)
    else:  # MONTHLY
        return now + timedelta(days=30)


# ===== Company Search =====

@router.get("/search", response_model=GlobalCompanySearchResponse)
async def search_companies(
    query: str = Query(..., min_length=2, max_length=255),
    limit: int = Query(default=10, ge=1, le=50),
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Search for companies globally to track
    Uses Clearbit and SerpAPI for real company search
    """
    org_id = get_user_organization_id(current_user)
    
    # Get list of already tracked company domains/names for this organization
    tracked_result = supabase.table("tracked_companies").select("domain, company_name").eq("organization_id", org_id).eq("is_active", True).execute()
    tracked_companies = tracked_result.data if tracked_result.data else []
    tracked_domains = {c.get("domain", "").lower() for c in tracked_companies if c.get("domain")}
    tracked_names = {c.get("company_name", "").lower() for c in tracked_companies if c.get("company_name")}

    # Use real company search service
    try:
        results = await company_search_service.search_companies(query, limit)
    except ValueError as e:
        # SERP_API_KEY not configured or other service error
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Search service unavailable: {str(e)}"
        )
    except Exception as e:
        # Other errors - return empty results instead of failing
        results = []

    # Convert to response schema and mark if already tracked
    search_results = []
    for r in results:
        domain = (r.get("domain") or "").lower()
        name = (r.get("name") or "").lower()
        is_tracked = domain in tracked_domains or name in tracked_names
        
        search_results.append(
            GlobalCompanySearchResult(
                name=r.get("name", ""),
                domain=r.get("domain"),
                industry=r.get("industry"),
                employee_count=r.get("employee_count"),
                headquarters=r.get("headquarters"),
                logo_url=r.get("logo_url"),
                linkedin_url=r.get("linkedin_url"),
                description=r.get("description"),
                website=r.get("website") or r.get("domain"),
                is_already_tracked=is_tracked,
            )
        )

    return GlobalCompanySearchResponse(
        results=search_results,
        total=len(search_results),
    )


@router.get("/search/{domain}/details")
async def get_company_by_domain(
    domain: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Get detailed company information by domain
    Uses Clearbit Company API for enrichment
    """
    details = await company_search_service.get_company_details(domain)

    if not details:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found or unable to fetch details"
        )

    return details


# ===== Tracked Companies CRUD =====

@router.get("", response_model=PaginatedTrackedCompanies)
def get_tracked_companies(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    is_priority: Optional[bool] = Query(default=None),
    industry: Optional[str] = Query(default=None),
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Get all tracked companies for the user's organization
    """
    org_id = get_user_organization_id(current_user)

    # Build query
    query = supabase.table("tracked_companies").select("*").eq("organization_id", org_id).eq("is_active", True)

    if is_priority is not None:
        query = query.eq("is_priority", is_priority)

    if industry:
        query = query.ilike("industry", f"%{industry}%")

    # Get total count
    count_result = query.execute()
    total = len(count_result.data) if count_result.data else 0

    # Paginate
    offset = (page - 1) * page_size
    query = query.order("is_priority", desc=True).order("last_updated", desc=True).range(offset, offset + page_size - 1)

    result = query.execute()
    items = result.data if result.data else []

    # Parse tags from JSON
    for item in items:
        item["tags"] = item.get("tags") or []

    return PaginatedTrackedCompanies(
        items=[TrackedCompanyResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.post("", response_model=TrackedCompanyResponse, status_code=status.HTTP_201_CREATED)
def track_company(
    data: TrackedCompanyCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Start tracking a company
    """
    org_id = get_user_organization_id(current_user)

    # Check if company is already tracked
    existing = supabase.table("tracked_companies").select("id").eq("organization_id", org_id).eq("company_name", data.company_name).eq("is_active", True).execute()

    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Company is already being tracked"
        )

    # Check subscription limits
    # TODO: Implement subscription limit check

    # Create tracked company
    now = datetime.utcnow()
    company_data = {
        "organization_id": org_id,
        "added_by_id": current_user["id"],
        "company_name": data.company_name,
        "domain": data.domain,
        "linkedin_url": data.linkedin_url,
        "logo_url": data.logo_url,
        "industry": data.industry,
        "employee_count": data.employee_count,
        "headquarters": data.headquarters,
        "description": data.description,
        "is_priority": data.is_priority,
        "update_frequency": data.update_frequency.value,
        "notify_on_update": data.notify_on_update,
        "tags": data.tags,
        "last_updated": now.isoformat(),
        "next_update_at": calculate_next_update(data.update_frequency).isoformat(),
        "is_active": True,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }

    result = supabase.table("tracked_companies").insert(company_data).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to track company"
        )

    company = result.data[0]
    company["tags"] = company.get("tags") or []

    return TrackedCompanyResponse.model_validate(company)


@router.get("/{company_id}", response_model=TrackedCompanyWithDetails)
def get_company_details(
    company_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Get detailed information about a tracked company including contacts and updates
    """
    org_id = get_user_organization_id(current_user)

    # Get company
    result = supabase.table("tracked_companies").select("*").eq("id", company_id).eq("organization_id", org_id).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )

    company = result.data[0]
    company["tags"] = company.get("tags") or []

    # Get contacts
    contacts_result = supabase.table("company_contacts").select("*").eq("company_id", company_id).eq("is_active", True).execute()
    contacts = contacts_result.data if contacts_result.data else []

    # Get recent updates
    updates_result = supabase.table("company_updates").select("*").eq("company_id", company_id).order("created_at", desc=True).limit(10).execute()
    updates = updates_result.data if updates_result.data else []

    # Count unread updates
    unread_result = supabase.table("company_updates").select("id").eq("company_id", company_id).eq("is_read", False).execute()
    unread_count = len(unread_result.data) if unread_result.data else 0

    return TrackedCompanyWithDetails(
        **company,
        contacts=[TrackedCompanyContactResponse.model_validate(c) for c in contacts],
        recent_updates=[TrackedCompanyUpdateResponse.model_validate(u) for u in updates],
        unread_update_count=unread_count,
    )


@router.patch("/{company_id}", response_model=TrackedCompanyResponse)
def update_tracked_company(
    company_id: int,
    data: TrackedCompanyUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Update tracking settings for a company
    """
    org_id = get_user_organization_id(current_user)

    # Verify company belongs to organization
    existing = supabase.table("tracked_companies").select("id, update_frequency").eq("id", company_id).eq("organization_id", org_id).execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )

    # Build update data
    update_data = {"updated_at": datetime.utcnow().isoformat()}

    if data.is_priority is not None:
        update_data["is_priority"] = data.is_priority

    if data.update_frequency is not None:
        update_data["update_frequency"] = data.update_frequency.value
        update_data["next_update_at"] = calculate_next_update(data.update_frequency).isoformat()

    if data.notify_on_update is not None:
        update_data["notify_on_update"] = data.notify_on_update

    if data.tags is not None:
        update_data["tags"] = data.tags

    result = supabase.table("tracked_companies").update(update_data).eq("id", company_id).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update company"
        )

    company = result.data[0]
    company["tags"] = company.get("tags") or []

    return TrackedCompanyResponse.model_validate(company)


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def untrack_company(
    company_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Stop tracking a company (soft delete)
    """
    org_id = get_user_organization_id(current_user)

    # Verify company belongs to organization
    existing = supabase.table("tracked_companies").select("id").eq("id", company_id).eq("organization_id", org_id).execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )

    # Soft delete
    supabase.table("tracked_companies").update({
        "is_active": False,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", company_id).execute()


# ===== Company Contacts =====

@router.post("/{company_id}/contacts", response_model=TrackedCompanyContactResponse, status_code=status.HTTP_201_CREATED)
def add_contact(
    company_id: int,
    data: TrackedCompanyContactCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Add a contact to a tracked company
    """
    org_id = get_user_organization_id(current_user)

    # Verify company belongs to organization
    existing = supabase.table("tracked_companies").select("id").eq("id", company_id).eq("organization_id", org_id).execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )

    now = datetime.utcnow()
    contact_data = {
        "company_id": company_id,
        "full_name": data.full_name,
        "title": data.title,
        "department": data.department,
        "email": data.email,
        "phone": data.phone,
        "linkedin_url": data.linkedin_url,
        "is_decision_maker": data.is_decision_maker,
        "source": "manual",
        "is_active": True,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }

    result = supabase.table("company_contacts").insert(contact_data).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add contact"
        )

    return TrackedCompanyContactResponse.model_validate(result.data[0])


@router.get("/{company_id}/contacts", response_model=List[TrackedCompanyContactResponse])
def get_contacts(
    company_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Get all contacts for a tracked company
    """
    org_id = get_user_organization_id(current_user)

    # Verify company belongs to organization
    existing = supabase.table("tracked_companies").select("id").eq("id", company_id).eq("organization_id", org_id).execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )

    result = supabase.table("company_contacts").select("*").eq("company_id", company_id).eq("is_active", True).order("is_decision_maker", desc=True).execute()

    contacts = result.data if result.data else []
    return [TrackedCompanyContactResponse.model_validate(c) for c in contacts]


@router.patch("/{company_id}/contacts/{contact_id}", response_model=TrackedCompanyContactResponse)
def update_contact(
    company_id: int,
    contact_id: int,
    data: TrackedCompanyContactUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Update a contact's information
    """
    org_id = get_user_organization_id(current_user)

    # Verify company belongs to organization
    existing = supabase.table("tracked_companies").select("id").eq("id", company_id).eq("organization_id", org_id).execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )

    # Build update data
    update_data = {"updated_at": datetime.utcnow().isoformat()}

    for field in ["full_name", "title", "department", "email", "phone", "linkedin_url", "is_decision_maker", "is_active"]:
        value = getattr(data, field, None)
        if value is not None:
            update_data[field] = value

    result = supabase.table("company_contacts").update(update_data).eq("id", contact_id).eq("company_id", company_id).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )

    return TrackedCompanyContactResponse.model_validate(result.data[0])


@router.delete("/{company_id}/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(
    company_id: int,
    contact_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Remove a contact (soft delete)
    """
    org_id = get_user_organization_id(current_user)

    # Verify company belongs to organization
    existing = supabase.table("tracked_companies").select("id").eq("id", company_id).eq("organization_id", org_id).execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )

    supabase.table("company_contacts").update({
        "is_active": False,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", contact_id).eq("company_id", company_id).execute()


# ===== Company Updates =====

@router.get("/updates", response_model=PaginatedCompanyUpdates)
def get_all_updates(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    company_id: Optional[int] = Query(default=None),
    is_read: Optional[bool] = Query(default=None),
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Get updates for all tracked companies (or a specific company)
    """
    org_id = get_user_organization_id(current_user)

    # Get company IDs for this organization
    companies_result = supabase.table("tracked_companies").select("id").eq("organization_id", org_id).eq("is_active", True).execute()
    company_ids = [c["id"] for c in (companies_result.data or [])]

    if not company_ids:
        return PaginatedCompanyUpdates(
            items=[],
            total=0,
            page=page,
            page_size=page_size,
            has_more=False,
            unread_count=0,
        )

    # Build query
    query = supabase.table("company_updates").select("*")

    if company_id:
        if company_id not in company_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )
        query = query.eq("company_id", company_id)
    else:
        query = query.in_("company_id", company_ids)

    if is_read is not None:
        query = query.eq("is_read", is_read)

    # Get total and unread count
    all_updates = query.execute()
    total = len(all_updates.data) if all_updates.data else 0
    unread_count = len([u for u in (all_updates.data or []) if not u.get("is_read", False)])

    # Paginate
    offset = (page - 1) * page_size
    query = query.order("created_at", desc=True).range(offset, offset + page_size - 1)

    result = query.execute()
    items = result.data if result.data else []

    return PaginatedCompanyUpdates(
        items=[TrackedCompanyUpdateResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
        unread_count=unread_count,
    )


@router.post("/updates/mark-read", status_code=status.HTTP_204_NO_CONTENT)
def mark_updates_read(
    data: MarkUpdatesReadRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Mark specific updates as read
    """
    org_id = get_user_organization_id(current_user)
    now = datetime.utcnow()

    # Verify updates belong to organization's companies
    # For simplicity, just update - in production, verify ownership

    for update_id in data.update_ids:
        supabase.table("company_updates").update({
            "is_read": True,
            "read_by_id": current_user["id"],
            "read_at": now.isoformat(),
        }).eq("id", update_id).execute()


@router.post("/{company_id}/refresh", response_model=TrackedCompanyResponse)
def refresh_company_data(
    company_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Manually refresh data for a tracked company
    """
    org_id = get_user_organization_id(current_user)

    # Verify company belongs to organization
    result = supabase.table("tracked_companies").select("*").eq("id", company_id).eq("organization_id", org_id).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )

    company = result.data[0]

    # TODO: Trigger background job to fetch latest data
    # For now, just update last_updated timestamp

    now = datetime.utcnow()
    frequency = UpdateFrequency(company.get("update_frequency", "weekly"))

    update_result = supabase.table("tracked_companies").update({
        "last_updated": now.isoformat(),
        "next_update_at": calculate_next_update(frequency).isoformat(),
        "updated_at": now.isoformat(),
    }).eq("id", company_id).execute()

    updated_company = update_result.data[0] if update_result.data else company
    updated_company["tags"] = updated_company.get("tags") or []

    return TrackedCompanyResponse.model_validate(updated_company)
