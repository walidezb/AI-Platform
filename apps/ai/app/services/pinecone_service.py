import logging
import uuid
from typing import List, Optional, Tuple
from pinecone import Pinecone
from app.config import settings
from app.services.embedding_service import embedding_service

logger = logging.getLogger(__name__)

SIMILARITY_THRESHOLD = 0.92  # above this = duplicate resource

class PineconeService:
    def __init__(self):
        if not settings.PINECONE_API_KEY or settings.PINECONE_API_KEY in ("", "...", "your-key-here"):
            logger.warning("Pinecone API key not set — vector features disabled")
            self._enabled = False
            return

        self._enabled = True
        self._pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        self._index = self._pc.Index(settings.PINECONE_INDEX_NAME)
        logger.info("Pinecone service initialized")

    @property
    def enabled(self) -> bool:
        return self._enabled

    # ── UPSERT ─────────────────────────────────────────────

    async def upsert_resource(
        self,
        resource_id: str,
        resource: dict,
        domain: str,
        experience_level: str,
        org_id: str,
    ) -> str:
        """
        Embed and store a learning resource.
        Returns the Pinecone vector ID.
        """
        if not self._enabled:
            return resource_id

        text = embedding_service.build_resource_text(resource)
        vector = await embedding_service.embed_text(text)
        vector_id = f"res_{resource_id}"

        self._index.upsert(
            vectors=[{
                "id": vector_id,
                "values": vector,
                "metadata": {
                    "resourceId":   resource_id,
                    "title":        resource.get("title", "")[:200],
                    "url":          resource.get("url", "")[:500],
                    "sourcePlatform": resource.get("sourcePlatform", ""),
                    "resourceType": resource.get("resourceType", "ARTICLE"),
                    "domain":       domain,
                    "level":        experience_level,
                    "orgId":        org_id,
                    "qualityScore": resource.get("qualityScore", 7.0),
                }
            }]
        )
        logger.debug(f"Upserted resource {resource_id} to Pinecone")
        return vector_id

    async def upsert_resources_batch(
        self,
        resources: List[dict],  # each has id, resource data, domain, level, orgId
    ) -> int:
        """Batch upsert multiple resources efficiently."""
        if not self._enabled or not resources:
            return 0

        # Build texts for batch embedding
        texts = [
            embedding_service.build_resource_text(r["resource"])
            for r in resources
        ]

        # Single batch embedding call
        vectors = await embedding_service.embed_batch(texts)

        # Build upsert payload
        upsert_data = []
        for r, vector in zip(resources, vectors):
            upsert_data.append({
                "id": f"res_{r['id']}",
                "values": vector,
                "metadata": {
                    "resourceId":   r["id"],
                    "title":        r["resource"].get("title", "")[:200],
                    "url":          r["resource"].get("url", "")[:500],
                    "sourcePlatform": r["resource"].get("sourcePlatform", ""),
                    "resourceType": r["resource"].get("resourceType", "ARTICLE"),
                    "domain":       r["domain"],
                    "level":        r["level"],
                    "orgId":        r["orgId"],
                    "qualityScore": r["resource"].get("qualityScore", 7.0),
                }
            })

        # Upsert in batches of 100 (Pinecone limit)
        batch_size = 100
        for i in range(0, len(upsert_data), batch_size):
            self._index.upsert(vectors=upsert_data[i:i+batch_size])

        logger.info(f"Batch upserted {len(resources)} resources to Pinecone")
        return len(resources)

    # ── SIMILARITY SEARCH ──────────────────────────────────

    async def find_similar_resources(
        self,
        query_text: str,
        domain: Optional[str] = None,
        level: Optional[str] = None,
        top_k: int = 5,
        threshold: float = SIMILARITY_THRESHOLD,
    ) -> List[dict]:
        """
        Find semantically similar resources already in the index.
        Used to avoid duplicates and for recommendations.
        """
        if not self._enabled:
            return []

        vector = await embedding_service.embed_text(query_text)

        # Build metadata filter
        filter_dict = {}
        if domain:
            filter_dict["domain"] = {"$eq": domain}
        if level:
            filter_dict["level"] = {"$eq": level}

        results = self._index.query(
            vector=vector,
            top_k=top_k,
            include_metadata=True,
            filter=filter_dict if filter_dict else None,
        )

        # Return only results above threshold
        return [
            {
                "resourceId": match.metadata["resourceId"],
                "title":      match.metadata["title"],
                "url":        match.metadata["url"],
                "score":      round(match.score, 4),
                "isDuplicate": match.score >= threshold,
            }
            for match in results.matches
            if match.score >= 0.75  # exclude very dissimilar
        ]

    async def is_duplicate(self, resource: dict, domain: str) -> Tuple[bool, Optional[str]]:
        """
        Check if a resource is a near-duplicate of an existing one.
        Returns (isDuplicate, existingResourceId).
        """
        if not self._enabled:
            return False, None

        text = embedding_service.build_resource_text(resource)
        similar = await self.find_similar_resources(
            query_text=text,
            domain=domain,
            top_k=1,
            threshold=SIMILARITY_THRESHOLD,
        )

        if similar and similar[0]["isDuplicate"]:
            return True, similar[0]["resourceId"]
        return False, None

    # ── RECOMMENDATIONS ────────────────────────────────────

    async def get_recommendations(
        self,
        completed_resource_ids: List[str],
        domain: str,
        level: str,
        limit: int = 5,
    ) -> List[dict]:
        """
        Given completed resources, recommend what to learn next.
        Averages the vectors of completed resources as the query.
        """
        if not self._enabled or not completed_resource_ids:
            return []

        # Fetch vectors for completed resources
        completed_vectors = self._index.fetch(
            ids=[f"res_{rid}" for rid in completed_resource_ids]
        )

        if not completed_vectors.vectors:
            return []

        # Average the vectors
        all_vectors = [v.values for v in completed_vectors.vectors.values()]
        avg_vector = [
            sum(col) / len(col)
            for col in zip(*all_vectors)
        ]

        # Query with averaged vector
        results = self._index.query(
            vector=avg_vector,
            top_k=limit + len(completed_resource_ids),
            include_metadata=True,
            filter={
                "domain": {"$eq": domain},
                "level": {"$eq": level},
            }
        )

        # Exclude already completed
        return [
            {
                "resourceId": m.metadata["resourceId"],
                "title":      m.metadata["title"],
                "url":        m.metadata["url"],
                "platform":   m.metadata["sourcePlatform"],
                "score":      round(m.score, 4),
            }
            for m in results.matches
            if m.metadata["resourceId"] not in completed_resource_ids
        ][:limit]

    # ── HEALTH ─────────────────────────────────────────────

    def health_check(self) -> dict:
        if not self._enabled:
            return {"status": "disabled", "reason": "No API key configured"}
        try:
            stats = self._index.describe_index_stats()
            return {
                "status": "ok",
                "totalVectors": stats.total_vector_count,
                "indexFullness": stats.index_fullness,
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}

# Singleton
pinecone_service = PineconeService()
