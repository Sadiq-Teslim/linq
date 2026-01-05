"""
API v1 Router - Aggregates all endpoints
"""
from fastapi import APIRouter

from .endpoints import auth, search, feed, export, companies, subscription, analytics, organization, internal, public

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

# Analytics and usage statistics endpoints
api_router.include_router(
    analytics.router,
    prefix="/analytics",
    tags=["Analytics"],
)

# Organization and team management endpoints
api_router.include_router(
    organization.router,
    prefix="/organization",
    tags=["Organization"],
)

# Internal endpoints for cron jobs (API key protected)
api_router.include_router(
    internal.router,
    prefix="/internal",
    tags=["Internal"],
)

# Public endpoints (no auth required) - for landing page demo
api_router.include_router(
    public.router,
    prefix="/public",
    tags=["Public"],
)
