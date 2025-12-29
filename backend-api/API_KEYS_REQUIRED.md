# Required API Keys

## ✅ Currently Required

### 1. `SERP_API_KEY` ⭐ **REQUIRED**

- **Purpose**: Used for all search and discovery operations
- **Used for**:
  - Company search (finding companies to track)
  - Contact discovery (LinkedIn, Google searches)
  - Company news/updates search
  - Business directory searches
- **Status**: ✅ Already set in your environment
- **Where to get**: https://serpapi.com/

## 🔵 Optional (Not Currently Implemented)

These are defined in the config but **not yet implemented** in the code. They're placeholders for future enhancements:

### 2. `CLEARBIT_API_KEY` (Optional)

- **Purpose**: Company data enrichment (beyond what SerpAPI provides)
- **Status**: ❌ Not implemented yet
- **Note**: The code currently uses the free Clearbit Logo API (no key needed) for logos
- **Where to get**: https://clearbit.com/ (if you want to add this later)

### 3. `HUNTER_API_KEY` (Optional)

- **Purpose**: Email finding and verification
- **Status**: ❌ Not implemented yet
- **Where to get**: https://hunter.io/ (if you want to add this later)

### 4. `APOLLO_API_KEY` (Optional)

- **Purpose**: Enhanced contact discovery
- **Status**: ❌ Not implemented yet
- **Where to get**: https://www.apollo.io/ (if you want to add this later)

### 5. `GEMINI_API_KEY` (Optional)

- **Purpose**: AI features (if you're using AI summaries/insights)
- **Status**: ⚠️ Partially implemented (used in LLM service)
- **Required for**: AI-generated company insights (optional feature)
- **Where to get**: https://ai.google.dev/

## Summary

**For contact discovery and company refresh to work, you only need:**

- ✅ `SERP_API_KEY` (already set)

**All other keys are optional and can be added later if you want enhanced features.**

## Current Implementation Status

| Feature            | API Key Needed       | Status             |
| ------------------ | -------------------- | ------------------ |
| Company Search     | SERP_API_KEY         | ✅ Working         |
| Contact Discovery  | SERP_API_KEY         | ✅ Working         |
| Company News       | SERP_API_KEY         | ✅ Working         |
| Logo Fetching      | None (free Clearbit) | ✅ Working         |
| Email Finding      | HUNTER_API_KEY       | ❌ Not implemented |
| Enhanced Contacts  | APOLLO_API_KEY       | ❌ Not implemented |
| Company Enrichment | CLEARBIT_API_KEY     | ❌ Not implemented |
| AI Insights        | GEMINI_API_KEY       | ⚠️ Optional        |

## Next Steps

1. ✅ **You're all set!** SERP_API_KEY is already configured
2. The contact discovery will work with just SerpAPI
3. Optional keys can be added later if you want to enhance the system
