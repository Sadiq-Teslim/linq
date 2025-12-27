"""
Google Gemini API wrapper for AI-powered lead qualification
"""
from typing import Optional, Dict, Any, List
import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from .prompts import PromptTemplates


class GeminiClient:
    """
    Wrapper for Google Gemini Pro API
    Handles company analysis and lead scoring
    """

    def __init__(self):
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            # Use gemini-1.5-flash (fast, cheap) or gemini-1.5-pro (better quality)
            self.model = genai.GenerativeModel("gemini-2.5-flash")
        else:
            self.model = None

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def generate_company_summary(
        self,
        company_name: str,
        search_results: List[Dict[str, Any]],
        news_items: List[Dict[str, Any]],
        country: str = "Nigeria",
    ) -> Dict[str, Any]:
        """
        Generate AI summary and conversion score for a company (F1.4, F1.5)
        Returns:
            {
                "summary": str,  # 3-sentence "Why Now" summary
                "conversion_score": int,  # 0-100
                "score_factors": list,
                "pain_points": list,
            }
        """
        if not self.model:
            return self._fallback_response(company_name)

        # Build context from search results
        context = self._build_context(search_results, news_items)

        prompt = PromptTemplates.company_analysis(
            company_name=company_name,
            country=country,
            context=context,
        )

        try:
            response = self.model.generate_content(prompt)
            return self._parse_analysis_response(response.text, company_name)
        except Exception as e:
            print(f"Gemini API error: {e}")
            return self._fallback_response(company_name)

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=5))
    async def extract_decision_makers(
        self,
        search_results: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Extract and structure decision maker information from search results
        """
        if not self.model or not search_results:
            return []

        prompt = PromptTemplates.decision_maker_extraction(search_results)

        try:
            response = self.model.generate_content(prompt)
            return self._parse_decision_makers(response.text)
        except Exception:
            return []

    def _build_context(
        self,
        search_results: List[Dict[str, Any]],
        news_items: List[Dict[str, Any]],
    ) -> str:
        """Build context string from search and news results"""
        parts = []

        # Add search result snippets
        for result in search_results[:5]:
            if result.get("snippet"):
                parts.append(f"- {result['snippet']}")
            if result.get("type") == "knowledge_graph" and result.get("description"):
                parts.append(f"- {result['description']}")

        # Add recent news
        for news in news_items[:3]:
            if news.get("headline"):
                parts.append(f"- News: {news['headline']}")

        return "\n".join(parts) if parts else "No additional context available."

    def _parse_analysis_response(self, response_text: str, company_name: str) -> Dict[str, Any]:
        """Parse Gemini response into structured format matching PRD requirements"""
        import re
        lines = response_text.strip().split("\n")

        summary = ""
        score = 50
        score_label = "Growth Stage - Monitor"
        factors = []
        pain_points = []
        why_now_factors = []
        industry = "Technology"

        current_section = None
        for line in lines:
            line = line.strip()
            if not line:
                continue

            lower_line = line.lower()

            # Parse SUMMARY section
            if lower_line.startswith("summary:"):
                current_section = "summary"
                summary = line.split(":", 1)[-1].strip()
            # Parse SCORE_LABEL section
            elif lower_line.startswith("score_label:"):
                current_section = None
                score_label = line.split(":", 1)[-1].strip().strip('"\'[]')
            # Parse CONVERSION_SCORE section
            elif lower_line.startswith("conversion_score:"):
                current_section = None
                numbers = re.findall(r'\d+', line)
                if numbers:
                    score = min(100, max(0, int(numbers[0])))
            # Parse WHY_NOW_FACTORS section
            elif lower_line.startswith("why_now_factors:"):
                current_section = "why_now"
            # Parse SCORE_FACTORS section
            elif lower_line.startswith("score_factors:"):
                current_section = "factors"
            # Parse PAIN_POINTS section
            elif lower_line.startswith("pain_points:"):
                current_section = "pain_points"
            # Parse INDUSTRY section
            elif lower_line.startswith("industry:"):
                current_section = None
                industry = line.split(":", 1)[-1].strip().strip('"\'[]')
            # Parse list items
            elif line.startswith("-") or line.startswith("*"):
                item = line.lstrip("-* ").strip()
                if current_section == "factors":
                    factors.append(self._parse_score_factor(item))
                elif current_section == "pain_points":
                    pain_points.append(item)
                elif current_section == "why_now":
                    why_now_factors.append(item)
            elif current_section == "summary" and not summary:
                summary = line

        # Ensure we have a summary
        if not summary:
            summary = f"{company_name} shows potential for B2B engagement based on available market data."

        # Determine confidence based on data quality
        confidence = "high" if len(factors) >= 3 and len(pain_points) >= 2 else "medium" if factors else "low"

        return {
            "summary": summary[:500],
            "conversion_score": score,
            "score_label": score_label,
            "score_factors": factors[:5],
            "pain_points": pain_points[:5],
            "why_now_factors": why_now_factors[:5],
            "industry": industry,
            "confidence_level": confidence,
        }

    def _parse_score_factor(self, factor_text: str) -> Dict[str, Any]:
        """Parse a score factor line into structured format"""
        # Expected format: "[Factor]: [positive/negative] - [explanation]"
        parts = factor_text.split(":")
        if len(parts) >= 2:
            factor_name = parts[0].strip()
            rest = ":".join(parts[1:]).strip()

            impact = "neutral"
            if "positive" in rest.lower():
                impact = "positive"
            elif "negative" in rest.lower():
                impact = "negative"

            return {
                "factor": factor_name,
                "impact": impact,
                "explanation": rest,
                "weight": 5 if impact == "positive" else 3 if impact == "neutral" else 2
            }
        return {
            "factor": factor_text,
            "impact": "neutral",
            "explanation": "",
            "weight": 3
        }

    def _parse_decision_makers(self, response_text: str) -> List[Dict[str, Any]]:
        """Parse decision maker response"""
        # Simple parsing for MVP
        decision_makers = []
        lines = response_text.strip().split("\n")

        current_dm = {}
        for line in lines:
            line = line.strip()
            if not line:
                if current_dm:
                    decision_makers.append(current_dm)
                    current_dm = {}
                continue

            if "name:" in line.lower():
                current_dm["name"] = line.split(":", 1)[-1].strip()
            elif "title:" in line.lower():
                current_dm["title"] = line.split(":", 1)[-1].strip()
            elif "linkedin" in line.lower():
                current_dm["linkedin_url"] = line.split(":", 1)[-1].strip()

        if current_dm:
            decision_makers.append(current_dm)

        return [dm for dm in decision_makers if dm.get("name") and dm.get("title")]

    def _fallback_response(self, company_name: str) -> Dict[str, Any]:
        """Fallback when Gemini is unavailable"""
        return {
            "summary": f"{company_name} is a business operating in the West African market. Further analysis requires AI configuration.",
            "conversion_score": 50,
            "score_label": "Growth Stage - Monitor",
            "score_factors": [{"factor": "Limited data", "impact": "neutral", "explanation": "AI analysis unavailable", "weight": 3}],
            "pain_points": ["Unable to determine without AI analysis"],
            "why_now_factors": ["Requires AI analysis for timing insights"],
            "industry": "Unknown",
            "confidence_level": "low",
        }
