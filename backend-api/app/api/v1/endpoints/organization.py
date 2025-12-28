"""
Organization and Team Management endpoints
Handles team member management and organization settings
"""
from typing import Dict, Any, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.db.supabase_client import get_supabase_client, SupabaseClient
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


class TeamMemberInvite(BaseModel):
    email: EmailStr
    role: str = "member"  # owner, admin, member


class TeamMemberResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: str


@router.get("/team-members")
def get_team_members(
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Get all team members for the current user's organization
    """
    org_id = current_user.get("organization_id")
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with an organization"
        )

    # Get all users in the organization
    result = supabase.table("users").select("id, email, full_name, is_active, created_at").eq("organization_id", org_id).execute()

    # For now, we'll use a simple role system
    # In production, you'd have a separate user_roles table
    team_members = []
    for user in (result.data or []):
        # Determine role (first user is owner, others are members)
        role = "owner" if user["id"] == current_user["id"] else "member"
        team_members.append({
            "id": user["id"],
            "email": user["email"],
            "full_name": user.get("full_name", ""),
            "role": role,
            "is_active": user.get("is_active", True),
            "created_at": user.get("created_at", ""),
        })

    return {"team_members": team_members}


@router.post("/team-members/invite")
def invite_team_member(
    invite: TeamMemberInvite,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Invite a new team member to the organization
    """
    org_id = current_user.get("organization_id")
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with an organization"
        )

    # Check subscription limits
    org_result = supabase.table("organizations").select("*, subscriptions(max_team_members)").eq("id", org_id).execute()
    if not org_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    org = org_result.data[0]
    subscription = org.get("subscriptions", {})
    max_members = subscription.get("max_team_members", 1)

    # Count current team members
    current_members_result = supabase.table("users").select("id", count="exact").eq("organization_id", org_id).execute()
    current_count = current_members_result.count if hasattr(current_members_result, 'count') else len(current_members_result.data or [])

    if max_members > 0 and current_count >= max_members:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Team member limit reached ({max_members} members). Please upgrade your plan."
        )

    # Check if user already exists
    existing_user = supabase.table("users").select("id, organization_id").eq("email", invite.email).execute()
    
    if existing_user.data:
        user = existing_user.data[0]
        if user.get("organization_id") == org_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a member of this organization"
            )
        # Update user's organization
        supabase.table("users").update({
            "organization_id": org_id,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", user["id"]).execute()
    else:
        # Create new user (they'll need to set password on first login)
        supabase.table("users").insert({
            "email": invite.email,
            "organization_id": org_id,
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }).execute()

    return {
        "message": "Team member invited successfully",
        "email": invite.email,
    }


@router.delete("/team-members/{user_id}")
def remove_team_member(
    user_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Remove a team member from the organization
    """
    org_id = current_user.get("organization_id")
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with an organization"
        )

    # Prevent removing yourself
    if user_id == current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove yourself from the organization"
        )

    # Verify user belongs to organization
    user_result = supabase.table("users").select("id, organization_id").eq("id", user_id).eq("organization_id", org_id).execute()
    
    if not user_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found"
        )

    # Remove user from organization (set organization_id to null)
    supabase.table("users").update({
        "organization_id": None,
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("id", user_id).execute()

    return {"message": "Team member removed successfully"}

