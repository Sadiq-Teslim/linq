"""
API v1 Router - Aggregates all endpoints
"""
from fastapi import APIRouter

from .endpoints import auth, search, feed

api_router = APIRouter()

# Authentication endpoints
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"],
)

# Company search/analysis endpoints
api_router.include_router(
    search.router,
    prefix="/search",
    tags=["Company Intelligence"],
)

# Live feed endpoints
api_router.include_router(
    feed.router,
    prefix="/feed",
    tags=["Activity Feed"],
)
