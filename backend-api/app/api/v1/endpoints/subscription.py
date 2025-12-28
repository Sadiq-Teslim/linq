"""
Subscription and Access Code endpoints
Handles billing, plan management, and extension activation
Uses real Paystack integration for payments
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
PAYSTACK_PLAN_CODES: Dict[SubscriptionPlan, str] = {
    SubscriptionPlan.STARTER: "",  # Set via environment or create on startup
    SubscriptionPlan.PROFESSIONAL: "",
    SubscriptionPlan.ENTERPRISE: "",
}


# ===== Plan Definitions =====

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
        price_monthly=14500,  # ₦14,500 per month (multiply by 100 for Paystack kobo)
        price_yearly=130500,  # ₦130,500 per year (2 months free)
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
        price_monthly=39500,  # ₦39,500 per month (multiply by 100 for Paystack kobo)
        price_yearly=355500,  # ₦355,500 per year (2 months free)
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
        price_monthly=99500,  # ₦99,500 per month (multiply by 100 for Paystack kobo)
        price_yearly=895500,  # ₦895,500 per year (2 months free)
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
    org_result = supabase.table("organizations").select("*, subscriptions(plan)").eq("id", org_id).execute()

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
    org_result = supabase.table("organizations").select("name, subscriptions(plan)").eq("id", org_id).execute()
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

    result = supabase.table("access_codes").select("*, organizations(name, subscriptions(plan))").eq("code", data.code).execute()

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
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            message="Demo mode activated successfully",
        )

    # Validate code first
    result = supabase.table("access_codes").select("*, organizations(id, name, subscriptions(plan))").eq("code", data.code).execute()

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

    # Create session token
    auth_service = AuthService(supabase)
    access_token = auth_service.create_extension_session(org_id)

    return ActivationResult(
        success=True,
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
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
        message="Extension activated successfully",
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
# PAYSTACK INTEGRATION - Real Payment Processing
# =============================================================================

@router.post("/paystack/initialize")
async def initialize_payment(
    plan: str = Query(...),
    callback_url: str = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Initialize a Paystack payment for subscription
    Returns a payment URL to redirect the user to
    """
    import sys
    sys.stderr.write(f"\n\n>>> ENDPOINT REACHED\n")
    sys.stderr.write(f">>> Plan (raw string): {plan}\n")
    sys.stderr.write(f">>> Callback URL: {callback_url}\n")
    sys.stderr.flush()
    
    # Try to convert to enum
    try:
        plan_enum = SubscriptionPlan(plan)
        sys.stderr.write(f">>> Plan enum converted: {plan_enum}\n")
        sys.stderr.flush()
    except ValueError as e:
        sys.stderr.write(f">>> ERROR converting plan to enum: {e}\n")
        sys.stderr.flush()
        return {"error": f"Invalid plan: {plan}"}
    
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

    try:
        # Initialize transaction with Paystack
        # Paystack requires amounts in kobo (smallest currency unit)
        # 1 Naira = 100 Kobo
        # So we multiply the Naira amount by 100 to get kobo
        amount_in_naira = plan_details.price_monthly  # Already in Naira (e.g., 14500 = ₦14,500)
        amount_in_kobo = amount_in_naira * 100  # Convert to kobo (e.g., 1,450,000 kobo)
        
        import sys
        sys.stderr.write(f"\n\n=== PAYSTACK PAYMENT INIT ===\n")
        sys.stderr.write(f"Plan: {plan_enum}\n")
        sys.stderr.write(f"Email: {email}\n")
        sys.stderr.write(f"Amount (Naira): ₦{amount_in_naira:,}\n")
        sys.stderr.write(f"Amount (Kobo): {amount_in_kobo:,} kobo\n")
        sys.stderr.write(f"Callback URL: {callback_url}\n")
        sys.stderr.write(f"================================\n\n")
        sys.stderr.flush()
        
        result = await paystack_service.initialize_transaction(
            email=email,
            amount=amount_in_kobo,  # Paystack expects amount in kobo
            callback_url=callback_url,
            currency=plan_details.currency,  # NGN
            metadata={
                "organization_id": org_id,
                "user_id": current_user["id"],
                "plan": plan_enum.value,
            },
        )

        return {
            "authorization_url": result.get("authorization_url"),
            "access_code": result.get("access_code"),
            "reference": result.get("reference"),
        }

    except PaystackError as e:
        logger.error(f"Paystack error: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment initialization failed: {e.message}"
        )


