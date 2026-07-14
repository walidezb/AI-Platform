import httpx
import logging
from app.config import settings

logger = logging.getLogger(__name__)

async def log_usage_to_api(
    org_id: str,
    user_id: str,
    feature: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
    cost_usd: float,
):
    """Fire-and-forget usage log to NestJS."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(
                f"{settings.API_URL}/internal/usage/log",
                json={
                    "organizationId": org_id,
                    "userId": user_id,
                    "feature": feature,
                    "modelUsed": model,
                    "tokensInput": input_tokens,
                    "tokensOutput": output_tokens,
                    "costUsd": cost_usd,
                },
                headers={"X-Internal-Secret": settings.INTERNAL_SERVICE_SECRET},
            )
    except Exception as e:
        logger.error(f"Usage log failed: {e}")
        # Non-fatal — don't interrupt main flow
