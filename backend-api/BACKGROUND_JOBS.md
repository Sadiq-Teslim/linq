# Background Jobs & Automated Data Fetching

This document describes how the LINQ platform automatically fetches industry news and company details.

## Overview

The LINQ platform uses automated background jobs to:
1. **Fetch Industry News** - Continuously aggregates news from RSS feeds and web sources
2. **Update Tracked Companies** - Fetches latest information, contacts, and news about tracked companies
3. **Populate Industry Feed** - Ensures the `industry_news` table is always up-to-date

## Current Implementation

### 1. Industry News Fetching

**Endpoint:** `GET /api/v1/feed/refresh`

**What it does:**
- Fetches news from configured RSS feeds (TechCabal, Disrupt Africa, TechPoint Africa, etc.)
- Stores news in both `activity_feed` and `industry_news` tables
- Classifies news by event type (funding, partnership, hiring, expansion)
- Extracts company names and industries from headlines
- Prioritizes news about tracked companies

**How to trigger:**
- **Manual:** Call the endpoint via API
- **Automatic:** Extension automatically triggers on page load
- **Scheduled:** Set up a cron job or background task (see below)

### 2. Company Data Refresh

**Endpoint:** `POST /api/v1/companies/{company_id}/refresh`

**What it does:**
- Searches Google News for recent updates about the company
- Creates `company_updates` records for relevant news
- Updates company's `last_updated` timestamp
- Can be triggered manually or automatically based on `update_frequency`

**How to trigger:**
- **Manual:** User clicks "Refresh" button in extension
- **Automatic:** Based on company's `update_frequency` setting (daily/weekly/monthly)

## Setting Up Automated Background Jobs

### Option 1: Cron Job (Recommended for Production)

Create a cron job to run the feed refresh every hour:

```bash
# Add to crontab (crontab -e)
0 * * * * curl -X GET "https://your-api-url.com/api/v1/feed/refresh" -H "Authorization: Bearer YOUR_SERVICE_TOKEN"
```

### Option 2: Python Background Task (Using APScheduler)

Create a background task file:

```python
# app/tasks/background_jobs.py
from apscheduler.schedulers.background import BackgroundScheduler
from app.services.scraper.news import NewsAggregatorService
from app.db.supabase_client import get_supabase_client

scheduler = BackgroundScheduler()

async def refresh_industry_feed():
    """Refresh industry news feed every hour"""
    news_service = NewsAggregatorService()
    supabase = get_supabase_client()
    
    new_items = await news_service.fetch_all_feeds()
    # ... (same logic as in feed.py endpoint)
    
    print(f"Refreshed feed: {len(new_items)} new items")

async def refresh_tracked_companies():
    """Refresh all tracked companies based on their update frequency"""
    supabase = get_supabase_client()
    
    # Get companies that need updating
    now = datetime.utcnow()
    companies = supabase.table("tracked_companies")\
        .select("*")\
        .eq("is_active", True)\
        .lte("next_update_at", now.isoformat())\
        .execute()
    
    for company in companies.data:
        # Call refresh endpoint logic
        await refresh_company_data(company["id"])

# Schedule jobs
scheduler.add_job(refresh_industry_feed, 'interval', hours=1)
scheduler.add_job(refresh_tracked_companies, 'interval', hours=6)

scheduler.start()
```

### Option 3: Celery (For Distributed Systems)

If using Celery for task queues:

```python
# app/tasks/celery_tasks.py
from celery import Celery
from app.services.scraper.news import NewsAggregatorService

celery_app = Celery('linq_tasks')

@celery_app.task
def refresh_industry_feed_task():
    """Celery task to refresh industry feed"""
    # Same logic as endpoint
    pass

@celery_app.task
def refresh_company_task(company_id: int):
    """Celery task to refresh a specific company"""
    # Same logic as refresh endpoint
    pass

# Schedule in celerybeat
CELERYBEAT_SCHEDULE = {
    'refresh-industry-feed': {
        'task': 'app.tasks.celery_tasks.refresh_industry_feed_task',
        'schedule': crontab(hour='*', minute=0),  # Every hour
    },
    'refresh-companies': {
        'task': 'app.tasks.celery_tasks.refresh_all_companies',
        'schedule': crontab(hour='*/6', minute=0),  # Every 6 hours
    },
}
```

## Extension Auto-Refresh

The Chrome extension automatically triggers feed refresh on page load:

```typescript
// frontend-extension/src/pages/popup/PopupPage.tsx
useEffect(() => {
  // ... fetch data ...
  
  // Trigger feed refresh in background
  fetch('/api/v1/feed/refresh', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
}, []);
```

## Data Flow

```
┌─────────────────┐
│  RSS Feeds      │
│  (TechCabal,    │
│   Disrupt, etc) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ NewsAggregator  │
│ Service         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│ activity_feed   │─────▶│ industry_news     │
│ (general feed)  │      │ (industry-specific)│
└─────────────────┘      └──────────────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ Extension Feed   │
                         │ (prioritized by  │
                         │  tracked cos)    │
                         └──────────────────┘

┌─────────────────┐
│ Tracked Company │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Google Search   │
│ Service         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ company_updates │
│ (news, funding, │
│  hiring, etc)   │
└─────────────────┘
```

## Next Steps

1. **Set up cron job** or background task scheduler
2. **Configure API keys** for SerpAPI (for company search)
3. **Monitor job execution** and error logs
4. **Adjust refresh frequency** based on usage patterns

## Environment Variables

Ensure these are set:
- `SERP_API_KEY` - For Google Search/News API
- `CLEARBIT_API_KEY` - (Optional) For company enrichment
- `HUNTER_API_KEY` - (Optional) For contact discovery

