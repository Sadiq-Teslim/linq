"""
Tracked Companies endpoints for the Monitor Board feature
Handles company tracking, contacts, and updates
"""
import httpx
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks

from app.db.supabase_client import get_supabase_client, SupabaseClient
from app.api.v1.endpoints.auth import get_current_user
from app.services.company_search_service import company_search_service
from app.services.llm.text_formatter import text_formatter
from app.core.config import settings
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

    # Use real company search service with fallbacks
    results = []
    
    # Try the full search service if SERP_API_KEY is available
    if settings.SERP_API_KEY:
        try:
            results = await company_search_service.search_companies(query, limit)
        except Exception as e:
            print(f"[Company Search] SerpAPI error (non-fatal): {e}")
            results = []
    
    # If no results from SerpAPI, try fallback methods
    if not results:
        # Try Clearbit Autocomplete (free)
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://autocomplete.clearbit.com/v1/companies/suggest",
                    params={"query": query},
                    timeout=10.0,
                )
                if response.status_code == 200:
                    clearbit_results = response.json()
                    for r in clearbit_results[:limit]:
                        results.append({
                            "name": r.get("name", query.title()),
                            "domain": r.get("domain"),
                            "logo_url": r.get("logo"),
                            "website": f"https://{r.get('domain')}" if r.get("domain") else None,
                            "industry": None,
                            "employee_count": None,
                            "headquarters": None,
                            "linkedin_url": None,
                            "description": None,
                        })
        except Exception as e:
            print(f"[Company Search] Clearbit error (non-fatal): {e}")
        
        # If still no results, check known companies (similar to public endpoint)
        if not results:
            from app.api.v1.endpoints.public import KNOWN_COMPANIES, normalize_query
            normalized_query = normalize_query(query)
            
            for key, company_data in KNOWN_COMPANIES.items():
                if normalized_query in normalize_query(key) or normalize_query(key) in normalized_query:
                    results.append({
                        "name": company_data["name"],
                        "domain": company_data.get("domain"),
                        "industry": company_data.get("industry"),
                        "headquarters": company_data.get("headquarters"),
                        "employee_count": company_data.get("employee_count"),
                        "description": company_data.get("description"),
                        "logo_url": f"https://logo.clearbit.com/{company_data.get('domain')}" if company_data.get("domain") else None,
                        "website": f"https://{company_data.get('domain')}" if company_data.get("domain") else None,
                        "linkedin_url": None,
                    })
                    if len(results) >= limit:
                        break

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

    # Parse tags from JSON and fix logo URLs
    for item in items:
        item["tags"] = item.get("tags") or []
        # Fix logo URL if it's using a subdomain
        if item.get("logo_url") and item.get("domain"):
            try:
                domain_parts = item["domain"].replace("www.", "").split(".")
                if len(domain_parts) >= 2:
                    main_domain = ".".join(domain_parts[-2:])
                    if "logo.clearbit.com" in item["logo_url"]:
                        item["logo_url"] = f"https://logo.clearbit.com/{main_domain}"
            except Exception:
                pass

    return PaginatedTrackedCompanies(
        items=[TrackedCompanyResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.post("", response_model=TrackedCompanyResponse, status_code=status.HTTP_201_CREATED)
async def track_company(
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

    # Fix logo URL - extract main domain from subdomain
    logo_url = data.logo_url
    if logo_url and data.domain:
        try:
            from urllib.parse import urlparse
            # Extract main domain (remove subdomain)
            domain_parts = data.domain.replace("www.", "").split(".")
            if len(domain_parts) >= 2:
                main_domain = ".".join(domain_parts[-2:])  # Get last 2 parts (e.g., "zenithbank.com")
                # Update logo URL if it's a Clearbit URL
                if "logo.clearbit.com" in logo_url:
                    logo_url = f"https://logo.clearbit.com/{main_domain}"
        except Exception:
            pass  # Keep original logo_url if parsing fails

    # Format company name and description using AI
    formatted_company_name = data.company_name
    formatted_description = data.description
    try:
        formatted_company_name = await text_formatter.format_company_name(data.company_name)
        if data.description:
            formatted_description = await text_formatter.format_description(data.description)
    except Exception as e:
        print(f"Error formatting company data: {e}")
    
    # Create tracked company
    now = datetime.utcnow()
    company_data = {
        "organization_id": org_id,
        "added_by_id": current_user["id"],
        "company_name": formatted_company_name,
        "domain": data.domain,
        "linkedin_url": data.linkedin_url,
        "logo_url": logo_url,  # Use fixed logo URL
        "website": data.domain,  # Add website field
        "industry": data.industry,
        "employee_count": data.employee_count,
        "headquarters": data.headquarters,
        "description": formatted_description,
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
    company_id = company["id"]

    # Immediately discover contacts (await to ensure they're saved before response)
    try:
        # Discover contacts immediately - await to ensure they're available right away
        print(f"[TrackCompany] Starting contact discovery for {data.company_name} (domain: {data.domain})")
        contacts_found = await _discover_and_save_contacts(
            company_id=company_id,
            company_name=data.company_name,
            company_domain=data.domain,
            supabase=supabase,
        )
        print(f"[TrackCompany] Contact discovery completed for {data.company_name}: {contacts_found} contacts saved")
        
        # Also fetch initial company updates (funding, news, events)
        await _fetch_initial_company_updates(
            company_id=company_id,
            company_name=data.company_name,
            supabase=supabase,
        )
    except Exception as e:
        # Log full error with traceback but don't fail the request
        import traceback
        print(f"[TrackCompany] ERROR during contact discovery for {data.company_name}:")
        print(f"[TrackCompany] Error type: {type(e).__name__}")
        print(f"[TrackCompany] Error message: {str(e)}")
        traceback.print_exc()

    return TrackedCompanyResponse.model_validate(company)


async def _discover_and_save_contacts(
    company_id: int,
    company_name: str,
    company_domain: Optional[str],
    supabase: SupabaseClient,
):
    """Helper function to discover and save contacts using Smart Contact Discovery (Apollo + SerpAPI + Groq)"""
    try:
        from app.services.smart_contact_discovery import smart_contact_discovery
        
        # Extract main domain from subdomain (e.g., ibank.zenithbank.com -> zenithbank.com)
        main_domain = company_domain
        if company_domain:
            domain_parts = company_domain.replace("www.", "").split(".")
            if len(domain_parts) >= 2:
                main_domain = ".".join(domain_parts[-2:])  # Get last 2 parts
        
        print(f"[SmartDiscovery] Discovering contacts for {company_name} (domain: {main_domain})")
        
        # Use smart discovery (Apollo + SerpAPI + Groq merge)
        discovery_result = await smart_contact_discovery.discover_contacts(
            company_name=company_name,
            company_domain=main_domain,
            location="Nigeria",
            max_contacts=50,
        )
        
        discovered_contacts = discovery_result.get("contacts", [])
        sources_used = discovery_result.get("sources_used", [])
        merge_quality = discovery_result.get("merge_quality", "unknown")
        
        print(f"[SmartDiscovery] Found {len(discovered_contacts)} contacts (sources: {sources_used}, quality: {merge_quality})")
        
        now = datetime.utcnow()
        contacts_added = 0
        
        for contact_data in discovered_contacts:
            # Skip contacts without a valid full_name (required by database)
            full_name = contact_data.get("full_name") or contact_data.get("name")
            if not full_name or not full_name.strip():
                # Try to generate a name from email if available
                email = contact_data.get("email")
                if email:
                    # Extract name from email (e.g., "john.doe@company.com" -> "John Doe")
                    email_local = email.split("@")[0]
                    # Replace dots/underscores with spaces and capitalize
                    full_name = email_local.replace(".", " ").replace("_", " ").title()
                else:
                    # Skip contacts without name or email
                    print(f"⚠ Skipping contact: no name or email (data: {contact_data})")
                    continue
            
            # Format contact name using AI to ensure proper English (with timeout to avoid blocking)
            try:
                import asyncio
                full_name = await asyncio.wait_for(
                    text_formatter.format_contact_name(full_name),
                    timeout=5.0  # 5 second timeout for AI formatting
                )
            except asyncio.TimeoutError:
                print(f"⚠ AI formatting timeout for '{full_name}', using original")
                full_name = full_name.strip()
            except Exception as e:
                print(f"⚠ Error formatting contact name '{full_name}': {e}")
                full_name = full_name.strip()
            
            # Format title if available (with timeout)
            title = contact_data.get("title")
            if title:
                try:
                    import asyncio
                    title = await asyncio.wait_for(
                        text_formatter.format_title(title),
                        timeout=5.0
                    )
                except (asyncio.TimeoutError, Exception) as e:
                    print(f"⚠ Error formatting title '{title}': {e}")
                    title = title.strip() if title else None
            
            # Ensure full_name is not empty after formatting
            if not full_name or not full_name.strip():
                print(f"⚠ Skipping contact: empty name after formatting")
                continue
            
            # Check if contact already exists
            existing_contact = supabase.table("company_contacts")\
                .select("id")\
                .eq("company_id", company_id)\
                .eq("full_name", full_name)\
                .execute()
            
            if not existing_contact.data:
                try:
                    contact_record = {
                        "company_id": company_id,
                        "full_name": full_name,  # Already formatted
                        "title": title,
                        "department": contact_data.get("department", "other"),
                        "email": contact_data.get("email"),
                        "phone": contact_data.get("phone"),
                        "linkedin_url": contact_data.get("linkedin_url"),
                        "is_decision_maker": contact_data.get("is_decision_maker", False),
                        "is_verified": False,
                        "verification_score": contact_data.get("confidence_score", 0.5),
                        "source": contact_data.get("source", "automated"),
                        "is_active": True,
                        "created_at": now.isoformat(),
                        "updated_at": now.isoformat(),
                    }
                    supabase.table("company_contacts").insert(contact_record).execute()
                    contacts_added += 1
                except Exception as e:
                    print(f"⚠ Error saving contact '{full_name}': {e}")
                    continue
        
        print(f"[SmartDiscovery] Saved {contacts_added} contacts for {company_name}")
        return contacts_added
    except Exception as e:
        import traceback
        print(f"[SmartDiscovery] ERROR discovering contacts for {company_name}: {e}")
        traceback.print_exc()
        return 0


async def _fetch_initial_company_updates(
    company_id: int,
    company_name: str,
    company_domain: Optional[str] = None,
    supabase: SupabaseClient = None,
):
    """Fetch initial company updates including funding, role changes, events"""
    try:
        from app.services.scraper.google import GoogleSearchService
        
        now = datetime.utcnow()
        google_service = GoogleSearchService()
        
        # Search for recent news, funding, and events
        company_news = await google_service.search_company_news(company_name, "Nigeria")
        
        updates_added = 0
        for news_item in company_news[:10]:  # Get more initial updates
            # Check if update already exists
            existing_update = supabase.table("company_updates")\
                .select("id")\
                .eq("company_id", company_id)\
                .eq("title", news_item.get("title", ""))\
                .execute()
            
            if existing_update.data:
                continue
            
            # Enhanced classification for funding, role changes, events
            update_type = "news"
            title_lower = news_item.get("title", "").lower()
            snippet_lower = news_item.get("snippet", "").lower()
            combined_text = f"{title_lower} {snippet_lower}"
            
            # Detect funding signals
            funding_keywords = ["funding", "raised", "investment", "series", "round", "million", "billion", "$", "seed", "venture", "capital"]
            if any(kw in combined_text for kw in funding_keywords):
                update_type = "funding"
            
            # Detect role changes and promotions
            elif any(kw in combined_text for kw in ["promoted", "appointed", "hired", "joined", "role", "ceo", "cfo", "cto", "vp", "director"]):
                update_type = "hiring"  # Or we could add "role_change" type
            
            # Detect events (map to news since event type may not be in DB constraint)
            elif any(kw in combined_text for kw in ["summit", "conference", "event", "speaking", "attending", "webinar"]):
                update_type = "news"  # Use "news" instead of "event" to match DB constraint
            
            # Detect partnerships
            elif any(kw in combined_text for kw in ["partnership", "partner", "collaboration", "alliance"]):
                update_type = "partnership"
            
            # Detect expansion/launches
            elif any(kw in combined_text for kw in ["expansion", "launch", "opens", "launched"]):
                update_type = "expansion"
            
            # Parse published_at date
            published_at = None
            date_str = news_item.get("date")
            if date_str:
                try:
                    from dateutil import parser
                    published_at = parser.parse(date_str).isoformat()
                except:
                    if "ago" in str(date_str).lower():
                        published_at = now.isoformat()
                    else:
                        try:
                            published_at = parser.parse(date_str).isoformat()
                        except:
                            published_at = now.isoformat()
            else:
                published_at = now.isoformat()
            
            # Determine importance
            importance = "medium"
            if update_type == "funding" or "ceo" in combined_text or "cfo" in combined_text:
                importance = "high"
            
            # Format title and summary using AI
            title = news_item.get("title", "")
            summary = news_item.get("snippet", "")
            try:
                title = await text_formatter.format_text(title, "This is a news article title", "title")
                summary = await text_formatter.format_description(summary)
            except Exception as e:
                print(f"Error formatting update text: {e}")
            
            update_data = {
                "company_id": company_id,
                "update_type": update_type,
                "title": title,
                "summary": summary,
                "source_url": news_item.get("link"),
                "source_name": news_item.get("source", "Google News"),
                "importance": importance,
                "is_read": False,
                "detected_at": now.isoformat(),
                "published_at": published_at,
                "created_at": now.isoformat(),
            }
            supabase.table("company_updates").insert(update_data).execute()
            updates_added += 1
        
        print(f"✓ Fetched and saved {updates_added} initial updates for {company_name}")
    except Exception as e:
        print(f"⚠ Error fetching initial company updates: {e}")


async def _generate_and_log_insights(
    company_id: int,
    company_name: str,
    company_data: Dict[str, Any],
    recent_updates: List[Dict[str, Any]],
    contacts: List[Dict[str, Any]],
    supabase: SupabaseClient,
):
    """Background task to generate AI insights and log the response"""
    try:
        from app.services.llm.client import GeminiClient
        import json
        
        llm_client = GeminiClient()
        print(f"🤖 [AI Insights Background] Generating insights for {company_name}...")
        
        ai_insights = await llm_client.generate_company_insights(
            company_name=company_name,
            company_data=company_data,
            recent_updates=recent_updates,
            contacts=contacts,
        )
        
        # Format insights as readable text
        if ai_insights:
            print(f"✅ [AI Insights Background] Successfully generated insights for {company_name}")
            print(f"📝 [AI Insights Background] Raw response: {json.dumps(ai_insights, indent=2)}")
            
            insights_parts = []
            if ai_insights.get("strategic_insights"):
                insights_parts.append("Strategic Insights:\n" + "\n".join(f"• {i}" for i in ai_insights["strategic_insights"][:3]))
            if ai_insights.get("action_recommendations"):
                insights_parts.append("\nRecommended Actions:\n" + "\n".join(f"• {i}" for i in ai_insights["action_recommendations"][:3]))
            if ai_insights.get("growth_signals"):
                insights_parts.append("\nGrowth Signals:\n" + "\n".join(f"• {i}" for i in ai_insights["growth_signals"][:3]))
            if ai_insights.get("relationship_opportunities"):
                insights_parts.append("\nRelationship Opportunities:\n" + "\n".join(f"• {i}" for i in ai_insights["relationship_opportunities"][:3]))
            if ai_insights.get("risk_factors"):
                insights_parts.append("\nRisk Factors:\n" + "\n".join(f"• {i}" for i in ai_insights["risk_factors"][:3]))
            
            ai_insights_text = "\n\n".join(insights_parts) if insights_parts else None
            
            if ai_insights_text:
                print(f"📄 [AI Insights Background] Formatted insights:\n{ai_insights_text}\n")
                
                # Save insights to the company_updates table as a special "ai_insight" type
                try:
                    # Check if an AI insight already exists for this company
                    existing = supabase.table("company_updates").select("id").eq("company_id", company_id).eq("update_type", "ai_insight").execute()
                    
                    now = datetime.utcnow().isoformat()
                    insight_data = {
                        "company_id": company_id,
                        "update_type": "news",  # Use "news" type since "ai_insight" may not exist in enum
                        "title": f"AI Strategic Analysis for {company_name}",
                        "summary": ai_insights_text,
                        "source_name": "LYNQ AI (Ollama)",
                        "importance": "high",
                        "is_read": False,
                        "detected_at": now,
                        "published_at": now,
                        "created_at": now,
                    }
                    
                    if existing.data:
                        # Update existing insight
                        supabase.table("company_updates").update({
                            "summary": ai_insights_text,
                            "detected_at": now,
                        }).eq("id", existing.data[0]["id"]).execute()
                        print(f"💾 [AI Insights Background] Updated existing AI insights for {company_name}")
                    else:
                        # Insert new insight
                        supabase.table("company_updates").insert(insight_data).execute()
                        print(f"💾 [AI Insights Background] Saved new AI insights for {company_name}")
                except Exception as db_error:
                    print(f"⚠️ [AI Insights Background] Failed to save insights to database: {db_error}")
    except Exception as e:
        print(f"❌ [AI Insights Background] Error generating insights: {e}")
        import traceback
        traceback.print_exc()


@router.get("/{company_id}", response_model=TrackedCompanyWithDetails)
async def get_company_details(
    company_id: int,
    background_tasks: BackgroundTasks,
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

    # Fix logo URL if it's using a subdomain
    if company.get("logo_url") and company.get("domain"):
        try:
            domain_parts = company["domain"].replace("www.", "").split(".")
            if len(domain_parts) >= 2:
                main_domain = ".".join(domain_parts[-2:])
                if "logo.clearbit.com" in company["logo_url"]:
                    company["logo_url"] = f"https://logo.clearbit.com/{main_domain}"
        except Exception:
            pass

    # Get contacts
    contacts_result = supabase.table("company_contacts").select("*").eq("company_id", company_id).eq("is_active", True).execute()
    contacts = contacts_result.data if contacts_result.data else []

    # Map contact fields if needed (database uses 'name', schema expects 'full_name')
    # Also map verification_score -> confidence_score and last_verified -> last_verified_at
    mapped_contacts = []
    for c in contacts:
        if "name" in c and "full_name" not in c:
            c["full_name"] = c["name"]
        # Map verification_score to confidence_score
        if "verification_score" in c and "confidence_score" not in c:
            c["confidence_score"] = c["verification_score"]
        # Map last_verified to last_verified_at
        if "last_verified" in c and "last_verified_at" not in c:
            c["last_verified_at"] = c["last_verified"]
        # Ensure confidence_score exists (default to None if missing)
        if "confidence_score" not in c:
            c["confidence_score"] = None
        # Ensure last_verified_at exists (default to None if missing)
        if "last_verified_at" not in c:
            c["last_verified_at"] = None
        mapped_contacts.append(c)

    # Get recent updates
    updates_result = supabase.table("company_updates").select("*").eq("company_id", company_id).order("created_at", desc=True).limit(10).execute()
    updates = updates_result.data if updates_result.data else []

    # Map update fields if needed (database uses 'title', ensure it's present)
    mapped_updates = []
    for u in updates:
        # Ensure title field exists (some code might use 'headline', schema uses 'title')
        if "headline" in u and "title" not in u:
            u["title"] = u["headline"]
        # Map detected_at to created_at if needed
        if "detected_at" in u and "created_at" not in u:
            u["created_at"] = u["detected_at"]
        mapped_updates.append(u)

    # Count unread updates
    unread_result = supabase.table("company_updates").select("id").eq("company_id", company_id).eq("is_read", False).execute()
    unread_count = len(unread_result.data) if unread_result.data else 0

    # Get existing AI insights from database (if available)
    ai_insights_text = company.get("ai_insights")
    
    # Generate AI insights in background (non-blocking)
    # This allows the API to return immediately while Ollama generates insights
    background_tasks.add_task(
        _generate_and_log_insights,
        company_id=company_id,
        company_name=company.get("company_name", ""),
        company_data=company,
        recent_updates=mapped_updates,
        contacts=mapped_contacts,
        supabase=supabase,
    )
    print(f"🚀 [AI Insights] Started background task for {company.get('company_name', '')} - API returning immediately")

    # Build response
    response_data = {
        **company,
        "contacts": [TrackedCompanyContactResponse.model_validate(c) for c in mapped_contacts],
        "recent_updates": [TrackedCompanyUpdateResponse.model_validate(u) for u in mapped_updates],
        "unread_update_count": unread_count,
    }
    
    # Add AI insights if available
    if ai_insights_text:
        response_data["ai_insights"] = ai_insights_text

    return TrackedCompanyWithDetails(**response_data)


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

    # Build base query for counting
    count_query = supabase.table("company_updates").select("id, is_read")
    
    if company_id:
        if company_id not in company_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )
        count_query = count_query.eq("company_id", company_id)
    else:
        count_query = count_query.in_("company_id", company_ids)

    if is_read is not None:
        count_query = count_query.eq("is_read", is_read)

    # Get total and unread count
    all_updates = count_query.execute()
    total = len(all_updates.data) if all_updates.data else 0
    unread_count = len([u for u in (all_updates.data or []) if not u.get("is_read", False)])

    # Build separate query for paginated results
    data_query = supabase.table("company_updates").select("*")
    
    if company_id:
        data_query = data_query.eq("company_id", company_id)
    else:
        data_query = data_query.in_("company_id", company_ids)

    if is_read is not None:
        data_query = data_query.eq("is_read", is_read)

    # Paginate
    offset = (page - 1) * page_size
    data_query = data_query.order("created_at", desc=True).range(offset, offset + page_size - 1)

    result = data_query.execute()
    raw_items = result.data if result.data else []
    
    # Safely validate items, skip invalid ones
    items = []
    for item in raw_items:
        try:
            # Ensure required fields have defaults
            if item.get("update_type") is None:
                item["update_type"] = "other"
            if item.get("is_important") is None:
                item["is_important"] = False
            if item.get("is_read") is None:
                item["is_read"] = False
            items.append(TrackedCompanyUpdateResponse.model_validate(item))
        except Exception as e:
            print(f"[Updates] Skipping invalid update {item.get('id')}: {e}")
            continue

    return PaginatedCompanyUpdates(
        items=items,
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
async def refresh_company_data(
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

    # Fetch latest company data and updates
    now = datetime.utcnow()
    frequency = UpdateFrequency(company.get("update_frequency", "weekly"))

    # Fetch company news/updates from external sources
    try:
        from app.services.scraper.google import GoogleSearchService
        
        google_service = GoogleSearchService()
        company_name = company.get("company_name", "")
        company_domain = company.get("domain", "")
        
        # Search for recent news about this company
        company_news = await google_service.search_company_news(company_name, "Nigeria")
        
        # Store relevant news as company updates
        for news_item in company_news[:5]:  # Limit to 5 most recent
            # Check if update already exists
            existing_update = supabase.table("company_updates")\
                .select("id")\
                .eq("company_id", company_id)\
                .eq("title", news_item.get("title", ""))\
                .execute()
            
            if not existing_update.data:
                # Classify update type
                update_type = "news"
                title_lower = news_item.get("title", "").lower()
                if any(kw in title_lower for kw in ["funding", "raised", "investment"]):
                    update_type = "funding"
                elif any(kw in title_lower for kw in ["hiring", "recruit", "jobs"]):
                    update_type = "hiring"
                elif any(kw in title_lower for kw in ["partnership", "partner", "collaboration"]):
                    update_type = "partnership"
                elif any(kw in title_lower for kw in ["expansion", "launch", "opens"]):
                    update_type = "expansion"
                
                # Parse published_at date - handle relative time strings like "1 month ago"
                published_at = None
                date_str = news_item.get("date")
                if date_str:
                    try:
                        # Try to parse as ISO format first
                        from dateutil import parser
                        published_at = parser.parse(date_str).isoformat()
                    except:
                        # If parsing fails (e.g., "1 month ago"), use detected_at as fallback
                        try:
                            # Try to parse relative time strings
                            if "ago" in str(date_str).lower():
                                # Use detected_at as fallback for relative times
                                published_at = now.isoformat()
                            else:
                                # Try other date formats
                                published_at = parser.parse(date_str).isoformat()
                        except:
                            # Final fallback: use current time
                            published_at = now.isoformat()
                else:
                    # No date provided, use current time
                    published_at = now.isoformat()
                
                update_data = {
                    "company_id": company_id,
                    "update_type": update_type,
                    "title": news_item.get("title", ""),
                    "summary": news_item.get("snippet", ""),
                    "source_url": news_item.get("link"),
                    "source_name": news_item.get("source", "Google News"),
                    "importance": "medium",
                    "is_read": False,
                    "detected_at": now.isoformat(),
                    "published_at": published_at,  # Always a valid ISO timestamp
                    "created_at": now.isoformat(),
                }
                supabase.table("company_updates").insert(update_data).execute()
    except Exception as e:
        # Log error but don't fail the refresh
        print(f"Error fetching company updates: {e}")

    # Discover and store contacts using Smart Contact Discovery (Apollo + SerpAPI + Groq)
    try:
        from app.services.smart_contact_discovery import smart_contact_discovery
        
        # Extract main domain from subdomain (e.g., ibank.zenithbank.com -> zenithbank.com)
        main_domain = company_domain
        if company_domain:
            domain_parts = company_domain.replace("www.", "").split(".")
            if len(domain_parts) >= 2:
                main_domain = ".".join(domain_parts[-2:])  # Get last 2 parts
        
        print(f"[SmartDiscovery] Refreshing contacts for {company_name} (domain: {main_domain})")
        
        # Use smart discovery (Apollo + SerpAPI + Groq merge)
        discovery_result = await smart_contact_discovery.discover_contacts(
            company_name=company_name,
            company_domain=main_domain,
            location="Nigeria",
            max_contacts=50,
        )
        
        discovered_contacts = discovery_result.get("contacts", [])
        sources_used = discovery_result.get("sources_used", [])
        print(f"[SmartDiscovery] Found {len(discovered_contacts)} contacts (sources: {sources_used})")
        
        # Store discovered contacts
        for contact_data in discovered_contacts:
            # Skip contacts without a valid full_name (required by database)
            full_name = contact_data.get("full_name") or contact_data.get("name")
            if not full_name or not full_name.strip():
                # Try to generate a name from email if available
                email = contact_data.get("email")
                if email:
                    # Extract name from email (e.g., "john.doe@company.com" -> "John Doe")
                    email_local = email.split("@")[0]
                    # Replace dots/underscores with spaces and capitalize
                    full_name = email_local.replace(".", " ").replace("_", " ").title()
                else:
                    # Skip contacts without name or email
                    continue
            
            # Check if contact already exists
            existing_contact = supabase.table("company_contacts")\
                .select("id")\
                .eq("company_id", company_id)\
                .eq("full_name", full_name)\
                .execute()
            
            if not existing_contact.data:
                contact_record = {
                    "company_id": company_id,
                    "full_name": full_name.strip(),  # Ensure it's a valid string
                    "title": contact_data.get("title"),
                    "department": contact_data.get("department", "other"),
                    "email": contact_data.get("email"),
                    "phone": contact_data.get("phone"),
                    "linkedin_url": contact_data.get("linkedin_url"),
                    "is_decision_maker": contact_data.get("is_decision_maker", False),
                    "is_verified": False,
                    "verification_score": contact_data.get("confidence_score", 0.5),
                    "source": contact_data.get("source", "automated"),
                    "is_active": True,
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                }
                supabase.table("company_contacts").insert(contact_record).execute()
    except Exception as e:
        # Log error but don't fail the refresh
        print(f"Error discovering contacts: {e}")

    # Update company timestamp
    update_result = supabase.table("tracked_companies").update({
        "last_updated": now.isoformat(),
        "next_update_at": calculate_next_update(frequency).isoformat(),
        "updated_at": now.isoformat(),
    }).eq("id", company_id).execute()

    updated_company = update_result.data[0] if update_result.data else company
    updated_company["tags"] = updated_company.get("tags") or []

    return TrackedCompanyResponse.model_validate(updated_company)
