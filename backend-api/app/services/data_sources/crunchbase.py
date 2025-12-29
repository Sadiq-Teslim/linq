"""
Crunchbase API integration for company leadership and funding data
Provides structured data on executives, funding rounds, and company information
"""
from typing import List, Dict, Any, Optional
import aiohttp
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.services.cache.redis_client import redis_cache


class CrunchbaseService:
    """
    Crunchbase API client for company and people data
    API Documentation: https://data.crunchbase.com/docs
    """
    
    BASE_URL = "https://api.crunchbase.com/v4"
    
    def __init__(self):
        self.api_key = settings.CRUNCHBASE_API_KEY
        self.enabled = bool(self.api_key)
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def get_company_data(
        self,
        company_name: str,
        domain: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Get comprehensive company data from Crunchbase
        Returns: funding, leadership, employees, etc.
        """
        if not self.enabled:
            return None
        
        cache_key = f"crunchbase:company:{company_name.lower()}"
        
        # Try cache first
        cached = await redis_cache.get(cache_key)
        if cached:
            return cached
        
        try:
            # Search for company
            search_url = f"{self.BASE_URL}/searches/organizations"
            params = {
                "user_key": self.api_key,
                "name": company_name,
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(search_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # Extract company data
                        if data.get("entities"):
                            company = data["entities"][0]
                            
                            # Get detailed company info
                            company_uuid = company.get("uuid")
                            if company_uuid:
                                detail_url = f"{self.BASE_URL}/entities/organizations/{company_uuid}"
                                detail_params = {
                                    "user_key": self.api_key,
                                    "field_ids": [
                                        "name", "short_description", "website",
                                        "funding_total", "number_of_employees",
                                        "founded_on", "closed_on", "categories",
                                        "headquarters_location", "funding_rounds",
                                        "founders", "current_team"
                                    ]
                                }
                                
                                async with session.get(detail_url, params=detail_params) as detail_response:
                                    if detail_response.status == 200:
                                        detail_data = await detail_response.json()
                                        
                                        # Cache for 24 hours
                                        await redis_cache.set(cache_key, detail_data, ttl=86400)
                                        return detail_data
                        
                        # Cache search results even if no detail
                        await redis_cache.set(cache_key, data, ttl=86400)
                        return data
        except Exception as e:
            print(f"Crunchbase API error: {e}")
        
        return None
    
    async def get_company_leadership(
        self,
        company_name: str,
    ) -> List[Dict[str, Any]]:
        """
        Get company leadership/executives from Crunchbase
        """
        company_data = await self.get_company_data(company_name)
        if not company_data:
            return []
        
        leadership = []
        
        # Extract founders
        if company_data.get("properties", {}).get("founders"):
            for founder in company_data["properties"]["founders"]:
                leadership.append({
                    "name": founder.get("name"),
                    "title": "Founder",
                    "source": "crunchbase",
                })
        
        # Extract current team
        if company_data.get("properties", {}).get("current_team"):
            for member in company_data["properties"]["current_team"]:
                leadership.append({
                    "name": member.get("name"),
                    "title": member.get("title"),
                    "source": "crunchbase",
                })
        
        return leadership
    
    async def get_funding_info(
        self,
        company_name: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Get funding information for a company
        """
        company_data = await self.get_company_data(company_name)
        if not company_data:
            return None
        
        properties = company_data.get("properties", {})
        
        return {
            "total_funding": properties.get("funding_total"),
            "funding_rounds": properties.get("funding_rounds", []),
            "latest_funding_date": properties.get("latest_funding_on"),
            "latest_funding_amount": properties.get("latest_funding_amount"),
            "latest_funding_type": properties.get("latest_funding_type"),
        }

