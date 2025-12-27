"""
API v1 Router - Aggregates all endpoints
"""
from fastapi import APIRouter

from .endpoints import auth, search, feed, export, companies, subscription

api_router = APIRouter()

# Authentication endpoints
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"],
)

# Company search/analysis endpoints (legacy)
api_router.include_router(
    search.router,
    prefix="/search",
    tags=["Company Intelligence"],
)

# Tracked companies endpoints (Monitor Board)
api_router.include_router(
    companies.router,
    prefix="/companies",
    tags=["Tracked Companies"],
)

# Subscription and billing endpoints
api_router.include_router(
    subscription.router,
    prefix="/subscription",
    tags=["Subscription"],
)

# Live feed endpoints
api_router.include_router(
    feed.router,
    prefix="/feed",
    tags=["Activity Feed"],
)

# Data export endpoints (F3.3)
api_router.include_router(
    export.router,
    prefix="/export",
    tags=["Data Export"],
)
