"""
Authentication endpoints (F3.1, F3.2)
Implements login, logout, and single-session enforcement
Using Supabase for database operations
"""
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Request, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse, JSONResponse

from app.db.supabase_client import get_supabase_client, SupabaseClient
from app.schemas.token import Token
from app.schemas.user import UserCreate, UserResponse
from app.services.auth_service import AuthService
from app.services.google_oauth_service import google_oauth_service
from app.core.config import settings
from app.core.exceptions import AuthenticationError

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    supabase: SupabaseClient = Depends(get_supabase_client),
) -> Dict[str, Any]:
    """Dependency to get current authenticated user"""
    auth_service = AuthService(supabase)
    user = auth_service.validate_session(token)

    if not user:
        raise AuthenticationError("Invalid or expired session")

    return user


@router.post("/register", response_model=UserResponse)
def register(
    user_data: UserCreate,
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Register a new user account
    """
    auth_service = AuthService(supabase)
    user = auth_service.register_user(
        email=user_data.email,
        password=user_data.password,
        full_name=user_data.full_name,
        company_name=user_data.company_name,
    )
    return UserResponse.model_validate(user)


@router.post("/login", response_model=Token)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Login endpoint with single-session enforcement (Netflix model F3.2)

    If user is already logged in on another device, that session
    will be terminated and user will be notified.
    """
    auth_service = AuthService(supabase)

    # Authenticate user
    user = auth_service.authenticate_user(
        email=form_data.username,
        password=form_data.password,
    )

    if not user:
        raise AuthenticationError("Incorrect email or password")

    # Check subscription status
    if not auth_service.check_subscription(user):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Subscription expired or invalid",
        )

    # Get device info from request
    device_info = request.headers.get("User-Agent", "Unknown")
    ip_address = request.client.host if request.client else None

    # Create session (this will revoke existing sessions - Netflix model)
    access_token, was_session_revoked = auth_service.create_session(
        user=user,
        device_info=device_info,
        ip_address=ip_address,
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout")
def logout(
    token: str = Depends(oauth2_scheme),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Logout and revoke current session
    """
    auth_service = AuthService(supabase)
    success = auth_service.revoke_session(token)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session not found or already revoked",
        )

    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Get current user profile
    """
    return UserResponse.model_validate(current_user)


@router.get("/session/status")
def check_session_status(
    token: str = Depends(oauth2_scheme),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Check if current session is still valid
    Used by frontend to detect session revocation
    """
    auth_service = AuthService(supabase)
    user = auth_service.validate_session(token)

    if not user:
        raise AuthenticationError("Session revoked or expired")

    return {
        "status": "active",
        "user_id": user["id"],
        "email": user["email"],
    }


@router.get("/google")
def google_auth(
    state: Optional[str] = Query(None),
):
    """
    Initiate Google OAuth flow
    Returns the Google OAuth URL for frontend redirect
    """
    try:
        auth_url = google_oauth_service.get_authorization_url(state=state)
        return {
            "auth_url": auth_url,
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate OAuth URL: {str(e)}"
        )


@router.get("/google/callback")
async def google_callback(
    code: str = Query(...),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Handle Google OAuth callback
    This endpoint processes the OAuth callback and creates/authenticates the user
    Redirects to frontend with token or error
    """
    if error:
        # User denied access or error occurred
        frontend_url = f"{settings.FRONTEND_URL}/auth/login?error={error}"
        return RedirectResponse(url=frontend_url)

    if not code:
        frontend_url = f"{settings.FRONTEND_URL}/auth/login?error=no_code"
        return RedirectResponse(url=frontend_url)

    try:
        # Complete OAuth flow
        result = await google_oauth_service.authenticate_user(code, supabase)
        
        user = result["user"]
        access_token = result["access_token"]
        is_new_user = result.get("is_new_user", False)

        # Redirect to frontend with token
        # In production, use a more secure method (e.g., httpOnly cookie)
        frontend_url = f"{settings.FRONTEND_URL}/auth/google/callback?token={access_token}&email={user['email']}&new_user={is_new_user}"
        return RedirectResponse(url=frontend_url)

    except Exception as e:
        # Log error
        import sys
        sys.stderr.write(f"\n>>> Google OAuth Error: {str(e)}\n")
        sys.stderr.flush()
        
        # Redirect to frontend with error
        frontend_url = f"{settings.FRONTEND_URL}/auth/login?error=oauth_failed&message={str(e)}"
        return RedirectResponse(url=frontend_url)
