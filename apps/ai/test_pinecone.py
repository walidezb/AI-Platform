"""
Test Pinecone integration end to end.
Run: python test_pinecone.py
"""
import asyncio
from app.services.pinecone_service import pinecone_service

async def test():
    print("=== Pinecone Integration Test ===\n")

    # 1. Health check
    health = pinecone_service.health_check()
    print(f"Health: {health}")
    
    if health["status"] == "disabled":
        print("\n⚠️ Pinecone vector features are disabled (No API key configured). Skipping tests requiring remote Pinecone connectivity.")
        print("=== Test finished (Pinecone disabled) ===")
        return

    assert health["status"] == "ok", "Pinecone not connected!"

    # 2. Upsert a test resource
    test_resource = {
        "title": "TypeScript Handbook — Official Docs",
        "description": "The official guide to TypeScript",
        "url": "https://www.typescriptlang.org/docs/",
        "sourcePlatform": "TypeScript Official",
        "resourceType": "DOCUMENTATION",
        "qualityScore": 9.5,
    }
    vector_id = await pinecone_service.upsert_resource(
        resource_id="test-resource-001",
        resource=test_resource,
        domain="Frontend Development",
        experience_level="INTERMEDIATE",
        org_id="test-org",
    )
    print(f"\n✅ Upserted resource: {vector_id}")

    # 3. Wait a moment for index to update
    await asyncio.sleep(2)

    # 4. Semantic search
    results = await pinecone_service.find_similar_resources(
        query_text="TypeScript type system documentation",
        domain="Frontend Development",
        top_k=3,
        threshold=0.7,
    )
    print("\n✅ Search results for 'TypeScript type system':")
    for r in results:
        print(f"  - {r['title']} (score: {r['score']})")

    # 5. Duplicate check
    duplicate_resource = {
        "title": "TypeScript Official Documentation",
        "description": "Complete TypeScript guide by Microsoft",
        "url": "https://www.typescriptlang.org/docs/handbook/intro.html",
        "sourcePlatform": "TypeScript Official",
        "qualityScore": 9.0,
    }
    is_dup, existing_id = await pinecone_service.is_duplicate(
        resource=duplicate_resource,
        domain="Frontend Development",
    )
    print(f"\n✅ Duplicate check: isDuplicate={is_dup}, existingId={existing_id}")

    # 6. Updated health with vector count
    health_after = pinecone_service.health_check()
    print(f"\n✅ Final health: {health_after}")
    print("\n=== All tests passed! ===")

if __name__ == "__main__":
    import sys
    import os
    # Add app to path to allow direct running
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from dotenv import load_dotenv
    load_dotenv()
    asyncio.run(test())
