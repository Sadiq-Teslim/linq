#!/usr/bin/env python3
"""
Cron Job Script: Refresh Industry Feed
Runs every 6 hours to fetch latest industry news

Usage:
    python scripts/refresh_feed_cron.py

Or add to crontab:
    0 */6 * * * cd /path/to/backend-api && /usr/bin/python3 scripts/refresh_feed_cron.py >> logs/refresh_feed.log 2>&1
"""
import asyncio
import sys
import os
from pathlib import Path
from datetime import datetime

# Add parent directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Change to backend directory for relative imports
os.chdir(backend_dir)

from app.services.scraper.news import NewsAggregatorService
from app.db.supabase_client import get_supabase_client


async def refresh_feed():
    """Refresh industry news feed"""
    print(f"[{datetime.utcnow()}] Starting feed refresh job...")
    
    supabase = get_supabase_client()
    news_service = NewsAggregatorService()
    
    try:
        # Fetch fresh news items
        new_items = await news_service.fetch_all_feeds()
        print(f"[{datetime.utcnow()}] Fetched {len(new_items)} news items")
        
        items_added = 0
        industry_news_added = 0
        
        for item in new_items:
            # Check if already exists in activity_feed
            existing = supabase.table("activity_feed")\
                .select("id")\
                .eq("headline", item["headline"])\
                .eq("source_name", item.get("source_name", ""))\
                .execute()
            
            if existing.data:
                continue
            
            # Add to activity_feed
            feed_data = {
                "event_type": item.get("event_type", "news"),
                "headline": item["headline"],
                "summary": item.get("summary"),
                "company_name": item.get("company_name"),
                "country": item.get("country"),
                "source_url": item.get("source_url"),
                "source_name": item.get("source_name"),
                "published_at": item["published_at"].isoformat() if item.get("published_at") else None,
                "indexed_at": datetime.utcnow().isoformat(),
            }
            supabase.table("activity_feed").insert(feed_data).execute()
            items_added += 1
            
            # Also add to industry_news table
            industry = "Technology"  # Default
            if item.get("company_name"):
                try:
                    company_result = supabase.table("tracked_companies")\
                        .select("industry")\
                        .ilike("company_name", f"%{item['company_name']}%")\
                        .limit(1)\
                        .execute()
                    if company_result.data and company_result.data[0].get("industry"):
                        industry = company_result.data[0]["industry"]
                except Exception:
                    pass
            
            existing_news = supabase.table("industry_news")\
                .select("id")\
                .eq("headline", item["headline"])\
                .eq("source_name", item.get("source_name", ""))\
                .execute()
            
            if not existing_news.data:
                companies_mentioned = []
                if item.get("company_name"):
                    companies_mentioned.append(item["company_name"])
                
                news_data = {
                    "industry": industry,
                    "news_type": item.get("event_type", "news"),
                    "headline": item["headline"],
                    "summary": item.get("summary"),
                    "companies_mentioned": companies_mentioned,
                    "source_url": item.get("source_url"),
                    "source_name": item.get("source_name"),
                    "published_at": item["published_at"].isoformat() if item.get("published_at") else None,
                    "indexed_at": datetime.utcnow().isoformat(),
                }
                supabase.table("industry_news").insert(news_data).execute()
                industry_news_added += 1
        
        print(f"[{datetime.utcnow()}] Feed refresh completed:")
        print(f"  ✓ Activity feed items added: {items_added}")
        print(f"  ✓ Industry news items added: {industry_news_added}")
        
    except Exception as e:
        print(f"[{datetime.utcnow()}] ERROR: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(refresh_feed())

