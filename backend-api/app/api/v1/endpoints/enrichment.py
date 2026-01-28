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
from app.services.data_sources.apollo import apollo_provider
from app.services.smart_contact_discovery import smart_contact_discovery

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


class SmartDiscoveryRequest(BaseModel):
    """Request model for smart contact discovery"""
    company_name: str
    company_domain: Optional[str] = None
    location: Optional[str] = None
    max_contacts: int = 50
    include_roles: Optional[List[str]] = None


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


@router.post("/smart-discover")
async def smart_discover_contacts(
    request: SmartDiscoveryRequest = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Smart Contact Discovery - Apollo + SerpAPI + Groq AI Merge
    
    This is the PRIMARY contact discovery endpoint that combines:
    1. Apollo.io (Primary) - High-quality structured B2B data (91% email accuracy)
    2. SerpAPI (Secondary) - Broader web coverage via Google/LinkedIn search
    3. Groq LLM (Merger) - Intelligently combines and deduplicates results
    
    Request body:
    {
        "company_name": "Zenith Bank",
        "company_domain": "zenithbank.com",  // Optional
        "location": "Nigeria",                // Optional
        "max_contacts": 50,
        "include_roles": ["CEO", "CTO", "VP Sales"]  // Optional, defaults to executives + sales
    }
    
    Returns:
    {
        "success": true,
        "contacts": [...],           // Merged, deduplicated contacts
        "company": {...},            // Company info from Apollo
        "sources_used": ["apollo", "serpapi", "groq_merger"],
        "merge_quality": "excellent",  // excellent/good/moderate/limited
        "total_raw_results": 45,      // Total before merge
        "total_merged": 32            // Unique contacts after AI merge
    }
    """
    try:
        result = await smart_contact_discovery.discover_contacts(
            company_name=request.company_name,
            company_domain=request.company_domain,
            location=request.location,
            max_contacts=request.max_contacts,
            include_roles=request.include_roles,
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Smart discovery error: {str(e)}"
        )


@router.get("/test-smart-discover")
async def test_smart_discovery():
    """
    Test Smart Contact Discovery (no auth required for testing)
    
    Tests the Apollo + SerpAPI + Groq pipeline with a sample company.
    """
    try:
        result = await smart_contact_discovery.discover_contacts(
            company_name="Microsoft",
            max_contacts=10,
        )
        
        return {
            "success": result.get("success"),
            "message": "Smart discovery test complete",
            "sources_used": result.get("sources_used", []),
            "merge_quality": result.get("merge_quality"),
            "contacts_found": len(result.get("contacts", [])),
            "sample_contacts": result.get("contacts", [])[:3],  # Show first 3
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"Smart discovery test error: {str(e)}",
            "error_type": type(e).__name__
        }


@router.get("/test-apollo")
async def test_apollo_connection():
    """
    Test Apollo.io API connection (no auth required for testing)
    
    Returns:
    - Apollo enabled status
    - Test company search result
    """
    try:
        # Check if Apollo is enabled
        if not apollo_provider.enabled:
            return {
                "success": False,
                "apollo_enabled": False,
                "message": "Apollo API key not configured. Set APOLLO_API_KEY in .env"
            }
        
        # Test with a well-known company
        test_company = await apollo_provider.search_company("Microsoft")
        
        if test_company:
            return {
                "success": True,
                "apollo_enabled": True,
                "message": "Apollo.io connection successful!",
                "test_result": {
                    "company_name": test_company.get("name"),
                    "domain": test_company.get("domain"),
                    "industry": test_company.get("industry"),
                    "employee_count": test_company.get("employee_count"),
                }
            }
        else:
            return {
                "success": False,
                "apollo_enabled": True,
                "message": "Apollo connected but returned no results for test query"
            }
            
    except Exception as e:
        return {
            "success": False,
            "apollo_enabled": apollo_provider.enabled,
            "message": f"Apollo API error: {str(e)}",
            "error_type": type(e).__name__
        }

