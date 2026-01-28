"""
Authentication service with Netflix-style single session enforcement (F3.2)
Using Supabase for database operations
"""
import time
from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict, Any, TYPE_CHECKING

from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import httpx

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
        """Register a new user with organization and subscription"""
        # Check if user exists
        existing = self.supabase.table("users").select("id").eq("email", email).execute()
        if existing.data:
            raise AuthenticationError("Email already registered")

        now = datetime.utcnow()
        
        # 1. Create organization first
        org_name = company_name or f"{email.split('@')[0]}'s Organization"
        org_data = {
            "name": org_name,
            "is_active": True,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }
        
        org_result = self.supabase.table("organizations").insert(org_data).execute()
        if not org_result.data:
            raise AuthenticationError("Failed to create organization")
        
        organization = org_result.data[0]
        organization_id = organization["id"]
        
        # 2. Create free trial subscription
        trial_end = now + timedelta(days=7)
        subscription_data = {
            "plan": "free_trial",
            "status": "trialing",
            "price_monthly": 0,
            "currency": "NGN",
            "max_tracked_companies": 5,
            "max_team_members": 1,
            "max_contacts_per_company": 5,
            "current_period_start": now.isoformat(),
            "current_period_end": trial_end.isoformat(),
            "trial_ends_at": trial_end.isoformat(),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }
        
        sub_result = self.supabase.table("subscriptions").insert(subscription_data).execute()
        if sub_result.data:
            subscription_id = sub_result.data[0]["id"]
            # Link subscription to organization
            self.supabase.table("organizations").update({
                "subscription_id": subscription_id,
                "updated_at": now.isoformat(),
            }).eq("id", organization_id).execute()
        
        # 3. Create user linked to organization
        user_data = {
            "email": email,
            "hashed_password": get_password_hash(password),
            "full_name": full_name,
            "company_name": company_name,
            "organization_id": organization_id,
            "is_active": True,
            "subscription_tier": "free",
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }

        result = self.supabase.table("users").insert(user_data).execute()

        if not result.data:
            raise AuthenticationError("Failed to create user")

        user = result.data[0]
        user["organization_id"] = organization_id
        return user

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

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=0.5, max=5),
        retry=retry_if_exception_type((httpx.ReadError, httpx.ConnectError, httpx.TimeoutException, ConnectionError)),
        reraise=True
    )
    def _execute_with_retry(self, query_builder):
        """Execute a Supabase query with retry logic for network errors"""
        return query_builder.execute()

    def validate_session(self, token: str) -> Optional[Dict[str, Any]]:
        """Validate a session token and return the user"""
        try:
            # First, try to find active session in database
            session_result = self._execute_with_retry(
                self.supabase.table("user_sessions")
                    .select("*")
                    .eq("session_token", token)
                    .eq("is_active", True)
            )

            if session_result.data:
                session = session_result.data[0]

                # Update last activity with retry logic
                self._execute_with_retry(
                    self.supabase.table("user_sessions")
                        .update({"last_activity": datetime.utcnow().isoformat()})
                        .eq("id", session["id"])
                )

                # Get user with retry logic
                user_result = self._execute_with_retry(
                    self.supabase.table("users")
                        .select("*")
                        .eq("id", session["user_id"])
                )

                if user_result.data:
                    return user_result.data[0]

            # Fallback: Try to decode JWT directly for extension tokens
            # This handles cases where session wasn't created in DB (extension access codes)
            try:
                from jose import jwt, JWTError
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
                
                # Check if this is an extension token with organization_id
                org_id = payload.get("organization_id")
                user_id = payload.get("user_id")
                is_extension = payload.get("extension", False)
                
                if is_extension and org_id:
                    # Find a user in this organization
                    if user_id:
                        user_result = self._execute_with_retry(
                            self.supabase.table("users")
                                .select("*")
                                .eq("id", user_id)
                        )
                        if user_result.data:
                            return user_result.data[0]
                    
                    # If no user_id in token, find any active user in the organization
                    user_result = self._execute_with_retry(
                        self.supabase.table("users")
                            .select("*")
                            .eq("organization_id", org_id)
                            .eq("is_active", True)
                            .limit(1)
                    )
                    if user_result.data:
                        return user_result.data[0]
                
                # Regular JWT token (not extension) - try to get user from sub claim
                email = payload.get("sub")
                if email and not email.startswith("org:"):
                    user_result = self._execute_with_retry(
                        self.supabase.table("users")
                            .select("*")
                            .eq("email", email)
                    )
                    if user_result.data:
                        return user_result.data[0]
                        
            except JWTError:
                # Token is invalid or expired
                pass
            
            return None
            
        except (httpx.ReadError, httpx.ConnectError, httpx.TimeoutException, ConnectionError) as e:
            # Log the error but don't fail silently - let it propagate after retries
            print(f"[Auth] Network error during session validation: {e}")
            raise

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
        """Check if user has an active subscription via their organization.

        This method first checks if subscription data is already embedded in the user object
        (from get_user_with_organization), otherwise queries the database.
        """
        # First check if subscription data is already embedded (from get_user_with_organization)
        embedded_subscription = user.get("subscription")
        if embedded_subscription:
            status = embedded_subscription.get("status")
            # Active or trialing subscriptions are valid
            if status in ["active", "trialing"]:
                return True
            # For other statuses, we need to query full data for grace period check
            if status == "past_due":
                # Need to query for current_period_end
                pass
            elif status in ["cancelled", "expired"]:
                return False

        organization_id = user.get("organization_id")

        if not organization_id:
            # No organization = use legacy check on user fields
            tier = user.get("subscription_tier", "free")
            if tier == "free":
                return True
            expires_at = user.get("subscription_expires_at")
            if expires_at is None:
                return False
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            return expires_at > datetime.utcnow()

        # Get organization's subscription (full data for grace period calculation)
        org_result = self.supabase.table("organizations").select(
            "subscriptions!organizations_subscription_id_fkey(status, plan, current_period_end, trial_ends_at)"
        ).eq("id", organization_id).execute()

        if not org_result.data:
            return True  # No org data found, allow access

        org = org_result.data[0]
        subscription = org.get("subscriptions")

        if not subscription:
            # No subscription linked, allow free access
            return True

        status = subscription.get("status")

        # Active or trialing subscriptions are valid
        if status in ["active", "trialing"]:
            return True

        # Check if within grace period for past_due
        if status == "past_due":
            period_end = subscription.get("current_period_end")
            if period_end:
                if isinstance(period_end, str):
                    period_end = datetime.fromisoformat(period_end.replace("Z", "+00:00"))
                # Allow 3-day grace period
                grace_period = period_end + timedelta(days=3)
                if datetime.utcnow() < grace_period:
                    return True

        return False

    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        result = self.supabase.table("users").select("*").eq("id", user_id).execute()
        return result.data[0] if result.data else None

    def create_extension_session(self, organization_id: int, user_id: Optional[int] = None) -> str:
        """
        Create a session for the Chrome extension activation
        This is used when activating via access code
        """
        # Create access token for organization-based access
        token_data = {
            "sub": f"org:{organization_id}",
            "organization_id": organization_id,
            "user_id": user_id,
            "extension": True,
        }

        access_token = create_access_token(
            token_data,
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        )

        # Only create session record if we have a user_id
        # Extension activations may not have a user yet
        if user_id:
            session_data = {
                "user_id": user_id,
                "session_token": access_token,
                "device_info": "Chrome Extension",
                "is_active": True,
                "created_at": datetime.utcnow().isoformat(),
                "last_activity": datetime.utcnow().isoformat(),
            }
            try:
                self.supabase.table("user_sessions").insert(session_data).execute()
            except Exception:
                # Session creation is optional for extension access
                pass

        return access_token

    def get_user_with_organization(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user with organization and subscription info"""
        result = self.supabase.table("users").select(
            "*, organizations!users_organization_id_fkey(id, name, subscriptions!organizations_subscription_id_fkey(plan, status, max_tracked_companies, max_team_members))"
        ).eq("id", user_id).execute()

        if not result.data:
            return None

        user = result.data[0]

        # Flatten organization data
        if user.get("organizations"):
            org = user["organizations"]
            user["organization_id"] = org.get("id")
            user["organization_name"] = org.get("name")

            if org.get("subscriptions"):
                sub = org["subscriptions"]
                user["subscription"] = {
                    "plan": sub.get("plan"),
                    "status": sub.get("status"),
                    "max_tracked_companies": sub.get("max_tracked_companies"),
                    "max_team_members": sub.get("max_team_members"),
                }

        return user
