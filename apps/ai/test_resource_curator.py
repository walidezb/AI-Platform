"""
Test the Resource Curation Agent end to end.
Run: python test_resource_curator.py
"""
import asyncio
from app.agents.resource_curator import ResourceCuratorAgent
from app.schemas.path import GeneratedResource

async def test():
  curator = ResourceCuratorAgent()
  print("=== Resource Curation Agent Test ===\n")

  # Mix of valid + dead URLs
  test_resources = [
    GeneratedResource(
      title="TypeScript Handbook",
      url="https://www.typescriptlang.org/docs/",
      sourcePlatform="TypeScript Official",
      description="Official TypeScript documentation",
      resourceType="DOCUMENTATION",
      qualityScore=9.5,
      language="EN",
    ),
    GeneratedResource(
      title="Dead Link Example",
      url="https://this-domain-does-not-exist-xyz123.com/tutorial",
      sourcePlatform="Unknown",
      description="A resource that does not exist",
      resourceType="ARTICLE",
      qualityScore=7.0,
      language="EN",
    ),
    GeneratedResource(
      title="React Documentation",
      url="https://react.dev/learn",
      sourcePlatform="React Official",
      description="Official React documentation and tutorials",
      resourceType="DOCUMENTATION",
      qualityScore=9.5,
      language="EN",
    ),
  ]

  print(f"Input: {len(test_resources)} resources (1 dead link)\n")

  curated = await curator.curate(
    resources=test_resources,
    module_title="TypeScript with React",
    module_description="Using TypeScript in React applications",
    domain="Frontend Development",
    experience_level="INTERMEDIATE",
    language="EN",
  )

  print(f"Output: {len(curated)} curated resources\n")
  for i, r in enumerate(curated):
    print(f"  {i+1}. {r.title}")
    print(f"     URL: {r.url}")
    print(f"     Platform: {r.sourcePlatform}")
    print(f"     Quality Score: {r.qualityScore}")
    print()

  # Verify dead link was removed
  urls = [r.url for r in curated]
  assert "this-domain-does-not-exist-xyz123.com" not in str(urls)
  print("✅ Dead link successfully removed")

  # Verify quality scores are all > 0
  assert all(r.qualityScore > 0 for r in curated)
  print("✅ All resources have valid quality scores")

  # Verify sorted by quality
  scores = [r.qualityScore for r in curated]
  assert scores == sorted(scores, reverse=True)
  print("✅ Resources sorted by quality score (high to low)")

  # Test Google Search fallback
  print("\nTesting Google Search fallback (empty input)...")
  fallback = await curator.curate(
    resources=[],
    module_title="JavaScript Array Methods",
    module_description="Filter, map, reduce in JavaScript",
    domain="Frontend Development",
    experience_level="BEGINNER",
    language="EN",
  )
  print(f"✅ Fallback returned {len(fallback)} resources from Google Search")
  for r in fallback:
    print(f"   - {r.title} ({r.sourcePlatform})")

  print("\n=== All tests passed! ===")

if __name__ == "__main__":
  from dotenv import load_dotenv
  load_dotenv()
  asyncio.run(test())
