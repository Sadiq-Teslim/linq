"""
News aggregation service for the Live Feed (F2.1)
Scrapes African tech/business news from RSS feeds and websites
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import feedparser
import httpx
from bs4 import BeautifulSoup

from app.core.exceptions import ScrapingError


class NewsAggregatorService:
    """
    Aggregates news from African tech/business sources
    Focuses on Nigeria and Ghana markets
    """

    # African tech news RSS feeds
    RSS_FEEDS = [
        {
            "name": "TechCabal",
            "url": "https://techcabal.com/feed/",
            "region": "Africa",
        },
        {
            "name": "Disrupt Africa",
            "url": "https://disrupt-africa.com/feed/",
            "region": "Africa",
        },
        {
            "name": "TechPoint Africa",
            "url": "https://techpoint.africa/feed/",
            "region": "Nigeria",
        },
        {
            "name": "Benjamindada",
            "url": "https://www.benjamindada.com/rss/",
            "region": "Nigeria",
        },
    ]

    # Keywords for event classification
    EVENT_KEYWORDS = {
        "funding": ["funding", "raised", "investment", "series", "seed", "venture", "million", "capital"],
        "partnership": ["partnership", "partner", "collaboration", "agreement", "deal", "alliance"],
        "hiring": ["hiring", "jobs", "recruit", "talent", "team", "positions", "careers"],
        "expansion": ["expansion", "launch", "expand", "new market", "enters", "opens"],
    }

    async def fetch_all_feeds(self) -> List[Dict[str, Any]]:
        """Fetch and parse all configured RSS feeds"""
        all_items = []

        for feed_config in self.RSS_FEEDS:
            try:
                items = await self._fetch_single_feed(feed_config)
                all_items.extend(items)
            except Exception as e:
                # Log error but continue with other feeds
                print(f"Error fetching {feed_config['name']}: {e}")
                continue

        # Sort by date, most recent first
        all_items.sort(
            key=lambda x: x.get("published_at") or datetime.min,
            reverse=True,
        )

        return all_items

    async def _fetch_single_feed(self, feed_config: Dict[str, str]) -> List[Dict[str, Any]]:
        """Fetch and parse a single RSS feed"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(feed_config["url"])
            response.raise_for_status()

        feed = feedparser.parse(response.text)
        items = []

        for entry in feed.entries[:20]:  # Limit to 20 most recent
            published = None
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                published = datetime(*entry.published_parsed[:6])

            # Only include items from last 7 days (N2 requirement)
            if published and published < datetime.utcnow() - timedelta(days=7):
                continue

            event_type = self._classify_event(entry.get("title", "") + " " + entry.get("summary", ""))
            country = self._detect_country(entry.get("title", "") + " " + entry.get("summary", ""))

            items.append({
                "headline": entry.get("title", ""),
                "summary": self._clean_html(entry.get("summary", "")),
                "source_url": entry.get("link", ""),
                "source_name": feed_config["name"],
                "published_at": published,
                "event_type": event_type,
                "country": country or feed_config.get("region"),
                "company_name": self._extract_company_name(entry.get("title", "")),
            })

        return items

    def _classify_event(self, text: str) -> str:
        """Classify the event type based on keywords"""
        text_lower = text.lower()

        scores = {}
        for event_type, keywords in self.EVENT_KEYWORDS.items():
            scores[event_type] = sum(1 for kw in keywords if kw in text_lower)

        if max(scores.values()) > 0:
            return max(scores, key=scores.get)

        return "news"  # Default category

    def _detect_country(self, text: str) -> Optional[str]:
        """Detect if the news is about Nigeria or Ghana"""
        text_lower = text.lower()

        nigeria_keywords = ["nigeria", "nigerian", "lagos", "abuja", "naira", "ngn"]
        ghana_keywords = ["ghana", "ghanaian", "accra", "cedi", "ghs"]

        nigeria_score = sum(1 for kw in nigeria_keywords if kw in text_lower)
        ghana_score = sum(1 for kw in ghana_keywords if kw in text_lower)

        if nigeria_score > ghana_score:
            return "Nigeria"
        elif ghana_score > nigeria_score:
            return "Ghana"

        return None

    def _extract_company_name(self, title: str) -> Optional[str]:
        """Attempt to extract company name from headline"""
        # Simple heuristic: first capitalized word or phrase before common verbs
        verbs = ["raises", "announces", "launches", "secures", "partners", "expands", "hires"]

        for verb in verbs:
            if verb in title.lower():
                idx = title.lower().index(verb)
                potential_name = title[:idx].strip()
                if potential_name and len(potential_name) > 2:
                    return potential_name

        return None

    def _clean_html(self, html: str) -> str:
        """Remove HTML tags and clean text"""
        if not html:
            return ""
        soup = BeautifulSoup(html, "lxml")
        return soup.get_text(separator=" ", strip=True)[:500]  # Limit length

    async def search_by_event_type(
        self,
        event_type: str,
        country: Optional[str] = None,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        """Filter feed items by event type and country"""
        all_items = await self.fetch_all_feeds()

        filtered = [
            item for item in all_items
            if item["event_type"] == event_type
            and (country is None or item.get("country") == country)
        ]

        return filtered[:limit]
