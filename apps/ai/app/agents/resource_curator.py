import asyncio
import logging
from app.schemas.path import GeneratedResource
from app.services.url_validator import url_validator
from app.services.google_search_service import google_search
from app.config import settings

logger = logging.getLogger(__name__)

class ResourceCuratorAgent:
  """
  Full resource curation pipeline:
  1. Validate all URLs in batch
  2. Remove dead links
  3. Replace dead links via Google Search
  4. Score all resources by domain quality + validation result
  5. Filter by language
  6. Deduplicate by URL
  7. Sort by quality score
  """

  MIN_RESOURCES_PER_MODULE = 2
  MAX_RESOURCES_PER_MODULE = 4

  async def curate(
    self,
    resources: list[GeneratedResource],
    module_title: str,
    module_description: str,
    domain: str,
    experience_level: str,
    language: str = "EN",
  ) -> list[GeneratedResource]:
    """
    Curate resources for a single module.
    Returns validated, scored, filtered resource list.
    """
    if not resources:
      return await self._search_fallback(
        module_title, domain, language
      )

    # Step 1: Validate all URLs in batch
    urls = [r.url for r in resources]
    validation_results = {}

    if settings.RESOURCE_VALIDATION_ENABLED:
      logger.info(
        f"Validating {len(urls)} URLs for module: {module_title[:40]}"
      )
      validation_results = await url_validator.validate_batch(urls)
    else:
      # Skip validation in dev mode
      validation_results = {url: {"valid": True} for url in urls}

    # Step 2: Separate valid from dead
    valid_resources = []
    dead_resources = []

    for resource in resources:
      result = validation_results.get(resource.url, {"valid": True})
      if result["valid"]:
        valid_resources.append(resource)
      else:
        logger.warning(
          f"Dead link removed: {resource.url} "
          f"(reason: {result.get('reason', 'unknown')})"
        )
        dead_resources.append(resource)

    # Step 3: Replace dead links via Google Search
    if dead_resources and google_search._enabled:
      for dead in dead_resources:
        search_results = await google_search.search_resources(
          query=f"{module_title} {dead.title}",
          resource_type=dead.resourceType,
          language=language,
          max_results=1,
        )
        if search_results:
          replacement = search_results[0]
          valid_resources.append(GeneratedResource(
            title=replacement["title"],
            url=replacement["url"],
            sourcePlatform=replacement["sourcePlatform"],
            description=replacement["description"],
            resourceType=dead.resourceType,
            durationMinutes=dead.durationMinutes,
            qualityScore=replacement["qualityScore"],
            language=language,
          ))
          logger.info(
            f"Replaced dead link with: {replacement['url']}"
          )

    # Step 4: If still too few resources → search for more
    if len(valid_resources) < self.MIN_RESOURCES_PER_MODULE:
      extra = await google_search.search_resources(
        query=f"{module_title} {domain} tutorial",
        language=language,
        max_results=self.MIN_RESOURCES_PER_MODULE - len(valid_resources),
      )
      for r in extra:
        valid_resources.append(GeneratedResource(**r))

    # Step 5: Score all resources
    scored = self._score_resources(valid_resources, language)

    # Step 6: Deduplicate by URL
    seen_urls = set()
    deduped = []
    for r in scored:
      if r.url not in seen_urls:
        seen_urls.add(r.url)
        deduped.append(r)

    # Step 7: Filter by language preference
    filtered = self._filter_by_language(deduped, language)

    # Step 8: Sort by quality score + limit count
    final = sorted(filtered, key=lambda r: r.qualityScore, reverse=True)
    final = final[:self.MAX_RESOURCES_PER_MODULE]

    logger.info(
      f"Module '{module_title[:40]}': "
      f"{len(resources)} raw → {len(final)} curated resources"
    )
    return final

  def _score_resources(
    self,
    resources: list[GeneratedResource],
    language: str,
  ) -> list[GeneratedResource]:
    """Apply quality scoring heuristics."""
    for resource in resources:
      base_score = url_validator.get_base_quality_score(resource.url)

      # Domain reputation
      score = base_score

      # Boost for official docs
      url_lower = resource.url.lower()
      if any(d in url_lower for d in ['docs.', 'official', 'learn.']):
        score += 0.5

      # Boost for specific content (not just homepages)
      path = resource.url.split('/', 3)[-1] if '/' in resource.url else ''
      if len(path) > 10:  # has a specific path, not just homepage
        score += 0.3

      # Slight penalty for very long URLs (often SEO spam)
      if len(resource.url) > 150:
        score -= 0.3

      # Cap at 10
      resource.qualityScore = round(min(10.0, max(0.0, score)), 2)

    return resources

  def _filter_by_language(
    self,
    resources: list[GeneratedResource],
    preferred_language: str,
  ) -> list[GeneratedResource]:
    """
    For EN: exclude known AR-only domains
    For AR: prefer AR resources, keep EN as fallback
    """
    if preferred_language == "EN":
      return [
        r for r in resources
        if r.language != "AR"
      ]
    else:
      # AR preferred — sort AR first, EN as backup
      ar_resources = [r for r in resources if r.language == "AR"]
      en_resources = [r for r in resources if r.language != "AR"]
      return (ar_resources + en_resources)[:self.MAX_RESOURCES_PER_MODULE]

  async def _search_fallback(
    self,
    module_title: str,
    domain: str,
    language: str,
  ) -> list[GeneratedResource]:
    """Last resort: search Google when no resources provided at all."""
    results = await google_search.search_resources(
      query=f"{module_title} {domain} tutorial",
      language=language,
      max_results=2,
    )
    return [GeneratedResource(**r) for r in results] if results else []

  async def curate_all_modules(
    self,
    path_milestones: list,
    domain: str,
    experience_level: str,
    language: str = "EN",
  ) -> list:
    """
    Curate resources for ALL modules across ALL milestones.
    Runs module curation concurrently for speed.
    """
    # Flatten all modules with their milestone context
    tasks = []
    module_refs = []  # track which milestone/module each task belongs to

    for m_idx, milestone in enumerate(path_milestones):
      for mod_idx, module in enumerate(milestone.modules):
        task = self.curate(
          resources=module.resources,
          module_title=module.title,
          module_description=module.description,
          domain=domain,
          experience_level=experience_level,
          language=language,
        )
        tasks.append(task)
        module_refs.append((m_idx, mod_idx))

    # Run all curation tasks concurrently
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Apply results back to milestones
    for (m_idx, mod_idx), result in zip(module_refs, results):
      if isinstance(result, Exception):
        logger.error(
          f"Curation failed for module "
          f"'{path_milestones[m_idx].modules[mod_idx].title}': {result}"
        )
        # Keep original resources on failure
      else:
        path_milestones[m_idx].modules[mod_idx].resources = result

    total_resources = sum(
      len(mod.resources)
      for m in path_milestones
      for mod in m.modules
    )
    logger.info(
      f"Resource curation complete: "
      f"{total_resources} curated resources across "
      f"{len(tasks)} modules"
    )
    return path_milestones
