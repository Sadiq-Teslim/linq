# Redis Production Setup Guide

## Overview

Redis is used for:
1. **Caching API responses** - Reduces costs by 70-90%
2. **Celery broker** - Background job processing
3. **Session storage** - Fast session lookups

## Option 1: Render.com Redis (Recommended)

### Step 1: Create Redis Service

1. Go to your Render.com dashboard
2. Click **"New +"** → **"Redis"**
3. Configure:
   - **Name**: `linq-redis` (or your preferred name)
   - **Plan**: Start with **Free** (25MB) or **Starter** ($10/month, 25MB)
   - **Region**: Same as your web service
4. Click **"Create Redis"**

### Step 2: Get Redis URL

After creation, Render provides:
- **Internal Redis URL**: `redis://red-xxxxx:6379`
- **External Redis URL**: `redis://red-xxxxx.render.com:6379`

**Use the Internal URL** for services on Render (faster, no egress charges).

### Step 3: Add Environment Variables

In your **Web Service** environment variables:

```bash
REDIS_URL=redis://red-xxxxx:6379/0
CELERY_BROKER_URL=redis://red-xxxxx:6379/0
CELERY_RESULT_BACKEND=redis://red-xxxxx:6379/0
```

**Important**: Replace `red-xxxxx` with your actual Redis instance name.

### Step 4: Update render.yaml (Optional)

Add Redis URL to your `render.yaml`:

```yaml
services:
  - type: web
    name: linq-backend-api
    envVars:
      - key: REDIS_URL
        fromService:
          type: redis
          name: linq-redis
          property: connectionString
      - key: CELERY_BROKER_URL
        fromService:
          type: redis
          name: linq-redis
          property: connectionString
      - key: CELERY_RESULT_BACKEND
        fromService:
          type: redis
          name: linq-redis
          property: connectionString
```

This automatically syncs the Redis URL when the Redis service is created.

### Step 5: Verify Connection

After deployment, check logs for:
```
✓ Redis connected successfully
```

If you see:
```
⚠ Redis connection failed: ...
```

Check:
- Redis service is running
- Environment variables are set correctly
- Redis URL format is correct

## Option 2: Upstash Redis (Serverless)

### Step 1: Create Upstash Account

1. Go to https://upstash.com/
2. Sign up (free tier available)
3. Create a new Redis database

### Step 2: Get Connection Details

Upstash provides:
- **Endpoint**: `xxxxx.upstash.io`
- **Port**: `6379` (or `6380` for TLS)
- **Password**: Auto-generated

### Step 3: Build Redis URL

For TLS (recommended):
```
rediss://default:YOUR_PASSWORD@xxxxx.upstash.io:6380
```

For non-TLS:
```
redis://default:YOUR_PASSWORD@xxxxx.upstash.io:6379
```

### Step 4: Add to Render Environment Variables

```bash
REDIS_URL=rediss://default:YOUR_PASSWORD@xxxxx.upstash.io:6380
CELERY_BROKER_URL=rediss://default:YOUR_PASSWORD@xxxxx.upstash.io:6380
CELERY_RESULT_BACKEND=rediss://default:YOUR_PASSWORD@xxxxx.upstash.io:6380
```

## Option 3: Redis Cloud (Managed)

### Step 1: Create Redis Cloud Account

1. Go to https://redis.com/try-free/
2. Sign up for free tier (30MB)
3. Create a database

### Step 2: Get Connection Details

Redis Cloud provides:
- **Endpoint**: `redis-xxxxx.cloud.redislabs.com`
- **Port**: `xxxxx`
- **Password**: Your database password

### Step 3: Build Redis URL

```
redis://default:YOUR_PASSWORD@redis-xxxxx.cloud.redislabs.com:xxxxx
```

### Step 4: Add to Render Environment Variables

Same as Upstash above.

## Testing Redis Connection

### Method 1: Check Application Logs

After deployment, your app should log:
```
✓ Redis connected successfully
```

### Method 2: Test via API (if you add a test endpoint)

```python
# In your FastAPI app
@app.get("/api/v1/test/redis")
async def test_redis():
    from app.services.cache.redis_client import redis_cache
    await redis_cache.connect()
    await redis_cache.set("test", "value", ttl=60)
    value = await redis_cache.get("test")
    return {"status": "connected", "test_value": value}
```

### Method 3: Use Redis CLI (if accessible)

```bash
redis-cli -u redis://red-xxxxx:6379
> PING
PONG
> SET test "value"
OK
> GET test
"value"
```

## Production Checklist

- [ ] Redis service created and running
- [ ] `REDIS_URL` environment variable set
- [ ] `CELERY_BROKER_URL` environment variable set
- [ ] `CELERY_RESULT_BACKEND` environment variable set
- [ ] Application logs show "✓ Redis connected successfully"
- [ ] Cache is working (check API response times)
- [ ] Celery workers can connect (if using background jobs)

## Troubleshooting

### Connection Failed

**Error**: `⚠ Redis connection failed: ...`

**Solutions**:
1. Check Redis service is running
2. Verify Redis URL format is correct
3. Check firewall/network settings
4. Ensure Redis is in same region as web service (for Render)

### Authentication Failed

**Error**: `NOAUTH Authentication required`

**Solutions**:
1. Check password is correct
2. Ensure password is URL-encoded if it contains special characters
3. Verify Redis URL includes password: `redis://:password@host:port`

### Connection Timeout

**Error**: `Connection timeout`

**Solutions**:
1. Check Redis service is accessible
2. Verify port is correct
3. Check network/firewall rules
4. Try using internal URL (for Render)

## Cost Optimization

### Cache TTL Configuration

Adjust cache TTL in `.env` or environment variables:

```bash
REDIS_CACHE_TTL=3600  # 1 hour (default)
```

Or per-cache in code:
```python
await redis_cache.set("key", data, ttl=86400)  # 24 hours
```

### Redis Memory Management

- **Free tier (25MB)**: Good for development, ~1000 cached items
- **Starter ($10/month, 25MB)**: Production-ready for small apps
- **Standard ($25/month, 100MB)**: For medium traffic
- **Pro ($100/month, 1GB)**: For high traffic

Monitor memory usage in Redis dashboard and upgrade as needed.

## Security Best Practices

1. **Use TLS/SSL**: Always use `rediss://` (with 's') in production
2. **Strong Passwords**: Use auto-generated strong passwords
3. **Internal URLs**: Use internal Redis URLs when possible (no external exposure)
4. **Environment Variables**: Never commit Redis URLs to git
5. **IP Whitelisting**: If available, whitelist your app's IP addresses

## Next Steps

After Redis is set up:

1. ✅ Verify connection in logs
2. ✅ Test caching with a real API call
3. ✅ Monitor cache hit rates
4. ✅ Set up Celery workers (optional, for background jobs)
5. ✅ Configure cache TTL based on your needs

