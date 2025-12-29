# Contact Discovery & Automated Refresh Setup

## Overview

The LINQ platform now automatically discovers and stores contact details for tracked companies, focusing on:
- **Head Officers**: CEOs, Founders, Managing Directors, Presidents
- **Sales Department Heads**: Head of Sales, Sales Directors, VP Sales, CROs

## How It Works

### Contact Discovery Service

The `ContactDiscoveryService` searches multiple sources:

1. **LinkedIn** (via SerpAPI)
   - Searches for executives and sales leaders
   - Extracts names, titles, and LinkedIn profiles

2. **Company Websites**
   - Scans team/leadership pages
   - Extracts contact information

3. **Google Search**
   - Finds executive profiles
   - Discovers contact pages

4. **Business Directories**
   - Searches Crunchbase and similar directories
   - Finds company leadership information

### Data Retrieved

For each contact discovered:
- Full Name
- Title/Position
- Department (executive or sales)
- Email (when available)
- Phone (when available)
- LinkedIn URL
- Decision Maker Status
- Confidence Score
- Source

## Setup Instructions

### 1. Ensure API Key is Set

Add to your `.env` file:
```bash
SERP_API_KEY=your_serpapi_key_here
```

### 2. Set Up Cron Jobs

#### Option A: Automated Setup (Recommended)

```bash
cd backend-api
chmod +x scripts/setup_cron.sh
./scripts/setup_cron.sh
```

#### Option B: Manual Setup

Edit crontab:
```bash
crontab -e
```

Add these lines:
```bash
# Refresh all companies every 12 hours (00:00 and 12:00)
0 0,12 * * * cd /path/to/backend-api && python3 scripts/refresh_companies_cron.py >> logs/refresh_companies.log 2>&1

# Refresh industry feed every 6 hours
0 */6 * * * cd /path/to/backend-api && python3 scripts/refresh_feed_cron.py >> logs/refresh_feed.log 2>&1
```

### 3. Create Logs Directory

```bash
mkdir -p backend-api/logs
```

### 4. Test the Scripts

Before setting up cron, test manually:

```bash
# Test company refresh
python3 scripts/refresh_companies_cron.py

# Test feed refresh
python3 scripts/refresh_feed_cron.py
```

## What Happens Every 12 Hours

1. **Fetches Latest News**
   - Searches Google News for each tracked company
   - Creates `company_updates` records

2. **Discovers Contacts**
   - Searches LinkedIn for executives and sales leaders
   - Scans company websites
   - Searches Google and business directories
   - Stores contacts in `company_contacts` table

3. **Updates Timestamps**
   - Updates `last_updated` for each company
   - Tracks when data was last refreshed

## Manual Refresh

Users can also manually refresh a company:

1. **Via Extension**: Click "Refresh" button on company card
2. **Via API**: `POST /api/v1/companies/{company_id}/refresh`

## Viewing Contacts

Contacts are automatically displayed in:
- Company detail view in extension
- Dashboard company pages
- API responses for company details

## Monitoring

Check logs to monitor the cron jobs:

```bash
# View company refresh logs
tail -f logs/refresh_companies.log

# View feed refresh logs
tail -f logs/refresh_feed.log
```

## Troubleshooting

### No contacts found

- Check `SERP_API_KEY` is set correctly
- Verify company has a domain or LinkedIn presence
- Check logs for API errors

### Cron job not running

- Verify cron service is running: `sudo service cron status`
- Check cron logs: `grep CRON /var/log/syslog`
- Ensure script paths are absolute in crontab

### Rate limiting

- SerpAPI has rate limits based on your plan
- Scripts include delays between requests
- Consider upgrading SerpAPI plan for higher limits

## Next Steps

1. ✅ Set up cron jobs
2. ✅ Monitor first run
3. ✅ Verify contacts are being discovered
4. ✅ Check extension displays contacts correctly

## Additional APIs (Optional)

For enhanced contact discovery, you can add:

- **Clearbit**: Company enrichment (`CLEARBIT_API_KEY`)
- **Hunter.io**: Email finding (`HUNTER_API_KEY`)
- **Apollo.io**: Contact discovery (`APOLLO_API_KEY`)

These can be added to the `ContactDiscoveryService` for even better results.