@router.get("/paystack/verify/{reference}")
async def verify_payment(
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

        # Extract metadata - Paystack may nest it differently
        metadata = result.get("metadata", {})
        # Sometimes metadata comes as a string or nested object
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
            # Try to get plan from custom_fields if metadata didn't have it
            custom_fields = result.get("custom_fields", [])
            for field in custom_fields:
                if field.get("variable_name") == "plan":
                    plan_value = field.get("value")
                    break
        
        if not plan_value:
            return {
                "verified": False,
                "message": "Could not determine plan from payment. Please contact support.",
            }
        
        if not org_id:
            return {
                "verified": False,
                "message": "No organization found. Please contact support.",
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
                "plan": plan.value,
                "status": SubscriptionStatus.ACTIVE.value,
                "price_monthly": plan_details.price_monthly,
                "max_tracked_companies": plan_details.max_tracked_companies,
                "max_team_members": plan_details.max_team_members,
                "max_contacts_per_company": plan_details.max_contacts_per_company,
                "current_period_start": now.isoformat(),
                "current_period_end": (now + timedelta(days=30)).isoformat(),
                "paystack_customer_code": result.get("customer", {}).get("customer_code"),
                "updated_at": now.isoformat(),
            }).eq("id", sub_id).execute()
        else:
            # Create new subscription
            subscription_data = {
                "plan": plan.value,
                "status": SubscriptionStatus.ACTIVE.value,
                "price_monthly": plan_details.price_monthly,
                "currency": plan_details.currency,
                "max_tracked_companies": plan_details.max_tracked_companies,
                "max_team_members": plan_details.max_team_members,
                "max_contacts_per_company": plan_details.max_contacts_per_company,
                "current_period_start": now.isoformat(),
                "current_period_end": (now + timedelta(days=30)).isoformat(),
                "paystack_customer_code": result.get("customer", {}).get("customer_code"),
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }

            sub_result = supabase.table("subscriptions").insert(subscription_data).execute()
            if sub_result.data:
                supabase.table("organizations").update({
                    "subscription_id": sub_result.data[0]["id"],
                    "updated_at": now.isoformat(),
                }).eq("id", org_id).execute()

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
            "currency": result.get("currency"),
        }

    except PaystackError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment verification failed: {e.message}"
        )


