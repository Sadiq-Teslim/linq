"""
Cost Tracking Service
Tracks API usage and costs across all data providers
Helps monitor spending and optimize provider usage
"""
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from collections import defaultdict
import json

from app.services.cache.redis_client import redis_cache


class CostTracker:
    """
    Tracks API costs and usage statistics
    Stores data in Redis for persistence
    """
    
    def __init__(self):
        self.session_costs = defaultdict(float)  # Track costs for current session
        self.session_operations = []  # Track operations for current session
    
    def record(
        self,
        provider: str,
        operation: str,
        cost: float,
        results_count: int = 0,
        **metadata
    ):
        """
        Record an API operation and its cost
        
        Args:
            provider: Provider name (e.g., "apollo", "hunter")
            operation: Operation type (e.g., "company_search", "email_enrichment")
            cost: Cost in USD
            results_count: Number of results returned
            **metadata: Additional metadata
        """
        # Track in session
        self.session_costs[provider] += cost
        
        operation_record = {
            "provider": provider,
            "operation": operation,
            "cost": cost,
            "results_count": results_count,
            "timestamp": datetime.utcnow().isoformat(),
            **metadata
        }
        self.session_operations.append(operation_record)
        
        # Store in Redis for analytics (async - fire and forget)
        # We'll use a background task or store synchronously in a thread-safe way
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If loop is running, schedule as background task
                asyncio.create_task(self._store_daily_stats(provider, operation, cost, operation_record))
            else:
                # If no loop, run synchronously (shouldn't happen in async context)
                loop.run_until_complete(self._store_daily_stats(provider, operation, cost, operation_record))
        except RuntimeError:
            # No event loop, skip Redis storage (cost tracking will still work in memory)
            pass
    
    def get_session_cost(self) -> float:
        """Get total cost for current session"""
        return sum(self.session_costs.values())
    
    def get_session_operations(self) -> List[Dict[str, Any]]:
        """Get all operations for current session"""
        return self.session_operations.copy()
    
    async def _store_daily_stats(
        self,
        provider: str,
        operation: str,
        cost: float,
        operation_record: Dict[str, Any]
    ):
        """Store daily stats in Redis (async)"""
        try:
            today = datetime.utcnow().date().isoformat()
            daily_key = f"cost_tracking:daily:{today}"
            
            # Get existing daily stats
            daily_stats = await redis_cache.get(daily_key)
            if not daily_stats:
                daily_stats = {
                    "date": today,
                    "total_cost": 0.0,
                    "operations": [],
                    "by_provider": {},
                    "by_operation": {}
                }
            
            # Update stats
            daily_stats["total_cost"] = daily_stats.get("total_cost", 0.0) + cost
            daily_stats["operations"].append(operation_record)
            
            # Update by provider
            if provider not in daily_stats["by_provider"]:
                daily_stats["by_provider"][provider] = {"cost": 0.0, "count": 0}
            daily_stats["by_provider"][provider]["cost"] += cost
            daily_stats["by_provider"][provider]["count"] += 1
            
            # Update by operation
            if operation not in daily_stats["by_operation"]:
                daily_stats["by_operation"][operation] = {"cost": 0.0, "count": 0}
            daily_stats["by_operation"][operation]["cost"] += cost
            daily_stats["by_operation"][operation]["count"] += 1
            
            # Store back to Redis (30 day TTL)
            await redis_cache.set(daily_key, daily_stats, ttl=2592000)
        except Exception as e:
            print(f"Cost tracking storage error: {e}")
    
    def reset_session(self):
        """Reset session tracking"""
        self.session_costs.clear()
        self.session_operations.clear()
    
    async def get_analytics(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get cost analytics for a date range
        
        Args:
            start_date: Start date (ISO format, e.g., "2024-01-01")
            end_date: End date (ISO format, e.g., "2024-01-31")
        
        Returns:
            Analytics dict with total cost, by provider, by operation, etc.
        """
        if not start_date:
            start_date = (datetime.utcnow() - timedelta(days=30)).date().isoformat()
        if not end_date:
            end_date = datetime.utcnow().date().isoformat()
        
        # Parse dates
        start = datetime.fromisoformat(start_date).date()
        end = datetime.fromisoformat(end_date).date()
        
        # Collect daily stats
        total_cost = 0.0
        by_provider = defaultdict(lambda: {"cost": 0.0, "count": 0})
        by_operation = defaultdict(lambda: {"cost": 0.0, "count": 0})
        daily_breakdown = []
        
        current_date = start
        while current_date <= end:
            daily_key = f"cost_tracking:daily:{current_date.isoformat()}"
            # Note: This requires async context - will need to be called from async function
            # For now, we'll use a sync wrapper
            daily_stats = await self._get_daily_stats(daily_key)
            
            if daily_stats:
                total_cost += daily_stats.get("total_cost", 0.0)
                
                # Aggregate by provider
                for provider, stats in daily_stats.get("by_provider", {}).items():
                    by_provider[provider]["cost"] += stats.get("cost", 0.0)
                    by_provider[provider]["count"] += stats.get("count", 0)
                
                # Aggregate by operation
                for operation, stats in daily_stats.get("by_operation", {}).items():
                    by_operation[operation]["cost"] += stats.get("cost", 0.0)
                    by_operation[operation]["count"] += stats.get("count", 0)
                
                daily_breakdown.append({
                    "date": current_date.isoformat(),
                    "cost": daily_stats.get("total_cost", 0.0),
                    "operations_count": len(daily_stats.get("operations", []))
                })
            
            current_date += timedelta(days=1)
        
        return {
            "period": {
                "start_date": start_date,
                "end_date": end_date,
                "days": (end - start).days + 1
            },
            "total_cost": round(total_cost, 4),
            "average_daily_cost": round(total_cost / max((end - start).days + 1, 1), 4),
            "by_provider": dict(by_provider),
            "by_operation": dict(by_operation),
            "daily_breakdown": daily_breakdown
        }
    
    async def _get_daily_stats(self, key: str) -> Optional[Dict[str, Any]]:
        """Get daily stats from Redis"""
        try:
            return await redis_cache.get(key)
        except Exception:
            return None


# Singleton instance
cost_tracker = CostTracker()

