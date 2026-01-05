"""
Public endpoints - No authentication required
Used for landing page demo and public features
"""
import httpx
import re
from typing import List, Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services.company_search_service import company_search_service
from app.core.config import settings

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


# Common company database for instant results
KNOWN_COMPANIES = {
    "stripe": {
        "name": "Stripe",
        "domain": "stripe.com",
        "industry": "Financial Technology",
        "headquarters": "San Francisco, CA",
        "employee_count": "5001-10000",
        "description": "Stripe is a financial infrastructure platform for businesses. Millions of companies use Stripe to accept payments, grow their revenue, and accelerate new business opportunities.",
    },
    "shopify": {
        "name": "Shopify",
        "domain": "shopify.com",
        "industry": "E-commerce",
        "headquarters": "Ottawa, Canada",
        "employee_count": "5001-10000",
        "description": "Shopify is a leading global commerce company providing trusted tools to start, grow, market, and manage a retail business of any size.",
    },
    "slack": {
        "name": "Slack",
        "domain": "slack.com",
        "industry": "Software",
        "headquarters": "San Francisco, CA",
        "employee_count": "1001-5000",
        "description": "Slack is a business communication platform offering messaging, file sharing, and integrations with other business software.",
    },
    "notion": {
        "name": "Notion",
        "domain": "notion.so",
        "industry": "Software",
        "headquarters": "San Francisco, CA",
        "employee_count": "201-500",
        "description": "Notion is an all-in-one workspace for notes, documents, wikis, and project management.",
    },
    "figma": {
        "name": "Figma",
        "domain": "figma.com",
        "industry": "Software",
        "headquarters": "San Francisco, CA",
        "employee_count": "501-1000",
        "description": "Figma is a collaborative web application for interface design, with real-time collaboration features.",
    },
    "airbnb": {
        "name": "Airbnb",
        "domain": "airbnb.com",
        "industry": "Travel & Hospitality",
        "headquarters": "San Francisco, CA",
        "employee_count": "5001-10000",
        "description": "Airbnb is an online marketplace for lodging, primarily homestays for vacation rentals, and tourism activities.",
    },
    "uber": {
        "name": "Uber",
        "domain": "uber.com",
        "industry": "Transportation",
        "headquarters": "San Francisco, CA",
        "employee_count": "10001+",
        "description": "Uber is a technology company that offers ride-hailing, food delivery, package delivery, and freight transport.",
    },
    "spotify": {
        "name": "Spotify",
        "domain": "spotify.com",
        "industry": "Media & Entertainment",
        "headquarters": "Stockholm, Sweden",
        "employee_count": "5001-10000",
        "description": "Spotify is an audio streaming and media services provider with millions of songs and podcasts.",
    },
    "twitter": {
        "name": "Twitter (X)",
        "domain": "twitter.com",
        "industry": "Social Media",
        "headquarters": "San Francisco, CA",
        "employee_count": "1001-5000",
        "description": "Twitter is a social media platform for microblogging and social networking.",
    },
    "linkedin": {
        "name": "LinkedIn",
        "domain": "linkedin.com",
        "industry": "Social Media",
        "headquarters": "Sunnyvale, CA",
        "employee_count": "10001+",
        "description": "LinkedIn is a business and employment-focused social media platform for professional networking.",
    },
    "microsoft": {
        "name": "Microsoft",
        "domain": "microsoft.com",
        "industry": "Technology",
        "headquarters": "Redmond, WA",
        "employee_count": "10001+",
        "description": "Microsoft Corporation is a multinational technology company that develops, manufactures, licenses, and sells computer software, electronics, and related services.",
    },
    "google": {
        "name": "Google",
        "domain": "google.com",
        "industry": "Technology",
        "headquarters": "Mountain View, CA",
        "employee_count": "10001+",
        "description": "Google LLC is a technology company specializing in Internet-related services and products, including search engines, cloud computing, and advertising.",
    },
    "amazon": {
        "name": "Amazon",
        "domain": "amazon.com",
        "industry": "E-commerce & Technology",
        "headquarters": "Seattle, WA",
        "employee_count": "10001+",
        "description": "Amazon is a multinational technology company focusing on e-commerce, cloud computing, digital streaming, and artificial intelligence.",
    },
    "apple": {
        "name": "Apple",
        "domain": "apple.com",
        "industry": "Technology",
        "headquarters": "Cupertino, CA",
        "employee_count": "10001+",
        "description": "Apple Inc. is a technology company that designs, manufactures, and markets smartphones, personal computers, tablets, and accessories.",
    },
    "meta": {
        "name": "Meta",
        "domain": "meta.com",
        "industry": "Technology",
        "headquarters": "Menlo Park, CA",
        "employee_count": "10001+",
        "description": "Meta Platforms builds technologies that help people connect, find communities, and grow businesses.",
    },
    "facebook": {
        "name": "Meta (Facebook)",
        "domain": "facebook.com",
        "industry": "Social Media",
        "headquarters": "Menlo Park, CA",
        "employee_count": "10001+",
        "description": "Facebook is a social networking service owned by Meta Platforms.",
    },
    "netflix": {
        "name": "Netflix",
        "domain": "netflix.com",
        "industry": "Media & Entertainment",
        "headquarters": "Los Gatos, CA",
        "employee_count": "10001+",
        "description": "Netflix is a streaming service offering a wide variety of award-winning TV shows, movies, anime, documentaries, and more.",
    },
    "salesforce": {
        "name": "Salesforce",
        "domain": "salesforce.com",
        "industry": "Software",
        "headquarters": "San Francisco, CA",
        "employee_count": "10001+",
        "description": "Salesforce is a cloud-based software company providing customer relationship management (CRM) software and applications.",
    },
    "hubspot": {
        "name": "HubSpot",
        "domain": "hubspot.com",
        "industry": "Software",
        "headquarters": "Cambridge, MA",
        "employee_count": "5001-10000",
        "description": "HubSpot is a developer and marketer of software products for inbound marketing, sales, and customer service.",
    },
    "zenith": {
        "name": "Zenith Bank",
        "domain": "zenithbank.com",
        "industry": "Banking & Finance",
        "headquarters": "Lagos, Nigeria",
        "employee_count": "5001-10000",
        "description": "Zenith Bank Plc is one of the largest banks in Nigeria by tier-1 capital, providing a full range of banking services.",
    },
    "zenith bank": {
        "name": "Zenith Bank",
        "domain": "zenithbank.com",
        "industry": "Banking & Finance",
        "headquarters": "Lagos, Nigeria",
        "employee_count": "5001-10000",
        "description": "Zenith Bank Plc is one of the largest banks in Nigeria by tier-1 capital, providing a full range of banking services.",
    },
    "gtbank": {
        "name": "GTBank (Guaranty Trust)",
        "domain": "gtbank.com",
        "industry": "Banking & Finance",
        "headquarters": "Lagos, Nigeria",
        "employee_count": "5001-10000",
        "description": "Guaranty Trust Bank is a multinational financial institution offering banking and other financial services.",
    },
    "access bank": {
        "name": "Access Bank",
        "domain": "accessbankplc.com",
        "industry": "Banking & Finance",
        "headquarters": "Lagos, Nigeria",
        "employee_count": "5001-10000",
        "description": "Access Bank Plc is a Nigerian multinational commercial bank, providing retail, business, commercial and corporate banking services.",
    },
    "first bank": {
        "name": "First Bank of Nigeria",
        "domain": "firstbanknigeria.com",
        "industry": "Banking & Finance",
        "headquarters": "Lagos, Nigeria",
        "employee_count": "5001-10000",
        "description": "First Bank of Nigeria is a Nigerian multinational bank and financial services company, the oldest bank in Nigeria.",
    },
    "paystack": {
        "name": "Paystack",
        "domain": "paystack.com",
        "industry": "Financial Technology",
        "headquarters": "Lagos, Nigeria",
        "employee_count": "51-200",
        "description": "Paystack is a Nigerian fintech company that offers payment processing services to businesses in Africa.",
    },
    "flutterwave": {
        "name": "Flutterwave",
        "domain": "flutterwave.com",
        "industry": "Financial Technology",
        "headquarters": "San Francisco, CA",
        "employee_count": "201-500",
        "description": "Flutterwave is a payments technology company providing infrastructure for digital and cross-border payments.",
    },
    "andela": {
        "name": "Andela",
        "domain": "andela.com",
        "industry": "Technology",
        "headquarters": "New York, NY",
        "employee_count": "501-1000",
        "description": "Andela is a global talent network that connects companies with vetted, remote engineers from emerging markets.",
    },
    "interswitch": {
        "name": "Interswitch",
        "domain": "interswitchgroup.com",
        "industry": "Financial Technology",
        "headquarters": "Lagos, Nigeria",
        "employee_count": "501-1000",
        "description": "Interswitch is an integrated digital payments and commerce company facilitating electronic transactions in Africa.",
    },
    "kuda": {
        "name": "Kuda Bank",
        "domain": "kuda.com",
        "industry": "Financial Technology",
        "headquarters": "Lagos, Nigeria",
        "employee_count": "201-500",
        "description": "Kuda is a Nigerian digital-only bank providing mobile-first banking services with no fees.",
    },
    "opay": {
        "name": "OPay",
        "domain": "opayweb.com",
        "industry": "Financial Technology",
        "headquarters": "Lagos, Nigeria",
        "employee_count": "1001-5000",
        "description": "OPay is a mobile money platform providing payment services, transportation, and logistics in Africa.",
    },
    "chipper": {
        "name": "Chipper Cash",
        "domain": "chippercash.com",
        "industry": "Financial Technology",
        "headquarters": "San Francisco, CA",
        "employee_count": "201-500",
        "description": "Chipper Cash is a cross-border payments platform enabling peer-to-peer payments across Africa.",
    },
}


