import httpx
import logging
from app.config import settings

logger = logging.getLogger(__name__)

async def log_usage(
  organization_id: str,
  user_id:         str,
  feature:         str,
  model_used:      str,
  tokens_input:    int,
  tokens_output:   int,
) -> None:
  """Log AI token usage to NestJS for billing + budget tracking."""
  try:
    # Cost calculation (GPT-4o pricing, per 1M tokens)
    input_cost_per_1m  = 2.50
    output_cost_per_1m = 10.00
    cost_usd = (
      (tokens_input  / 1_000_000) * input_cost_per_1m +
      (tokens_output / 1_000_000) * output_cost_per_1m
    )

    async with httpx.AsyncClient(timeout=5.0) as client:
      await client.post(
        f"{settings.API_URL}/internal/usage/log",
        json={
          "organizationId": organization_id,
          "userId":         user_id,
          "feature":        feature,
          "modelUsed":      model_used,
          "tokensInput":    tokens_input,
          "tokensOutput":   tokens_output,
          "costUsd":        round(cost_usd, 6),
        },
        headers={
          "X-Internal-Secret": settings.INTERNAL_SERVICE_SECRET,
        }
      )
  except Exception as e:
    # Non-critical — don't fail the main flow
    logger.warning(f"Failed to log AI usage: {e}")
