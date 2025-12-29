"""
SpaCy-based Named Entity Recognition (NER) for extracting
names, titles, companies from unstructured text
"""
from typing import List, Dict, Any, Optional
import spacy
from spacy import displacy

from app.core.config import settings


class EntityExtractor:
    """
    Extract entities (names, organizations, titles) from unstructured text
    using SpaCy NER
    """
    
    def __init__(self):
        self.nlp = None
        self._model_loaded = False
    
    def _load_model(self):
        """Load SpaCy model (lazy loading)"""
        if not self._model_loaded:
            try:
                # Try to load English model
                # User needs to run: python -m spacy download en_core_web_sm
                self.nlp = spacy.load("en_core_web_sm")
                self._model_loaded = True
                print("✓ SpaCy model loaded successfully")
            except OSError:
                # Model not installed, use basic tokenizer
                print("⚠ SpaCy model not found. Install with: python -m spacy download en_core_web_sm")
                print("   Falling back to basic entity extraction.")
                self.nlp = None
                self._model_loaded = True
    
    def extract_entities(self, text: str) -> Dict[str, List[str]]:
        """
        Extract named entities from text
        
        Returns:
            {
                "persons": [...],
                "organizations": [...],
                "locations": [...],
                "titles": [...],  # Extracted from context
            }
        """
        if not text:
            return {"persons": [], "organizations": [], "locations": [], "titles": []}
        
        self._load_model()
        
        if not self.nlp:
            # Fallback to basic extraction
            return self._basic_extraction(text)
        
        doc = self.nlp(text)
        
        persons = []
        organizations = []
        locations = []
        titles = []
        
        for ent in doc.ents:
            if ent.label_ == "PERSON":
                persons.append(ent.text)
            elif ent.label_ == "ORG":
                organizations.append(ent.text)
            elif ent.label_ in ["GPE", "LOC"]:
                locations.append(ent.text)
        
        # Extract titles from context (heuristic)
        title_keywords = [
            "CEO", "CTO", "CFO", "COO", "Founder", "Director", "Manager",
            "VP", "Vice President", "Head of", "Chief", "President",
            "Lead", "Senior", "Junior", "Executive"
        ]
        
        for token in doc:
            if token.text in title_keywords or any(kw in token.text for kw in title_keywords):
                # Get surrounding context
                start = max(0, token.i - 3)
                end = min(len(doc), token.i + 4)
                context = doc[start:end].text
                titles.append(context.strip())
        
        return {
            "persons": list(set(persons)),
            "organizations": list(set(organizations)),
            "locations": list(set(locations)),
            "titles": list(set(titles)),
        }
    
    def _basic_extraction(self, text: str) -> Dict[str, List[str]]:
        """Basic entity extraction without SpaCy"""
        import re
        
        # Extract capitalized words (potential names/companies)
        capitalized = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text)
        
        # Simple heuristic: if it's 2-3 words and capitalized, might be a person
        persons = [w for w in capitalized if 2 <= len(w.split()) <= 3]
        
        # Organizations are usually single capitalized words or acronyms
        organizations = [w for w in capitalized if len(w.split()) == 1 or w.isupper()]
        
        return {
            "persons": list(set(persons[:10])),
            "organizations": list(set(organizations[:10])),
            "locations": [],
            "titles": [],
        }
    
    def extract_contacts_from_text(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract contact information from unstructured text
        Combines NER with pattern matching
        Returns contacts in the format expected by contact discovery service
        """
        entities = self.extract_entities(text)
        contacts = []
        
        import re
        
        # Look for email patterns
        emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
        
        # Look for phone patterns
        phones = re.findall(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
        
        # Look for titles (CEO, Director, Manager, etc.)
        title_patterns = [
            r'(CEO|Chief Executive Officer|CTO|Chief Technology Officer|CFO|Chief Financial Officer)',
            r'(Director|Managing Director|MD)',
            r'(Manager|Head of|VP|Vice President)',
            r'(President|Founder|Co-Founder)',
            r'(Sales Director|Sales Manager|Head of Sales)',
        ]
        titles = []
        for pattern in title_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            titles.extend(matches)
        
        # Extract names with potential titles nearby
        # Look for patterns like "John Doe, CEO" or "CEO: John Doe"
        name_title_pattern = re.findall(r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)[,\s]+(?:is\s+)?(CEO|CTO|CFO|Director|Manager|President|Founder|Head of [A-Za-z]+)', text, re.IGNORECASE)
        
        # Create contact entries from name-title pairs
        processed_names = set()
        for name, title in name_title_pattern[:10]:  # Limit to 10
            if not name or not title:
                continue
            name_key = name.lower() if name else ""
            if name_key and name_key not in processed_names:
                contact = {
                    "full_name": name.strip() if name else "",
                    "title": title.strip() if title else "",
                    "department": self._determine_department_from_title(title) if title else "other",
                    "email": None,
                    "phone": phones[0] if phones else None,
                    "linkedin_url": None,
                    "is_decision_maker": self._is_decision_maker_title(title) if title else False,
                    "source": "website_scrape",
                    "confidence_score": 0.7,
                }
                
                # Try to find associated email
                if emails and name:
                    name_parts = name.lower().split()
                    for email in emails:
                        # Check if email contains part of the name
                        if any(part in email.lower() for part in name_parts if len(part) > 2):
                            contact["email"] = email
                            break
                
                contacts.append(contact)
                processed_names.add(name_key)
        
        # Also create contacts from standalone emails if we have names
        if emails and entities["persons"]:
            for email in emails[:5]:  # Limit to 5 emails
                # Try to match email to a person
                email_local = email.split("@")[0].lower() if email else ""
                for person in entities["persons"]:
                    if not person:
                        continue
                    person_parts = person.lower().split() if person else []
                    if person_parts and any(part in email_local for part in person_parts if len(part) > 2):
                        # Check if we already have this person
                        person_lower = person.lower() if person else ""
                        if person_lower and not any(c.get("full_name", "").lower() == person_lower for c in contacts):
                            contacts.append({
                                "full_name": person,
                                "title": None,
                                "department": "other",
                                "email": email,
                                "phone": phones[0] if phones else None,
                                "linkedin_url": None,
                                "is_decision_maker": False,
                                "source": "website_scrape",
                                "confidence_score": 0.6,
                            })
                        break
        
        return contacts
    
    def _determine_department_from_title(self, title: str) -> str:
        """Determine department from job title"""
        if not title:
            return "other"
        title_lower = title.lower()
        if "sales" in title_lower or "revenue" in title_lower:
            return "sales"
        if "marketing" in title_lower:
            return "marketing"
        if "ceo" in title_lower or "founder" in title_lower or "president" in title_lower or "director" in title_lower:
            return "executive"
        if "cto" in title_lower or "cio" in title_lower or "engineering" in title_lower:
            return "engineering"
        return "other"
    
    def _is_decision_maker_title(self, title: str) -> bool:
        """Determine if title indicates decision maker"""
        if not title:
            return False
        title_lower = title.lower()
        decision_maker_keywords = ["ceo", "founder", "director", "president", "head of", "vp", "chief"]
        return any(kw in title_lower for kw in decision_maker_keywords)


# Global entity extractor instance
_entity_extractor: Optional[EntityExtractor] = None


def get_entity_extractor() -> EntityExtractor:
    """Get or create entity extractor instance"""
    global _entity_extractor
    if not _entity_extractor:
        _entity_extractor = EntityExtractor()
    return _entity_extractor

