"""
Playwright-based scraper for JS-heavy websites
Modern alternative to Selenium, faster and more reliable
"""
from typing import Dict, Any, Optional, List
from playwright.async_api import async_playwright, Browser, Page
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.services.cache.redis_client import redis_cache


class PlaywrightScraper:
    """
    Playwright scraper for JavaScript-heavy websites
    Handles dynamic content, SPAs, and modern web apps
    """
    
    def __init__(self):
        self.browser: Optional[Browser] = None
        self._playwright = None
    
    async def start(self):
        """Start Playwright browser"""
        if not self.browser:
            try:
                self._playwright = await async_playwright().start()
                self.browser = await self._playwright.chromium.launch(
                    headless=True,
                    args=[
                        "--no-sandbox",
                        "--disable-setuid-sandbox",
                        "--disable-dev-shm-usage",
                        "--disable-gpu",
                    ]
                )
            except Exception as e:
                print(f"  ⚠ Playwright browser not available: {e}")
                print(f"  ⚠ Skipping Playwright scraping. To enable, run: playwright install chromium")
                self.browser = None
                self._playwright = None
    
    async def stop(self):
        """Stop Playwright browser"""
        if self.browser:
            await self.browser.close()
            self.browser = None
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def scrape(
        self,
        url: str,
        wait_for_selector: Optional[str] = None,
        wait_timeout: int = 10000,
    ) -> Optional[str]:
        """
        Scrape a URL using Playwright
        
        Args:
            url: URL to scrape
            wait_for_selector: CSS selector to wait for before scraping
            wait_timeout: Maximum time to wait (ms)
        
        Returns:
            HTML content or None if failed
        """
        if not self.browser:
            await self.start()
        
        # If browser still not available, return None
        if not self.browser:
            return None
        
        cache_key = f"playwright:{url}:{wait_for_selector}"
        
        # Try cache first
        cached = await redis_cache.get(cache_key)
        if cached:
            return cached
        
        try:
            page: Page = await self.browser.new_page()
            
            # Set user agent to avoid detection
            await page.set_extra_http_headers({
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            })
            
            # Navigate to URL
            await page.goto(url, wait_until="networkidle", timeout=30000)
            
            # Wait for specific selector if provided
            if wait_for_selector:
                try:
                    await page.wait_for_selector(wait_for_selector, timeout=wait_timeout)
                except:
                    pass  # Continue even if selector not found
            
            # Get page content
            html = await page.content()
            
            await page.close()
            
            # Cache for 1 hour
            await redis_cache.set(cache_key, html, ttl=3600)
            return html
        except Exception as e:
            print(f"Playwright scrape error: {e}")
            return None
    
    async def scrape_linkedin_profile(self, profile_url: str) -> Optional[Dict[str, Any]]:
        """
        Scrape a LinkedIn profile page
        """
        html = await self.scrape(
            profile_url,
            wait_for_selector=".pv-text-details__left-panel",
            wait_timeout=15000,
        )
        
        if not html:
            return None
        
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html, "lxml")
            
            # Extract profile data
            name_elem = soup.select_one("h1.text-heading-xlarge")
            title_elem = soup.select_one(".text-body-medium.break-words")
            location_elem = soup.select_one(".text-body-small.inline.t-black--light.break-words")
            
            profile_data = {
                "name": name_elem.get_text(strip=True) if name_elem else None,
                "title": title_elem.get_text(strip=True) if title_elem else None,
                "location": location_elem.get_text(strip=True) if location_elem else None,
                "linkedin_url": profile_url,
            }
            
            # Extract experience
            experience = []
            exp_sections = soup.select(".pvs-list__paged-list-item")
            for exp in exp_sections[:5]:  # Limit to 5 most recent
                exp_title = exp.select_one(".mr1.t-bold span")
                exp_company = exp.select_one(".t-14.t-normal span")
                if exp_title and exp_company:
                    experience.append({
                        "title": exp_title.get_text(strip=True),
                        "company": exp_company.get_text(strip=True),
                    })
            
            profile_data["experience"] = experience
            
            return profile_data
        except Exception as e:
            print(f"LinkedIn profile parsing error: {e}")
            return None
    
    async def scrape_company_page(self, company_url: str) -> Optional[Dict[str, Any]]:
        """
        Scrape a company's website for contact information
        """
        html = await self.scrape(company_url, wait_timeout=10000)
        
        if not html:
            return None
        
        try:
            from bs4 import BeautifulSoup
            import re
            
            soup = BeautifulSoup(html, "lxml")
            
            # Extract emails
            email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
            emails = list(set(re.findall(email_pattern, html)))
            
            # Extract phone numbers
            phone_pattern = r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
            phones = list(set(re.findall(phone_pattern, html)))
            
            # Extract contact page links
            contact_links = []
            for link in soup.find_all("a", href=True):
                href = link.get("href", "").lower()
                if any(word in href for word in ["contact", "about", "team", "leadership"]):
                    contact_links.append(link.get("href"))
            
            return {
                "emails": emails[:10],  # Limit to 10
                "phones": [p[0] if isinstance(p, tuple) else p for p in phones[:5]],
                "contact_links": contact_links[:5],
            }
        except Exception as e:
            print(f"Company page scraping error: {e}")
            return None


# Global Playwright instance (singleton)
_playwright_scraper: Optional[PlaywrightScraper] = None


async def get_playwright_scraper() -> PlaywrightScraper:
    """Get or create Playwright scraper instance"""
    global _playwright_scraper
    if not _playwright_scraper:
        _playwright_scraper = PlaywrightScraper()
        await _playwright_scraper.start()
    return _playwright_scraper

