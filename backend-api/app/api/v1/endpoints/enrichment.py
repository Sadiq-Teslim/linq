"""
Waterfall Enrichment API Endpoints
Provides enriched company and contact data using multi-provider waterfall strategy
"""
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status, Body
from pydantic import BaseModel, EmailStr

from app.api.v1.endpoints.auth import get_current_user
from app.services.waterfall_enrichment import waterfall_enrichment
from app.services.cost_tracker import cost_tracker

router = APIRouter()


# ===== Request/Response Models =====

class CompanySearchRequest(BaseModel):
    query: str
    include_contacts: bool = True
    max_contacts: int = 50
    location: Optional[str] = None


class PeopleSearchRequest(BaseModel):
    company_name: Optional[str] = None
    company_domain: Optional[str] = None
    job_titles: Optional[List[str]] = None
    seniority_levels: Optional[List[str]] = None
    departments: Optional[List[str]] = None
    max_results: int = 100


class PersonEnrichmentRequest(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company_domain: Optional[str] = None
    linkedin_url: Optional[str] = None


# ===== Endpoints =====

@router.get("/company")
async def search_company_enriched(
    query: str = Query(..., min_length=2, description="Company name to search"),
    include_contacts: bool = Query(True, description="Include company contacts"),
    max_contacts: int = Query(50, ge=1, le=500, description="Maximum contacts to return"),
    location: Optional[str] = Query(None, description="Location filter (e.g., 'Nigeria', 'San Francisco, CA')"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Search for a company with enriched data and optional contacts
    
    Uses waterfall enrichment (Apollo → Hunter) for maximum coverage.
    Returns company details plus key decision-makers with verified emails/phones.
    
    Example:
        GET /api/v1/enrichment/company?query=Zenith Bank&include_contacts=true&max_contacts=50&location=Nigeria
    """
    try:
        # Reset cost tracker for this session
        cost_tracker.reset_session()
        
        result = await waterfall_enrichment.search_company(
            query=query,
            include_contacts=include_contacts,
            max_contacts=max_contacts,
            location=location
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Company '{query}' not found"
            )
        
        # Add cost information to response
        result["session_cost"] = cost_tracker.get_session_cost()
        result["session_operations"] = cost_tracker.get_session_operations()
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Enrichment error: {str(e)}"
        )


@router.post("/people")
async def search_people_enriched(
    request: PeopleSearchRequest = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Search for people at a company with enriched contact data
    
    Uses waterfall enrichment to find people and fill missing emails/phones.
    Automatically tries Apollo first, then Hunter for missing data.
    
    Request body:
    {
        "company_name": "Zenith Bank",
        "company_domain": "zenithbank.com",
        "job_titles": ["CEO", "CTO", "VP Sales"],
        "seniority_levels": ["C-Level", "VP-Level"],
        "departments": ["Sales", "Engineering"],
        "max_results": 100
    }
    """
    try:
        # Reset cost tracker
        cost_tracker.reset_session()
        
        contacts = await waterfall_enrichment.search_people(
            company_name=request.company_name,
            company_domain=request.company_domain,
            job_titles=request.job_titles,
            seniority_levels=request.seniority_levels,
            departments=request.departments,
            max_results=request.max_results
        )
        
        return {
            "success": True,
            "contacts": contacts,
            "total": len(contacts),
            "session_cost": cost_tracker.get_session_cost(),
            "session_operations": cost_tracker.get_session_operations()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"People search error: {str(e)}"
        )


@router.post("/person")
async def enrich_person(
    request: PersonEnrichmentRequest = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Enrich a single person's contact data
    
    Provide at least one identifier:
    - email (best)
    - first_name + last_name + company_domain
    - linkedin_url
    
    Request body:
    {
        "email": "ceo@zenithbank.com"
    }
    
    OR
    
    {
        "first_name": "Ebenezer",
        "last_name": "Onyeagwu",
        "company_domain": "zenithbank.com"
    }
    """
    # Validate that at least one identifier is provided
    if not any([request.email, (request.first_name and request.company_domain), request.linkedin_url]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide email, name+company, or LinkedIn URL"
        )
    
    try:
        # Reset cost tracker
        cost_tracker.reset_session()
        
        person = await waterfall_enrichment.enrich_person(
            email=request.email,
            first_name=request.first_name,
            last_name=request.last_name,
            company_domain=request.company_domain,
            linkedin_url=request.linkedin_url
        )
        
        if not person:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Person not found or could not be enriched"
            )
        
        return {
            "success": True,
            "person": person,
            "session_cost": cost_tracker.get_session_cost(),
            "session_operations": cost_tracker.get_session_operations()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Enrichment error: {str(e)}"
        )


@router.get("/analytics")
async def get_enrichment_analytics(
    start_date: Optional[str] = Query(None, description="Start date (ISO format: YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format: YYYY-MM-DD)"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Get cost and usage analytics for enrichment operations
    
    Returns:
    - Total cost for period
    - Average daily cost
    - Breakdown by provider (Apollo, Hunter, etc.)
    - Breakdown by operation type
    - Daily cost breakdown
    """
    try:
        analytics = await cost_tracker.get_analytics(
            start_date=start_date,
            end_date=end_date
        )
        
        return analytics
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analytics error: {str(e)}"
        )

