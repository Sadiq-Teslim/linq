"""
Hunter.io API integration for email finding and verification
Excellent for finding people + positions + contact info
"""
from typing import List, Dict, Any, Optional
import aiohttp
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.services.cache.redis_client import redis_cache


class HunterService:
    """
    Hunter.io API client for email discovery and verification
    API Documentation: https://hunter.io/api-documentation
    """
    
    BASE_URL = "https://api.hunter.io/v2"
    
    def __init__(self):
        self.api_key = settings.HUNTER_API_KEY
        self.enabled = bool(self.api_key)
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def find_emails(
        self,
        company_domain: str,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        seniority: Optional[str] = None,
        department: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Find emails for people at a company domain
        """
        if not self.enabled or not company_domain:
            return []
        
        cache_key = f"hunter:emails:{company_domain}:{first_name}:{last_name}"
        
        # Try cache first
        cached = await redis_cache.get(cache_key)
        if cached:
            return cached
        
        try:
            url = f"{self.BASE_URL}/domain-search"
            params = {
                "api_key": self.api_key,
                "domain": company_domain,
            }
            
            if first_name:
                params["first_name"] = first_name
            if last_name:
                params["last_name"] = last_name
            if seniority:
                params["seniority"] = seniority
            if department:
                params["department"] = department
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        emails = []
                        for email_data in data.get("data", {}).get("emails", []):
                            emails.append({
                                "email": email_data.get("value"),
                                "first_name": email_data.get("first_name"),
                                "last_name": email_data.get("last_name"),
                                "position": email_data.get("position"),
                                "seniority": email_data.get("seniority"),
                                "department": email_data.get("department"),
                                "linkedin_url": email_data.get("linkedin"),
                                "twitter_url": email_data.get("twitter"),
                                "phone_number": email_data.get("phone_number"),
                                "confidence_score": email_data.get("confidence"),
                                "sources": email_data.get("sources", []),
                                "verification_status": email_data.get("verification", {}).get("status"),
                            })
                        
                        # Cache for 7 days (emails don't change often)
                        await redis_cache.set(cache_key, emails, ttl=604800)
                        return emails
        except Exception as e:
            print(f"Hunter.io API error: {e}")
        
        return []
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def verify_email(self, email: str) -> Dict[str, Any]:
        """
        Verify an email address
        Returns: verification status, score, sources
        """
        if not self.enabled:
            return {"status": "unknown", "score": 0}
        
        cache_key = f"hunter:verify:{email.lower()}"
        
        # Try cache first
        cached = await redis_cache.get(cache_key)
        if cached:
            return cached
        
        try:
            url = f"{self.BASE_URL}/email-verifier"
            params = {
                "api_key": self.api_key,
                "email": email,
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        verification = {
                            "status": data.get("data", {}).get("result"),
                            "score": data.get("data", {}).get("score"),
                            "sources": data.get("data", {}).get("sources", []),
                            "disposable": data.get("data", {}).get("disposable", False),
                            "webmail": data.get("data", {}).get("webmail", False),
                        }
                        
                        # Cache for 30 days (verification doesn't change)
                        await redis_cache.set(cache_key, verification, ttl=2592000)
                        return verification
        except Exception as e:
            print(f"Hunter.io verification error: {e}")
        
        return {"status": "unknown", "score": 0}
    
    async def find_person_email(
        self,
        first_name: str,
        last_name: str,
        company_domain: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Find email for a specific person
        """
        emails = await self.find_emails(
            company_domain=company_domain,
            first_name=first_name,
            last_name=last_name,
        )
        
        if emails:
            # Return the highest confidence email
            return max(emails, key=lambda x: x.get("confidence_score", 0))
        
        return None

