"""
Contact Discovery Service
Searches multiple sources to find head officers and sales department heads
Uses SerpAPI, LinkedIn, company websites, and other sources
"""
from typing import List, Dict, Any, Optional
import httpx
import re
from urllib.parse import urlparse
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.core.exceptions import ScrapingError


class ContactDiscoveryService:
    """
    Discovers contacts for tracked companies from multiple sources:
    - LinkedIn (via SerpAPI)
    - Company websites
    - Google Search
    - Business directories
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
        self.api_key = settings.SERP_API_KEY

    async def discover_contacts(
        self,
        company_name: str,
        domain: Optional[str] = None,
        country: str = "Nigeria",
    ) -> List[Dict[str, Any]]:
        """
        Discover contacts from multiple sources
        Returns list of contacts with name, title, email, LinkedIn, etc.
        """
        all_contacts = []

        # Search strategies
        strategies = [
            self._search_linkedin_executives,
            self._search_linkedin_sales,
            self._search_company_website,
            self._search_google_profiles,
            self._search_business_directories,
        ]

        for strategy in strategies:
            try:
                contacts = await strategy(company_name, domain, country)
                all_contacts.extend(contacts)
            except Exception as e:
                print(f"Error in {strategy.__name__}: {e}")
                continue

        # Deduplicate contacts (by name + title similarity)
        unique_contacts = self._deduplicate_contacts(all_contacts)

        return unique_contacts[:20]  # Limit to top 20 contacts

    async def _search_linkedin_executives(
        self,
        company_name: str,
        domain: Optional[str],
        country: str,
    ) -> List[Dict[str, Any]]:
        """Search LinkedIn for executives"""
        contacts = []

        if not self.api_key:
            return contacts

        # Search queries for executives
        queries = [
            f"{company_name} CEO {country} site:linkedin.com/in",
            f"{company_name} Managing Director {country} site:linkedin.com/in",
            f"{company_name} Founder {country} site:linkedin.com/in",
            f"{company_name} President {country} site:linkedin.com/in",
        ]

        for query in queries:
            try:
                results = await self._execute_serp_search(query, num_results=5)
                for result in results:
                    contact = self._parse_linkedin_result(result, company_name, "executive")
                    if contact:
                        contacts.append(contact)
            except Exception:
                continue

        return contacts

    async def _search_linkedin_sales(
        self,
        company_name: str,
        domain: Optional[str],
        country: str,
    ) -> List[Dict[str, Any]]:
        """Search LinkedIn for sales department heads"""
        contacts = []

        if not self.api_key:
            return contacts

        queries = [
            f"{company_name} Head of Sales {country} site:linkedin.com/in",
            f"{company_name} Sales Director {country} site:linkedin.com/in",
            f"{company_name} VP Sales {country} site:linkedin.com/in",
            f"{company_name} Chief Revenue Officer {country} site:linkedin.com/in",
        ]

        for query in queries:
            try:
                results = await self._execute_serp_search(query, num_results=5)
                for result in results:
                    contact = self._parse_linkedin_result(result, company_name, "sales")
                    if contact:
                        contacts.append(contact)
            except Exception:
                continue

        return contacts

    async def _search_company_website(
        self,
        company_name: str,
        domain: Optional[str],
        country: str,
    ) -> List[Dict[str, Any]]:
        """Search company website for team/leadership pages"""
        contacts = []

        if not domain:
            return contacts

        # Common team page URLs
        team_urls = [
            f"https://{domain}/team",
            f"https://{domain}/about/team",
            f"https://{domain}/leadership",
            f"https://{domain}/about/leadership",
            f"https://{domain}/management",
            f"https://www.{domain}/team",
        ]

        # Search for these pages
        for url in team_urls:
            try:
                query = f'site:{domain} ("CEO" OR "Managing Director" OR "Head of Sales" OR "Sales Director")'
                results = await self._execute_serp_search(query, num_results=3)
                for result in results:
                    contact = self._parse_website_result(result, company_name)
                    if contact:
                        contacts.append(contact)
            except Exception:
                continue

        return contacts

    async def _search_google_profiles(
        self,
        company_name: str,
        domain: Optional[str],
        country: str,
    ) -> List[Dict[str, Any]]:
        """Search Google for executive profiles"""
        contacts = []

        if not self.api_key:
            return contacts

        queries = [
            f'"{company_name}" CEO {country} email contact',
            f'"{company_name}" Managing Director {country} email',
            f'"{company_name}" Head of Sales {country} contact',
        ]

        for query in queries:
            try:
                results = await self._execute_serp_search(query, num_results=5)
                for result in results:
                    contact = self._parse_google_result(result, company_name)
                    if contact:
                        contacts.append(contact)
            except Exception:
                continue

        return contacts

    async def _search_business_directories(
        self,
        company_name: str,
        domain: Optional[str],
        country: str,
    ) -> List[Dict[str, Any]]:
        """Search business directories (Crunchbase, etc.)"""
        contacts = []

        if not self.api_key:
            return contacts

        queries = [
            f"{company_name} {country} Crunchbase executives",
            f"{company_name} {country} leadership team",
        ]

        for query in queries:
            try:
                results = await self._execute_serp_search(query, num_results=3)
                for result in results:
                    contact = self._parse_directory_result(result, company_name)
                    if contact:
                        contacts.append(contact)
            except Exception:
                continue

        return contacts

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def _execute_serp_search(
        self,
        query: str,
        num_results: int = 10,
    ) -> List[Dict[str, Any]]:
        """Execute a SerpAPI search"""
        if not self.api_key:
            return []

        params = {
            "api_key": self.api_key,
            "q": query,
            "num": num_results,
            "hl": "en",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(self.SERP_API_URL, params=params)
            response.raise_for_status()
            data = response.json()

            results = []
            # Organic results
            for item in data.get("organic_results", []):
                results.append({
                    "title": item.get("title", ""),
                    "link": item.get("link", ""),
                    "snippet": item.get("snippet", ""),
                })

            return results

    def _parse_linkedin_result(
        self,
        result: Dict[str, Any],
        company_name: str,
        role_type: str,
    ) -> Optional[Dict[str, Any]]:
        """Parse LinkedIn search result into contact"""
        title = result.get("title", "")
        snippet = result.get("snippet", "")
        link = result.get("link", "")

        # Extract name from title (usually "Name | Title at Company")
        name_match = re.search(r"^([^|]+)", title)
        if not name_match:
            return None

        name = name_match.group(1).strip()

        # Extract title
        title_match = re.search(r"\|(.+?)at", title + " " + snippet, re.IGNORECASE)
        if title_match:
            extracted_title = title_match.group(1).strip()
        else:
            # Try to find role keywords
            all_roles = self.EXECUTIVE_ROLES + self.SALES_ROLES
            extracted_title = next(
                (role for role in all_roles if role.lower() in title.lower() or role.lower() in snippet.lower()),
                "Executive"
            )

        # Determine if decision maker
        is_decision_maker = any(
            role.lower() in extracted_title.lower()
            for role in self.EXECUTIVE_ROLES
        )

        # Determine department
        department = "executive" if role_type == "executive" else "sales"
        if any(role.lower() in extracted_title.lower() for role in self.SALES_ROLES):
            department = "sales"

        return {
            "full_name": name,
            "title": extracted_title,
            "department": department,
            "linkedin_url": link if "linkedin.com" in link else None,
            "is_decision_maker": is_decision_maker,
            "source": "linkedin",
            "confidence_score": 0.8,
        }

    def _parse_website_result(
        self,
        result: Dict[str, Any],
        company_name: str,
    ) -> Optional[Dict[str, Any]]:
        """Parse company website result"""
        title = result.get("title", "")
        snippet = result.get("snippet", "")
        link = result.get("link", "")

        # Try to extract name and title from snippet
        # Pattern: "Name, Title" or "Title: Name"
        name_match = re.search(r"([A-Z][a-z]+ [A-Z][a-z]+)", snippet)
        if not name_match:
            return None

        name = name_match.group(1)

        # Extract title
        all_roles = self.EXECUTIVE_ROLES + self.SALES_ROLES
        extracted_title = next(
            (role for role in all_roles if role.lower() in snippet.lower() or role.lower() in title.lower()),
            None
        )

        if not extracted_title:
            return None

        is_decision_maker = any(
            role.lower() in extracted_title.lower()
            for role in self.EXECUTIVE_ROLES
        )

        department = "executive" if is_decision_maker else "sales"

        return {
            "full_name": name,
            "title": extracted_title,
            "department": department,
            "linkedin_url": None,
            "is_decision_maker": is_decision_maker,
            "source": "company_website",
            "confidence_score": 0.7,
        }

    def _parse_google_result(
        self,
        result: Dict[str, Any],
        company_name: str,
    ) -> Optional[Dict[str, Any]]:
        """Parse Google search result"""
        snippet = result.get("snippet", "")
        link = result.get("link", "")

        # Try to extract email
        email_match = re.search(r"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})", snippet)
        email = email_match.group(1) if email_match else None

        # Try to extract name
        name_match = re.search(r"([A-Z][a-z]+ [A-Z][a-z]+)", snippet)
        if not name_match:
            return None

        name = name_match.group(1)

        # Extract title
        all_roles = self.EXECUTIVE_ROLES + self.SALES_ROLES
        extracted_title = next(
            (role for role in all_roles if role.lower() in snippet.lower()),
            None
        )

        if not extracted_title:
            return None

        is_decision_maker = any(
            role.lower() in extracted_title.lower()
            for role in self.EXECUTIVE_ROLES
        )

        return {
            "full_name": name,
            "title": extracted_title,
            "department": "executive" if is_decision_maker else "sales",
            "email": email,
            "linkedin_url": link if "linkedin.com" in link else None,
            "is_decision_maker": is_decision_maker,
            "source": "google_search",
            "confidence_score": 0.6,
        }

    def _parse_directory_result(
        self,
        result: Dict[str, Any],
        company_name: str,
    ) -> Optional[Dict[str, Any]]:
        """Parse business directory result"""
        snippet = result.get("snippet", "")

        # Similar parsing to Google results
        return self._parse_google_result(result, company_name)

    def _deduplicate_contacts(self, contacts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate contacts based on name similarity"""
        unique_contacts = []
        seen_names = set()

        for contact in contacts:
            name = contact.get("full_name", "").lower().strip()
            if not name:
                continue

            # Simple deduplication by exact name match
            if name not in seen_names:
                seen_names.add(name)
                unique_contacts.append(contact)

        return unique_contacts


# Global instance
contact_discovery_service = ContactDiscoveryService()

