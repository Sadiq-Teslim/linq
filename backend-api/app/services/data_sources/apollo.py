"""
Apollo.io API integration for B2B contact and company data
Primary data provider with 91% email accuracy and 210M+ contacts
API Documentation: https://apolloio.github.io/apollo-api-docs/
"""
from typing import List, Dict, Any, Optional
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.services.cache.redis_client import redis_cache


class ApolloProvider:
    """
    Apollo.io API client for company search, people search, and enrichment
    Best-in-class for B2B data with 91% email accuracy
    """
    
    BASE_URL = "https://api.apollo.io/v1"
    
    # Cost structure (based on Professional plan - $79/user/month)
    # These are approximate costs per operation
    COSTS = {
        "company_search": 0.03,      # Per company search
        "people_search": 0.05,       # Per person found
        "email_enrichment": 0.05,    # Per email enrichment
        "phone_enrichment": 0.05,    # Per phone enrichment
        "verify_email": 0.02,        # Per email verification
    }
    
    def __init__(self):
        self.api_key = settings.APOLLO_API_KEY
        self.enabled = bool(self.api_key)
        self.client = httpx.AsyncClient(
            headers={"X-Api-Key": self.api_key} if self.api_key else {},
            timeout=30.0
        )
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def search_company(
        self,
        query: str,
        location: Optional[str] = None,
        industry: Optional[str] = None,
        **filters
    ) -> Dict[str, Any]:
        """
        Search for companies by name
        
        Args:
            query: Company name to search
            location: Optional location filter (e.g., "Nigeria", "San Francisco, CA")
            industry: Optional industry filter
        
        Returns:
            Company data dict with name, domain, industry, employee_count, etc.
        """
        if not self.enabled:
            return {}
        
        cache_key = f"apollo:company:{query.lower()}:{location or ''}:{industry or ''}"
        
        # Try cache first
        cached = await redis_cache.get(cache_key)
        if cached:
            return cached
        
        try:
            payload = {
                "q_organization_name": query,
                "page": 1,
                "per_page": 1,
            }
            
            # Add optional filters
            if location:
                payload["organization_locations"] = [location]
            if industry:
                # Apollo uses industry tag IDs, but we can search by name
                payload["organization_industry_tag_ids"] = []  # Would need to map industry names to IDs
            
            response = await self.client.post(
                f"{self.BASE_URL}/organizations/search",
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            
            if not data.get("organizations"):
                return {}
            
            org = data["organizations"][0]
            
            company_data = {
                "id": org.get("id"),
                "name": org.get("name"),
                "domain": org.get("primary_domain"),
                "industry": org.get("industry"),
                "employee_count": org.get("estimated_num_employees"),
                "revenue": org.get("annual_revenue"),
                "headquarters_location": org.get("headquarters_address"),
                "founded_year": org.get("founded_year"),
                "description": org.get("short_description"),
                "logo_url": org.get("logo_url"),
                "linkedin_url": org.get("linkedin_url"),
                "technologies": org.get("technologies", []),
                "website_url": org.get("website_url"),
                "source": "apollo",
                "confidence": 0.95,  # Apollo has high data quality
            }
            
            # Cache for 30 days (company data doesn't change often)
            await redis_cache.set(cache_key, company_data, ttl=2592000)
            return company_data
            
        except Exception as e:
            print(f"Apollo.io company search error: {e}")
            return {}
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def search_people(
        self,
        company_name: Optional[str] = None,
        company_id: Optional[str] = None,
        company_domain: Optional[str] = None,
        job_titles: Optional[List[str]] = None,
        seniority_levels: Optional[List[str]] = None,
        departments: Optional[List[str]] = None,
        max_results: int = 100,
        **filters
    ) -> List[Dict[str, Any]]:
        """
        Search for people at a company
        
        Args:
            company_name: Company name to search
            company_id: Apollo company ID (more accurate than name)
            company_domain: Company domain (e.g., "zenithbank.com")
            job_titles: List of job titles to filter (e.g., ["CEO", "CTO", "VP Sales"])
            seniority_levels: List of seniority levels (e.g., ["C-Level", "VP-Level", "Director"])
            departments: List of departments (e.g., ["Sales", "Engineering"])
            max_results: Maximum number of results to return
        
        Returns:
            List of person data dicts with name, title, email, phone, etc.
        """
        if not self.enabled:
            return []
        
        # Build cache key
        cache_parts = [
            company_name or company_id or company_domain or "",
            ",".join(job_titles or []),
            ",".join(seniority_levels or []),
            str(max_results)
        ]
        cache_key = f"apollo:people:{':'.join(cache_parts)}"
        
        # Try cache first
        cached = await redis_cache.get(cache_key)
        if cached:
            return cached
        
        try:
            payload = {
                "page": 1,
                "per_page": min(max_results, 100),  # Apollo max is 100 per page
            }
            
            # Company filter (prefer ID, then domain, then name)
            if company_id:
                payload["organization_ids"] = [company_id]
            elif company_domain:
                payload["q_organization_domains"] = [company_domain]
            elif company_name:
                payload["q_organization_name"] = company_name
            
            # Job title filter
            if job_titles:
                payload["person_titles"] = job_titles
            
            # Seniority filter (map to Apollo's format)
            if seniority_levels:
                seniority_map = {
                    "C-Level": "c_suite",
                    "VP-Level": "vp",
                    "Director": "director",
                    "Manager": "manager"
                }
                payload["person_seniorities"] = [
                    seniority_map.get(s, s.lower()) for s in seniority_levels
                ]
            
            # Department filter
            if departments:
                payload["person_departments"] = departments
            
            response = await self.client.post(
                f"{self.BASE_URL}/mixed_people/search",
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            
            people = []
            for person in data.get("people", []):
                # Extract phone numbers
                phone_numbers = person.get("phone_numbers", [])
                primary_phone = phone_numbers[0] if phone_numbers else None
                
                people.append({
                    "id": person.get("id"),
                    "first_name": person.get("first_name"),
                    "last_name": person.get("last_name"),
                    "full_name": f"{person.get('first_name', '')} {person.get('last_name', '')}".strip(),
                    "title": person.get("title"),
                    "seniority": person.get("seniority"),
                    "department": person.get("departments", [None])[0] if person.get("departments") else None,
                    "email": person.get("email"),
                    "phone": primary_phone,
                    "mobile_phone": person.get("mobile_phone"),
                    "direct_dial": person.get("direct_dial"),
                    "linkedin_url": person.get("linkedin_url"),
                    "twitter_url": person.get("twitter_url"),
                    "company_name": person.get("organization", {}).get("name") if person.get("organization") else None,
                    "company_domain": person.get("organization", {}).get("primary_domain") if person.get("organization") else None,
                    "data_source": "apollo",
                    "data_confidence": 0.91,  # Apollo's stated accuracy
                })
            
            # Cache for 7 days (people data changes more frequently)
            await redis_cache.set(cache_key, people, ttl=604800)
            return people
            
        except Exception as e:
            print(f"Apollo.io people search error: {e}")
            return []
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def enrich_person(
        self,
        email: Optional[str] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        company_domain: Optional[str] = None,
        linkedin_url: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Enrich person data (find email/phone for a person)
        
        Args:
            email: Email to enrich (if known)
            first_name: First name
            last_name: Last name
            company_domain: Company domain
            linkedin_url: LinkedIn profile URL
        
        Returns:
            Enriched person data dict
        """
        if not self.enabled:
            return {}
        
        # Build cache key
        cache_key = f"apollo:enrich:{email or f'{first_name}:{last_name}:{company_domain}'}"
        
        # Try cache first
        cached = await redis_cache.get(cache_key)
        if cached:
            return cached
        
        try:
            payload = {}
            
            if email:
                payload["email"] = email
            if linkedin_url:
                payload["linkedin_url"] = linkedin_url
            if first_name:
                payload["first_name"] = first_name
            if last_name:
                payload["last_name"] = last_name
            if company_domain:
                payload["domain"] = company_domain
            
            # Request phone numbers explicitly
            payload["reveal_personal_emails"] = True
            payload["reveal_phone_number"] = True
            
            response = await self.client.post(
                f"{self.BASE_URL}/people/match",
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            
            person = data.get("person", {})
            
            if not person:
                return {}
            
            # Extract phone numbers
            phone_numbers = person.get("phone_numbers", [])
            primary_phone = phone_numbers[0] if phone_numbers else None
            
            enriched_data = {
                "email": person.get("email"),
                "phone": primary_phone,
                "mobile_phone": person.get("mobile_phone"),
                "direct_dial": person.get("direct_dial"),
                "first_name": person.get("first_name"),
                "last_name": person.get("last_name"),
                "full_name": f"{person.get('first_name', '')} {person.get('last_name', '')}".strip(),
                "title": person.get("title"),
                "seniority": person.get("seniority"),
                "department": person.get("departments", [None])[0] if person.get("departments") else None,
                "linkedin_url": person.get("linkedin_url"),
                "twitter_url": person.get("twitter_url"),
                "company_name": person.get("organization", {}).get("name") if person.get("organization") else None,
                "company_domain": person.get("organization", {}).get("primary_domain") if person.get("organization") else None,
                "source": "apollo",
                "confidence": 0.91,
            }
            
            # Cache for 30 days
            await redis_cache.set(cache_key, enriched_data, ttl=2592000)
            return enriched_data
            
        except Exception as e:
            print(f"Apollo.io enrichment error: {e}")
            return {}
    
    async def verify_email(self, email: str) -> Dict[str, Any]:
        """
        Verify email deliverability (uses enrichment as verification)
        Apollo doesn't have a dedicated verification endpoint
        """
        if not self.enabled:
            return {"email": email, "status": "unknown", "confidence": 0.0}
        
        result = await self.enrich_person(email=email)
        
        if result and result.get("email") == email:
            return {
                "email": email,
                "status": "verified",
                "confidence": 0.91,
                "source": "apollo"
            }
        
        return {
            "email": email,
            "status": "unverified",
            "confidence": 0.0,
            "source": "apollo"
        }
    
    def calculate_cost(self, operation: str, quantity: int = 1) -> float:
        """Calculate cost for operation"""
        return self.COSTS.get(operation, 0.0) * quantity
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# Singleton instance
apollo_provider = ApolloProvider()

