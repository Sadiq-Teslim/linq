"""
Authentication service with Netflix-style single session enforcement (F3.2)
Using Supabase for database operations
"""
from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict, Any, TYPE_CHECKING

from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.core.exceptions import AuthenticationError

if TYPE_CHECKING:
    from app.db.supabase_client import SupabaseClient


class AuthService:
    """Handles user authentication and session management using Supabase"""

    def __init__(self, supabase: "SupabaseClient"):
        self.supabase = supabase

    def register_user(
        self,
        email: str,
        password: str,
        full_name: Optional[str] = None,
        company_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Register a new user"""
        # Check if user exists
        existing = self.supabase.table("users").select("id").eq("email", email).execute()
        if existing.data:
            raise AuthenticationError("Email already registered")

        # Create user
        user_data = {
            "email": email,
            "hashed_password": get_password_hash(password),
            "full_name": full_name,
            "company_name": company_name,
            "is_active": True,
            "subscription_tier": "free",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

        result = self.supabase.table("users").insert(user_data).execute()

        if not result.data:
            raise AuthenticationError("Failed to create user")

        return result.data[0]

    def authenticate_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Verify user credentials"""
        result = self.supabase.table("users").select("*").eq("email", email).execute()

        if not result.data:
            return None

        user = result.data[0]

        if not verify_password(password, user["hashed_password"]):
            return None

        if not user.get("is_active", True):
            return None

        return user

    def create_session(
        self,
        user: Dict[str, Any],
        device_info: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> Tuple[str, bool]:
        """
        Create a new session, revoking any existing sessions (Netflix model).
        Returns (access_token, was_existing_session_revoked)
        """
        user_id = user["id"]

        # Check for existing active sessions
        existing = self.supabase.table("user_sessions")\
            .select("id")\
            .eq("user_id", user_id)\
            .eq("is_active", True)\
            .execute()

        was_revoked = len(existing.data) > 0

        # Revoke all existing sessions
        if was_revoked:
            self.supabase.table("user_sessions")\
                .update({
                    "is_active": False,
                    "revoked_at": datetime.utcnow().isoformat(),
                    "revoked_reason": "new_login"
                })\
                .eq("user_id", user_id)\
                .eq("is_active", True)\
                .execute()

        # Create access token
        token_data = {
            "sub": user["email"],
            "user_id": user_id,
        }
        access_token = create_access_token(
            token_data,
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        )

        # Create new session record
        session_data = {
            "user_id": user_id,
            "session_token": access_token,
            "device_info": device_info,
            "ip_address": ip_address,
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "last_activity": datetime.utcnow().isoformat(),
        }

        self.supabase.table("user_sessions").insert(session_data).execute()

        return access_token, was_revoked

    def validate_session(self, token: str) -> Optional[Dict[str, Any]]:
        """Validate a session token and return the user"""
        # Find active session
        session_result = self.supabase.table("user_sessions")\
            .select("*")\
            .eq("session_token", token)\
            .eq("is_active", True)\
            .execute()

        if not session_result.data:
            return None

        session = session_result.data[0]

        # Update last activity
        self.supabase.table("user_sessions")\
            .update({"last_activity": datetime.utcnow().isoformat()})\
            .eq("id", session["id"])\
            .execute()

        # Get user
        user_result = self.supabase.table("users")\
            .select("*")\
            .eq("id", session["user_id"])\
            .execute()

        if not user_result.data:
            return None

        return user_result.data[0]

    def revoke_session(self, token: str) -> bool:
        """Logout - revoke the current session"""
        result = self.supabase.table("user_sessions")\
            .update({
                "is_active": False,
                "revoked_at": datetime.utcnow().isoformat(),
                "revoked_reason": "logout"
            })\
            .eq("session_token", token)\
            .eq("is_active", True)\
            .execute()

        return len(result.data) > 0

    def check_subscription(self, user: Dict[str, Any]) -> bool:
        """Check if user has an active subscription"""
        tier = user.get("subscription_tier", "free")

        if tier == "free":
            return True  # Free tier always allowed

        expires_at = user.get("subscription_expires_at")
        if expires_at is None:
            return False

        # Parse ISO datetime string
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))

        return expires_at > datetime.utcnow()

    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        result = self.supabase.table("users").select("*").eq("id", user_id).execute()
        return result.data[0] if result.data else None
