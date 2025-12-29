#!/usr/bin/env python3
"""
Cron Job Script: Refresh All Tracked Companies
Runs every 12 hours to fetch latest data, contacts, and updates for all tracked companies

Usage:
    python scripts/refresh_companies_cron.py

Or add to crontab:
    0 0,12 * * * cd /path/to/backend-api && /usr/bin/python3 scripts/refresh_companies_cron.py >> logs/refresh_companies.log 2>&1
"""
import asyncio
import sys
import os
from datetime import datetime
from pathlib import Path

# Add parent directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Change to backend directory for relative imports
os.chdir(backend_dir)

from app.db.supabase_client import get_supabase_client
from app.services.scraper.google import GoogleSearchService
from app.services.contact_discovery_service import contact_discovery_service
from app.core.config import settings


async def refresh_all_companies():
    """Refresh all active tracked companies"""
    print(f"[{datetime.utcnow()}] Starting company refresh job...")
    
    supabase = get_supabase_client()
    google_service = GoogleSearchService()
    
    # Get all active tracked companies
    companies_result = supabase.table("tracked_companies")\
        .select("*")\
        .eq("is_active", True)\
        .execute()
    
    companies = companies_result.data if companies_result.data else []
    
    if not companies:
        print(f"[{datetime.utcnow()}] No active companies to refresh.")
        return
    
    print(f"[{datetime.utcnow()}] Found {len(companies)} companies to refresh.")
    
    refreshed_count = 0
    error_count = 0
    
    for company in companies:
        try:
            company_id = company["id"]
            company_name = company.get("company_name", "")
            company_domain = company.get("domain", "")
            
            print(f"[{datetime.utcnow()}] Refreshing: {company_name} (ID: {company_id})")
            
            now = datetime.utcnow()
            
            # 1. Fetch company news/updates
            try:
                company_news = await google_service.search_company_news(company_name, "Nigeria")
                
                for news_item in company_news[:5]:
                    existing_update = supabase.table("company_updates")\
                        .select("id")\
                        .eq("company_id", company_id)\
                        .eq("title", news_item.get("title", ""))\
                        .execute()
                    
                    if not existing_update.data:
                        update_type = "news"
                        title_lower = news_item.get("title", "").lower()
                        if any(kw in title_lower for kw in ["funding", "raised", "investment"]):
                            update_type = "funding"
                        elif any(kw in title_lower for kw in ["hiring", "recruit", "jobs"]):
                            update_type = "hiring"
                        elif any(kw in title_lower for kw in ["partnership", "partner"]):
                            update_type = "partnership"
                        elif any(kw in title_lower for kw in ["expansion", "launch"]):
                            update_type = "expansion"
                        
                        update_data = {
                            "company_id": company_id,
                            "update_type": update_type,
                            "title": news_item.get("title", ""),
                            "summary": news_item.get("snippet", ""),
                            "source_url": news_item.get("link"),
                            "source_name": news_item.get("source", "Google News"),
                            "importance": "medium",
                            "is_read": False,
                            "detected_at": now.isoformat(),
                            "published_at": news_item.get("date"),
                            "created_at": now.isoformat(),
                        }
                        supabase.table("company_updates").insert(update_data).execute()
                        print(f"  ✓ Added update: {news_item.get('title', '')[:50]}")
            except Exception as e:
                print(f"  ✗ Error fetching news: {e}")
            
            # 2. Discover contacts (head officers and sales department heads)
            try:
                discovered_contacts = await contact_discovery_service.discover_contacts(
                    company_name=company_name,
                    domain=company_domain,
                    country="Nigeria",
                )
                
                contacts_added = 0
                for contact_data in discovered_contacts:
                    # Skip contacts without a valid full_name (required by database)
                    full_name = contact_data.get("full_name") or contact_data.get("name")
                    if not full_name or not full_name.strip():
                        # Try to generate a name from email if available
                        email = contact_data.get("email")
                        if email:
                            # Extract name from email (e.g., "john.doe@company.com" -> "John Doe")
                            email_local = email.split("@")[0]
                            # Replace dots/underscores with spaces and capitalize
                            full_name = email_local.replace(".", " ").replace("_", " ").title()
                        else:
                            # Skip contacts without name or email
                            continue
                    
                    existing_contact = supabase.table("company_contacts")\
                        .select("id")\
                        .eq("company_id", company_id)\
                        .eq("full_name", full_name)\
                        .execute()
                    
                    if not existing_contact.data:
                        contact_record = {
                            "company_id": company_id,
                            "full_name": full_name.strip(),  # Ensure it's a valid string
                            "title": contact_data.get("title"),
                            "department": contact_data.get("department", "other"),
                            "email": contact_data.get("email"),
                            "phone": contact_data.get("phone"),
                            "linkedin_url": contact_data.get("linkedin_url"),
                            "is_decision_maker": contact_data.get("is_decision_maker", False),
                            "is_verified": False,
                            "verification_score": contact_data.get("confidence_score", 0.5),
                            "source": contact_data.get("source", "automated"),
                            "is_active": True,
                            "created_at": now.isoformat(),
                            "updated_at": now.isoformat(),
                        }
                        supabase.table("company_contacts").insert(contact_record).execute()
                        contacts_added += 1
                        print(f"  ✓ Added contact: {full_name} - {contact_data.get('title')}")
                
                if contacts_added > 0:
                    print(f"  ✓ Added {contacts_added} new contacts")
            except Exception as e:
                print(f"  ✗ Error discovering contacts: {e}")
            
            # 3. Update company timestamp
            supabase.table("tracked_companies").update({
                "last_updated": now.isoformat(),
                "updated_at": now.isoformat(),
            }).eq("id", company_id).execute()
            
            refreshed_count += 1
            print(f"  ✓ Successfully refreshed {company_name}")
            
            # Small delay to avoid rate limiting
            await asyncio.sleep(2)
            
        except Exception as e:
            error_count += 1
            print(f"  ✗ Error refreshing {company.get('company_name', 'Unknown')}: {e}")
            continue
    
    print(f"\n[{datetime.utcnow()}] Refresh job completed:")
    print(f"  ✓ Successfully refreshed: {refreshed_count}")
    print(f"  ✗ Errors: {error_count}")
    print(f"  Total companies: {len(companies)}")


if __name__ == "__main__":
    # Check if SERP_API_KEY is set
    if not settings.SERP_API_KEY:
        print("ERROR: SERP_API_KEY not set in environment variables")
        sys.exit(1)
    
    # Run the refresh job
    asyncio.run(refresh_all_companies())

