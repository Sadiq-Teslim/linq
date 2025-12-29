"""
Redis client for caching API responses and scraped data
Reduces costs and improves performance
"""
import json
try:
    import redis.asyncio as aioredis
except ImportError:
    # Fallback for older redis versions
    import redis
    aioredis = None
from typing import Optional, Any, Dict, List
from functools import wraps
import hashlib

from app.core.config import settings


class RedisCache:
    """Async Redis cache client for API responses and data"""
    
    def __init__(self):
        self.redis_client: Optional[aioredis.Redis] = None
        self._connection_pool = None
    
    async def connect(self):
        """Initialize Redis connection"""
        if not self.redis_client:
            try:
                if aioredis:
                    self.redis_client = await aioredis.from_url(
                        settings.REDIS_URL,
                        encoding="utf-8",
                        decode_responses=True,
                        max_connections=50,
                    )
                else:
                    # Fallback to sync redis (not recommended but works)
                    import redis
                    self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
                    self.redis_client.ping()
                
                # Test connection
                if aioredis:
                    await self.redis_client.ping()
                else:
                    self.redis_client.ping()
                
                print("✓ Redis connected successfully")
            except Exception as e:
                print(f"⚠ Redis connection failed: {e}. Continuing without cache.")
                self.redis_client = None
    
    async def disconnect(self):
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
            self.redis_client = None
    
    def _make_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate cache key from prefix and arguments"""
        key_parts = [prefix]
        if args:
            key_parts.extend(str(arg) for arg in args)
        if kwargs:
            # Sort kwargs for consistent keys
            sorted_kwargs = sorted(kwargs.items())
            key_parts.extend(f"{k}:{v}" for k, v in sorted_kwargs)
        
        key_string = ":".join(key_parts)
        # Hash long keys to keep them reasonable
        if len(key_string) > 200:
            key_hash = hashlib.md5(key_string.encode()).hexdigest()
            return f"{prefix}:hash:{key_hash}"
        return key_string
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.redis_client:
            return None
        
        try:
            value = await self.redis_client.get(key)
            if value:
                return json.loads(value)
        except Exception as e:
            print(f"Redis get error: {e}")
        return None
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
    ) -> bool:
        """Set value in cache with optional TTL"""
        if not self.redis_client:
            return False
        
        try:
            ttl = ttl or settings.REDIS_CACHE_TTL
            serialized = json.dumps(value, default=str)
            await self.redis_client.setex(key, ttl, serialized)
            return True
        except Exception as e:
            print(f"Redis set error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if not self.redis_client:
            return False
        
        try:
            await self.redis_client.delete(key)
            return True
        except Exception as e:
            print(f"Redis delete error: {e}")
            return False
    
    async def get_or_set(
        self,
        key: str,
        fetch_func,
        ttl: Optional[int] = None,
        *args,
        **kwargs,
    ) -> Any:
        """Get from cache or fetch and cache"""
        # Try cache first
        cached = await self.get(key)
        if cached is not None:
            return cached
        
        # Fetch fresh data
        if callable(fetch_func):
            value = await fetch_func(*args, **kwargs) if hasattr(fetch_func, '__call__') else fetch_func
        else:
            value = fetch_func
        
        # Cache it
        if value is not None:
            await self.set(key, value, ttl)
        
        return value
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate all keys matching pattern"""
        if not self.redis_client:
            return 0
        
        try:
            keys = []
            async for key in self.redis_client.scan_iter(match=pattern):
                keys.append(key)
            
            if keys:
                return await self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            print(f"Redis invalidate_pattern error: {e}")
            return 0


# Global Redis cache instance
redis_cache = RedisCache()


def cached(prefix: str, ttl: Optional[int] = None):
    """
    Decorator to cache function results
    
    Usage:
        @cached("company_search", ttl=3600)
        async def search_companies(query: str):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = redis_cache._make_key(prefix, *args, **kwargs)
            
            # Try cache
            cached_result = await redis_cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Cache result
            if result is not None:
                await redis_cache.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator

