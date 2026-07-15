import logging
from typing import List
from openai import AsyncOpenAI
from app.config import settings

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.EMBEDDING_MODEL

    async def embed_text(self, text: str) -> List[float]:
        """Embed a single text string."""
        try:
            response = await self.client.embeddings.create(
                model=self.model,
                input=text.strip()[:8000],  # stay within token limit
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Embedding failed: {e}")
            raise

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Embed multiple texts in a single API call (more efficient)."""
        try:
            # Clean and truncate inputs
            cleaned = [t.strip()[:8000] for t in texts]
            response = await self.client.embeddings.create(
                model=self.model,
                input=cleaned,
            )
            # Sort by index to ensure order is preserved
            sorted_data = sorted(response.data, key=lambda x: x.index)
            return [item.embedding for item in sorted_data]
        except Exception as e:
            logger.error(f"Batch embedding failed: {e}")
            raise

    def build_resource_text(self, resource: dict) -> str:
        """
        Build the text to embed for a learning resource.
        Combine title + description for richer semantic meaning.
        """
        parts = [
            resource.get("title", ""),
            resource.get("description", ""),
            resource.get("sourcePlatform", ""),
        ]
        return " | ".join(p for p in parts if p)

embedding_service = EmbeddingService()
