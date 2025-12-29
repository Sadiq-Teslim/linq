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
        """
        entities = self.extract_entities(text)
        contacts = []
        
        # Combine persons with titles
        import re
        
        # Look for email patterns
        emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
        
        # Look for phone patterns
        phones = re.findall(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
        
        # Create contact entries
        for person in entities["persons"][:5]:  # Limit to 5
            contact = {
                "name": person,
                "title": None,
                "email": None,
                "phone": None,
                "organization": entities["organizations"][0] if entities["organizations"] else None,
            }
            
            # Try to find associated email
            if emails:
                # Simple heuristic: email might contain person's name
                person_lower = person.lower().replace(" ", ".")
                for email in emails:
                    if person_lower.split()[0].lower() in email.lower():
                        contact["email"] = email
                        break
            
            contacts.append(contact)
        
        return contacts


# Global entity extractor instance
_entity_extractor: Optional[EntityExtractor] = None


def get_entity_extractor() -> EntityExtractor:
    """Get or create entity extractor instance"""
    global _entity_extractor
    if not _entity_extractor:
        _entity_extractor = EntityExtractor()
    return _entity_extractor

