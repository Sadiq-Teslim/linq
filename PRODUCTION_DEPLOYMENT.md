# Production Deployment Guide

## ✅ Completed Enhancements

### 1. Enhanced Gemini AI Integration
- **Company Insights**: Strategic insights, relationship opportunities, action recommendations
- **Update Analysis**: Context and implications for company updates
- **Outreach Suggestions**: Personalized cold outreach templates
- **Model**: Using `gemini-1.5-flash` (fast and cost-effective)

### 2. Contact Discovery System
- **Automatic Discovery**: Searches LinkedIn, company websites, Google, business directories
- **Target Roles**: Head officers (CEO, Founder, MD) and Sales department heads
- **Data Retrieved**: Name, title, email, phone, LinkedIn URL, decision maker status
- **Confidence Scoring**: Each contact has a confidence score (0.0-1.0)

### 3. Automated Background Jobs
- **Company Refresh**: Every 12 hours (00:00 and 12:00 UTC)
- **Feed Refresh**: Every 6 hours
- **Scripts**: Production-ready with error handling and logging

## 🚀 Production Setup

### For Render.com

#### Option 1: Using render.yaml (Recommended)
The `render.yaml` file is configured with cron jobs. When deploying:
1. Render will automatically create the cron jobs
2. Ensure environment variables are set in Render dashboard

#### Option 2: Manual Setup
1. Go to Render Dashboard → **New** → **Cron Job**
2. Create two cron jobs:

**Cron Job 1: Refresh Companies**
- Name: `refresh-companies`
- Schedule: `0 0,12 * * *`
- Command: `python scripts/refresh_companies_cron.py`
- Environment Variables: Copy from web service

**Cron Job 2: Refresh Feed**
- Name: `refresh-feed`
- Schedule: `0 */6 * * *`
- Command: `python scripts/refresh_feed_cron.py`
- Environment Variables: Copy from web service

### Required Environment Variables

```bash
# Required
SERP_API_KEY=your_key_here
SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
SUPABASE_ANON_KEY=your_key

# Optional but Recommended
GEMINI_API_KEY=your_key_here  # For AI insights

# Payment
PAYSTACK_SECRET_KEY=your_key
PAYSTACK_PUBLIC_KEY=your_key

# Auth
SECRET_KEY=your_secret_key_min_32_chars
```

## 📋 Pre-Deployment Checklist

- [x] Extension builds successfully
- [x] Cron scripts are production-ready
- [x] AI insights integrated
- [x] Contact discovery working
- [x] Production cron configuration documented
- [ ] Environment variables set in production
- [ ] Cron jobs configured in Render
- [ ] Database tables created (tracked_companies, company_contacts, etc.)
- [ ] Test cron jobs manually first

## 🔍 Testing

### Test Cron Scripts Locally

```bash
# Test company refresh
cd backend-api
python scripts/refresh_companies_cron.py

# Test feed refresh
python scripts/refresh_feed_cron.py
```

### Verify Extension Build

```bash
cd frontend-extension
npm run build
# Check dist/ folder for output
```

## 📊 What Happens Automatically

### Every 12 Hours (Company Refresh)
1. Fetches latest news for all tracked companies
2. Discovers contacts (executives and sales leaders)
3. Stores contacts in database
4. Updates company timestamps
5. Generates AI insights (if GEMINI_API_KEY is set)

### Every 6 Hours (Feed Refresh)
1. Fetches news from RSS feeds
2. Stores in activity_feed and industry_news tables
3. Prioritizes news about tracked companies

## 🐛 Troubleshooting

### Cron Jobs Not Running
- Check Render cron job logs
- Verify environment variables are set
- Test scripts manually first
- Check SERP_API_KEY is valid

### No Contacts Found
- Verify SERP_API_KEY is set and valid
- Check company has domain or LinkedIn presence
- Review logs for API errors

### AI Insights Not Showing
- Verify GEMINI_API_KEY is set (optional)
- Check logs for API errors
- System works without AI, just shows basic info

## 📝 Files Created/Modified

### New Files
- `app/services/contact_discovery_service.py` - Contact discovery
- `scripts/refresh_companies_cron.py` - Company refresh cron
- `scripts/refresh_feed_cron.py` - Feed refresh cron
- `scripts/setup_cron.sh` - Automated cron setup
- `scripts/README.md` - Scripts documentation
- `scripts/production_cron_setup.md` - Production setup guide
- `CONTACT_DISCOVERY_SETUP.md` - Contact discovery guide
- `API_KEYS_REQUIRED.md` - API keys documentation
- `render.yaml` - Render.com configuration

### Enhanced Files
- `app/services/llm/client.py` - Enhanced Gemini AI features
- `app/services/llm/prompts.py` - New AI prompts
- `app/api/v1/endpoints/companies.py` - Contact discovery integration
- `app/api/v1/endpoints/feed.py` - Industry news prioritization
- `app/schemas/company.py` - Added ai_insights field

## 🎯 Next Steps

1. **Set Environment Variables** in Render dashboard
2. **Create Cron Jobs** in Render (or use render.yaml)
3. **Run Database Migrations** (create_tracked_companies_tables.sql)
4. **Test Manually** before relying on cron
5. **Monitor Logs** for first few runs

## 📞 Support

If issues arise:
1. Check Render logs
2. Verify environment variables
3. Test scripts manually
4. Review error messages in logs

