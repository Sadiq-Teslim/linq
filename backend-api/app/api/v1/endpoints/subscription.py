"""
Subscription and Access Code endpoints
Handles billing, plan management, and extension activation
Uses Paystack integration for NGN payments
"""
from typing import Dict, Any, List
from datetime import datetime, timedelta
import secrets
import string
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header, Query

from app.db.supabase_client import get_supabase_client, SupabaseClient
from app.api.v1.endpoints.auth import get_current_user
from app.core.config import settings
from app.services.paystack_service import paystack_service, PaystackError

logger = logging.getLogger(__name__)
from app.schemas.subscription import (
    SubscriptionPlan,
    SubscriptionStatus,
    PlanDetails,
    SubscriptionCreate,
    SubscriptionUpdate,
    SubscriptionResponse,
    AccessCodeCreate,
    AccessCodeValidate,
    AccessCodeActivate,
    AccessCodeResponse,
    AccessCodeValidationResult,
    ActivationResult,
    PaystackWebhookEvent,
)
from app.schemas.organization import OrganizationResponse

router = APIRouter()


# ===== Paystack Plan Codes =====
# These should be created in Paystack dashboard or via API
# PAYSTACK_PLAN_CODES: Dict[SubscriptionPlan, str] = {
#     SubscriptionPlan.STARTER: "",  # Set via environment or create on startup
#     SubscriptionPlan.PROFESSIONAL: "",
#     SubscriptionPlan.ENTERPRISE: "",
# }


# ===== Plan Definitions (NGN Pricing) =====

PLAN_DETAILS: Dict[SubscriptionPlan, PlanDetails] = {
    SubscriptionPlan.FREE_TRIAL: PlanDetails(
        id=SubscriptionPlan.FREE_TRIAL,
        name="Free Trial",
        price_monthly=0,
        price_yearly=0,
        currency="NGN",
        max_tracked_companies=5,
        max_team_members=1,
        max_contacts_per_company=5,
        features=[
            "Track up to 5 companies",
            "Basic contact information",
            "Weekly updates",
            "7-day free trial",
        ],
    ),
    SubscriptionPlan.STARTER: PlanDetails(
        id=SubscriptionPlan.STARTER,
        name="Starter",
        price_monthly=14500,  # ₦14,500 per month
        price_yearly=145000,  # ₦145,000 per year (2 months free)
        currency="NGN",
        max_tracked_companies=25,
        max_team_members=3,
        max_contacts_per_company=10,
        features=[
            "Track up to 25 companies",
            "Full contact information",
            "Daily updates",
            "Email notifications",
            "3 team members",
        ],
    ),
    SubscriptionPlan.PROFESSIONAL: PlanDetails(
        id=SubscriptionPlan.PROFESSIONAL,
        name="Professional",
        price_monthly=40000,  # ₦40,000 per month
        price_yearly=400000,  # ₦400,000 per year (2 months free)
        currency="NGN",
        max_tracked_companies=100,
        max_team_members=10,
        max_contacts_per_company=25,
        features=[
            "Track up to 100 companies",
            "Full contact information",
            "Real-time updates",
            "Email & browser notifications",
            "10 team members",
            "Priority support",
            "API access",
        ],
        is_popular=True,
    ),
    SubscriptionPlan.ENTERPRISE: PlanDetails(
        id=SubscriptionPlan.ENTERPRISE,
        name="Enterprise",
        price_monthly=105000,  # ₦105,000 per month
        price_yearly=1050000,  # ₦1,050,000 per year (2 months free)
        currency="NGN",
        max_tracked_companies=-1,  # Unlimited
        max_team_members=-1,  # Unlimited
        max_contacts_per_company=-1,  # Unlimited
        features=[
            "Unlimited companies",
            "Unlimited contacts",
            "Real-time updates",
            "All notifications",
            "Unlimited team members",
            "Dedicated support",
            "Full API access",
            "Custom integrations",
            "SSO/SAML",
        ],
    ),
}


