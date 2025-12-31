"""
AI Text Formatting Service
Ensures all displayed text is properly formatted in English with correct grammar and arrangement
"""
from typing import Dict, Any, List, Optional
import httpx
from app.core.config import settings


class TextFormatter:
    """
    Formats and improves text quality using AI
    Ensures proper English, grammar, and arrangement for all displayed content
    """
    
    def __init__(self):
        self.gemini_available = bool(settings.GEMINI_API_KEY)
        self.ollama_available = bool(settings.OLLAMA_ENABLED)
        self.grok_available = bool(settings.XAI_API_KEY)
        self.openai_available = bool(settings.OPENAI_API_KEY)
    
    async def format_text(
        self,
        text: str,
        context: Optional[str] = None,
        format_type: str = "general"
    ) -> str:
        """
        Format text to ensure proper English, grammar, and arrangement
        
        Args:
            text: Raw text to format
            context: Optional context about what the text represents
            format_type: Type of formatting (general, title, description, contact_name, etc.)
        
        Returns:
            Formatted text with proper English and arrangement
        """
        if not text or not text.strip():
            return text
        
        # If text is already well-formatted, return as-is
        if self._is_well_formatted(text):
            return text.strip()
        
        # Try to format using AI (Gemini → Grok → OpenAI)
        try:
            formatted = await self._format_with_ai(text, context, format_type)
            return formatted if formatted else text.strip()
        except Exception as e:
            print(f"Text formatting error: {e}")
            # Fallback to basic cleaning
            return self._basic_format(text)
    
    def _is_well_formatted(self, text: str) -> bool:
        """Check if text appears to be already well-formatted"""
        # Basic heuristics
        if len(text) < 10:
            return True
        
        # Check for proper capitalization at start
        if text[0].islower():
            return False
        
        # Check for excessive whitespace
        if "  " in text or "\n\n\n" in text:
            return False
        
        return True
    
    async def _format_with_ai(
        self,
        text: str,
        context: Optional[str],
        format_type: str
    ) -> str:
        """Format text using AI (tries Gemini → Ollama → Grok → OpenAI)"""
        
        prompt = self._build_formatting_prompt(text, context, format_type)
        
        # Try Gemini first
        if self.gemini_available:
            try:
                result = await self._format_with_gemini(prompt)
                if result:
                    return result
            except Exception as e:
                print(f"Gemini formatting error: {e}")
        
        # Try Ollama (for dev/MVP)
        if self.ollama_available:
            try:
                result = await self._format_with_ollama(prompt)
                if result:
                    print("✓ Ollama formatted text successfully")
                    return result
            except Exception as e:
                print(f"Ollama formatting error: {e}")
        
        # Try Grok
        if self.grok_available:
            try:
                result = await self._format_with_grok(prompt)
                if result:
                    return result
            except Exception as e:
                print(f"Grok formatting error: {e}")
        
        # Try OpenAI
        if self.openai_available:
            try:
                result = await self._format_with_openai(prompt)
                if result:
                    return result
            except Exception as e:
                print(f"OpenAI formatting error: {e}")
        
        return None
    
    def _build_formatting_prompt(self, text: str, context: Optional[str], format_type: str) -> str:
        """Build prompt for AI formatting"""
        base_prompt = f"""Please format the following text to ensure proper English grammar, spelling, capitalization, and professional arrangement. Return only the formatted text, no explanations.

Text to format:
{text}
"""
        
        if context:
            base_prompt += f"\nContext: {context}\n"
        
        format_instructions = {
            "title": "Format as a professional title (Title Case, no trailing punctuation unless needed).",
            "description": "Format as a clear, professional description (proper sentences, correct grammar).",
            "contact_name": "Format as a person's name (Proper Case, remove extra spaces).",
            "company_name": "Format as a company name (proper capitalization, remove extra spaces).",
            "email": "Ensure email format is correct (lowercase, valid format).",
            "phone": "Format phone number consistently (international format preferred).",
            "general": "Format as general professional text (proper grammar, spelling, capitalization).",
        }
        
        instruction = format_instructions.get(format_type, format_instructions["general"])
        base_prompt += f"\nFormatting requirements: {instruction}"
        
        return base_prompt
    
    async def _format_with_gemini(self, prompt: str) -> str:
        """Format using Gemini"""
        import google.generativeai as genai
        
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        return response.text.strip()
    
    async def _format_with_ollama(self, prompt: str) -> str:
        """Format using Ollama (Llama 3.2)"""
        import httpx
        
        base_url = settings.OLLAMA_BASE_URL.rstrip('/')
        model = settings.OLLAMA_MODEL
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Use /api/chat for better performance
            response = await client.post(
                f"{base_url}/api/chat",
                json={
                    "model": model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a text formatting assistant. Return only the formatted text, no explanations."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "stream": False,
                    "options": {
                        "temperature": 0.3,
                        "top_p": 0.9,
                        "num_predict": 200,  # Limit response length for faster formatting
                    }
                },
                timeout=60.0
            )
            
            if response.status_code == 200:
                result = response.json()
                # /api/chat returns message.content
                return result.get("message", {}).get("content", "") or result.get("response", "")
            raise Exception(f"Ollama API error: {response.status_code}")
    
    async def _format_with_grok(self, prompt: str) -> str:
        """Format using Grok"""
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                "https://api.x.ai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.XAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "grok-beta",
                    "messages": [
                        {"role": "system", "content": "You are a text formatting assistant. Return only the formatted text, no explanations."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 500,
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"].strip()
            raise Exception(f"Grok API error: {response.status_code}")
    
    async def _format_with_openai(self, prompt: str) -> str:
        """Format using OpenAI"""
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": "You are a text formatting assistant. Return only the formatted text, no explanations."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 500,
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"].strip()
            raise Exception(f"OpenAI API error: {response.status_code}")
    
    def _basic_format(self, text: str) -> str:
        """Basic text formatting without AI"""
        # Remove extra whitespace
        text = " ".join(text.split())
        
        # Capitalize first letter
        if text and text[0].islower():
            text = text[0].upper() + text[1:]
        
        # Remove trailing punctuation issues
        text = text.rstrip(".,;:")
        
        return text.strip()
    
    async def format_contact_name(self, name: str) -> str:
        """Format contact name properly"""
        if not name:
            return name
        
        # Basic cleaning first
        name = " ".join(name.split())
        
        # Try AI formatting
        try:
            formatted = await self.format_text(name, "This is a person's full name", "contact_name")
            return formatted
        except:
            # Fallback: Title case
            return name.title()
    
    async def format_company_name(self, name: str) -> str:
        """Format company name properly"""
        if not name:
            return name
        
        # Basic cleaning
        name = " ".join(name.split())
        
        # Try AI formatting
        try:
            formatted = await self.format_text(name, "This is a company name", "company_name")
            return formatted
        except:
            # Fallback: Preserve original but clean whitespace
            return name
    
    async def format_description(self, description: str) -> str:
        """Format description text"""
        if not description:
            return description
        
        try:
            formatted = await self.format_text(description, "This is a company or contact description", "description")
            return formatted
        except:
            return self._basic_format(description)
    
    async def format_title(self, title: str) -> str:
        """Format job title"""
        if not title:
            return title
        
        try:
            formatted = await self.format_text(title, "This is a job title or position", "title")
            return formatted
        except:
            # Fallback: Title case
            return title.title()


# Singleton instance
text_formatter = TextFormatter()

