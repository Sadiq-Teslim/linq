# Production Cron Job Setup

## For Render.com / Cloud Hosting

If you're using Render.com or similar cloud hosting, use their **Cron Jobs** feature instead of system cron.

### Render.com Setup

1. Go to your Render dashboard
2. Navigate to your backend service
3. Go to **Cron Jobs** section
4. Add two cron jobs:

#### Job 1: Refresh Companies (Every 12 hours)
- **Schedule**: `0 0,12 * * *` (00:00 and 12:00 UTC)
- **Command**: `cd /opt/render/project/src && python3 scripts/refresh_companies_cron.py`
- **Environment**: Production

#### Job 2: Refresh Feed (Every 6 hours)
- **Schedule**: `0 */6 * * *` (Every 6 hours)
- **Command**: `cd /opt/render/project/src && python3 scripts/refresh_feed_cron.py`
- **Environment**: Production

### Alternative: Render Background Worker

Create a separate **Background Worker** service that runs continuously:

```python
# app/workers/scheduler.py
import asyncio
import schedule
import time
from datetime import datetime

async def refresh_companies():
    from scripts.refresh_companies_cron import refresh_all_companies
    await refresh_all_companies()

async def refresh_feed():
    from scripts.refresh_feed_cron import refresh_feed
    await refresh_feed()

def run_scheduler():
    # Schedule jobs
    schedule.every(12).hours.do(lambda: asyncio.run(refresh_companies()))
    schedule.every(6).hours.do(lambda: asyncio.run(refresh_feed()))
    
    while True:
        schedule.run_pending()
        time.sleep(60)  # Check every minute

if __name__ == "__main__":
    run_scheduler()
```

Then create a Background Worker service in Render that runs this script.

## For Linux VPS / Server

### Setup Cron Jobs

1. SSH into your server
2. Edit crontab:
   ```bash
   crontab -e
   ```

3. Add these lines (adjust paths):
   ```bash
   # LINQ Background Jobs
   # Refresh all tracked companies every 12 hours (00:00 and 12:00 UTC)
   0 0,12 * * * cd /path/to/backend-api && /usr/bin/python3 scripts/refresh_companies_cron.py >> logs/refresh_companies.log 2>&1

   # Refresh industry feed every 6 hours
   0 */6 * * * cd /path/to/backend-api && /usr/bin/python3 scripts/refresh_feed_cron.py >> logs/refresh_feed.log 2>&1
   ```

4. Create logs directory:
   ```bash
   mkdir -p /path/to/backend-api/logs
   ```

5. Make scripts executable:
   ```bash
   chmod +x /path/to/backend-api/scripts/*.py
   ```

6. Test cron job manually:
   ```bash
   /usr/bin/python3 /path/to/backend-api/scripts/refresh_companies_cron.py
   ```

### Verify Cron is Running

```bash
# Check cron service
sudo systemctl status cron

# View cron logs
grep CRON /var/log/syslog | tail -20

# Check your crontab
crontab -l
```

## Environment Variables

Ensure these are set in your production environment:

```bash
# Required
SERP_API_KEY=your_key_here
SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key

# Optional but recommended
GEMINI_API_KEY=your_key_here  # For AI insights
```

## Monitoring

### Check Logs

```bash
# Company refresh logs
tail -f logs/refresh_companies.log

# Feed refresh logs
tail -f logs/refresh_feed.log
```

### Health Check Endpoint

Add a health check endpoint to verify cron jobs are running:

```python
@router.get("/health/cron")
def check_cron_status():
    """Check if cron jobs are running"""
    # Check last run time from logs or database
    return {
        "status": "healthy",
        "last_company_refresh": "...",
        "last_feed_refresh": "..."
    }
```

## Troubleshooting

### Cron job not running

1. Check cron service: `sudo systemctl status cron`
2. Check cron logs: `grep CRON /var/log/syslog`
3. Verify script paths are absolute
4. Check file permissions
5. Test script manually first

### Import errors

Ensure Python path is correct:
```python
# In script, add this at the top
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
```

### Database connection errors

Ensure Supabase credentials are set in environment variables, not hardcoded.

## Production Checklist

- [ ] Cron jobs configured (Render Cron Jobs or system cron)
- [ ] Logs directory created
- [ ] Environment variables set
- [ ] Scripts tested manually
- [ ] Logs are being written
- [ ] Monitoring set up
- [ ] Error alerts configured (optional)