def generate_access_code() -> str:
    """Generate a unique access code in format LINQ-XXXX-XXXX-XXXX"""
    chars = string.ascii_uppercase + string.digits
    segments = [''.join(secrets.choice(chars) for _ in range(4)) for _ in range(3)]
    return f"LINQ-{'-'.join(segments)}"


# ===== Plans =====

@router.get("/plans", response_model=List[PlanDetails])
def get_available_plans():
    """
    Get all available subscription plans
    """
    return list(PLAN_DETAILS.values())


@router.get("/plans/{plan_id}", response_model=PlanDetails)
def get_plan_details(plan_id: SubscriptionPlan):
    """
    Get details for a specific plan
    """
    if plan_id not in PLAN_DETAILS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )
    return PLAN_DETAILS[plan_id]


# ===== Subscription Management =====

@router.get("/current", response_model=SubscriptionResponse)
def get_current_subscription(
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Get the current user's organization subscription
    """
    org_id = current_user.get("organization_id")
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not associated with an organization"
        )

    # Get organization with subscription
    org_result = supabase.table("organizations").select("subscription_id").eq("id", org_id).execute()

    if not org_result.data or not org_result.data[0].get("subscription_id"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No subscription found"
        )

    sub_id = org_result.data[0]["subscription_id"]
    sub_result = supabase.table("subscriptions").select("*").eq("id", sub_id).execute()

    if not sub_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )

    return SubscriptionResponse.model_validate(sub_result.data[0])


@router.post("/subscribe", response_model=SubscriptionResponse)
def create_subscription(
    data: SubscriptionCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Create a new subscription for the user's organization
    In production, this would integrate with Paystack for payment
    """
    org_id = current_user.get("organization_id")
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be part of an organization to subscribe"
        )

    plan = PLAN_DETAILS.get(data.plan)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan"
        )

    now = datetime.utcnow()
    trial_days = 7 if data.plan == SubscriptionPlan.FREE_TRIAL else 0

    subscription_data = {
        "plan": data.plan.value,
        "status": SubscriptionStatus.TRIALING.value if trial_days > 0 else SubscriptionStatus.ACTIVE.value,
        "price_monthly": plan.price_monthly,
        "currency": plan.currency,
        "max_tracked_companies": plan.max_tracked_companies,
        "max_team_members": plan.max_team_members,
        "max_contacts_per_company": plan.max_contacts_per_company,
        "current_period_start": now.isoformat(),
        "current_period_end": (now + timedelta(days=30)).isoformat(),
        "trial_ends_at": (now + timedelta(days=trial_days)).isoformat() if trial_days > 0 else None,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }

    # Create subscription
    sub_result = supabase.table("subscriptions").insert(subscription_data).execute()

    if not sub_result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create subscription"
        )

    subscription = sub_result.data[0]

    # Link subscription to organization
    supabase.table("organizations").update({
        "subscription_id": subscription["id"],
        "updated_at": now.isoformat(),
    }).eq("id", org_id).execute()

    return SubscriptionResponse.model_validate(subscription)


