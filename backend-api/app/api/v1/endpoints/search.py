"""
Company Search/Analysis endpoints (F1.1 - F1.5)
The main intelligence endpoint for analyzing companies
Using Supabase for database operations
"""
import time
import re
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from datetime import datetime, timedelta

from app.db.supabase_client import get_supabase_client, SupabaseClient
from app.schemas.company import (
    CompanySearchRequest,
    CompanyIntelligence,
    CompanyProfile,
    DecisionMaker,
    ContactInfo,
)
from app.services.scraper.google import GoogleSearchService
from app.services.scraper.news import NewsAggregatorService
from app.services.llm.client import GeminiClient
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


@router.post("/company", response_model=CompanyIntelligence)
async def analyze_company(
    request: CompanySearchRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Analyze a company and return full intelligence profile (F1.1)

    This endpoint:
    1. Checks cache for recent analysis
    2. Scrapes web for company data
    3. Uses AI to generate summary and score
    4. Returns structured intelligence within 5 seconds (target)
    """
    start_time = time.time()

    # Check cache first (data must be < 24 hours old)
    cached = _get_cached_company(supabase, request.company_name)
    if cached:
        return _build_response_from_cache(cached, start_time)

    # Initialize services
    search_service = GoogleSearchService()
    news_service = NewsAggregatorService()
    llm_client = GeminiClient()

    # Gather data (run searches concurrently in production)
    search_results = await search_service.search_company(
        company_name=request.company_name,
        country=request.country,
    )

    dm_results = await search_service.search_decision_makers(
        company_name=request.company_name,
        country=request.country,
    )

    news_results = await search_service.search_company_news(
        company_name=request.company_name,
        country=request.country,
    )

    # Generate AI analysis
    ai_analysis = await llm_client.generate_company_summary(
        company_name=request.company_name,
        search_results=search_results,
        news_items=news_results,
        country=request.country,
    )

    # Extract decision makers
    decision_makers = await llm_client.extract_decision_makers(dm_results)

    # Build company profile from search results
    profile = _build_company_profile(request.company_name, search_results)

    # Build decision maker list
    dm_list = [
        DecisionMaker(
            name=dm.get("name", "Unknown"),
            title=dm.get("title", "Executive"),
            linkedin_url=dm.get("linkedin_url"),
            contact=ContactInfo(verification_score=30),
        )
        for dm in decision_makers
    ]

    # Calculate processing time
    processing_time = int((time.time() - start_time) * 1000)

    # Build response
    response = CompanyIntelligence(
        profile=profile,
        decision_makers=dm_list,
        ai_summary=ai_analysis["summary"],
        predicted_pain_points=ai_analysis["pain_points"],
        conversion_score=ai_analysis["conversion_score"],
        score_factors=ai_analysis["score_factors"],
        data_freshness=datetime.utcnow(),
        sources_used=["Google Search", "News Aggregation", "Gemini AI"],
        processing_time_ms=processing_time,
    )

    # Cache the result
    _cache_company_result(supabase, request.company_name, response)

    return response


@router.get("/company/{company_name}")
async def quick_search(
    company_name: str,
    country: str = Query(default="Nigeria", description="Target country"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Quick search variant using GET method
    Useful for browser navigation and caching
    """
    request = CompanySearchRequest(company_name=company_name, country=country)
    return await analyze_company(request, current_user, supabase)


def _get_cached_company(
    supabase: SupabaseClient,
    company_name: str,
) -> Optional[Dict[str, Any]]:
    """Check for cached company data (< 24 hours old)"""
    cutoff = (datetime.utcnow() - timedelta(hours=24)).isoformat()

    result = supabase.table("company_cache")\
        .select("*")\
        .ilike("company_name", f"%{company_name}%")\
        .gte("updated_at", cutoff)\
        .order("updated_at", desc=True)\
        .limit(1)\
        .execute()

    return result.data[0] if result.data else None


def _build_response_from_cache(
    cached: Dict[str, Any],
    start_time: float,
) -> CompanyIntelligence:
    """Build response from cached data"""
    profile_data = cached.get("profile_data") or {}
    dm_data = cached.get("decision_makers") or []

    # Remove fields that conflict with explicit params
    profile_data_clean = {k: v for k, v in profile_data.items() if k not in ["name", "domain"]}

    profile = CompanyProfile(
        name=cached["company_name"],
        domain=cached.get("company_domain"),
        **profile_data_clean,
    )

    decision_makers = [
        DecisionMaker(**dm) for dm in dm_data
    ]

    # Parse updated_at timestamp
    updated_at = cached.get("updated_at")
    if isinstance(updated_at, str):
        updated_at = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
    else:
        updated_at = datetime.utcnow()

    return CompanyIntelligence(
        profile=profile,
        decision_makers=decision_makers,
        ai_summary=cached.get("ai_summary") or "Cached analysis",
        predicted_pain_points=cached.get("predicted_pain_points") or [],
        conversion_score=cached.get("conversion_score") or 50,
        score_factors=[],
        data_freshness=updated_at,
        sources_used=["Cache"],
        processing_time_ms=int((time.time() - start_time) * 1000),
    )


def _build_company_profile(
    company_name: str,
    search_results: list,
) -> CompanyProfile:
    """Build company profile from search results"""
    # Extract from knowledge graph if available
    kg = next(
        (r for r in search_results if r.get("type") == "knowledge_graph"),
        None,
    )

    if kg:
        attrs = kg.get("attributes", {})
        return CompanyProfile(
            name=kg.get("title", company_name),
            description=kg.get("description"),
            website=kg.get("website"),
            headquarters=attrs.get("Headquarters"),
            founded_year=_extract_year(attrs.get("Founded")),
            employee_count=attrs.get("Employees"),
        )

    # Fallback to basic profile
    return CompanyProfile(
        name=company_name,
        description=search_results[0].get("snippet") if search_results else None,
    )


def _extract_year(value: Optional[str]) -> Optional[int]:
    """Extract year from string"""
    if not value:
        return None
    match = re.search(r'\d{4}', str(value))
    return int(match.group()) if match else None


def _cache_company_result(
    supabase: SupabaseClient,
    company_name: str,
    response: CompanyIntelligence,
) -> None:
    """Cache the company intelligence result"""
    cache_data = {
        "company_name": company_name,
        "company_domain": response.profile.domain,
        "profile_data": response.profile.model_dump(),
        "decision_makers": [dm.model_dump() for dm in response.decision_makers],
        "ai_summary": response.ai_summary,
        "conversion_score": response.conversion_score,
        "predicted_pain_points": response.predicted_pain_points,
        "data_sources": response.sources_used,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }

    supabase.table("company_cache").insert(cache_data).execute()
