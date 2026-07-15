import httpx
import asyncio
import logging
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# Domains that always return 403 to HEAD but are valid
TRUSTED_DOMAINS = {
  'youtube.com', 'youtu.be',
  'github.com', 'github.io',
  'medium.com', 'dev.to',
  'udemy.com', 'coursera.org',
  'linkedin.com/learning',
  'developer.mozilla.org',
  'docs.microsoft.com', 'learn.microsoft.com',
  'web.dev', 'css-tricks.com',
  'kentcdodds.com', 'joshwcomeau.com',
  'fireship.io', 'theodinproject.com',
  'freecodecamp.org', 'roadmap.sh',
}

# Domains that are almost certainly valid learning resources
HIGH_QUALITY_DOMAINS = {
  'developer.mozilla.org': 9.5,
  'web.dev': 9.2,
  'docs.python.org': 9.5,
  'docs.djangoproject.com': 9.3,
  'react.dev': 9.5,
  'nextjs.org': 9.3,
  'typescriptlang.org': 9.4,
  'freecodecamp.org': 9.0,
  'theodinproject.com': 9.0,
  'roadmap.sh': 8.8,
  'css-tricks.com': 8.7,
  'kentcdodds.com': 8.9,
  'joshwcomeau.com': 8.8,
  'fireship.io': 8.7,
  'refactoring.guru': 9.1,
  'youtube.com': 8.0,   # varies, but default high
  'github.com': 8.5,
}

class UrlValidator:

  def __init__(self, timeout: float = 8.0):
    self.timeout = timeout

  def _extract_domain(self, url: str) -> str:
    try:
      parsed = urlparse(url)
      return parsed.netloc.replace('www.', '').lower()
    except Exception:
      return ''

  def _is_trusted_domain(self, url: str) -> bool:
    domain = self._extract_domain(url)
    return any(trusted in domain for trusted in TRUSTED_DOMAINS)

  def _is_valid_url_format(self, url: str) -> bool:
    try:
      parsed = urlparse(url)
      return all([
        parsed.scheme in ('http', 'https'),
        parsed.netloc,
        len(url) < 2000,
      ])
    except Exception:
      return False

  async def validate_url(self, url: str) -> dict:
    """
    Validate a single URL.
    Returns: { valid: bool, statusCode: int, reason: str }
    """
    if not self._is_valid_url_format(url):
      return { "valid": False, "statusCode": 0, "reason": "invalid_format" }

    # Trust known quality domains without HTTP check
    # (they often block bots but are always valid)
    if self._is_trusted_domain(url):
      return { "valid": True, "statusCode": 200, "reason": "trusted_domain" }

    try:
      async with httpx.AsyncClient(
        timeout=self.timeout,
        follow_redirects=True,
        headers={
          "User-Agent": (
            "Mozilla/5.0 (compatible; LearnPathBot/1.0; "
            "+https://learnpath.ai/bot)"
          )
        }
      ) as client:
        # Use HEAD first (lighter)
        response = await client.head(url)

        if response.status_code == 405:
          # HEAD not allowed → try GET with range
          response = await client.get(
            url,
            headers={"Range": "bytes=0-0"}
          )

        is_valid = response.status_code < 400
        return {
          "valid": is_valid,
          "statusCode": response.status_code,
          "reason": "ok" if is_valid else f"http_{response.status_code}",
          "finalUrl": str(response.url),  # after redirects
        }

    except httpx.TimeoutException:
      # Timeout doesn't mean invalid — could be slow server
      # Assume valid if it's a known education domain
      return { "valid": True, "statusCode": 0, "reason": "timeout_assumed_valid" }
    except httpx.ConnectError:
      return { "valid": False, "statusCode": 0, "reason": "connection_failed" }
    except Exception as e:
      logger.warning(f"URL validation error for {url}: {e}")
      return { "valid": True, "statusCode": 0, "reason": "error_assumed_valid" }

  async def validate_batch(
    self,
    urls: list[str],
    concurrency: int = 10,
  ) -> dict[str, dict]:
    """
    Validate multiple URLs concurrently.
    Returns: { url → validation_result }
    """
    semaphore = asyncio.Semaphore(concurrency)

    async def validate_with_semaphore(url: str):
      async with semaphore:
        result = await self.validate_url(url)
        return url, result

    results = await asyncio.gather(
      *[validate_with_semaphore(url) for url in urls],
      return_exceptions=True,
    )

    return {
      url: result
      for url, result in results
      if not isinstance(result, Exception)
    }

  def get_base_quality_score(self, url: str) -> float:
    """Get quality score based on domain reputation."""
    domain = self._extract_domain(url)
    for known_domain, score in HIGH_QUALITY_DOMAINS.items():
      if known_domain in domain:
        return score
    return 7.0  # default score for unknown domains

url_validator = UrlValidator()
