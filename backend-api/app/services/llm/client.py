"""
Google Gemini API wrapper for AI-powered lead qualification
Fallback chain: Gemini → Ollama (Llama 3.2) → Grok → OpenAI
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
            # Use gemini-2.5-pro (best quality) with fallback to gemini-2.5-flash (faster)
            try:
                self.model = genai.GenerativeModel("gemini-2.5-pro")
            except:
                # Fallback to flash if pro not available
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
            # Fallback chain: Ollama → Grok → OpenAI
            return await self._try_fallback_chain(prompt, company_name, "analysis")

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

    async def generate_company_insights(
        self,
        company_name: str,
        company_data: Dict[str, Any],
        recent_updates: List[Dict[str, Any]],
        contacts: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Generate comprehensive AI insights for a tracked company
        Includes: strategic insights, relationship opportunities, action recommendations
        """
        if not self.model:
            return self._fallback_insights(company_name)

        context = self._build_company_context(company_data, recent_updates, contacts)
        prompt = PromptTemplates.company_insights(
            company_name=company_name,
            company_data=company_data,
            recent_updates=recent_updates,
            contacts=contacts,
            context=context,
        )

        try:
            response = self.model.generate_content(prompt)
            return self._parse_insights_response(response.text, company_name)
        except Exception as e:
            print(f"Gemini insights error: {e}")
            # Fallback chain: Ollama → Grok → OpenAI
            result = await self._try_fallback_chain(prompt, company_name, "insights")
            if result:
                return result
            return self._fallback_insights(company_name)

    async def analyze_company_update(
        self,
        update: Dict[str, Any],
        company_name: str,
    ) -> Dict[str, Any]:
        """
        Analyze a company update and provide context, implications, and action items
        """
        if not self.model:
            return {
                "importance": "medium",
                "implications": [],
                "action_items": [],
                "timing_urgency": "normal",
            }

        prompt = PromptTemplates.update_analysis(
            company_name=company_name,
            update=update,
        )

        try:
            response = self.model.generate_content(prompt)
            return self._parse_update_analysis(response.text)
        except Exception as e:
            print(f"Gemini update analysis error: {e}")
            # Fallback chain: Ollama → Grok → OpenAI
            result = await self._try_fallback_chain(prompt, company_name, "update_analysis")
            if result:
                return result
            return {
                "importance": "medium",
                "implications": [],
                "action_items": [],
                "timing_urgency": "normal",
            }

    async def generate_outreach_suggestions(
        self,
        company_name: str,
        contact: Dict[str, Any],
        company_context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Generate personalized outreach suggestions for a contact
        """
        if not self.model:
            return {
                "subject_line": f"Partnership opportunity with {company_name}",
                "opening_line": f"Hi {contact.get('full_name', 'there')},",
                "value_proposition": "",
                "call_to_action": "",
            }

        prompt = PromptTemplates.outreach_suggestions(
            company_name=company_name,
            contact=contact,
            company_context=company_context,
        )

        try:
            response = self.model.generate_content(prompt)
            return self._parse_outreach_suggestions(response.text)
        except Exception as e:
            print(f"Gemini outreach error: {e}")
            # Fallback chain: Ollama → Grok → OpenAI
            result = await self._try_fallback_chain(prompt, company_name, "outreach")
            if result:
                return result
            return {
                "subject_line": f"Partnership opportunity with {company_name}",
                "opening_line": f"Hi {contact.get('full_name', 'there')},",
                "value_proposition": "",
                "call_to_action": "",
            }

    def _build_company_context(
        self,
        company_data: Dict[str, Any],
        recent_updates: List[Dict[str, Any]],
        contacts: List[Dict[str, Any]],
    ) -> str:
        """Build comprehensive context for company insights"""
        parts = []

        # Company basics
        if company_data.get("industry"):
            parts.append(f"Industry: {company_data['industry']}")
        if company_data.get("headquarters"):
            parts.append(f"Headquarters: {company_data['headquarters']}")
        if company_data.get("employee_count"):
            parts.append(f"Size: {company_data['employee_count']} employees")
        if company_data.get("description"):
            parts.append(f"Description: {company_data['description']}")

        # Recent updates
        if recent_updates:
            parts.append("\nRecent Updates:")
            for update in recent_updates[:5]:
                parts.append(f"- {update.get('title', '')}: {update.get('summary', '')}")

        # Key contacts
        if contacts:
            parts.append("\nKey Contacts:")
            for contact in contacts[:5]:
                parts.append(f"- {contact.get('full_name', '')} ({contact.get('title', '')})")

        return "\n".join(parts) if parts else "Limited company information available."

    def _parse_insights_response(self, response_text: str, company_name: str) -> Dict[str, Any]:
        """Parse insights response"""
        import json
        import re

        # Try to extract JSON if present
        json_match = re.search(r'\{[^{}]*"insights"[^{}]*\}', response_text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(0))
            except:
                pass

        # Fallback parsing
        insights = {
            "strategic_insights": [],
            "relationship_opportunities": [],
            "action_recommendations": [],
            "risk_factors": [],
            "growth_signals": [],
        }

        current_section = None
        for line in response_text.split("\n"):
            line = line.strip()
            if not line:
                continue

            lower_line = line.lower()
            if "strategic" in lower_line or "insights" in lower_line:
                current_section = "strategic"
            elif "relationship" in lower_line or "opportunity" in lower_line:
                current_section = "relationship"
            elif "action" in lower_line or "recommendation" in lower_line:
                current_section = "action"
            elif "risk" in lower_line:
                current_section = "risk"
            elif "growth" in lower_line or "signal" in lower_line:
                current_section = "growth"
            elif line.startswith("-") or line.startswith("*"):
                item = line.lstrip("-* ").strip()
                if current_section == "strategic":
                    insights["strategic_insights"].append(item)
                elif current_section == "relationship":
                    insights["relationship_opportunities"].append(item)
                elif current_section == "action":
                    insights["action_recommendations"].append(item)
                elif current_section == "risk":
                    insights["risk_factors"].append(item)
                elif current_section == "growth":
                    insights["growth_signals"].append(item)

        return insights

    def _parse_update_analysis(self, response_text: str) -> Dict[str, Any]:
        """Parse update analysis response"""
        analysis = {
            "importance": "medium",
            "implications": [],
            "action_items": [],
            "timing_urgency": "normal",
        }

        for line in response_text.split("\n"):
            line = line.strip()
            if not line:
                continue

            lower_line = line.lower()
            if "importance:" in lower_line or "critical" in lower_line:
                if "critical" in lower_line or "high" in lower_line:
                    analysis["importance"] = "high"
                elif "low" in lower_line:
                    analysis["importance"] = "low"
            elif "urgency:" in lower_line or "urgent" in lower_line:
                if "urgent" in lower_line or "immediate" in lower_line:
                    analysis["timing_urgency"] = "urgent"
            elif line.startswith("-") or line.startswith("*"):
                item = line.lstrip("-* ").strip()
                if "implication" in lower_line or "impact" in lower_line:
                    analysis["implications"].append(item)
                elif "action" in lower_line or "recommend" in lower_line:
                    analysis["action_items"].append(item)

        return analysis

    def _parse_outreach_suggestions(self, response_text: str) -> Dict[str, Any]:
        """Parse outreach suggestions response"""
        suggestions = {
            "subject_line": "",
            "opening_line": "",
            "value_proposition": "",
            "call_to_action": "",
        }

        for line in response_text.split("\n"):
            line = line.strip()
            if not line:
                continue

            lower_line = line.lower()
            if "subject" in lower_line:
                suggestions["subject_line"] = line.split(":", 1)[-1].strip()
            elif "opening" in lower_line:
                suggestions["opening_line"] = line.split(":", 1)[-1].strip()
            elif "value" in lower_line or "proposition" in lower_line:
                suggestions["value_proposition"] = line.split(":", 1)[-1].strip()
            elif "call" in lower_line or "cta" in lower_line:
                suggestions["call_to_action"] = line.split(":", 1)[-1].strip()

        return suggestions

    def _fallback_insights(self, company_name: str) -> Dict[str, Any]:
        """Fallback insights when Gemini is unavailable"""
        return {
            "strategic_insights": [f"{company_name} shows growth potential in the West African market."],
            "relationship_opportunities": ["Monitor for expansion or funding announcements"],
            "action_recommendations": ["Set up tracking alerts", "Research decision makers"],
            "risk_factors": [],
            "growth_signals": [],
        }

    async def _try_fallback_chain(self, prompt: str, company_name: str, response_type: str) -> Optional[Dict[str, Any]]:
        """
        Try fallback chain: Ollama → Grok → OpenAI
        Returns result immediately if any service responds successfully
        """
        # Try Ollama first (for dev/MVP)
        if settings.OLLAMA_ENABLED:
            try:
                result = await self._try_ollama_fallback(prompt, company_name, response_type)
                if result:
                    print(f"✓ Ollama responded successfully for {response_type}")
                    return result
            except Exception as ollama_error:
                print(f"Ollama fallback error: {ollama_error}")
        
        # Try Grok
        if settings.XAI_API_KEY:
            try:
                result = await self._try_grok_fallback(prompt, company_name, response_type)
                if result:
                    print(f"✓ Grok responded successfully for {response_type}")
                    return result
            except Exception as grok_error:
                print(f"Grok fallback error: {grok_error}")
        
        # Try OpenAI as final fallback
        if settings.OPENAI_API_KEY:
            try:
                result = await self._try_openai_fallback(prompt, company_name, response_type)
                if result:
                    print(f"✓ OpenAI responded successfully for {response_type}")
                    return result
            except Exception as openai_error:
                print(f"OpenAI fallback error: {openai_error}")
        
        return None
    
    async def _try_ollama_fallback(self, prompt: str, company_name: str, response_type: str) -> Dict[str, Any]:
        """Try Ollama API (Llama 3.2) as fallback"""
        import httpx
        
        base_url = settings.OLLAMA_BASE_URL.rstrip('/')
        model = settings.OLLAMA_MODEL
        
        print(f"🤖 [Ollama] Attempting to call Ollama at {base_url} with model {model}")
        print(f"🤖 [Ollama] Request type: {response_type} for company: {company_name}")
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                print(f"🤖 [Ollama] Sending POST request to {base_url}/api/generate")
                response = await client.post(
                    f"{base_url}/api/generate",
                    json={
                        "model": model,
                        "prompt": prompt,
                        "stream": False,
                        "options": {
                            "temperature": 0.7,
                            "top_p": 0.9,
                        }
                    }
                )
                
                print(f"🤖 [Ollama] Response status: {response.status_code}")
                
                if response.status_code != 200:
                    error_msg = f"Ollama API error: {response.status_code} - {response.text}"
                    print(f"❌ [Ollama] {error_msg}")
                    raise Exception(error_msg)
                
                result = response.json()
                ollama_text = result.get("response", "")
                
                if not ollama_text:
                    print("❌ [Ollama] Empty response received")
                    raise Exception("Ollama returned empty response")
                
                print(f"✅ [Ollama] Successfully received response ({len(ollama_text)} chars)")
                
                # Parse based on response type
                if response_type == "analysis":
                    return self._parse_analysis_response(ollama_text, company_name)
                elif response_type == "insights":
                    return self._parse_insights_response(ollama_text, company_name)
                elif response_type == "update_analysis":
                    return self._parse_update_analysis(ollama_text)
                elif response_type == "outreach":
                    return self._parse_outreach_suggestions(ollama_text)
                else:
                    raise Exception(f"Unknown response type: {response_type}")
        except httpx.TimeoutException:
            print(f"❌ [Ollama] Request timeout after 60 seconds")
            raise Exception("Ollama request timeout")
        except httpx.ConnectError as e:
            print(f"❌ [Ollama] Connection error: {e}")
            raise Exception(f"Ollama connection error: {e}")
        except Exception as e:
            print(f"❌ [Ollama] Error: {e}")
            raise

    async def _try_grok_fallback(self, prompt: str, company_name: str, response_type: str) -> Dict[str, Any]:
        """Try Grok API as fallback when Gemini fails"""
        if not settings.XAI_API_KEY:
            raise Exception("XAI_API_KEY not configured")
        
        import httpx
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.x.ai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.XAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "grok-beta",
                    "messages": [
                        {"role": "system", "content": "You are a helpful AI assistant for B2B sales intelligence."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 2000,
                }
            )
            
            if response.status_code != 200:
                raise Exception(f"Grok API error: {response.status_code}")
            
            result = response.json()
            grok_text = result["choices"][0]["message"]["content"]
            
            # Parse based on response type
            if response_type == "analysis":
                return self._parse_analysis_response(grok_text, company_name)
            elif response_type == "insights":
                return self._parse_insights_response(grok_text, company_name)
            elif response_type == "update_analysis":
                return self._parse_update_analysis(grok_text)
            elif response_type == "outreach":
                return self._parse_outreach_suggestions(grok_text)
            else:
                raise Exception(f"Unknown response type: {response_type}")
    
    async def _try_openai_fallback(self, prompt: str, company_name: str, response_type: str) -> Dict[str, Any]:
        """Try OpenAI API as final fallback when Gemini and Grok fail"""
        if not settings.OPENAI_API_KEY:
            raise Exception("OPENAI_API_KEY not configured")
        
        import httpx
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",  # Cost-effective model
                    "messages": [
                        {"role": "system", "content": "You are a helpful AI assistant for B2B sales intelligence. Provide clear, professional, and well-formatted responses."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 2000,
                }
            )
            
            if response.status_code != 200:
                raise Exception(f"OpenAI API error: {response.status_code}")
            
            result = response.json()
            openai_text = result["choices"][0]["message"]["content"]
            
            # Parse based on response type
            if response_type == "analysis":
                return self._parse_analysis_response(openai_text, company_name)
            elif response_type == "insights":
                return self._parse_insights_response(openai_text, company_name)
            elif response_type == "update_analysis":
                return self._parse_update_analysis(openai_text)
            elif response_type == "outreach":
                return self._parse_outreach_suggestions(openai_text)
            else:
                raise Exception(f"Unknown response type: {response_type}")
    
    def _fallback_response(self, company_name: str) -> Dict[str, Any]:
        """Fallback when both Gemini and Grok are unavailable"""
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