async def search_with_clearbit(query: str) -> Optional[dict]:
    """Try to get company info from Clearbit Autocomplete (free)"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://autocomplete.clearbit.com/v1/companies/suggest",
                params={"query": query},
                timeout=10.0,
            )
            if response.status_code == 200:
                results = response.json()
                if results and len(results) > 0:
                    return results[0]
    except Exception as e:
        print(f"[Clearbit] Error: {e}")
    return None


def normalize_query(query: str) -> str:
    """Normalize query for matching"""
    return re.sub(r'[^a-z0-9]', '', query.lower())


@router.get("/search", response_model=PublicSearchResponse)
async def public_company_search(
    query: str = Query(..., min_length=2, max_length=255, description="Company name to search for"),
    limit: int = Query(default=5, ge=1, le=10, description="Maximum results (capped at 10 for public)"),
):
    """
    Public company search for landing page demo.
    
    Returns basic company information without requiring authentication.
    Uses multiple data sources for best results.
    """
    limit = min(limit, 10)
    companies = []
    normalized_query = normalize_query(query)
    
    print(f"[Public Search] Query: '{query}' (normalized: '{normalized_query}')")
    
    # 1. Check known companies database first (instant results)
    for key, company_data in KNOWN_COMPANIES.items():
        if normalized_query in normalize_query(key) or normalize_query(key) in normalized_query:
            print(f"[Public Search] Found in known companies: {company_data['name']}")
            companies.append(PublicCompanyResult(
                name=company_data["name"],
                domain=company_data["domain"],
                industry=company_data.get("industry"),
                headquarters=company_data.get("headquarters"),
                employee_count=company_data.get("employee_count"),
                description=company_data.get("description"),
                logo_url=f"https://logo.clearbit.com/{company_data['domain']}",
                website=f"https://{company_data['domain']}",
                linkedin_url=f"https://linkedin.com/company/{company_data['domain'].split('.')[0]}",
            ))
            if len(companies) >= limit:
                break
    
    # 2. Try Clearbit Autocomplete (free API)
    if len(companies) < limit:
        clearbit_result = await search_with_clearbit(query)
        if clearbit_result:
            print(f"[Public Search] Clearbit result: {clearbit_result.get('name')}")
            # Check if not already in results
            existing_domains = {c.domain for c in companies}
            if clearbit_result.get("domain") not in existing_domains:
                companies.append(PublicCompanyResult(
                    name=clearbit_result.get("name", query.title()),
                    domain=clearbit_result.get("domain"),
                    industry=None,
                    headquarters=None,
                    employee_count=None,
                    description=None,
                    logo_url=clearbit_result.get("logo"),
                    website=f"https://{clearbit_result.get('domain')}" if clearbit_result.get("domain") else None,
                    linkedin_url=None,
                ))
    
    # 3. Try the full search service if SERP_API_KEY is available
    if len(companies) < limit and settings.SERP_API_KEY:
        try:
            print(f"[Public Search] Trying SerpAPI search...")
            serp_results = await company_search_service.search_companies(query, limit - len(companies))
            existing_domains = {c.domain for c in companies}
            
            for r in serp_results:
                if r.get("domain") not in existing_domains:
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
                    if len(companies) >= limit:
                        break
        except Exception as e:
            print(f"[Public Search] SerpAPI error (non-fatal): {e}")
    
    # 4. If still no results, create a basic entry from the query
    if not companies:
        print(f"[Public Search] No results found, creating basic entry")
        # Try to make a domain from the query
        clean_name = re.sub(r'[^a-zA-Z0-9\s]', '', query).strip()
        potential_domain = clean_name.lower().replace(' ', '') + ".com"
        
        companies.append(PublicCompanyResult(
            name=clean_name.title(),
            domain=potential_domain,
            industry=None,
            headquarters=None,
            employee_count=None,
            description=f"Search for {clean_name} - sign up to get detailed company information and insights.",
            logo_url=f"https://logo.clearbit.com/{potential_domain}",
            website=f"https://{potential_domain}",
            linkedin_url=None,
        ))
    
    print(f"[Public Search] Returning {len(companies)} results")
    
    return PublicSearchResponse(
        companies=companies[:limit],
        total=len(companies[:limit]),
        query=query,
    )


@router.get("/health")
async def health_check():
    """Simple health check endpoint"""
    return {"status": "ok", "service": "linq-api"}

