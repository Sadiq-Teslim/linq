"""
Google OAuth Service for user authentication
Handles Google OAuth flow and user creation/login
"""
import secrets
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import httpx
from app.core.config import settings
from app.core.security import create_access_token
from app.db.supabase_client import SupabaseClient
from app.services.auth_service import AuthService

logger = None
try:
    import logging
    logger = logging.getLogger(__name__)
except:
    pass


class GoogleOAuthService:
    """Handles Google OAuth authentication flow"""

    # Google OAuth endpoints
    AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    USER_INFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

    def __init__(self):
        self.client_id = settings.GOOGLE_CLIENT_ID
        self.client_secret = settings.GOOGLE_CLIENT_SECRET
        self.redirect_uri = settings.GOOGLE_REDIRECT_URI

    def get_authorization_url(self, state: Optional[str] = None) -> str:
        """
        Generate Google OAuth authorization URL
        """
        if not self.client_id:
            raise ValueError("GOOGLE_CLIENT_ID is not configured")

        if not state:
            state = secrets.token_urlsafe(32)

        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "offline",
            "prompt": "consent",
        }

        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{self.AUTH_URL}?{query_string}"

    async def get_access_token(self, code: str) -> Dict[str, Any]:
        """
        Exchange authorization code for access token
        """
        if not self.client_id or not self.client_secret:
            raise ValueError("Google OAuth credentials not configured")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                data={
                    "code": code,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "redirect_uri": self.redirect_uri,
                    "grant_type": "authorization_code",
                },
            )

            if response.status_code != 200:
                error_data = response.text
                if logger:
                    logger.error(f"Google OAuth token exchange failed: {error_data}")
                raise Exception(f"Failed to exchange code for token: {error_data}")

            return response.json()

    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """
        Get user information from Google
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.USER_INFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )

            if response.status_code != 200:
                error_data = response.text
                if logger:
                    logger.error(f"Failed to get user info: {error_data}")
                raise Exception(f"Failed to get user info: {error_data}")

            return response.json()

    async def authenticate_user(
        self, code: str, supabase: SupabaseClient
    ) -> Dict[str, Any]:
        """
        Complete OAuth flow: exchange code, get user info, create/login user
        Returns user data and access token
        """
        # Exchange code for token
        token_data = await self.get_access_token(code)
        access_token = token_data.get("access_token")

        if not access_token:
            raise Exception("No access token received from Google")

        # Get user info
        google_user = await self.get_user_info(access_token)
        email = google_user.get("email")
        name = google_user.get("name", "")
        picture = google_user.get("picture")

        if not email:
            raise Exception("No email found in Google account")

        # Check if user exists
        auth_service = AuthService(supabase)
        existing_user = supabase.table("users").select("*").eq("email", email).execute()

        if existing_user.data:
            # User exists - login
            user = existing_user.data[0]
            
            # Update user info if needed
            update_data = {}
            if name and not user.get("full_name"):
                update_data["full_name"] = name
            
            if update_data:
                supabase.table("users").update(update_data).eq("id", user["id"]).execute()
                user.update(update_data)

            # Create session
            session_token, _ = auth_service.create_session(
                user=user,
                device_info="Google OAuth",
                ip_address=None,
            )

            return {
                "user": user,
                "access_token": session_token,
                "is_new_user": False,
            }
        else:
            # New user - create account
            # Extract first and last name
            name_parts = name.split(" ", 1) if name else ["", ""]
            first_name = name_parts[0] if name_parts else ""
            last_name = name_parts[1] if len(name_parts) > 1 else ""

            # Create user
            user_data = {
                "email": email,
                "full_name": name,
                "hashed_password": "",  # OAuth users don't have passwords
                "is_active": True,
                "subscription_tier": "free",
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }

            result = supabase.table("users").insert(user_data).execute()

            if not result.data:
                raise Exception("Failed to create user")

            user = result.data[0]

            # Create organization for the user
            org_data = {
                "name": f"{name}'s Organization",
                "is_active": True,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }

            org_result = supabase.table("organizations").insert(org_data).execute()

            if org_result.data:
                org_id = org_result.data[0]["id"]
                # Link user to organization
                supabase.table("users").update({
                    "organization_id": org_id,
                    "updated_at": datetime.utcnow().isoformat(),
                }).eq("id", user["id"]).execute()
                user["organization_id"] = org_id

            # Create session
            session_token, _ = auth_service.create_session(
                user=user,
                device_info="Google OAuth",
                ip_address=None,
            )

            return {
                "user": user,
                "access_token": session_token,
                "is_new_user": True,
            }


# Singleton instance
google_oauth_service = GoogleOAuthService()

