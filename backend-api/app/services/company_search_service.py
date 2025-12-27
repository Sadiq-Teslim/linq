"""
Company Search Service
Uses SerpAPI for intensive global company search and data enrichment
Also uses free APIs for additional company information
"""
import httpx
import asyncio
import re
from typing import Optional, Dict, Any, List
from urllib.parse import urlparse, quote_plus
from app.core.config import settings


class CompanySearchService:
    """
    Company search using multiple data sources:
    1. SerpAPI (Google Search) - Primary search engine
    2. SerpAPI (Google Knowledge Graph) - Company details
    3. SerpAPI (LinkedIn Search) - Professional info
    4. Logo.dev / Clearbit Logo API (free) - Company logos
    5. Hunter.io (if available) - Email patterns
    """

    SERP_API_URL = "https://serpapi.com/search"

    def __init__(self):
        self.serp_api_key = settings.SERP_API_KEY

    async def search_companies(
        self,
        query: str,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Search for companies by name using multiple SerpAPI searches
        Returns enriched company data from multiple sources
        """
        if not self.serp_api_key:
            raise ValueError("SERP_API_KEY is required for company search")

        # Run multiple searches in parallel for richer results
        results = await asyncio.gather(
            self._search_google_companies(query, limit),
            self._search_google_knowledge(query),
            self._search_linkedin_companies(query, limit // 2),
            return_exceptions=True,
        )

        google_results = results[0] if not isinstance(results[0], Exception) else []
        knowledge_data = results[1] if not isinstance(results[1], Exception) else {}
        linkedin_results = results[2] if not isinstance(results[2], Exception) else []

        # Merge and deduplicate results
        companies = {}

        # Process Google results
        for company in google_results:
            domain = company.get("domain")
            if domain and domain not in companies:
                companies[domain] = company

        # Enrich with knowledge graph data if available
        if knowledge_data:
            for domain, company in companies.items():
                if company.get("name", "").lower() in knowledge_data.get("title", "").lower():
                    company.update({
                        "description": knowledge_data.get("description") or company.get("description"),
                        "website": knowledge_data.get("website") or company.get("website"),
                    })

        # Add LinkedIn results
        for company in linkedin_results:
            domain = company.get("domain")
            if domain:
                if domain in companies:
                    # Merge data
                    existing = companies[domain]
                    existing["linkedin_url"] = company.get("linkedin_url") or existing.get("linkedin_url")
                    existing["employee_count"] = company.get("employee_count") or existing.get("employee_count")
                    existing["industry"] = company.get("industry") or existing.get("industry")
                else:
                    companies[domain] = company

        # Get logos for all companies
        company_list = list(companies.values())[:limit]
        await self._enrich_with_logos(company_list)

        return company_list

    async def _search_google_companies(self, query: str, limit: int) -> List[Dict[str, Any]]:
        """
        Search using Google Search API via SerpAPI
        Searches for company websites and information
        """
        async with httpx.AsyncClient() as client:
            # Search for company websites
            response = await client.get(
                self.SERP_API_URL,
                params={
                    "api_key": self.serp_api_key,
                    "q": f"{query} company official website",
                    "engine": "google",
                    "num": limit * 2,  # Get more to filter
                    "gl": "us",  # Global results
                    "hl": "en",
                },
                timeout=20.0,
            )

            if response.status_code != 200:
                print(f"Google search failed: {response.status_code}")
                return []

            data = response.json()
            organic_results = data.get("organic_results", [])

            results = []
            seen_domains = set()

            for result in organic_results:
                link = result.get("link", "")
                if not link:
                    continue

                # Extract domain
                parsed = urlparse(link)
                domain = parsed.netloc.replace("www.", "")

                # Skip common non-company sites
                skip_domains = [
                    "linkedin.com", "facebook.com", "twitter.com", "instagram.com",
                    "youtube.com", "wikipedia.org", "crunchbase.com", "bloomberg.com",
                    "reuters.com", "forbes.com", "businessinsider.com", "techcrunch.com",
                    "github.com", "medium.com", "reddit.com", "quora.com",
                ]

                if any(skip in domain for skip in skip_domains):
                    continue

                if domain in seen_domains:
                    continue

                seen_domains.add(domain)

                # Extract company name from title
                title = result.get("title", "")
                company_name = self._extract_company_name(title)

                results.append({
                    "name": company_name,
                    "domain": domain,
                    "website": link,
                    "logo_url": None,  # Will be enriched later
                    "industry": None,
                    "employee_count": None,
                    "headquarters": None,
                    "linkedin_url": None,
                    "description": result.get("snippet", ""),
                    "source": "google",
                })

            return results[:limit]

    async def _search_google_knowledge(self, query: str) -> Dict[str, Any]:
        """
        Search Google Knowledge Graph for company info
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.SERP_API_URL,
                params={
                    "api_key": self.serp_api_key,
                    "q": f"{query} company",
                    "engine": "google",
                    "num": 1,
                },
                timeout=15.0,
            )

            if response.status_code != 200:
                return {}

            data = response.json()

            # Extract knowledge graph data
            knowledge_graph = data.get("knowledge_graph", {})
            if knowledge_graph:
                return {
                    "title": knowledge_graph.get("title", ""),
                    "description": knowledge_graph.get("description", ""),
                    "website": knowledge_graph.get("website", ""),
                    "type": knowledge_graph.get("type", ""),
                }

            # Try answer box
            answer_box = data.get("answer_box", {})
            if answer_box:
                return {
                    "title": answer_box.get("title", ""),
                    "description": answer_box.get("snippet", ""),
                }

            return {}

    async def _search_linkedin_companies(self, query: str, limit: int) -> List[Dict[str, Any]]:
        """
        Search for companies on LinkedIn via Google
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.SERP_API_URL,
                params={
                    "api_key": self.serp_api_key,
                    "q": f'site:linkedin.com/company "{query}"',
                    "engine": "google",
                    "num": limit,
                },
                timeout=15.0,
            )

            if response.status_code != 200:
                return []

            data = response.json()
            organic_results = data.get("organic_results", [])

            results = []
            for result in organic_results:
                link = result.get("link", "")
                if "linkedin.com/company" not in link:
                    continue

                title = result.get("title", "")
                snippet = result.get("snippet", "")

                # Extract company name from LinkedIn title
                # Format: "Company Name | LinkedIn" or "Company Name: Overview | LinkedIn"
                company_name = title.split("|")[0].split(":")[0].strip()

                # Try to extract employee count from snippet
                employee_count = self._extract_employee_count(snippet)

                # Try to extract industry from snippet
                industry = self._extract_industry(snippet)

                # Try to extract domain from snippet or title
                domain = self._extract_domain_from_text(snippet + " " + title)

                results.append({
                    "name": company_name,
                    "domain": domain,
                    "website": None,
                    "logo_url": None,
                    "industry": industry,
                    "employee_count": employee_count,
                    "headquarters": self._extract_location(snippet),
                    "linkedin_url": link,
                    "description": snippet,
                    "source": "linkedin",
                })

            return results

    async def _enrich_with_logos(self, companies: List[Dict[str, Any]]) -> None:
        """
        Add company logos using free logo APIs
        """
        for company in companies:
            domain = company.get("domain")
            if domain:
                # Use Logo.dev (free, no API key needed)
                company["logo_url"] = f"https://logo.clearbit.com/{domain}"
                # Fallback: company["logo_url"] = f"https://logo.dev/{domain}"

    async def get_company_details(self, domain: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed company information using intensive SerpAPI searches
        Combines multiple search strategies for comprehensive data
        """
        if not self.serp_api_key:
            return None

        # Run multiple enrichment searches in parallel
        results = await asyncio.gather(
            self._get_company_from_google(domain),
            self._get_company_from_linkedin(domain),
            self._get_company_news(domain),
            self._get_company_tech_stack(domain),
            return_exceptions=True,
        )

        google_data = results[0] if not isinstance(results[0], Exception) else {}
        linkedin_data = results[1] if not isinstance(results[1], Exception) else {}
        news_data = results[2] if not isinstance(results[2], Exception) else []
        tech_data = results[3] if not isinstance(results[3], Exception) else []

        # Merge all data
        company = {
            "name": google_data.get("name") or linkedin_data.get("name") or domain.split(".")[0].title(),
            "domain": domain,
            "website": f"https://{domain}",
            "logo_url": f"https://logo.clearbit.com/{domain}",
            "industry": linkedin_data.get("industry") or google_data.get("industry"),
            "employee_count": linkedin_data.get("employee_count") or google_data.get("employee_count"),
            "headquarters": linkedin_data.get("headquarters") or google_data.get("headquarters"),
            "linkedin_url": linkedin_data.get("linkedin_url"),
            "description": google_data.get("description") or linkedin_data.get("description"),
            "founded_year": google_data.get("founded_year"),
            "type": google_data.get("type"),
            "tags": google_data.get("tags", []),
            "tech_stack": tech_data,
            "recent_news": news_data[:5],
            "twitter_handle": google_data.get("twitter_handle"),
            "facebook_handle": google_data.get("facebook_handle"),
        }

        return company

    async def _get_company_from_google(self, domain: str) -> Dict[str, Any]:
        """
        Get company info from Google Knowledge Graph and search
        """
        company_name = domain.split(".")[0].replace("-", " ").title()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.SERP_API_URL,
                params={
                    "api_key": self.serp_api_key,
                    "q": f"{company_name} company founded headquarters employees",
                    "engine": "google",
                    "num": 5,
                },
                timeout=15.0,
            )

            if response.status_code != 200:
                return {}

            data = response.json()

            result = {
                "name": company_name,
                "description": None,
                "founded_year": None,
                "headquarters": None,
                "type": None,
                "tags": [],
            }

            # Extract from knowledge graph
            kg = data.get("knowledge_graph", {})
            if kg:
                result["name"] = kg.get("title", company_name)
                result["description"] = kg.get("description")
                result["type"] = kg.get("type")

                # Extract attributes
                for attr in kg.get("attributes", []):
                    name = attr.get("name", "").lower()
                    value = attr.get("value", "")

                    if "founded" in name:
                        result["founded_year"] = self._extract_year(value)
                    elif "headquarter" in name or "location" in name:
                        result["headquarters"] = value
                    elif "employee" in name:
                        result["employee_count"] = self._format_employee_count(value)
                    elif "industry" in name or "sector" in name:
                        result["industry"] = value

                # Extract social handles from profiles
                profiles = kg.get("profiles", [])
                for profile in profiles:
                    name = profile.get("name", "").lower()
                    link = profile.get("link", "")
                    if "twitter" in name:
                        result["twitter_handle"] = link.split("/")[-1]
                    elif "facebook" in name:
                        result["facebook_handle"] = link.split("/")[-1]

            # Extract from organic results
            for organic in data.get("organic_results", [])[:3]:
                snippet = organic.get("snippet", "")
                if not result["description"]:
                    result["description"] = snippet
                if not result["founded_year"]:
                    result["founded_year"] = self._extract_year(snippet)
                if not result["headquarters"]:
                    result["headquarters"] = self._extract_location(snippet)

            return result

    async def _get_company_from_linkedin(self, domain: str) -> Dict[str, Any]:
        """
        Get company info from LinkedIn via Google search
        """
        company_name = domain.split(".")[0].replace("-", " ")

        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.SERP_API_URL,
                params={
                    "api_key": self.serp_api_key,
                    "q": f'site:linkedin.com/company "{company_name}"',
                    "engine": "google",
                    "num": 3,
                },
                timeout=15.0,
            )

            if response.status_code != 200:
                return {}

            data = response.json()
            results = data.get("organic_results", [])

            if not results:
                return {}

            result = results[0]
            snippet = result.get("snippet", "")
            title = result.get("title", "")

            return {
                "name": title.split("|")[0].split(":")[0].strip(),
                "linkedin_url": result.get("link"),
                "description": snippet,
                "employee_count": self._extract_employee_count(snippet),
                "industry": self._extract_industry(snippet),
                "headquarters": self._extract_location(snippet),
            }

    async def _get_company_news(self, domain: str) -> List[Dict[str, Any]]:
        """
        Get recent news about the company
        """
        company_name = domain.split(".")[0].replace("-", " ").title()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.SERP_API_URL,
                params={
                    "api_key": self.serp_api_key,
                    "q": f"{company_name} news",
                    "engine": "google_news",
                    "num": 10,
                },
                timeout=15.0,
            )

            if response.status_code != 200:
                return []

            data = response.json()
            news_results = data.get("news_results", [])

            news = []
            for item in news_results[:5]:
                news.append({
                    "title": item.get("title"),
                    "source": item.get("source", {}).get("name"),
                    "link": item.get("link"),
                    "date": item.get("date"),
                    "snippet": item.get("snippet"),
                })

            return news

    async def _get_company_tech_stack(self, domain: str) -> List[str]:
        """
        Try to identify company's tech stack from search results
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.SERP_API_URL,
                params={
                    "api_key": self.serp_api_key,
                    "q": f'site:stackshare.io "{domain}" OR site:builtwith.com "{domain}"',
                    "engine": "google",
                    "num": 3,
                },
                timeout=15.0,
            )

            if response.status_code != 200:
                return []

            data = response.json()
            results = data.get("organic_results", [])

            tech_stack = []
            common_tech = [
                "AWS", "Azure", "GCP", "Kubernetes", "Docker",
                "React", "Vue", "Angular", "Node.js", "Python",
                "Java", "Go", "PostgreSQL", "MongoDB", "Redis",
                "Elasticsearch", "Kafka", "RabbitMQ", "GraphQL",
                "Terraform", "Jenkins", "GitHub", "GitLab",
                "Salesforce", "HubSpot", "Stripe", "Twilio",
            ]

            for result in results:
                snippet = result.get("snippet", "")
                for tech in common_tech:
                    if tech.lower() in snippet.lower() and tech not in tech_stack:
                        tech_stack.append(tech)

            return tech_stack[:10]

    # ===== Helper Methods =====

    def _extract_company_name(self, title: str) -> str:
        """Extract company name from search result title"""
        # Remove common suffixes
        title = title.split(" - ")[0].split(" | ")[0].split(" :: ")[0]
        # Remove common company suffixes
        for suffix in [" Inc", " Inc.", " LLC", " Ltd", " Ltd.", " Corp", " Corp."]:
            title = title.replace(suffix, "")
        return title.strip()

    def _extract_employee_count(self, text: str) -> Optional[str]:
        """Extract employee count from text"""
        patterns = [
            r"(\d+[\d,]*)\s*(?:\+\s*)?employees",
            r"(\d+[\d,]*)\s*-\s*(\d+[\d,]*)\s*employees",
            r"(\d+)\s*to\s*(\d+)\s*employees",
        ]

        for pattern in patterns:
            match = re.search(pattern, text.lower())
            if match:
                if len(match.groups()) == 2:
                    return f"{match.group(1)}-{match.group(2)}"
                return self._format_employee_count(match.group(1))

        return None

    def _format_employee_count(self, value: str) -> Optional[str]:
        """Format employee count into standard ranges"""
        try:
            # Remove commas and convert to int
            count = int(str(value).replace(",", "").replace("+", ""))

            if count <= 10:
                return "1-10"
            elif count <= 50:
                return "11-50"
            elif count <= 200:
                return "51-200"
            elif count <= 500:
                return "201-500"
            elif count <= 1000:
                return "501-1000"
            elif count <= 5000:
                return "1001-5000"
            elif count <= 10000:
                return "5001-10000"
            else:
                return "10001+"
        except (ValueError, TypeError):
            return None

    def _extract_industry(self, text: str) -> Optional[str]:
        """Extract industry from text"""
        industries = [
            "Technology", "Software", "SaaS", "Fintech", "Healthcare",
            "E-commerce", "Retail", "Manufacturing", "Finance",
            "Consulting", "Marketing", "Education", "Media",
            "Real Estate", "Transportation", "Energy", "Telecommunications",
            "AI", "Machine Learning", "Cybersecurity", "Blockchain",
            "Biotech", "Pharmaceuticals", "Insurance", "Banking",
        ]

        text_lower = text.lower()
        for industry in industries:
            if industry.lower() in text_lower:
                return industry

        return None

    def _extract_location(self, text: str) -> Optional[str]:
        """Extract location from text"""
        # Common patterns
        patterns = [
            r"(?:headquartered|based|located)\s+in\s+([A-Z][a-z]+(?:\s*,\s*[A-Z][a-z]+)*)",
            r"([A-Z][a-z]+(?:\s*,\s*[A-Z]{2})?)\s+based",
        ]

        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1)

        # Try to find city, state patterns
        city_pattern = r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z]{2}|[A-Z][a-z]+)"
        match = re.search(city_pattern, text)
        if match:
            return f"{match.group(1)}, {match.group(2)}"

        return None

    def _extract_domain_from_text(self, text: str) -> Optional[str]:
        """Extract domain from text"""
        # Look for URLs
        url_pattern = r"https?://(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})"
        match = re.search(url_pattern, text)
        if match:
            return match.group(1)

        # Look for domain patterns
        domain_pattern = r"\b([a-zA-Z0-9-]+\.(?:com|io|co|org|net|ai|dev))\b"
        match = re.search(domain_pattern, text)
        if match:
            return match.group(1)

        return None

    def _extract_year(self, text: str) -> Optional[int]:
        """Extract founding year from text"""
        patterns = [
            r"founded\s+(?:in\s+)?(\d{4})",
            r"established\s+(?:in\s+)?(\d{4})",
            r"since\s+(\d{4})",
            r"(\d{4})\s*[-–]\s*present",
        ]

        for pattern in patterns:
            match = re.search(pattern, text.lower())
            if match:
                year = int(match.group(1))
                if 1800 <= year <= 2025:
                    return year

        return None


# Singleton instance
company_search_service = CompanySearchService()
