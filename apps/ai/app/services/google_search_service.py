import httpx
import logging
from app.config import settings

logger = logging.getLogger(__name__)

# High-quality domains to prefer in search results
PREFERRED_DOMAINS = [
  'site:developer.mozilla.org',
  'site:web.dev',
  'site:freecodecamp.org',
  'site:theodinproject.com',
  'site:css-tricks.com',
  'site:fireship.io',
  'site:kentcdodds.com',
  'site:roadmap.sh',
  'site:github.com',
  'site:youtube.com',
]

class GoogleSearchService:

  BASE_URL = "https://www.googleapis.com/customsearch/v1"

  def __init__(self):
    self._enabled = bool(
      settings.GOOGLE_SEARCH_API_KEY
      and settings.GOOGLE_SEARCH_ENGINE_ID
      and settings.GOOGLE_SEARCH_ENABLED
    )
    if not self._enabled:
      logger.warning("Google Search disabled — API key or engine ID missing")

  async def search_resources(
    self,
    query: str,
    resource_type: str = "ARTICLE",  # ARTICLE | VIDEO | DOCUMENTATION
    language: str = "EN",
    max_results: int = 3,
  ) -> list[dict]:
    """
    Search Google for learning resources on a topic.
    Returns list of resource dicts.
    """
    if not self._enabled:
      return []

    # Build search query
    type_modifiers = {
      "VIDEO":         "tutorial video site:youtube.com",
      "DOCUMENTATION": "official documentation reference",
      "ARTICLE":       "tutorial guide tutorial beginner",
    }
    modifier = type_modifiers.get(resource_type, "tutorial")
    full_query = f"{query} {modifier}"

    # Language filter
    lang_param = "lang_ar" if language == "AR" else "lang_en"

    try:
      async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
          self.BASE_URL,
          params={
            "key":   settings.GOOGLE_SEARCH_API_KEY,
            "cx":    settings.GOOGLE_SEARCH_ENGINE_ID,
            "q":     full_query,
            "num":   min(max_results + 2, 10),  # get extras for filtering
            "lr":    lang_param,
            "safe":  "active",
          }
        )

        if response.status_code != 200:
          logger.error(
            f"Google Search API error {response.status_code}: {response.text}"
          )
          return []

        data = response.json()
        items = data.get("items", [])

        resources = []
        for item in items[:max_results]:
          resources.append({
            "title":          item.get("title", ""),
            "url":            item.get("link", ""),
            "description":    item.get("snippet", ""),
            "sourcePlatform": self._extract_platform(item.get("link", "")),
            "resourceType":   resource_type,
            "language":       language,
            "qualityScore":   7.5,  # will be re-scored by curator
            "durationMinutes": None,
            "fromSearch":     True,  # flag: found via Google Search
          })

        logger.info(
          f"Google Search found {len(resources)} results for: {query[:50]}"
        )
        return resources

    except Exception as e:
      logger.error(f"Google Search failed: {e}")
      return []

  def _extract_platform(self, url: str) -> str:
    """Extract human-readable platform name from URL."""
    platform_map = {
      'youtube.com':              'YouTube',
      'developer.mozilla.org':    'MDN Web Docs',
      'freecodecamp.org':         'freeCodeCamp',
      'css-tricks.com':           'CSS-Tricks',
      'web.dev':                  'web.dev',
      'fireship.io':              'Fireship',
      'kentcdodds.com':           'Kent C. Dodds',
      'theodinproject.com':       'The Odin Project',
      'roadmap.sh':               'roadmap.sh',
      'github.com':               'GitHub',
      'medium.com':               'Medium',
      'dev.to':                   'DEV Community',
      'typescriptlang.org':       'TypeScript Official',
      'react.dev':                'React Official',
      'nextjs.org':               'Next.js Official',
      'docs.python.org':          'Python Docs',
    }
    url_lower = url.lower()
    for domain, name in platform_map.items():
      if domain in url_lower:
        return name
    # Extract domain as fallback
    try:
      from urllib.parse import urlparse
      return urlparse(url).netloc.replace('www.', '').split('.')[0].title()
    except Exception:
      return 'Web'

google_search = GoogleSearchService()