@router.post("/upgrade", response_model=SubscriptionResponse)
def upgrade_subscription(
    data: SubscriptionUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Upgrade/downgrade subscription plan
    In production, this would handle proration and payment
    """
    org_id = current_user.get("organization_id")
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be part of an organization"
        )

    # Get current subscription
    org_result = supabase.table("organizations").select("subscription_id").eq("id", org_id).execute()

    if not org_result.data or not org_result.data[0].get("subscription_id"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No subscription found"
        )

    sub_id = org_result.data[0]["subscription_id"]
    plan = PLAN_DETAILS.get(data.plan)

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan"
        )

    now = datetime.utcnow()
    update_data = {
        "plan": data.plan.value,
        "price_monthly": plan.price_monthly,
        "max_tracked_companies": plan.max_tracked_companies,
        "max_team_members": plan.max_team_members,
        "max_contacts_per_company": plan.max_contacts_per_company,
        "updated_at": now.isoformat(),
    }

    result = supabase.table("subscriptions").update(update_data).eq("id", sub_id).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update subscription"
        )

    return SubscriptionResponse.model_validate(result.data[0])


# ===== Access Codes =====

@router.post("/access-codes", response_model=AccessCodeResponse)
def generate_access_code_endpoint(
    data: AccessCodeCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Generate a new access code for extension activation
    Only organization owners/admins can generate codes
    """
    org_id = current_user.get("organization_id")
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be part of an organization"
        )

    # Get organization info
    org_result = supabase.table("organizations").select("id, name, subscriptions!organizations_subscription_id_fkey(plan)").eq("id", org_id).execute()

    if not org_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    org = org_result.data[0]
    plan = org.get("subscriptions", {}).get("plan", "free_trial")

    now = datetime.utcnow()
    code = generate_access_code()

    access_code_data = {
        "code": code,
        "organization_id": org_id,
        "created_by_id": current_user["id"],
        "is_used": False,
        "is_active": True,
        "expires_at": (now + timedelta(days=data.expires_in_days)).isoformat() if data.expires_in_days else None,
        "created_at": now.isoformat(),
    }

    result = supabase.table("access_codes").insert(access_code_data).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate access code"
        )

    code_data = result.data[0]
    code_data["organization_name"] = org["name"]
    code_data["plan"] = plan

    return AccessCodeResponse.model_validate(code_data)


