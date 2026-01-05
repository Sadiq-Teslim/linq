"""
Public endpoints - No authentication required
Used for landing page demo and public features
"""
from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException, status
from pydantic import BaseModel

from app.services.company_search_service import company_search_service

router = APIRouter()


class PublicCompanyResult(BaseModel):
    """Public company search result - limited info for demo"""
    name: str
    domain: Optional[str] = None
    industry: Optional[str] = None
    headquarters: Optional[str] = None
    employee_count: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    linkedin_url: Optional[str] = None


class PublicSearchResponse(BaseModel):
    """Response for public company search"""
    companies: List[PublicCompanyResult]
    total: int
    query: str


@router.get("/search", response_model=PublicSearchResponse)
async def public_company_search(
    query: str = Query(..., min_length=2, max_length=255, description="Company name to search for"),
    limit: int = Query(default=5, ge=1, le=10, description="Maximum results (capped at 10 for public)"),
):
    """
    Public company search for landing page demo.
    
    Returns basic company information without requiring authentication.
    Results are limited and some features are locked to encourage signup.
    
    - **query**: Company name to search for (2-255 characters)
    - **limit**: Max results to return (1-10, default 5)
    """
    # Cap limit for public endpoint
    limit = min(limit, 10)
    
    try:
        results = await company_search_service.search_companies(query, limit)
    except ValueError as e:
        # SERP_API_KEY not configured
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Search service temporarily unavailable. Please try again later."
        )
    except Exception as e:
        print(f"[Public Search] Error: {e}")
        # Return empty results on error
        results = []
    
    # Convert to public response format
    companies = []
    for r in results:
        companies.append(PublicCompanyResult(
            name=r.get("name", ""),
            domain=r.get("domain"),
            industry=r.get("industry"),
            headquarters=r.get("headquarters") or r.get("location"),
            employee_count=r.get("employee_count"),
            description=r.get("description"),
            logo_url=r.get("logo_url"),
            website=r.get("website") or (f"https://{r.get('domain')}" if r.get("domain") else None),
            linkedin_url=r.get("linkedin_url"),
        ))
    
    return PublicSearchResponse(
        companies=companies,
        total=len(companies),
        query=query,
    )


@router.get("/health")
async def health_check():
    """Simple health check endpoint"""
    return {"status": "ok", "service": "linq-api"}

