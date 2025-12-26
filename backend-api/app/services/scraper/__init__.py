"""Web scraping services for data aggregation"""
from .google import GoogleSearchService
from .news import NewsAggregatorService

__all__ = ["GoogleSearchService", "NewsAggregatorService"]
