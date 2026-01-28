"""
Smart Contact Discovery Service
Combines multiple data sources with AI-powered result merging

Strategy:
1. Apollo.io (Primary) - High-quality structured B2B data (91% email accuracy)
2. SerpAPI (Secondary) - Broader web coverage via Google/LinkedIn search
3. Groq LLM (Merger) - Intelligently combines and deduplicates results

This approach maximizes data coverage while ensuring quality through AI validation.
"""
from typing import List, Dict, Any, Optional
import asyncio
import httpx
import json
import re

from app.core.config import settings
from app.services.data_sources.apollo import apollo_provider
from app.services.cache.redis_client import redis_cache


class SmartContactDiscovery:
    """
    Intelligent contact discovery using Apollo + SerpAPI + Groq
    Returns the best quality contacts with maximum coverage
    """
    
    SERP_API_URL = "https://serpapi.com/search"
    GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
    
    # Target roles for discovery
    EXECUTIVE_ROLES = ["CEO", "Founder", "Managing Director", "President", "Owner", "Co-Founder"]
    SALES_ROLES = ["VP Sales", "Head of Sales", "Sales Director", "Chief Revenue Officer", "Business Development"]
    TECH_ROLES = ["CTO", "CIO", "VP Engineering", "Head of Technology", "Chief Technology Officer"]
    
    def __init__(self):
        self.apollo = apollo_provider
        self.serp_key = settings.SERP_API_KEY
        self.groq_key = settings.GROQ_API_KEY
    
    async def discover_contacts(
        self,
        company_name: str,
        company_domain: Optional[str] = None,
        location: Optional[str] = None,
        max_contacts: int = 50,
        include_roles: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Discover contacts from multiple sources and merge with AI
        
        Args:
            company_name: Company to search for
            company_domain: Company domain (e.g., zenithbank.com)
            location: Location filter (e.g., "Nigeria")
            max_contacts: Maximum contacts to return
            include_roles: Specific roles to search for
        
        Returns:
            {
                "success": bool,
                "contacts": List[contact],
                "company": Dict,
                "sources_used": List[str],
                "merge_quality": str,
                "total_raw_results": int,
                "total_merged": int,
            }
        """
        print(f"\n[SmartDiscovery] Starting discovery for {company_name}...")
        
        # Build role list
        roles = include_roles or (self.EXECUTIVE_ROLES[:3] + self.SALES_ROLES[:2])
        
        # Step 1: Fetch from both sources in parallel
        apollo_task = self._fetch_from_apollo(company_name, company_domain, roles, max_contacts)
        serp_task = self._fetch_from_serpapi(company_name, company_domain, location, roles)
        
        apollo_results, serp_results = await asyncio.gather(
            apollo_task, serp_task, return_exceptions=True
        )
        
        # Handle exceptions
        if isinstance(apollo_results, Exception):
            print(f"[SmartDiscovery] Apollo error: {apollo_results}")
            apollo_results = {"contacts": [], "company": None}
        
        if isinstance(serp_results, Exception):
            print(f"[SmartDiscovery] SerpAPI error: {serp_results}")
            serp_results = {"contacts": []}
        
        apollo_contacts = apollo_results.get("contacts", [])
        serp_contacts = serp_results.get("contacts", [])
        company_data = apollo_results.get("company") or {}
        
        total_raw = len(apollo_contacts) + len(serp_contacts)
        print(f"[SmartDiscovery] Raw results: Apollo={len(apollo_contacts)}, SerpAPI={len(serp_contacts)}")
        
        # Step 2: Merge with Groq AI
        if apollo_contacts or serp_contacts:
            merged_contacts = await self._merge_with_groq(
                apollo_contacts=apollo_contacts,
                serp_contacts=serp_contacts,
                company_name=company_name,
                max_contacts=max_contacts
            )
            # Final deduplication pass
            merged_contacts = self._post_process_contacts(merged_contacts)
        else:
            merged_contacts = []
        
        # Determine merge quality
        merge_quality = self._assess_merge_quality(apollo_contacts, serp_contacts, merged_contacts)
        
        # Build sources list
        sources_used = []
        if apollo_contacts:
            sources_used.append("apollo")
        if serp_contacts:
            sources_used.append("serpapi")
        if self.groq_key and (apollo_contacts or serp_contacts):
            sources_used.append("groq_merger")
        
        print(f"[SmartDiscovery] Merged {total_raw} raw contacts into {len(merged_contacts)} unique contacts")
        
        return {
            "success": bool(merged_contacts),
            "contacts": merged_contacts[:max_contacts],
            "company": company_data,
            "sources_used": sources_used,
            "merge_quality": merge_quality,
            "total_raw_results": total_raw,
            "total_merged": len(merged_contacts),
        }
    
    async def _fetch_from_apollo(
        self,
        company_name: str,
        company_domain: Optional[str],
        roles: List[str],
        max_contacts: int,
    ) -> Dict[str, Any]:
        """Fetch contacts from Apollo.io (Primary source)"""
        if not self.apollo.enabled:
            print("[SmartDiscovery] Apollo not enabled (no API key)")
            return {"contacts": [], "company": None}
        
        company_data = None
        contacts = []
        
        try:
            # First, get company info (this usually works)
            company_data = await self.apollo.search_company(company_name)
            if company_data:
                print(f"[Apollo] Found company: {company_data.get('name')} ({company_data.get('domain')})")
        except Exception as e:
            print(f"[Apollo] Company search error: {e}")
        
        try:
            # Then search for people (may require higher tier)
            people_results = await self.apollo.search_people(
                company_name=company_name,
                company_domain=company_domain or (company_data.get("domain") if company_data else None),
                job_titles=roles,
                seniority_levels=["C-Level", "VP-Level", "Director"],
                max_results=max_contacts
            )
            
            # Normalize to standard format
            for c in people_results:
                contacts.append({
                    "full_name": c.get("full_name") or f"{c.get('first_name', '')} {c.get('last_name', '')}".strip(),
                    "first_name": c.get("first_name"),
                    "last_name": c.get("last_name"),
                    "title": c.get("title"),
                    "email": c.get("email"),
                    "phone": c.get("phone") or c.get("mobile_phone") or c.get("direct_dial"),
                    "linkedin_url": c.get("linkedin_url"),
                    "department": c.get("department"),
                    "seniority": c.get("seniority"),
                    "company_name": company_name,
                    "company_domain": company_domain or (company_data.get("domain") if company_data else None),
                    "source": "apollo",
                    "confidence": 0.91,  # Apollo's stated accuracy
                })
            
            print(f"[Apollo] Found {len(contacts)} contacts")
            
        except Exception as e:
            # People search may fail with 403 if API tier doesn't support it
            error_msg = str(e)
            if "403" in error_msg:
                print(f"[Apollo] People search requires higher API tier (403 Forbidden)")
            else:
                print(f"[Apollo] People search error: {e}")
        
        return {"contacts": contacts, "company": company_data}
    
    async def _fetch_from_serpapi(
        self,
        company_name: str,
        company_domain: Optional[str],
        location: Optional[str],
        roles: List[str],
    ) -> Dict[str, Any]:
        """Fetch contacts from SerpAPI (Secondary source - web scraping)"""
        if not self.serp_key:
            print("[SmartDiscovery] SerpAPI not enabled (no API key)")
            return {"contacts": []}
        
        all_contacts = []
        
        # Search for each role
        search_tasks = []
        for role in roles[:4]:  # Limit to 4 roles to save API calls
            search_tasks.append(self._search_serpapi_role(company_name, role, location))
        
        results = await asyncio.gather(*search_tasks, return_exceptions=True)
        
        for result in results:
            if isinstance(result, Exception):
                continue
            all_contacts.extend(result)
        
        # Also search LinkedIn directly
        linkedin_contacts = await self._search_linkedin_via_serpapi(company_name, location)
        all_contacts.extend(linkedin_contacts)
        
        print(f"[SerpAPI] Found {len(all_contacts)} contacts")
        return {"contacts": all_contacts}
    
    async def _search_serpapi_role(
        self,
        company_name: str,
        role: str,
        location: Optional[str],
    ) -> List[Dict[str, Any]]:
        """Search SerpAPI for a specific role"""
        query = f"{role} {company_name}"
        if location:
            query += f" {location}"
        
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    self.SERP_API_URL,
                    params={
                        "api_key": self.serp_key,
                        "q": query,
                        "engine": "google",
                        "num": 10,
                    }
                )
                
                if response.status_code != 200:
                    return []
                
                data = response.json()
                return self._parse_serpapi_results(data, company_name, role)
                
        except Exception as e:
            print(f"[SerpAPI] Search error: {e}")
            return []
    
    async def _search_linkedin_via_serpapi(
        self,
        company_name: str,
        location: Optional[str],
    ) -> List[Dict[str, Any]]:
        """Search LinkedIn profiles via SerpAPI"""
        query = f'site:linkedin.com/in "{company_name}" CEO OR founder OR director'
        if location:
            query += f" {location}"
        
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    self.SERP_API_URL,
                    params={
                        "api_key": self.serp_key,
                        "q": query,
                        "engine": "google",
                        "num": 15,
                    }
                )
                
                if response.status_code != 200:
                    return []
                
                data = response.json()
                contacts = []
                
                for result in data.get("organic_results", []):
                    link = result.get("link", "")
                    if "linkedin.com/in/" not in link:
                        continue
                    
                    title = result.get("title", "")
                    snippet = result.get("snippet", "")
                    
                    # Extract name from LinkedIn title (format: "Name - Title | LinkedIn")
                    name = title.split(" - ")[0].split(" | ")[0].strip()
                    
                    # Extract job title from title or snippet
                    job_title = None
                    if " - " in title:
                        job_title = title.split(" - ")[1].split(" | ")[0].strip()
                    
                    if name and len(name) > 2:
                        contacts.append({
                            "full_name": name,
                            "title": job_title,
                            "linkedin_url": link,
                            "company_name": company_name,
                            "source": "serpapi_linkedin",
                            "confidence": 0.7,
                        })
                
                return contacts
                
        except Exception as e:
            print(f"[SerpAPI] LinkedIn search error: {e}")
            return []
    
    def _parse_serpapi_results(
        self,
        data: Dict[str, Any],
        company_name: str,
        role: str,
    ) -> List[Dict[str, Any]]:
        """Parse SerpAPI results into contacts"""
        contacts = []
        
        # Parse LinkedIn profiles from results
        for result in data.get("organic_results", []):
            link = result.get("link", "")
            snippet = result.get("snippet", "")
            title = result.get("title", "")
            
            # Extract email from snippet
            email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', snippet)
            
            # Extract phone from snippet
            phone_match = re.search(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', snippet)
            
            # Try to extract name
            name = None
            if "linkedin.com/in/" in link:
                # LinkedIn profile
                name = title.split(" - ")[0].split(" | ")[0].strip()
            elif email_match or phone_match:
                # Found contact info in snippet
                name = title.split(" - ")[0].split(" | ")[0].strip()
            
            if name and (email_match or phone_match or "linkedin.com/in/" in link):
                contacts.append({
                    "full_name": name,
                    "title": role,
                    "email": email_match.group(0) if email_match else None,
                    "phone": phone_match.group(0) if phone_match else None,
                    "linkedin_url": link if "linkedin.com/in/" in link else None,
                    "company_name": company_name,
                    "source": "serpapi_google",
                    "confidence": 0.6,
                })
        
        return contacts
    
    async def _merge_with_groq(
        self,
        apollo_contacts: List[Dict[str, Any]],
        serp_contacts: List[Dict[str, Any]],
        company_name: str,
        max_contacts: int,
    ) -> List[Dict[str, Any]]:
        """Use Groq to intelligently merge and deduplicate contacts"""
        
        # If no Groq key, use basic deduplication
        if not self.groq_key:
            print("[SmartDiscovery] Groq not available, using basic merge")
            return self._basic_merge(apollo_contacts, serp_contacts)
        
        # If one source is empty, return the other
        if not apollo_contacts and not serp_contacts:
            return []
        if not serp_contacts:
            return apollo_contacts
        if not apollo_contacts:
            return serp_contacts
        
        # Prepare data for Groq
        prompt = self._build_merge_prompt(apollo_contacts, serp_contacts, company_name, max_contacts)
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.GROQ_API_URL,
                    headers={
                        "Authorization": f"Bearer {self.groq_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "llama-3.1-70b-versatile",
                        "messages": [
                            {
                                "role": "system",
                                "content": """You are a data merging AI. Merge contact lists from two sources (Apollo and SerpAPI) into one deduplicated list.
Rules:
1. Prefer Apollo data for email/phone (higher accuracy)
2. Combine LinkedIn URLs from both sources
3. Remove exact duplicates (same name + same company)
4. For similar names, merge their data into one record
5. Return ONLY valid JSON array, no explanations
6. Each contact must have: full_name, title, email, phone, linkedin_url, confidence"""
                            },
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.1,  # Low temperature for consistent output
                        "max_tokens": 4000,
                    }
                )
                
                if response.status_code != 200:
                    print(f"[Groq] API error: {response.status_code}")
                    return self._basic_merge(apollo_contacts, serp_contacts)
                
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                
                # Parse JSON from response
                merged = self._parse_groq_response(content)
                
                if merged:
                    # Post-process to ensure deduplication
                    merged = self._post_process_contacts(merged)
                    print(f"[Groq] Successfully merged {len(apollo_contacts) + len(serp_contacts)} into {len(merged)} contacts")
                    return merged
                else:
                    print("[Groq] Failed to parse response, using basic merge")
                    return self._post_process_contacts(self._basic_merge(apollo_contacts, serp_contacts))
                    
        except Exception as e:
            print(f"[Groq] Merge error: {e}")
            return self._post_process_contacts(self._basic_merge(apollo_contacts, serp_contacts))
    
    def _build_merge_prompt(
        self,
        apollo_contacts: List[Dict[str, Any]],
        serp_contacts: List[Dict[str, Any]],
        company_name: str,
        max_contacts: int,
    ) -> str:
        """Build prompt for Groq merge"""
        # Limit data size for prompt
        apollo_sample = apollo_contacts[:20]
        serp_sample = serp_contacts[:20]
        
        return f"""Merge and deduplicate these contact lists for company: {company_name}

APOLLO CONTACTS (high quality, 91% email accuracy):
{json.dumps(apollo_sample, indent=2)}

SERPAPI CONTACTS (broader coverage, lower accuracy):
{json.dumps(serp_sample, indent=2)}

DEDUPLICATION RULES:
1. Same person = same name (ignore case) - MERGE into ONE record
2. When merging, prefer Apollo data for email/phone (higher accuracy)
3. Combine LinkedIn URLs and other data from both sources
4. Remove obvious duplicates (e.g., "Satya Nadella" appears twice = keep only 1)

PRIORITY ORDER for final list:
1. Contacts with verified emails
2. C-level executives (CEO, CFO, CTO, Founder)
3. Contacts with LinkedIn profiles
4. Sales/Business development roles

Return a clean, deduplicated JSON array with max {max_contacts} unique contacts.
Each contact must have: full_name, title, email, phone, linkedin_url, confidence, source

Return ONLY the JSON array, no explanations or other text."""
    
    def _parse_groq_response(self, content: str) -> List[Dict[str, Any]]:
        """Parse Groq response into contact list"""
        try:
            # Try to find JSON array in response
            content = content.strip()
            
            # If response starts with [ and ends with ], it's pure JSON
            if content.startswith("[") and content.endswith("]"):
                return json.loads(content)
            
            # Try to extract JSON array from text
            json_match = re.search(r'\[[\s\S]*\]', content)
            if json_match:
                return json.loads(json_match.group(0))
            
            return None
            
        except json.JSONDecodeError as e:
            print(f"[Groq] JSON parse error: {e}")
            return None
    
    def _basic_merge(
        self,
        apollo_contacts: List[Dict[str, Any]],
        serp_contacts: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Basic merge without AI (fallback) - with deduplication"""
        merged = {}
        
        def normalize_name(name: str) -> str:
            """Normalize name for comparison"""
            if not name:
                return ""
            # Lowercase, remove extra spaces, remove common suffixes
            name = " ".join(name.lower().split())
            return name
        
        def merge_contact(existing: Dict, new: Dict) -> Dict:
            """Merge two contact records"""
            result = existing.copy()
            # Fill missing fields from new record
            for field in ["linkedin_url", "phone", "email", "title"]:
                if not result.get(field) and new.get(field):
                    result[field] = new[field]
            # Keep higher confidence
            if new.get("confidence", 0) > result.get("confidence", 0):
                result["confidence"] = new["confidence"]
                result["source"] = new.get("source", result.get("source"))
            return result
        
        # Add Apollo contacts first (higher quality)
        for contact in apollo_contacts:
            name = normalize_name(contact.get("full_name") or "")
            if name:
                merged[name] = contact
        
        # Add SerpAPI contacts (fill gaps and merge)
        for contact in serp_contacts:
            name = normalize_name(contact.get("full_name") or "")
            if not name:
                continue
            
            if name in merged:
                merged[name] = merge_contact(merged[name], contact)
            else:
                merged[name] = contact
        
        # Sort by confidence, then by whether they have email/linkedin
        contacts = list(merged.values())
        contacts.sort(key=lambda x: (
            x.get("confidence", 0),
            1 if x.get("email") else 0,
            1 if x.get("linkedin_url") else 0,
        ), reverse=True)
        
        return contacts
    
    def _post_process_contacts(self, contacts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Post-process contacts to ensure quality and deduplication"""
        if not contacts:
            return contacts
        
        # Deduplicate by normalized name
        seen_names = {}
        unique_contacts = []
        
        for contact in contacts:
            name = (contact.get("full_name") or "").lower().strip()
            name = " ".join(name.split())  # Normalize whitespace
            
            if not name or len(name) < 3:
                continue
            
            if name in seen_names:
                # Merge with existing
                idx = seen_names[name]
                existing = unique_contacts[idx]
                # Update with any missing data
                for field in ["email", "phone", "linkedin_url"]:
                    if not existing.get(field) and contact.get(field):
                        existing[field] = contact[field]
            else:
                seen_names[name] = len(unique_contacts)
                unique_contacts.append(contact)
        
        return unique_contacts
    
    def _assess_merge_quality(
        self,
        apollo_contacts: List[Dict[str, Any]],
        serp_contacts: List[Dict[str, Any]],
        merged_contacts: List[Dict[str, Any]],
    ) -> str:
        """Assess the quality of the merge"""
        if not merged_contacts:
            return "no_data"
        
        # Count contacts with emails
        with_email = sum(1 for c in merged_contacts if c.get("email"))
        with_linkedin = sum(1 for c in merged_contacts if c.get("linkedin_url"))
        with_phone = sum(1 for c in merged_contacts if c.get("phone"))
        
        total = len(merged_contacts)
        
        # Quality assessment
        email_ratio = with_email / total if total > 0 else 0
        
        if email_ratio >= 0.7 and with_linkedin >= total * 0.5:
            return "excellent"
        elif email_ratio >= 0.5 or with_linkedin >= total * 0.7:
            return "good"
        elif email_ratio >= 0.3 or with_linkedin >= total * 0.5:
            return "moderate"
        else:
            return "limited"


# Singleton instance
smart_contact_discovery = SmartContactDiscovery()

