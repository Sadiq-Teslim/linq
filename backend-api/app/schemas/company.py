"""
Company intelligence schemas - The main output structure for the frontend
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class CompanySearchRequest(BaseModel):
    """Request to search/analyze a company (F1.1)"""
    company_name: str = Field(..., min_length=2, max_length=255)
    country: Optional[str] = Field(default="Nigeria", description="Target country: Nigeria or Ghana")


class ContactInfo(BaseModel):
    """Contact information with verification score (F1.3)"""
    email: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    linkedin_url: Optional[str] = None
    verification_score: int = Field(default=0, ge=0, le=100, description="0-100 based on source strength")


class DecisionMaker(BaseModel):
    """Key executive/decision maker (F1.2)"""
    name: str
    title: str
    linkedin_url: Optional[str] = None
    contact: Optional[ContactInfo] = None


class CompanyProfile(BaseModel):
    """Basic company profile data"""
    name: str
    domain: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    headquarters: Optional[str] = None
    employee_count: Optional[str] = None
    founded_year: Optional[int] = None
    funding_stage: Optional[str] = None
    last_funding_amount: Optional[str] = None
    website: Optional[str] = None
    social_links: Optional[dict] = None


class CompanyIntelligence(BaseModel):
    """
    Complete company intelligence response
    This is the main output displayed in the extension popup
    """
    # Basic profile
    profile: CompanyProfile

    # Decision makers (F1.2)
    decision_makers: List[DecisionMaker] = []

    # AI-generated insights (F1.4)
    ai_summary: str = Field(
        ...,
        description="AI-generated 'Why Now' summary - max 3 sentences",
        max_length=500
    )
    predicted_pain_points: List[str] = []

    # Conversion score (F1.5)
    conversion_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="AI-generated Conversion Readiness Score"
    )
    score_factors: List[str] = Field(
        default=[],
        description="Factors contributing to the score"
    )

    # Metadata
    data_freshness: datetime = Field(default_factory=datetime.utcnow)
    sources_used: List[str] = []
    processing_time_ms: Optional[int] = None
