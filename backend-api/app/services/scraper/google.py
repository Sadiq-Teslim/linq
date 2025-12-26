"""
Google Search wrapper using SerpAPI
Aggregates company data from web search results
"""
from typing import Optional, List, Dict, Any
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.core.exceptions import ScrapingError


class GoogleSearchService:
    """Search service for company data aggregation"""

    SERP_API_URL = "https://serpapi.com/search"

    def __init__(self):
        self.api_key = settings.SERP_API_KEY

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def search_company(
        self,
        company_name: str,
        country: str = "Nigeria",
        num_results: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Search for company information across the web
        Returns structured search results
        """
        if not self.api_key:
            raise ScrapingError("SERP API key not configured")

        # Craft search query for African B2B context
        query = f"{company_name} {country} company"

        params = {
            "api_key": self.api_key,
            "q": query,
            "num": num_results,
            "gl": "ng" if country.lower() == "nigeria" else "gh",  # Nigeria or Ghana
            "hl": "en",
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(self.SERP_API_URL, params=params)
                response.raise_for_status()
                data = response.json()

                return self._parse_search_results(data)

        except httpx.HTTPError as e:
            raise ScrapingError(f"Search API error: {str(e)}")

    def _parse_search_results(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse SerpAPI response into structured results"""
        results = []

        # Organic search results
        for item in data.get("organic_results", []):
            results.append({
                "type": "organic",
                "title": item.get("title"),
                "link": item.get("link"),
                "snippet": item.get("snippet"),
                "source": item.get("displayed_link"),
            })

        # Knowledge graph (if available)
        kg = data.get("knowledge_graph", {})
        if kg:
            results.append({
                "type": "knowledge_graph",
                "title": kg.get("title"),
                "description": kg.get("description"),
                "website": kg.get("website"),
                "attributes": kg.get("attributes", {}),
            })

        return results

    async def search_decision_makers(
        self,
        company_name: str,
        country: str = "Nigeria",
    ) -> List[Dict[str, Any]]:
        """Search for company executives and decision makers"""
        queries = [
            f"{company_name} CEO founder {country} LinkedIn",
            f"{company_name} CTO CIO {country} LinkedIn",
            f"{company_name} managing director {country}",
        ]

        all_results = []
        for query in queries:
            try:
                results = await self._search_single_query(query)
                all_results.extend(results)
            except Exception:
                continue  # Continue with other queries if one fails

        return all_results

    async def _search_single_query(self, query: str) -> List[Dict[str, Any]]:
        """Execute a single search query"""
        if not self.api_key:
            return []

        params = {
            "api_key": self.api_key,
            "q": query,
            "num": 5,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(self.SERP_API_URL, params=params)
            response.raise_for_status()
            data = response.json()

            return [
                {
                    "title": item.get("title"),
                    "link": item.get("link"),
                    "snippet": item.get("snippet"),
                }
                for item in data.get("organic_results", [])
            ]

    async def search_company_news(
        self,
        company_name: str,
        country: str = "Nigeria",
    ) -> List[Dict[str, Any]]:
        """Search for recent news about the company"""
        query = f"{company_name} {country} news funding partnership"

        if not self.api_key:
            return []

        params = {
            "api_key": self.api_key,
            "q": query,
            "tbm": "nws",  # News search
            "num": 10,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(self.SERP_API_URL, params=params)
                response.raise_for_status()
                data = response.json()

                return [
                    {
                        "title": item.get("title"),
                        "link": item.get("link"),
                        "snippet": item.get("snippet"),
                        "source": item.get("source"),
                        "date": item.get("date"),
                    }
                    for item in data.get("news_results", [])
                ]
        except Exception:
            return []
