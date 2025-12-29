"""
LinkedIn integration for contact discovery
Uses LinkedIn API if available, otherwise falls back to scraping
"""
from typing import List, Dict, Any, Optional
import aiohttp
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.services.cache.redis_client import redis_cache


class LinkedInService:
    """
    LinkedIn integration for finding contacts
    Supports both API and scraping methods
    """
    
    # LinkedIn API endpoints (if API access is available)
    API_BASE_URL = "https://api.linkedin.com/v2"
    
    # LinkedIn search via SerpAPI (fallback)
    SERP_LINKEDIN_URL = "https://serpapi.com/search"
    
    def __init__(self):
        self.api_key = settings.LINKEDIN_API_KEY
        self.session_cookie = settings.LINKEDIN_SESSION_COOKIE
        self.serp_key = settings.SERP_API_KEY
        self.enabled = bool(self.api_key or self.session_cookie or self.serp_key)
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def search_people(
        self,
        company_name: str,
        role: Optional[str] = None,
        location: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search for people on LinkedIn
        Uses API if available, otherwise SerpAPI
        """
        if not self.enabled:
            return []
        
        cache_key = f"linkedin:people:{company_name}:{role}:{location}"
        
        # Try cache first
        cached = await redis_cache.get(cache_key)
        if cached:
            return cached
        
        # Try LinkedIn API first
        if self.api_key:
            results = await self._search_via_api(company_name, role, location)
            if results:
                await redis_cache.set(cache_key, results, ttl=86400)
                return results
        
        # Fallback to SerpAPI
        if self.serp_key:
            results = await self._search_via_serpapi(company_name, role, location)
            if results:
                await redis_cache.set(cache_key, results, ttl=86400)
                return results
        
        return []
    
    async def _search_via_api(
        self,
        company_name: str,
        role: Optional[str] = None,
        location: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Search using LinkedIn API (if available)"""
        try:
            # LinkedIn API v2 people search
            # Note: LinkedIn API access is restricted and requires approval
            # This is a placeholder for when API access is granted
            
            url = f"{self.API_BASE_URL}/peopleSearch"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
            }
            params = {
                "keywords": f"{company_name} {role or ''}",
            }
            if location:
                params["location"] = location
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        # Parse LinkedIn API response
                        # Format will depend on actual API structure
                        return self._parse_api_results(data)
        except Exception as e:
            print(f"LinkedIn API error: {e}")
        
        return []
    
    async def _search_via_serpapi(
        self,
        company_name: str,
        role: Optional[str] = None,
        location: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Search using SerpAPI LinkedIn search"""
        try:
            query = f"{role or ''} {company_name} LinkedIn"
            if location:
                query += f" {location}"
            
            params = {
                "api_key": self.serp_key,
                "engine": "linkedin",
                "q": query,
                "num": 20,
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.SERP_LINKEDIN_URL, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        return self._parse_serpapi_results(data)
        except Exception as e:
            print(f"LinkedIn SerpAPI error: {e}")
        
        return []
    
    def _parse_api_results(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse LinkedIn API response"""
        results = []
        # Implementation depends on actual API response structure
        # This is a placeholder
        return results
    
    def _parse_serpapi_results(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse SerpAPI LinkedIn search results"""
        results = []
        
        # Parse profiles from SerpAPI response
        profiles = data.get("profiles", [])
        for profile in profiles:
            results.append({
                "name": profile.get("name"),
                "title": profile.get("title"),
                "company": profile.get("company"),
                "location": profile.get("location"),
                "linkedin_url": profile.get("link"),
                "profile_image": profile.get("image"),
                "description": profile.get("description"),
                "source": "linkedin_serpapi",
            })
        
        return results
    
    async def get_person_details(self, linkedin_url: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a person from LinkedIn
        """
        if not self.enabled:
            return None
        
        cache_key = f"linkedin:person:{linkedin_url}"
        
        # Try cache first
        cached = await redis_cache.get(cache_key)
        if cached:
            return cached
        
        # Implementation would depend on available method (API or scraping)
        # For now, return None and let other services handle it
        return None

