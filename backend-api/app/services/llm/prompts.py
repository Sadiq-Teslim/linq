"""
Prompt templates for Gemini AI analysis
Optimized for African B2B lead qualification (PRD F1.4, F1.5, F2.3)
"""
from typing import List, Dict, Any, Optional


class PromptTemplates:
    """Collection of prompt templates for different AI tasks"""

    @staticmethod
    def company_analysis(
        company_name: str,
        country: str,
        context: str,
        user_vertical: Optional[str] = None,
    ) -> str:
        """
        Generate prompt for company analysis and lead scoring (F1.4, F1.5)
        Contextual to user's vertical as per PRD requirements
        """
        vertical_context = ""
        if user_vertical:
            vertical_context = f"""
TARGET VERTICAL: {user_vertical}
Tailor your analysis to highlight relevance for a {user_vertical} company selling to this prospect."""

        return f"""You are LINQ AI, an expert B2B sales intelligence analyst specializing in West African markets (Nigeria and Ghana). You help SDRs and Account Executives at Fintechs, Banks, and Corporates find and qualify high-intent leads.

Analyze the following company and provide actionable sales intelligence.

COMPANY: {company_name}
COUNTRY: {country}
{vertical_context}

AVAILABLE CONTEXT:
{context}

Provide your analysis in this EXACT format:

SUMMARY: [Write exactly 2-3 sentences as a "Why Now" summary. Explain why this company might be ready to engage NOW. Focus on: recent funding, expansion plans, technology adoption, regulatory compliance needs, or growth signals. Be specific and actionable for a sales rep.]

SCORE_LABEL: [Provide ONE label: "Hot Lead - Act Now", "Warm Lead - Nurture", "Growth Stage - Monitor", "Early Stage - Long-term", or "Not Ready"]

CONVERSION_SCORE: [Number 0-100]
- 85-100: Hot - Recent funding, active hiring, expansion announced
- 70-84: Warm - Growth signals, may have budget
- 50-69: Moderate - Potential but needs nurturing
- 30-49: Cool - Long-term prospect
- 0-29: Cold - Not a fit currently

WHY_NOW_FACTORS:
- [Specific timing factor 1]
- [Specific timing factor 2]
- [Specific timing factor 3]

SCORE_FACTORS:
- [Factor]: [positive/negative] - [brief explanation]
- [Factor]: [positive/negative] - [brief explanation]
- [Factor]: [positive/negative] - [brief explanation]

PAIN_POINTS:
- [Specific pain point relevant to {country} market]
- [Technology or operational pain point]
- [Growth or scaling challenge]

INDUSTRY: [Identify the primary industry: Fintech, Banking, Logistics, E-commerce, AgriTech, HealthTech, EdTech, or Other]

Consider {country}-specific factors:
- Nigeria: NDPR compliance, CBN regulations, Naira volatility, Lagos/Abuja expansion
- Ghana: Data Protection Act, Bank of Ghana regulations, Cedi considerations, Accra tech ecosystem
- Regional: ECOWAS trade, mobile money adoption, infrastructure challenges

Every insight should help a sales rep personalize their cold outreach and book meetings."""

    @staticmethod
    def decision_maker_extraction(search_results: List[Dict[str, Any]]) -> str:
        """
        Generate prompt to extract decision maker info from search results
        """
        context = "\n".join([
            f"- {r.get('title', '')}: {r.get('snippet', '')}"
            for r in search_results[:10]
        ])

        return f"""Extract decision maker information from these search results.

SEARCH RESULTS:
{context}

For each person found, extract:
- Name: (Full name)
- Title: (Job title)
- LinkedIn: (LinkedIn URL if found)

Focus on:
1. C-Suite executives (CEO, CTO, CFO, COO)
2. Founders and Co-founders
3. Managing Directors
4. VPs and Directors of relevant departments

Format each person on separate lines:
Name: [name]
Title: [title]
LinkedIn: [url or N/A]

Only include people you can verify from the search results. Do not make up information."""

    @staticmethod
    def news_relevance_scoring(headline: str, summary: str, user_vertical: str = "Fintech") -> str:
        """
        Score news item relevance for the Live Feed
        """
        return f"""Score the relevance of this news item for a B2B salesperson targeting {user_vertical} companies in West Africa.

HEADLINE: {headline}
SUMMARY: {summary}

Provide a relevance score from 0.0 to 1.0 where:
- 0.9-1.0: Directly relevant buying signal (funding, expansion, new leadership)
- 0.7-0.8: Industry news affecting target companies
- 0.5-0.6: General market news
- 0.3-0.4: Tangentially related
- 0.0-0.2: Not relevant

Respond with just the number."""

    @staticmethod
    def local_language_interpretation(text: str, source_language: str = "pidgin") -> str:
        """
        Interpret business signals from local language content (F2.3)
        """
        return f"""You are fluent in West African business communication including Nigerian Pidgin, Ghanaian Twi references, and French used in Francophone Africa.

Interpret the following text and extract any business signals:

TEXT ({source_language}):
{text}

Provide:
1. English translation/interpretation
2. Any business signals detected (hiring, growth, challenges, partnerships)
3. Sentiment (positive, negative, neutral)

        Be concise and focus on actionable business intelligence."""

    @staticmethod
    def company_insights(
        company_name: str,
        company_data: Dict[str, Any],
        recent_updates: List[Dict[str, Any]],
        contacts: List[Dict[str, Any]],
        context: str,
    ) -> str:
        """
        Generate comprehensive insights for a tracked company
        """
        updates_text = "\n".join([
            f"- {u.get('title', '')}: {u.get('summary', '')}"
            for u in recent_updates[:5]
        ]) if recent_updates else "No recent updates"

        contacts_text = "\n".join([
            f"- {c.get('full_name', '')} ({c.get('title', '')}) - {'Decision Maker' if c.get('is_decision_maker') else 'Contact'}"
            for c in contacts[:5]
        ]) if contacts else "No contacts found"

        return f"""You are LINQ AI, an expert B2B sales intelligence analyst. Analyze this tracked company and provide strategic insights.

COMPANY: {company_name}
INDUSTRY: {company_data.get('industry', 'Unknown')}
HEADQUARTERS: {company_data.get('headquarters', 'Unknown')}
EMPLOYEE COUNT: {company_data.get('employee_count', 'Unknown')}

RECENT UPDATES:
{updates_text}

KEY CONTACTS:
{contacts_text}

ADDITIONAL CONTEXT:
{context}

Provide comprehensive analysis in this format:

STRATEGIC_INSIGHTS:
- [Key insight about company's position, growth trajectory, or market opportunity]
- [Strategic recommendation for engagement]
- [Competitive positioning or differentiation]

RELATIONSHIP_OPPORTUNITIES:
- [Specific opportunity to engage based on recent activity]
- [Best contact to approach and why]
- [Timing recommendation]

ACTION_RECOMMENDATIONS:
- [Immediate action item 1]
- [Action item 2]
- [Long-term strategy]

RISK_FACTORS:
- [Any risks or concerns about this prospect]
- [Market or industry challenges]

GROWTH_SIGNALS:
- [Positive growth indicators]
- [Expansion or investment signals]

Be specific, actionable, and focus on helping sales teams make informed decisions."""

    @staticmethod
    def update_analysis(
        company_name: str,
        update: Dict[str, Any],
    ) -> str:
        """
        Analyze a company update and provide context
        """
        return f"""Analyze this company update and provide actionable insights for a B2B salesperson.

COMPANY: {company_name}
UPDATE TYPE: {update.get('update_type', 'news')}
HEADLINE: {update.get('title', update.get('headline', ''))}
SUMMARY: {update.get('summary', '')}
SOURCE: {update.get('source_name', 'Unknown')}

Provide analysis in this format:

IMPORTANCE: [critical/high/medium/low]
- Critical: Funding, major expansion, leadership change, regulatory compliance
- High: Significant partnerships, product launches, market entry
- Medium: Hiring, minor partnerships, general news
- Low: Routine updates, minor announcements

IMPLICATIONS:
- [What this means for sales opportunities]
- [How this affects the company's needs]
- [Market or industry impact]

ACTION_ITEMS:
- [Specific action for sales team]
- [Who to contact and when]
- [Follow-up strategy]

TIMING_URGENCY: [urgent/normal/low]
- Urgent: Act within 24-48 hours
- Normal: Engage within 1-2 weeks
- Low: Monitor and nurture

Be concise and actionable."""

    @staticmethod
    def outreach_suggestions(
        company_name: str,
        contact: Dict[str, Any],
        company_context: Dict[str, Any],
    ) -> str:
        """
        Generate personalized outreach suggestions
        """
        return f"""Generate personalized cold outreach suggestions for this contact.

COMPANY: {company_name}
CONTACT: {contact.get('full_name', '')}
TITLE: {contact.get('title', '')}
DEPARTMENT: {contact.get('department', '')}
IS_DECISION_MAKER: {contact.get('is_decision_maker', False)}

COMPANY CONTEXT:
- Industry: {company_context.get('industry', 'Unknown')}
- Recent Activity: {company_context.get('recent_activity', 'No recent updates')}
- Growth Stage: {company_context.get('growth_stage', 'Unknown')}

Provide outreach suggestions in this format:

SUBJECT_LINE: [Compelling, personalized subject line (max 50 chars)]

OPENING_LINE: [Personalized opening that shows you researched them]

VALUE_PROPOSITION: [2-3 sentences about how you can help their company specifically]

CALL_TO_ACTION: [Clear, low-pressure CTA]

TONE: Professional but warm, West African business context
FOCUS: Their specific needs based on company context, not generic pitch"""
