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
            self.model = genai.GenerativeModel("gemini-pro")
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
        """Parse Gemini response into structured format"""
        # Simple parsing - in production, use structured output or JSON mode
        lines = response_text.strip().split("\n")

        summary = ""
        score = 50
        factors = []
        pain_points = []

        current_section = None
        for line in lines:
            line = line.strip()
            if not line:
                continue

            lower_line = line.lower()

            if "summary:" in lower_line or "why now:" in lower_line:
                current_section = "summary"
                summary = line.split(":", 1)[-1].strip()
            elif "score:" in lower_line or "conversion" in lower_line:
                current_section = "score"
                # Extract number from line
                import re
                numbers = re.findall(r'\d+', line)
                if numbers:
                    score = min(100, max(0, int(numbers[0])))
            elif "factor" in lower_line:
                current_section = "factors"
            elif "pain" in lower_line:
                current_section = "pain_points"
            elif line.startswith("-") or line.startswith("*"):
                item = line.lstrip("-* ").strip()
                if current_section == "factors":
                    factors.append(item)
                elif current_section == "pain_points":
                    pain_points.append(item)
            elif current_section == "summary" and not summary:
                summary = line

        # Ensure we have a summary
        if not summary:
            summary = f"{company_name} shows potential for B2B engagement based on available market data."

        return {
            "summary": summary[:500],  # Max 3 sentences / 500 chars
            "conversion_score": score,
            "score_factors": factors[:5],
            "pain_points": pain_points[:5],
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
            "score_factors": ["Limited data available"],
            "pain_points": ["Unable to determine without AI analysis"],
        }
