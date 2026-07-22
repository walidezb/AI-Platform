import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

async def save_module_resources(
    module_id: str,
    resources: list[dict],
) -> bool:
    """Push curated resources to NestJS for a specific module."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{settings.API_URL}/internal/modules/{module_id}/resources",
                json={"resources": resources},
                headers={"X-Internal-Secret": settings.INTERNAL_SERVICE_SECRET},
            )
            response.raise_for_status()
            data = response.json()
            logger.info(
                f"Saved {data.get('savedCount', 0)} resources "
                f"for module {module_id}"
            )
            return True
    except Exception as e:
        logger.error(f"Failed to save resources for module {module_id}: {e}")
        return False