@router.post("/paystack/webhook")
async def paystack_webhook(
    request: Request,
    x_paystack_signature: str = Header(None),
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

        # Handle different event types
        if event == "charge.success":
            # Payment successful - activate subscription
            metadata = data.get("metadata", {})
            org_id = metadata.get("organization_id")
            user_id = metadata.get("user_id")
            plan_value = metadata.get("plan")
            reference = data.get("reference")
            amount = data.get("amount", 0)  # Amount in kobo
            currency = data.get("currency", "NGN")
            customer_code = data.get("customer", {}).get("customer_code") if isinstance(data.get("customer"), dict) else None
            authorization_code = data.get("authorization", {}).get("authorization_code") if isinstance(data.get("authorization"), dict) else None

            if org_id and plan_value and reference:
                plan = SubscriptionPlan(plan_value)
                plan_details = PLAN_DETAILS[plan]
                now = datetime.utcnow()

                # Store transaction in database
                transaction_data = {
                    "organization_id": org_id,
                    "user_id": user_id,
                    "paystack_reference": reference,
                    "paystack_customer_code": customer_code,
                    "paystack_authorization_code": authorization_code,
                    "amount": amount,
                    "currency": currency,
                    "plan": plan.value,
                    "status": "success",
                    "gateway_response": data.get("gateway_response", ""),
                    "metadata": metadata,
                    "transaction_date": data.get("paid_at") or now.isoformat(),
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                }

                # Insert transaction (ignore if already exists)
                try:
                    supabase.table("transactions").insert(transaction_data).execute()
                except Exception as e:
                    # Transaction might already exist, that's okay
                    logger.warning(f"Transaction already exists or insert failed: {e}")

                # Update or create subscription
                org_result = supabase.table("organizations").select("subscription_id").eq("id", org_id).execute()

                if org_result.data and org_result.data[0].get("subscription_id"):
                    sub_id = org_result.data[0]["subscription_id"]
                    supabase.table("subscriptions").update({
                        "plan": plan.value,
                        "status": SubscriptionStatus.ACTIVE.value,
                        "current_period_start": now.isoformat(),
                        "current_period_end": (now + timedelta(days=30)).isoformat(),
                        "paystack_customer_code": customer_code,
                        "updated_at": now.isoformat(),
                    }).eq("id", sub_id).execute()
                else:
                    # Create new subscription
                    subscription_data = {
                        "plan": plan.value,
                        "status": SubscriptionStatus.ACTIVE.value,
                        "price_monthly": plan_details.price_monthly,
                        "currency": plan_details.currency,
                        "max_tracked_companies": plan_details.max_tracked_companies,
                        "max_team_members": plan_details.max_team_members,
                        "max_contacts_per_company": plan_details.max_contacts_per_company,
                        "current_period_start": now.isoformat(),
                        "current_period_end": (now + timedelta(days=30)).isoformat(),
                        "paystack_customer_code": customer_code,
                        "created_at": now.isoformat(),
                        "updated_at": now.isoformat(),
                    }

                    sub_result = supabase.table("subscriptions").insert(subscription_data).execute()
                    if sub_result.data:
                        supabase.table("organizations").update({
                            "subscription_id": sub_result.data[0]["id"],
                            "updated_at": now.isoformat(),
                        }).eq("id", org_id).execute()

        elif event == "subscription.disable":
            # Subscription cancelled
            subscription_code = data.get("subscription_code")
            if subscription_code:
                supabase.table("subscriptions").update({
                    "status": SubscriptionStatus.CANCELLED.value,
                    "cancelled_at": datetime.utcnow().isoformat(),
                }).eq("paystack_subscription_code", subscription_code).execute()

        elif event == "invoice.payment_failed":
            # Payment failed - update status
            subscription_code = data.get("subscription", {}).get("subscription_code")
            if subscription_code:
                supabase.table("subscriptions").update({
                    "status": SubscriptionStatus.PAST_DUE.value,
                    "updated_at": datetime.utcnow().isoformat(),
                }).eq("paystack_subscription_code", subscription_code).execute()

        return {"status": "success"}

    except Exception as e:
        # Log error but return 200 to acknowledge receipt
        print(f"Webhook processing error: {e}")
        return {"status": "error", "message": str(e)}


@router.post("/paystack/create-customer")
async def create_paystack_customer(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Create a Paystack customer for the current user
    """
    try:
        customer = await paystack_service.create_customer(
            email=current_user["email"],
            first_name=current_user.get("full_name", "").split()[0] if current_user.get("full_name") else None,
            last_name=current_user.get("full_name", "").split()[-1] if current_user.get("full_name") and " " in current_user.get("full_name", "") else None,
            metadata={
                "user_id": current_user["id"],
                "organization_id": current_user.get("organization_id"),
            },
        )

        return {
            "customer_code": customer.get("customer_code"),
            "email": customer.get("email"),
        }

    except PaystackError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create customer: {e.message}"
        )


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
            "reference": tx.get("paystack_reference"),
            "amount": tx.get("amount"),
            "currency": tx.get("currency", "NGN"),
            "plan": tx.get("plan"),
            "status": tx.get("status"),
            "date": tx.get("transaction_date") or tx.get("created_at"),
            "gateway_response": tx.get("gateway_response"),
        })

    return {"payments": payments}
