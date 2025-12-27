"""
LINQ AI Backend API - Entry Point
B2B Sales Intelligence Platform
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings, get_port
from app.core.security import RateLimitMiddleware, SecurityHeadersMiddleware

# =============================================================================
# APP CONFIGURATION
# =============================================================================

app = FastAPI(
    title="LINQ AI API",
    description="B2B Sales Intelligence Platform API",
    version="1.0.0",
    docs_url="/docs" if settings.is_development else None,  # Disable docs in prod
    redoc_url="/redoc" if settings.is_development else None,
    openapi_url="/openapi.json" if settings.is_development else None,
)

# =============================================================================
# MIDDLEWARE
# =============================================================================

# Security middleware (order matters - first added = last executed)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)

# CORS middleware - uses environment-aware origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# ROUTES
# =============================================================================

# Include API routes
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "LINQ AI API",
        "version": "1.0.0",
        "status": "running",
        "environment": settings.ENVIRONMENT,
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for Render/load balancers"""
    return {
        "status": "healthy",
        "service": "linq-ai-api",
        "environment": settings.ENVIRONMENT,
    }


@app.get("/api/v1/config")
async def get_public_config():
    """
    Public configuration endpoint for frontend
    Returns non-sensitive config values
    """
    return {
        "paystack_public_key": settings.PAYSTACK_PUBLIC_KEY,
        "environment": settings.ENVIRONMENT,
        "api_version": "v1",
    }


# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    import uvicorn

    port = get_port()
    reload = settings.is_development

    print(f"Starting LINQ AI API...")
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Port: {port}")
    print(f"CORS Origins: {settings.allowed_origins}")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=reload,
    )
