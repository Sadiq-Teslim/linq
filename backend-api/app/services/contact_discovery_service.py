"""
Enhanced Contact Discovery Service
Uses multiple data sources in parallel for maximum coverage:
- Crunchbase API (company leadership)
- Hunter.io API (email finding)
- LinkedIn (API or SerpAPI)
- ScraperAPI (company websites)
- Playwright (JS-heavy sites)
- SpaCy NER (unstructured text extraction)
"""
from typing import List, Dict, Any, Optional
import aiohttp
import asyncio
import re
from urllib.parse import urlparse
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.core.exceptions import ScrapingError
from app.services.cache.redis_client import redis_cache
from app.services.data_sources.crunchbase import CrunchbaseService
from app.services.data_sources.hunter import HunterService
from app.services.data_sources.linkedin import LinkedInService
from app.services.scraper.scraperapi import ScraperAPIService
from app.services.scraper.playwright_scraper import get_playwright_scraper
from app.services.nlp.entity_extractor import get_entity_extractor


class ContactDiscoveryService:
    """
    Enhanced contact discovery using multiple sources in parallel
    Combines structured APIs with intelligent scraping
    """
    
    SERP_API_URL = "https://serpapi.com/search"
    
    # Target roles to find
    EXECUTIVE_ROLES = [
        "CEO", "Chief Executive Officer", "Founder", "Co-Founder",
        "Managing Director", "MD", "President", "Owner"
    ]
    
    SALES_ROLES = [
        "Head of Sales", "Sales Director", "Sales Manager", "VP Sales",
        "Vice President Sales", "Chief Revenue Officer", "CRO",
        "Director of Sales", "Sales Lead", "Business Development Manager",
        "BDM", "Account Director"
    ]

    def __init__(self):
        self.serp_key = settings.SERP_API_KEY
        self.crunchbase = CrunchbaseService()
        self.hunter = HunterService()
        self.linkedin = LinkedInService()
        self.scraperapi = ScraperAPIService()
        self.entity_extractor = get_entity_extractor()

    async def discover_contacts(
        self,
        company_name: str,
        company_domain: Optional[str] = None,
        company_industry: Optional[str] = None,
        country: str = "Nigeria",
    ) -> List[Dict[str, Any]]:
        """
        Discover contacts from ALL available sources in parallel
        Uses asyncio.gather for maximum speed
        """
        print(f"🔍 Starting enhanced contact discovery for {company_name}...")
        
        # Normalize domain
        if company_domain:
            company_domain = company_domain.replace("www.", "").replace("http://", "").replace("https://", "").split("/")[0]
        
        # Run all discovery methods in parallel
        tasks = []
        
        # 1. Crunchbase (company leadership)
        if self.crunchbase.enabled:
            tasks.append(self._discover_from_crunchbase(company_name))
        
        # 2. Hunter.io (email finding)
        if self.hunter.enabled and company_domain:
            tasks.append(self._discover_from_hunter(company_domain))
        
        # 3. LinkedIn (people search)
        if self.linkedin.enabled:
            for role in self.EXECUTIVE_ROLES[:3] + self.SALES_ROLES[:3]:  # Limit to 6 roles
                tasks.append(self._discover_from_linkedin(company_name, role, country))
        
        # 4. SerpAPI (Google + LinkedIn search)
        if self.serp_key:
            tasks.append(self._discover_from_serpapi(company_name, company_domain, country))
        
        # 5. ScraperAPI (company website scraping)
        if self.scraperapi.enabled and company_domain:
            tasks.append(self._discover_from_scraperapi(company_domain))
        
        # 6. Playwright (JS-heavy sites)
        if company_domain:
            tasks.append(self._discover_from_playwright(company_domain))
        
        # Execute all tasks in parallel
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Combine and deduplicate results
        all_contacts = []
        processed_emails = set()
        processed_names = set()
        
        for result in results:
            if isinstance(result, Exception):
                print(f"  ⚠ Discovery source error: {result}")
                continue
            
            for contact in result:
                # Deduplicate by email or name+title
                email = contact.get("email", "").lower()
                name_key = f"{contact.get('full_name', '')}:{contact.get('title', '')}".lower()
                
                if email and email in processed_emails:
                    continue
                if name_key in processed_names:
                    continue
                
                all_contacts.append(contact)
                if email:
                    processed_emails.add(email)
                if name_key:
                    processed_names.add(name_key)
        
        print(f"  ✓ Found {len(all_contacts)} unique contacts from {len([r for r in results if not isinstance(r, Exception)])} sources")
        return all_contacts

    async def _discover_from_crunchbase(self, company_name: str) -> List[Dict[str, Any]]:
        """Discover contacts from Crunchbase"""
        try:
            leadership = await self.crunchbase.get_company_leadership(company_name)
            contacts = []
            
            for person in leadership:
                contacts.append({
                    "full_name": person.get("name"),
                    "title": person.get("title", "Executive"),
                    "department": self._determine_department(person.get("title", "")),
                    "email": None,  # Crunchbase doesn't provide emails
                    "phone": None,
                    "linkedin_url": None,
                    "is_decision_maker": True,
                    "source": "crunchbase",
                    "confidence_score": 0.9,  # High confidence from structured data
                })
            
            return contacts
        except Exception as e:
            print(f"  ⚠ Crunchbase error: {e}")
            return []

    async def _discover_from_hunter(self, company_domain: str) -> List[Dict[str, Any]]:
        """Discover contacts from Hunter.io"""
        try:
            # Get emails for executives
            executive_emails = await self.hunter.find_emails(
                company_domain=company_domain,
                seniority="executive",
            )
            
            # Get emails for sales department
            sales_emails = await self.hunter.find_emails(
                company_domain=company_domain,
                department="sales",
            )
            
            contacts = []
            
            for email_data in executive_emails + sales_emails:
                # Verify email if not already verified
                if email_data.get("verification_status") != "valid":
                    verification = await self.hunter.verify_email(email_data["email"])
                    email_data["verification_status"] = verification.get("status")
                    email_data["confidence_score"] = verification.get("score", 0) / 100
            
                contacts.append({
                    "full_name": f"{email_data.get('first_name', '')} {email_data.get('last_name', '')}".strip(),
                    "title": email_data.get("position"),
                    "department": email_data.get("department", "other"),
                    "email": email_data.get("email"),
                    "phone": email_data.get("phone_number"),
                    "linkedin_url": email_data.get("linkedin_url"),
                    "is_decision_maker": email_data.get("seniority") in ["executive", "c-level"],
                    "source": "hunter.io",
                    "confidence_score": email_data.get("confidence_score", 0.7),
                })
            
            return contacts
        except Exception as e:
            print(f"  ⚠ Hunter.io error: {e}")
            return []

    async def _discover_from_linkedin(self, company_name: str, role: str, country: str) -> List[Dict[str, Any]]:
        """Discover contacts from LinkedIn"""
        try:
            people = await self.linkedin.search_people(company_name, role=role, location=country)
            contacts = []
            
            for person in people:
                contacts.append({
                    "full_name": person.get("name"),
                    "title": person.get("title") or role,
                    "department": self._determine_department(person.get("title", role)),
                    "email": None,  # LinkedIn doesn't provide emails directly
                    "phone": None,
                    "linkedin_url": person.get("linkedin_url"),
                    "is_decision_maker": self._is_decision_maker(person.get("title", role)),
                    "source": "linkedin",
                    "confidence_score": 0.8,
                })
            
            return contacts
        except Exception as e:
            print(f"  ⚠ LinkedIn error: {e}")
            return []

    async def _discover_from_serpapi(self, company_name: str, domain: Optional[str], country: str) -> List[Dict[str, Any]]:
        """Discover contacts using SerpAPI (Google + LinkedIn search)"""
        if not self.serp_key:
            return []
        
        contacts = []
        all_roles = self.EXECUTIVE_ROLES[:2] + self.SALES_ROLES[:2]  # Limit to 4 roles
        
        # Create search tasks for all roles
        search_tasks = []
        for role in all_roles:
            search_tasks.append(self._search_serpapi_for_role(company_name, role, domain, country))
        
        # Execute searches in parallel
        results = await asyncio.gather(*search_tasks, return_exceptions=True)
        
        for result in results:
            if isinstance(result, Exception):
                continue
            contacts.extend(result)
        
        return contacts

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def _search_serpapi_for_role(
        self,
        company_name: str,
        role: str,
        domain: Optional[str],
        country: str,
    ) -> List[Dict[str, Any]]:
        """Search SerpAPI for a specific role"""
        try:
            query = f"{role} {company_name} {country}"
            params = {
                "api_key": self.serp_key,
                "q": query,
                "num": 10,
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.SERP_API_URL, params=params, timeout=aiohttp.ClientTimeout(total=30)) as response:
                    if response.status == 200:
                        data = await response.json()
                        return self._parse_serpapi_results(data, role)
        except Exception as e:
            print(f"  ⚠ SerpAPI search error: {e}")
            return []

    def _parse_serpapi_results(self, data: Dict[str, Any], role: str) -> List[Dict[str, Any]]:
        """Parse SerpAPI search results"""
        contacts = []
        
        # Parse LinkedIn profiles
        for profile in data.get("profiles", []):
            if profile.get("link") and "linkedin.com/in/" in profile.get("link", ""):
                contacts.append({
                    "full_name": profile.get("name"),
                    "title": profile.get("description", "").split(" at ")[0] or role,
                    "department": self._determine_department(role),
                    "email": None,
                    "phone": None,
                    "linkedin_url": profile.get("link"),
                    "is_decision_maker": self._is_decision_maker(role),
                    "source": "serpapi_linkedin",
                    "confidence_score": 0.75,
                })
        
        # Parse organic results for emails/phones
        for result in data.get("organic_results", []):
            snippet = result.get("snippet", "").lower()
            link = result.get("link", "")
            
            # Extract email and phone from snippet
            email_match = re.search(r'[\w\.-]+@[\w\.-]+', snippet)
            phone_match = re.search(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', snippet)
            
            if email_match or phone_match:
                # Try to extract name from title
                title = result.get("title", "")
                name = title.split(" | ")[0] if " | " in title else title.split(" - ")[0]
                
                contacts.append({
                    "full_name": name,
                    "title": role,
                    "department": self._determine_department(role),
                    "email": email_match.group(0) if email_match else None,
                    "phone": phone_match.group(0) if phone_match else None,
                    "linkedin_url": link if "linkedin.com/in/" in link else None,
                    "is_decision_maker": self._is_decision_maker(role),
                    "source": "serpapi_organic",
                    "confidence_score": 0.7,
                })
        
        return contacts

    async def _discover_from_scraperapi(self, company_domain: str) -> List[Dict[str, Any]]:
        """Discover contacts by scraping company website with ScraperAPI"""
        if not company_domain:
            return []
        
        try:
            # Try common contact/about pages
            urls_to_try = [
                f"https://{company_domain}/contact",
                f"https://{company_domain}/about",
                f"https://{company_domain}/team",
                f"https://{company_domain}/leadership",
            ]
            
            # Scrape all URLs in parallel
            scrape_tasks = [self.scraperapi.scrape(url, render=True) for url in urls_to_try]
            html_contents = await asyncio.gather(*scrape_tasks, return_exceptions=True)
            
            contacts = []
            
            for html in html_contents:
                if isinstance(html, Exception) or not html:
                    continue
                
                # Extract entities using SpaCy
                entities = self.entity_extractor.extract_entities(html)
                
                # Extract contacts from text
                extracted = self.entity_extractor.extract_contacts_from_text(html)
                contacts.extend(extracted)
            
            return contacts
        except Exception as e:
            print(f"  ⚠ ScraperAPI error: {e}")
            return []

    async def _discover_from_playwright(self, company_domain: str) -> List[Dict[str, Any]]:
        """Discover contacts using Playwright for JS-heavy sites"""
        if not company_domain:
            return []
        
        try:
            playwright = await get_playwright_scraper()
            
            # Scrape company page
            company_data = await playwright.scrape_company_page(f"https://{company_domain}")
            
            if not company_data:
                return []
            
            contacts = []
            
            # Create contacts from extracted emails
            for email in company_data.get("emails", [])[:5]:
                # Try to find associated name in page
                contacts.append({
                    "full_name": None,  # Would need more sophisticated extraction
                    "title": None,
                    "department": "other",
                    "email": email,
                    "phone": company_data.get("phones", [])[0] if company_data.get("phones") else None,
                    "linkedin_url": None,
                    "is_decision_maker": False,
                    "source": "playwright_scrape",
                    "confidence_score": 0.6,
                })
            
            return contacts
        except Exception as e:
            print(f"  ⚠ Playwright error: {e}")
            return []

    def _is_decision_maker(self, role: str) -> bool:
        """Determine if role is a decision maker"""
        role_lower = role.lower()
        decision_maker_keywords = ["ceo", "founder", "director", "president", "head of", "vp", "chief"]
        return any(kw in role_lower for kw in decision_maker_keywords)

    def _determine_department(self, role: str) -> str:
        """Determine department from role"""
        role_lower = role.lower()
        if "sales" in role_lower or "revenue" in role_lower or "business development" in role_lower:
            return "sales"
        if "marketing" in role_lower:
            return "marketing"
        if "ceo" in role_lower or "founder" in role_lower or "president" in role_lower or "managing director" in role_lower:
            return "executive"
        if "cto" in role_lower or "cio" in role_lower or "engineering" in role_lower:
            return "engineering"
        return "other"


# Singleton instance
contact_discovery_service = ContactDiscoveryService()
