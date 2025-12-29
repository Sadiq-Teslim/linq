"""
ScraperAPI integration for proxy, CAPTCHA handling, and JS rendering
Makes scraping more reliable and harder to detect
"""
from typing import Dict, Any, Optional
import aiohttp
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.services.cache.redis_client import redis_cache


class ScraperAPIService:
    """
    ScraperAPI service for reliable web scraping
    Handles proxies, CAPTCHAs, and JS rendering automatically
    """
    
    BASE_URL = "http://api.scraperapi.com"
    
    def __init__(self):
        self.api_key = settings.SCRAPERAPI_KEY
        self.enabled = bool(self.api_key)
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def scrape(
        self,
        url: str,
        render: bool = False,
        country_code: Optional[str] = None,
        device_type: Optional[str] = None,
    ) -> Optional[str]:
        """
        Scrape a URL using ScraperAPI
        
        Args:
            url: URL to scrape
            render: Whether to render JavaScript (default: False)
            country_code: Country code for proxy (e.g., 'us', 'gb', 'ng')
            device_type: Device type ('desktop', 'mobile', 'tablet')
        
        Returns:
            HTML content or None if failed
        """
        if not self.enabled:
            return None
        
        cache_key = f"scraperapi:{url}:{render}:{country_code}"
        
        # Try cache first
        cached = await redis_cache.get(cache_key)
        if cached:
            return cached
        
        try:
            params = {
                "api_key": self.api_key,
                "url": url,
            }
            
            if render:
                params["render"] = "true"
            if country_code:
                params["country_code"] = country_code
            if device_type:
                params["device_type"] = device_type
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.BASE_URL, params=params, timeout=aiohttp.ClientTimeout(total=30)) as response:
                    if response.status == 200:
                        html = await response.text()
                        
                        # Cache for 1 hour
                        await redis_cache.set(cache_key, html, ttl=3600)
                        return html
                    else:
                        print(f"ScraperAPI error: {response.status} - {await response.text()}")
        except Exception as e:
            print(f"ScraperAPI error: {e}")
        
        return None
    
    async def scrape_json(
        self,
        url: str,
        render: bool = False,
        country_code: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Scrape a URL and parse as JSON
        """
        html = await self.scrape(url, render=render, country_code=country_code)
        if not html:
            return None
        
        try:
            import json
            return json.loads(html)
        except:
            return None