@router.get("/access-codes", response_model=List[AccessCodeResponse])
def list_access_codes(
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    List all access codes for the organization
    """
    org_id = current_user.get("organization_id")
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be part of an organization"
        )

    # Get organization info
    org_result = supabase.table("organizations").select("name, subscriptions!organizations_subscription_id_fkey(plan)").eq("id", org_id).execute()
    org = org_result.data[0] if org_result.data else {}

    result = supabase.table("access_codes").select("*").eq("organization_id", org_id).order("created_at", desc=True).execute()

    codes = result.data if result.data else []
    for code in codes:
        code["organization_name"] = org.get("name", "")
        code["plan"] = org.get("subscriptions", {}).get("plan", "free_trial")

    return [AccessCodeResponse.model_validate(c) for c in codes]


@router.post("/access-codes/validate", response_model=AccessCodeValidationResult)
def validate_access_code(
    data: AccessCodeValidate,
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Validate an access code without activating it
    This is a public endpoint used by the extension
    """
    # Handle demo codes
    if data.code.upper() in ["DEMO", "LINQ-DEMO-2024"]:
        return AccessCodeValidationResult(
            valid=True,
            organization_name="Demo Organization",
            plan=SubscriptionPlan.PROFESSIONAL,
            message="Demo access code valid",
        )

    result = supabase.table("access_codes").select("*, organizations(name, subscriptions!organizations_subscription_id_fkey(plan))").eq("code", data.code).execute()

    if not result.data:
        return AccessCodeValidationResult(
            valid=False,
            message="Invalid access code",
        )

    code = result.data[0]

    if not code.get("is_active"):
        return AccessCodeValidationResult(
            valid=False,
            message="This access code has been deactivated",
        )

    if code.get("is_used"):
        return AccessCodeValidationResult(
            valid=False,
            message="This access code has already been used",
        )

    if code.get("expires_at"):
        expires_at = datetime.fromisoformat(code["expires_at"].replace("Z", "+00:00"))
        if expires_at < datetime.utcnow().replace(tzinfo=expires_at.tzinfo):
            return AccessCodeValidationResult(
                valid=False,
                message="This access code has expired",
            )

    org = code.get("organizations", {})
    plan = org.get("subscriptions", {}).get("plan", "free_trial")

    return AccessCodeValidationResult(
        valid=True,
        organization_name=org.get("name"),
        plan=SubscriptionPlan(plan) if plan else SubscriptionPlan.FREE_TRIAL,
        expires_at=code.get("expires_at"),
        message="Access code is valid",
    )


@router.post("/access-codes/activate", response_model=ActivationResult)
def activate_access_code(
    data: AccessCodeActivate,
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Activate an access code in the Chrome extension
    This creates a session for the user and links them to the organization
    """
    from app.services.auth_service import AuthService

    # Handle demo codes
    if data.code.upper() in ["DEMO", "LINQ-DEMO-2024"]:
        # Create demo session
        demo_token = f"demo-token-{secrets.token_hex(16)}"

        return ActivationResult(
            success=True,
            access_token=demo_token,
            token_type="bearer",
            expires_in=settings.EXTENSION_TOKEN_EXPIRE_HOURS * 60 * 60,  # 48 hours in seconds
            message="Demo mode activated successfully. Valid for 48 hours.",
        )

    # Validate code first
    result = supabase.table("access_codes").select("*, organizations(id, name, subscriptions!organizations_subscription_id_fkey(plan))").eq("code", data.code).execute()

    if not result.data:
        return ActivationResult(
            success=False,
            message="Invalid access code",
        )

    code = result.data[0]

    if not code.get("is_active"):
        return ActivationResult(
            success=False,
            message="This access code has been deactivated",
        )

    if code.get("is_used"):
        return ActivationResult(
            success=False,
            message="This access code has already been used",
        )

    if code.get("expires_at"):
        expires_at = datetime.fromisoformat(code["expires_at"].replace("Z", "+00:00"))
        if expires_at < datetime.utcnow().replace(tzinfo=expires_at.tzinfo):
            return ActivationResult(
                success=False,
                message="This access code has expired",
            )

    org = code.get("organizations", {})
    org_id = org.get("id")

    # Mark code as used
    now = datetime.utcnow()
    supabase.table("access_codes").update({
        "is_used": True,
        "used_at": now.isoformat(),
    }).eq("id", code["id"]).execute()

    # Find or create a user for this organization to create a proper session
    # First, try to find an existing user in this organization
    user_result = supabase.table("users").select("*").eq("organization_id", org_id).eq("is_active", True).limit(1).execute()
    
    user_id = None
    if user_result.data:
        user_id = user_result.data[0]["id"]
    
    # Create session token (now with user_id so session record is created)
    auth_service = AuthService(supabase)
    access_token = auth_service.create_extension_session(org_id, user_id=user_id)

    return ActivationResult(
        success=True,
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.EXTENSION_TOKEN_EXPIRE_HOURS * 60 * 60,  # 48 hours in seconds
        organization=OrganizationResponse(
            id=org_id,
            name=org.get("name"),
            domain=None,
            industry=None,
            logo_url=None,
            default_update_frequency="weekly",
            is_active=True,
            created_at=now,
            updated_at=now,
        ),
        message="Extension activated successfully. Valid for 48 hours.",
    )


@router.delete("/access-codes/{code_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_access_code(
    code_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Revoke/deactivate an access code
    """
    org_id = current_user.get("organization_id")
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be part of an organization"
        )

    # Verify code belongs to organization
    existing = supabase.table("access_codes").select("id").eq("id", code_id).eq("organization_id", org_id).execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Access code not found"
        )

    supabase.table("access_codes").update({
        "is_active": False,
    }).eq("id", code_id).execute()


# =============================================================================
# PAYSTACK INTEGRATION - Real Payment Processing (NGN)
# =============================================================================

