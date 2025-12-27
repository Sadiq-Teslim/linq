"""
Data Export endpoints (F3.3)
CSV export for CRM integration
"""
import csv
import io
from typing import List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.db.supabase_client import get_supabase_client, SupabaseClient
from app.schemas.company import LeadExportData
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


@router.get("/csv")
async def export_leads_csv(
    company_names: str = Query(
        ...,
        description="Comma-separated list of company names to export"
    ),
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Export lead data as CSV for CRM integration (F3.3)

    CSV includes:
    - Company Name, Industry, Country, Website
    - Decision Maker Name, Title, Email, Phone, LinkedIn
    - Contact Verification Score
    - AI Summary
    - Pain Points
    - Conversion Score & Label
    """
    names = [n.strip() for n in company_names.split(",") if n.strip()]

    if not names:
        return {"error": "No company names provided"}

    # Fetch cached data for each company
    leads = []
    for name in names:
        try:
            result = supabase.table("company_cache")\
                .select("*")\
                .ilike("company_name", f"%{name}%")\
                .order("updated_at", desc=True)\
                .limit(1)\
                .execute()

            if result.data:
                cached = result.data[0]
                lead = _build_export_data(cached)
                leads.append(lead)
        except Exception as e:
            print(f"Error fetching {name}: {e}")
            continue

    if not leads:
        return {"error": "No data found for the specified companies"}

    # Generate CSV
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "company_name",
        "industry",
        "country",
        "website",
        "decision_maker_name",
        "decision_maker_title",
        "decision_maker_email",
        "decision_maker_phone",
        "decision_maker_linkedin",
        "contact_verification_score",
        "ai_summary",
        "pain_points",
        "conversion_score",
        "score_label",
        "exported_at",
    ])

    writer.writeheader()
    for lead in leads:
        writer.writerow(lead.model_dump())

    output.seek(0)

    # Return as downloadable CSV
    filename = f"linq_leads_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/csv/bulk")
async def export_all_leads_csv(
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase_client),
):
    """
    Export all cached leads as CSV
    """
    try:
        result = supabase.table("company_cache")\
            .select("*")\
            .order("updated_at", desc=True)\
            .limit(1000)\
            .execute()

        if not result.data:
            return {"error": "No cached data available"}

        leads = [_build_export_data(cached) for cached in result.data]

        # Generate CSV
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=[
            "company_name",
            "industry",
            "country",
            "website",
            "decision_maker_name",
            "decision_maker_title",
            "decision_maker_email",
            "decision_maker_phone",
            "decision_maker_linkedin",
            "contact_verification_score",
            "ai_summary",
            "pain_points",
            "conversion_score",
            "score_label",
            "exported_at",
        ])

        writer.writeheader()
        for lead in leads:
            writer.writerow(lead.model_dump())

        output.seek(0)

        filename = f"linq_all_leads_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        return {"error": str(e)}


def _build_export_data(cached: Dict[str, Any]) -> LeadExportData:
    """Build export data from cached company data"""
    profile = cached.get("profile_data") or {}
    decision_makers = cached.get("decision_makers") or []
    pain_points = cached.get("predicted_pain_points") or []

    # Get primary decision maker
    primary_dm = decision_makers[0] if decision_makers else {}
    dm_contact = primary_dm.get("contact") or {}

    return LeadExportData(
        company_name=cached.get("company_name", "Unknown"),
        industry=profile.get("industry"),
        country=profile.get("country", "Nigeria"),
        website=profile.get("website"),
        decision_maker_name=primary_dm.get("name"),
        decision_maker_title=primary_dm.get("title"),
        decision_maker_email=dm_contact.get("email"),
        decision_maker_phone=dm_contact.get("phone"),
        decision_maker_linkedin=primary_dm.get("linkedin_url"),
        contact_verification_score=dm_contact.get("verification_score", 0),
        ai_summary=cached.get("ai_summary", ""),
        pain_points=", ".join(pain_points) if pain_points else "",
        conversion_score=cached.get("conversion_score", 0),
        score_label=cached.get("score_label", ""),
    )
