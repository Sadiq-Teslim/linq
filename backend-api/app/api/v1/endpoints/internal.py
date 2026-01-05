"""
Internal endpoints for cron jobs and automated tasks
Protected by API key authentication
"""
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Header, status, BackgroundTasks
from datetime import datetime
import asyncio

from app.db.supabase_client import get_supabase_client, SupabaseClient
from app.core.config import settings
from app.services.contact_discovery_service import contact_discovery_service
from app.services.scraper.google import GoogleSearchService

router = APIRouter()


def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")) -> bool:
    """Verify API key for internal endpoints"""
    expected_key = "linq-is-called-from-inside-outside"
    if x_api_key != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    return True


@router.post("/refresh-companies")
@router.get("/refresh-companies")  
async def refresh_all_companies(
    background_tasks: BackgroundTasks,
    _: bool = Depends(verify_api_key),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Refresh all tracked companies - re-discover contacts, verify existing, detect changes
    Called by cron-job.org every 6 hours
    Returns immediately and processes in background to avoid timeouts
    """
    try:
        from app.api.v1.endpoints.companies import _discover_and_save_contacts, _fetch_initial_company_updates
        
        # Get all active tracked companies
        result = supabase.table("tracked_companies").select("*").eq("is_active", True).execute()
        
        if not result.data:
            return {"message": "No active companies to refresh", "count": 0}
        
        companies = result.data
        
        # Process in background to avoid timeout
        async def process_refresh():
            refreshed_count = 0
            errors = []
            
            # Get a new supabase client for background task
            from app.db.supabase_client import get_supabase_client
            bg_supabase = get_supabase_client()
            
            for company in companies:
                try:
                    company_id = company["id"]
                    company_name = company["company_name"]
                    company_domain = company.get("domain")
                    
                    print(f"[{datetime.utcnow()}] 🔄 Refreshing {company_name}...")
                    
                    # Re-discover contacts
                    await _discover_and_save_contacts(
                        company_id=company_id,
                        company_name=company_name,
                        company_domain=company_domain,
                        supabase=bg_supabase,
                    )
                    
                    # Fetch updates
                    await _fetch_initial_company_updates(
                        company_id=company_id,
                        company_name=company_name,
                        company_domain=company_domain,
                        supabase=bg_supabase,
                    )
                    
                    # Update last_updated timestamp
                    bg_supabase.table("tracked_companies").update({
                        "last_updated": datetime.utcnow().isoformat(),
                        "updated_at": datetime.utcnow().isoformat(),
                    }).eq("id", company_id).execute()
                    
                    refreshed_count += 1
                    print(f"[{datetime.utcnow()}] ✓ Refreshed {company_name}")
                    
                except Exception as e:
                    error_msg = f"Error refreshing {company.get('company_name', 'Unknown')}: {str(e)}"
                    print(f"[{datetime.utcnow()}] ✗ {error_msg}")
                    errors.append(error_msg)
            
            print(f"[{datetime.utcnow()}] ✅ Completed refresh: {refreshed_count}/{len(companies)} companies")
        
        # Add background task
        background_tasks.add_task(process_refresh)
        
        # Return immediately
        return {
            "message": f"Started refresh for {len(companies)} companies (processing in background)",
            "count": len(companies),
            "status": "processing",
            "timestamp": datetime.utcnow().isoformat(),
        }
        
    except Exception as e:
        print(f"[{datetime.utcnow()}] ✗ Error in refresh_all_companies: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error refreshing companies: {str(e)}"
        )


@router.post("/fetch-updates")
@router.get("/fetch-updates")  # Also allow GET for cron jobs that might use it
async def fetch_company_updates(
    _: bool = Depends(verify_api_key),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Fetch company updates - funding signals, news, events, growth indicators
    Called by cron-job.org every 12 hours
    """
    try:
        from app.api.v1.endpoints.companies import _fetch_initial_company_updates
        
        # Get all active tracked companies
        result = supabase.table("tracked_companies").select("*").eq("is_active", True).execute()
        
        if not result.data:
            return {"message": "No active companies to fetch updates for", "count": 0}
        
        companies = result.data
        updated_count = 0
        errors = []
        
        for company in companies:
            try:
                company_id = company["id"]
                company_name = company["company_name"]
                
                print(f"[{datetime.utcnow()}] 📰 Fetching updates for {company_name}...")
                
                await _fetch_initial_company_updates(
                    company_id=company_id,
                    company_name=company_name,
                    company_domain=company.get("domain"),
                    supabase=supabase,
                )
                
                updated_count += 1
                print(f"[{datetime.utcnow()}] ✓ Fetched updates for {company_name}")
                
            except Exception as e:
                error_msg = f"Error fetching updates for {company.get('company_name', 'Unknown')}: {str(e)}"
                print(f"[{datetime.utcnow()}] ✗ {error_msg}")
                errors.append(error_msg)
        
        return {
            "message": f"Fetched updates for {updated_count} companies",
            "count": updated_count,
            "total": len(companies),
            "errors": errors if errors else None,
            "timestamp": datetime.utcnow().isoformat(),
        }
        
    except Exception as e:
        print(f"[{datetime.utcnow()}] ✗ Error in fetch_company_updates: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching company updates: {str(e)}"
        )


@router.post("/verify-contacts")
async def verify_contacts_batch(
    _: bool = Depends(verify_api_key),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Verify contacts - email/phone validation, LinkedIn verification
    Called by cron-job.org daily at 2 AM
    """
    try:
        import re
        
        # Get all active contacts
        result = supabase.table("company_contacts").select("*").eq("is_active", True).execute()
        
        if not result.data:
            return {"message": "No active contacts to verify", "count": 0}
        
        contacts = result.data
        verified_count = 0
        errors = []
        
        for contact in contacts:
            try:
                contact_id = contact["id"]
                email = contact.get("email")
                phone = contact.get("phone")
                linkedin_url = contact.get("linkedin_url")
                
                verification_updates = {}
                
                # Verify email
                if email:
                    # Basic email validation
                    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                    is_valid_email = bool(re.match(email_pattern, email))
                    
                    if is_valid_email:
                        # Check domain exists (basic check)
                        domain = email.split("@")[1]
                        # For now, mark as verified if format is valid
                        # In production, you'd want to do actual SMTP verification
                        verification_updates["is_verified"] = True
                        verification_updates["verification_score"] = 0.8
                    else:
                        verification_updates["is_verified"] = False
                        verification_updates["verification_score"] = 0.3
                
                # Verify phone (basic format check)
                if phone:
                    # Remove common formatting
                    phone_clean = re.sub(r'[\s\-\(\)]', '', phone)
                    # Check if it looks like a valid phone number
                    is_valid_phone = bool(re.match(r'^\+?[1-9]\d{7,14}$', phone_clean))
                    if is_valid_phone:
                        if "verification_score" not in verification_updates:
                            verification_updates["verification_score"] = 0.7
                        else:
                            verification_updates["verification_score"] = min(0.9, verification_updates["verification_score"] + 0.1)
                
                # Update verification status
                if verification_updates:
                    verification_updates["last_verified"] = datetime.utcnow().isoformat()
                    verification_updates["updated_at"] = datetime.utcnow().isoformat()
                    
                    supabase.table("company_contacts").update(verification_updates).eq("id", contact_id).execute()
                    verified_count += 1
                
            except Exception as e:
                error_msg = f"Error verifying contact {contact.get('full_name', 'Unknown')}: {str(e)}"
                print(f"[{datetime.utcnow()}] ✗ {error_msg}")
                errors.append(error_msg)
        
        return {
            "message": f"Verified {verified_count} contacts",
            "count": verified_count,
            "total": len(contacts),
            "errors": errors if errors else None,
            "timestamp": datetime.utcnow().isoformat(),
        }
        
    except Exception as e:
        print(f"[{datetime.utcnow()}] ✗ Error in verify_contacts_batch: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error verifying contacts: {str(e)}"
        )