@router.post("/paystack/initialize")
async def initialize_paystack_payment(
    plan: str = Query(...),
    callback_url: str = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Initialize a Paystack payment for subscription
    Returns authorization URL and reference for frontend checkout
    """
    # Convert plan string to enum
    try:
        plan_enum = SubscriptionPlan(plan)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan: {plan}"
        )
    
    if plan_enum == SubscriptionPlan.FREE_TRIAL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Free trial does not require payment"
        )

    plan_details = PLAN_DETAILS.get(plan_enum)
    if not plan_details:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan"
        )

    org_id = current_user.get("organization_id")
    email = current_user.get("email")
    full_name = current_user.get("full_name") or email.split("@")[0]
    
    # If user doesn't have an organization, create one
    if not org_id:
        now = datetime.utcnow()
        org_name = current_user.get("company_name") or f"{email.split('@')[0]}'s Organization"
        
        org_result = supabase.table("organizations").insert({
            "name": org_name,
            "is_active": True,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }).execute()
        
        if org_result.data:
            org_id = org_result.data[0]["id"]
            # Link user to organization
            supabase.table("users").update({
                "organization_id": org_id,
                "updated_at": now.isoformat(),
            }).eq("id", current_user["id"]).execute()
            logger.info(f"Created organization {org_id} for user {current_user['id']}")
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create organization"
            )

    # Amount in kobo (NGN smallest unit - 100 kobo = 1 Naira)
    amount_in_naira = plan_details.price_monthly
    amount_in_kobo = amount_in_naira * 100

    try:
        # Initialize transaction with Paystack
        result = await paystack_service.initialize_transaction(
            email=email,
            amount=amount_in_kobo,
            callback_url=callback_url,
            currency="NGN",
            metadata={
                "organization_id": str(org_id),
                "user_id": str(current_user["id"]),
                "plan": plan_enum.value,
                "customer_name": full_name,
            },
        )

        # Return config for frontend
        return {
            "authorization_url": result.get("authorization_url"),
            "access_code": result.get("access_code"),
            "reference": result.get("reference"),
            "public_key": settings.PAYSTACK_PUBLIC_KEY,
            "amount": amount_in_kobo,
            "currency": "NGN",
            "plan": plan_enum.value,
        }

    except PaystackError as e:
        logger.error(f"Paystack initialization error: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment initialization failed: {e.message}"
        )


@router.get("/paystack/verify/{reference}")
async def verify_paystack_payment(
    reference: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Verify a Paystack payment by reference
    Call this after user completes payment
    """
    try:
        result = await paystack_service.verify_transaction(reference)

        if result.get("status") != "success":
            return {
                "verified": False,
                "message": "Payment not successful",
                "status": result.get("status"),
            }

        # Extract metadata from Paystack response
        metadata = result.get("metadata", {})
        if isinstance(metadata, str):
            import json
            try:
                metadata = json.loads(metadata)
            except:
                metadata = {}
        
        plan_value = metadata.get("plan")
        org_id = metadata.get("organization_id")
        
        # If org_id is None or missing, get it from current user
        if not org_id:
            org_id = current_user.get("organization_id")
        
        if not plan_value:
            return {
                "verified": False,
                "message": "Could not determine plan from payment. Please contact support.",
            }
        
        # If user still doesn't have an organization, create one now
        if not org_id:
            now_for_org = datetime.utcnow()
            email = current_user.get("email", "")
            org_name = current_user.get("company_name") or f"{email.split('@')[0]}'s Organization"
            
            org_create_result = supabase.table("organizations").insert({
                "name": org_name,
                "is_active": True,
                "created_at": now_for_org.isoformat(),
                "updated_at": now_for_org.isoformat(),
            }).execute()
            
            if org_create_result.data:
                org_id = org_create_result.data[0]["id"]
                # Link user to organization
                supabase.table("users").update({
                    "organization_id": org_id,
                    "updated_at": now_for_org.isoformat(),
                }).eq("id", current_user["id"]).execute()
                logger.info(f"Created organization {org_id} for user {current_user['id']} during payment verification")
            else:
                return {
                    "verified": False,
                    "message": "Failed to create organization. Please contact support.",
                }

        # Activate subscription
        plan = SubscriptionPlan(plan_value)
        plan_details = PLAN_DETAILS[plan]
        now = datetime.utcnow()

        # Check if organization already has a subscription
        org_result = supabase.table("organizations").select("subscription_id").eq("id", org_id).execute()

        if org_result.data and org_result.data[0].get("subscription_id"):
            # Update existing subscription
            sub_id = org_result.data[0]["subscription_id"]
            supabase.table("subscriptions").update({
                "organization_id": org_id,
                "plan": plan.value,
                "status": SubscriptionStatus.ACTIVE.value,
                "price_monthly": plan_details.price_monthly,
                "currency": "NGN",
                "max_tracked_companies": plan_details.max_tracked_companies,
                "max_team_members": plan_details.max_team_members,
                "max_contacts_per_company": plan_details.max_contacts_per_company,
                "current_period_start": now.isoformat(),
                "current_period_end": (now + timedelta(days=30)).isoformat(),
                "paystack_reference": reference,
                "updated_at": now.isoformat(),
            }).eq("id", sub_id).execute()
            logger.info(f"Updated subscription {sub_id} for org {org_id} to plan {plan.value}")
        else:
            # Create new subscription with organization_id
            subscription_data = {
                "organization_id": org_id,
                "plan": plan.value,
                "status": SubscriptionStatus.ACTIVE.value,
                "price_monthly": plan_details.price_monthly,
                "currency": "NGN",
                "max_tracked_companies": plan_details.max_tracked_companies,
                "max_team_members": plan_details.max_team_members,
                "max_contacts_per_company": plan_details.max_contacts_per_company,
                "current_period_start": now.isoformat(),
                "current_period_end": (now + timedelta(days=30)).isoformat(),
                "paystack_reference": reference,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }

            sub_result = supabase.table("subscriptions").insert(subscription_data).execute()
            if sub_result.data:
                sub_id = sub_result.data[0]["id"]
                supabase.table("organizations").update({
                    "subscription_id": sub_id,
                    "updated_at": now.isoformat(),
                }).eq("id", org_id).execute()
                logger.info(f"Created subscription {sub_id} for org {org_id} with plan {plan.value}")

        # Generate access code for extension activation
        access_code = generate_access_code()
        supabase.table("access_codes").insert({
            "code": access_code,
            "organization_id": org_id,
            "created_by_id": current_user["id"],
            "is_used": False,
            "is_active": True,
            "expires_at": (now + timedelta(days=30)).isoformat(),
            "created_at": now.isoformat(),
        }).execute()

        return {
            "verified": True,
            "message": "Payment successful",
            "plan": plan.value,
            "access_code": access_code,
            "amount": result.get("amount"),
            "currency": "NGN",
        }

    except PaystackError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment verification failed: {e.message}"
        )


