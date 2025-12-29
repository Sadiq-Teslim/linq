# Setup Guide: Enhanced Data Collection System

## Quick Start

### 1. Install Dependencies

```bash
cd backend-api
pip install -r requirements.txt
```

### 2. Install Additional Tools

```bash
# Install Playwright browsers (after pip install completes)
python -m playwright install chromium

# Install SpaCy English model
python -m spacy download en_core_web_sm
```

**Note**: On Windows, use `python -m playwright` instead of just `playwright` command.

### 3. Set Up Redis

#### Option A: Local Redis (Development)
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Windows
# Download from: https://github.com/microsoftarchive/redis/releases
# Or use WSL
```

#### Option B: Cloud Redis (Production)
- **Render**: Add Redis service in dashboard
- **Redis Cloud**: Free tier available at https://redis.com/try-free/
- **Upstash**: Serverless Redis at https://upstash.com/

### 4. Configure Environment Variables

Add to your `.env` file:

```bash
# Core APIs (Required)
SERP_API_KEY=your_serpapi_key
GEMINI_API_KEY=your_gemini_key

# Enhanced Data Sources (Optional but Recommended)
CRUNCHBASE_API_KEY=your_crunchbase_key
HUNTER_API_KEY=your_hunter_key
SCRAPERAPI_KEY=your_scraperapi_key

# Redis (Required for caching)
REDIS_URL=redis://localhost:6379/0

# Celery (Required for background jobs)
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Optional: LinkedIn
LINKEDIN_API_KEY=your_linkedin_key  # If you have API access
LINKEDIN_SESSION_COOKIE=your_cookie  # Alternative method
```

### 5. Get API Keys

#### Crunchbase API
1. Go to https://data.crunchbase.com/
2. Sign up for API access
3. Get your API key from dashboard

#### Hunter.io API
1. Go to https://hunter.io/
2. Sign up (free tier: 25 requests/month)
3. Get API key from account settings

#### ScraperAPI
1. Go to https://www.scraperapi.com/
2. Sign up (free tier: 1,000 requests/month)
3. Get API key from dashboard

#### LinkedIn API (Optional)
- LinkedIn API access is restricted
- Requires partnership application
- Alternative: Use SerpAPI LinkedIn search (already configured)

### 6. Test the System

```python
# Test Redis connection
from app.services.cache.redis_client import redis_cache
await redis_cache.connect()
await redis_cache.set("test", "value")
print(await redis_cache.get("test"))  # Should print "value"

# Test contact discovery
from app.services.contact_discovery_service import ContactDiscoveryService
service = ContactDiscoveryService()
contacts = await service.discover_contacts(
    company_name="Zenith Bank",
    company_domain="zenithbank.com",
    country="Nigeria"
)
print(f"Found {len(contacts)} contacts")
```

## Production Deployment

### Render.com Setup

1. **Add Redis Service**
   - Go to Render Dashboard
   - Click "New" → "Redis"
   - Copy the Redis URL

2. **Update Environment Variables**
   - Add all API keys
   - Set `REDIS_URL` to your Render Redis URL
   - Set `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND` to same URL

3. **Set Up Celery Workers** (Optional)
   - Create a new Background Worker
   - Command: `celery -A app.core.celery_app worker --loglevel=info`
   - Use same environment variables as web service

### Database Indexing

Run these SQL commands in Supabase:

```sql
-- Index for faster company searches
CREATE INDEX IF NOT EXISTS idx_tracked_companies_org_id ON tracked_companies(organization_id);
CREATE INDEX IF NOT EXISTS idx_tracked_companies_domain ON tracked_companies(domain);
CREATE INDEX IF NOT EXISTS idx_tracked_companies_name ON tracked_companies(company_name);

-- Index for contacts
CREATE INDEX IF NOT EXISTS idx_company_contacts_company_id ON company_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_company_contacts_email ON company_contacts(email);

-- Index for updates
CREATE INDEX IF NOT EXISTS idx_company_updates_company_id ON company_updates(company_id);
CREATE INDEX IF NOT EXISTS idx_company_updates_created_at ON company_updates(created_at DESC);
```

## Performance Tuning

### Cache TTL Configuration

Adjust in `.env`:
```bash
REDIS_CACHE_TTL=3600  # 1 hour default
```

Or per-cache in code:
```python
await redis_cache.set("key", data, ttl=86400)  # 24 hours
```

### Parallel Request Limits

The system automatically limits parallel requests to avoid rate limits:
- SerpAPI: 10 concurrent requests
- Hunter.io: 5 concurrent requests
- Crunchbase: 3 concurrent requests

## Monitoring

### Check Redis Cache Hit Rate

```python
# In your code
cache_stats = await redis_cache.redis_client.info("stats")
print(f"Cache hits: {cache_stats.get('keyspace_hits', 0)}")
print(f"Cache misses: {cache_stats.get('keyspace_misses', 0)}")
```

### Monitor API Usage

Check logs for:
- Which data sources are active
- API errors and retries
- Cache hits vs misses

## Troubleshooting

### Redis Connection Issues
- Check `REDIS_URL` is correct
- Ensure Redis is running
- System degrades gracefully (continues without cache)

### Playwright Issues
- Run: `playwright install chromium`
- Check browser is installed correctly

### SpaCy Model Missing
- Run: `python -m spacy download en_core_web_sm`
- System falls back to basic extraction

### API Rate Limits
- System automatically retries with exponential backoff
- Check API dashboard for usage
- Consider upgrading API plans

## Cost Optimization

### Estimated Monthly Costs (with caching)

**Without Caching:**
- SerpAPI: ~$50-100/month
- Hunter.io: ~$49/month (Starter plan)
- Crunchbase: ~$99/month (Basic plan)
- ScraperAPI: ~$29/month (Hobby plan)
- **Total: ~$227-277/month**

**With Caching (70-90% reduction):**
- SerpAPI: ~$5-30/month
- Hunter.io: ~$49/month (same, but fewer calls)
- Crunchbase: ~$99/month (same)
- ScraperAPI: ~$29/month (same)
- **Total: ~$182-207/month**

**Savings: ~$45-70/month** (20-25% reduction)

Plus:
- Faster response times
- Better reliability
- Higher success rates

## Next Steps

1. ✅ Install all dependencies
2. ✅ Set up Redis
3. ✅ Configure API keys
4. ✅ Test contact discovery
5. ⏳ Set up Celery workers (optional)
6. ⏳ Add database indexes
7. ⏳ Monitor performance

