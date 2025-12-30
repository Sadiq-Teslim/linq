"""
Supabase client initialization using postgrest-py
Lightweight alternative to full supabase-py package
"""
from functools import lru_cache
import httpx
from postgrest import SyncPostgrestClient
from app.core.config import settings


class SupabaseClient:
    """Wrapper around PostgREST client for Supabase tables"""

    def __init__(self, url: str, key: str):
        self.rest_url = f"{url}/rest/v1"
        self.key = key
        # Configure httpx client with better timeouts and connection pooling
        http_client = httpx.Client(
            timeout=httpx.Timeout(30.0, connect=10.0, read=20.0, write=10.0, pool=5.0),
            limits=httpx.Limits(max_keepalive_connections=20, max_connections=100),
            follow_redirects=True,
        )
        self._client = SyncPostgrestClient(
            base_url=self.rest_url,
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
            },
            http_client=http_client
        )

    def table(self, table_name: str):
        """Access a table (mirrors supabase-py interface)"""
        return self._client.from_(table_name)


@lru_cache()
def get_supabase_admin() -> SupabaseClient:
    """
    Get Supabase client with service role key (admin access)
    Use this for server-side operations that bypass RLS
    """
    return SupabaseClient(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY
    )


@lru_cache()
def get_supabase() -> SupabaseClient:
    """
    Get Supabase client with anon key (respects RLS)
    Use this for operations that should respect Row Level Security
    """
    return SupabaseClient(
        settings.SUPABASE_URL,
        settings.SUPABASE_ANON_KEY
    )


def get_supabase_client() -> SupabaseClient:
    """Dependency for FastAPI endpoints - returns admin client"""
    return get_supabase_admin()