@router.post("/paystack/webhook")
async def paystack_webhook(
    request: Request,
    x_paystack_signature: str = Header(None, alias="x-paystack-signature"),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Handle Paystack webhook events
    https://paystack.com/docs/payments/webhooks/
    """
    body = await request.body()

    # Verify webhook signature
    if x_paystack_signature:
        if not paystack_service.verify_webhook(body, x_paystack_signature):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature"
            )

    try:
        payload = await request.json()
        event = payload.get("event")
        data = payload.get("data", {})

        logger.info(f"Paystack webhook received: {event}")
        logger.debug(f"Webhook data: {data}")

        # Handle different event types
        if event == "charge.success":
            # Payment successful - activate subscription
            metadata = data.get("metadata", {})
            if isinstance(metadata, str):
                import json
                try:
                    metadata = json.loads(metadata)
                except:
                    metadata = {}
            
            org_id = metadata.get("organization_id")
            user_id = metadata.get("user_id")
            plan_value = metadata.get("plan")
            reference = data.get("reference")
            amount = data.get("amount", 0)  # Amount in kobo
            currency = data.get("currency", "NGN")

            if org_id and plan_value and reference:
                plan = SubscriptionPlan(plan_value)
                plan_details = PLAN_DETAILS[plan]
                now = datetime.utcnow()

                # Store transaction in database
                transaction_data = {
                    "organization_id": org_id,
                    "user_id": user_id,
                    "paystack_reference": reference,
                    "amount": amount,
                    "currency": currency,
                    "plan": plan.value,
                    "status": "success",
                    "gateway_response": data.get("gateway_response", "success"),
                    "metadata": metadata,
                    "transaction_date": now.isoformat(),
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                }

                # Insert transaction (ignore if already exists)
                try:
                    supabase.table("transactions").insert(transaction_data).execute()
                except Exception as e:
                    logger.warning(f"Transaction already exists or insert failed: {e}")

                # Update or create subscription
                org_result = supabase.table("organizations").select("subscription_id").eq("id", org_id).execute()

                if org_result.data and org_result.data[0].get("subscription_id"):
                    sub_id = org_result.data[0]["subscription_id"]
                    supabase.table("subscriptions").update({
                        "plan": plan.value,
                        "status": SubscriptionStatus.ACTIVE.value,
                        "currency": "NGN",
                        "current_period_start": now.isoformat(),
                        "current_period_end": (now + timedelta(days=30)).isoformat(),
                        "paystack_reference": reference,
                        "updated_at": now.isoformat(),
                    }).eq("id", sub_id).execute()
                else:
                    # Create new subscription
                    subscription_data = {
                        "organization_id": org_id,
                        "plan": plan.value,
                        "status": SubscriptionStatus.ACTIVE.value,
                        "price_monthly": plan_details.price_monthly,
                        "currency": "NGN",
                        "max_tracked_companies": plan_details.max_tracked_companies,
                        "max_team_members": plan_details.max_team_members,
                        "max_contacts_per_company": plan_details.max_contacts_per_company,
                        "current_period_start": now.isoformat(),
                        "current_period_end": (now + timedelta(days=30)).isoformat(),
                        "paystack_reference": reference,
                        "created_at": now.isoformat(),
                        "updated_at": now.isoformat(),
                    }

                    sub_result = supabase.table("subscriptions").insert(subscription_data).execute()
                    if sub_result.data:
                        supabase.table("organizations").update({
                            "subscription_id": sub_result.data[0]["id"],
                            "updated_at": now.isoformat(),
                        }).eq("id", org_id).execute()

                logger.info(f"Subscription activated for org {org_id} with plan {plan.value}")

        elif event == "charge.failed":
            # Payment failed
            reference = data.get("reference")
            logger.warning(f"Payment failed for reference: {reference}")

        return {"status": "success"}

    except Exception as e:
        # Log error but return 200 to acknowledge receipt
        logger.error(f"Webhook processing error: {e}")
        return {"status": "error", "message": str(e)}


@router.get("/payment-history")
async def get_payment_history(
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Get payment history for the current user's organization
    Returns transactions stored in the database
    """
    org_id = current_user.get("organization_id")
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with an organization"
        )

    # Get transactions from database
    result = supabase.table("transactions").select("*").eq("organization_id", org_id).order("transaction_date", desc=True).execute()

    transactions = result.data if result.data else []

    # Format transactions for frontend
    payments = []
    for tx in transactions:
        payments.append({
            "id": tx.get("id"),
            "reference": tx.get("korapay_reference") or tx.get("paystack_reference"),
            "amount": tx.get("amount"),
            "currency": tx.get("currency", "USD"),
            "plan": tx.get("plan"),
            "status": tx.get("status"),
            "date": tx.get("transaction_date") or tx.get("created_at"),
            "gateway_response": tx.get("gateway_response"),
        })

    return {"payments": payments}
