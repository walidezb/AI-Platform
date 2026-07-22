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


async def update_submission(
  submission_id: str,
  score:         float,
  feedback:      str,
  passed:        bool,
  milestone_id:  str,
  user_id:       str,
) -> bool:
  """Push evaluation result back to NestJS."""
  try:
    status = 'PASSED' if passed else 'FAILED'
    async with httpx.AsyncClient(timeout=15.0) as client:
      response = await client.patch(
        f"{settings.API_URL}/internal/submissions/{submission_id}",
        json={
          "score":       score,
          "feedback":    feedback,
          "status":      status,
          "milestoneId": milestone_id,
          "userId":      user_id,
        },
        headers={
          "X-Internal-Secret": settings.INTERNAL_SERVICE_SECRET,
        }
      )
      response.raise_for_status()
      return True
  except Exception as e:
    logger.error(f"update_submission failed: {e}")
    return False
