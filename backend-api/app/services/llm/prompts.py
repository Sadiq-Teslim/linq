"""
Prompt templates for Gemini AI analysis
Optimized for African B2B lead qualification
"""
from typing import List, Dict, Any


class PromptTemplates:
    """Collection of prompt templates for different AI tasks"""

    @staticmethod
    def company_analysis(
        company_name: str,
        country: str,
        context: str,
    ) -> str:
        """
        Generate prompt for company analysis and lead scoring (F1.4, F1.5)
        """
        return f"""You are an expert B2B sales intelligence analyst specializing in West African markets (Nigeria and Ghana).

Analyze the following company and provide sales intelligence for a B2B sales representative.

COMPANY: {company_name}
COUNTRY: {country}

AVAILABLE CONTEXT:
{context}

Provide your analysis in the following format:

SUMMARY: (Write exactly 2-3 sentences explaining "Why Now" - why this company might be ready to buy. Focus on timing signals, growth indicators, or pain points that suggest buying readiness. Be specific and actionable.)

CONVERSION SCORE: (Provide a number 0-100 representing the likelihood this lead will convert. Consider:
- 80-100: Strong buying signals, active growth, recent funding
- 60-79: Good potential, some positive indicators
- 40-59: Moderate potential, needs nurturing
- 20-39: Low immediate potential but worth monitoring
- 0-19: Not a good fit currently)

SCORE FACTORS:
- Factor 1
- Factor 2
- Factor 3

PAIN POINTS:
- Predicted pain point 1
- Predicted pain point 2
- Predicted pain point 3

Consider the unique context of doing business in {country}:
- Local regulatory environment (NDPR in Nigeria, Data Protection in Ghana)
- Payment infrastructure challenges
- Talent acquisition in tech hubs (Lagos, Accra)
- Foreign exchange considerations
- Local competition landscape

Be concise and actionable. Every insight should help a sales rep personalize their outreach."""

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
