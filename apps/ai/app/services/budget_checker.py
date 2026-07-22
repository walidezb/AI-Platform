import httpx
import logging
import time
from app.config import settings
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# In-memory cache: { orgId: { data, fetchedAt } }
# TTL: 60 seconds (avoids a DB hit on every AI message)
_budget_cache: dict = {}
CACHE_TTL_SECONDS = 60

async def check_budget(organization_id: str) -> dict:
    """
    Fetch budget status from NestJS.
    Returns the budget dict or raises HTTPException(402) if over budget.
    Caches results for 60 seconds.
    """
    if not organization_id:
        return {"isOverBudget": False, "isNearLimit": False}

    # Check cache first
    cached = _budget_cache.get(organization_id)
    if cached and (time.time() - cached['fetchedAt']) < CACHE_TTL_SECONDS:
        budget = cached['data']
    else:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{settings.API_URL}/internal/budget/{organization_id}",
                    headers={"X-Internal-Secret": settings.INTERNAL_SERVICE_SECRET}
                )
                response.raise_for_status()
                budget = response.json().get('data', {})

                # Store in cache
                _budget_cache[organization_id] = {
                    'data': budget,
                    'fetchedAt': time.time(),
                }
        except httpx.HTTPStatusError as e:
            logger.error(f"Budget check HTTP error for org {organization_id}: {e}")
            # Fail open — don't block AI if budget service is down
            return {"isOverBudget": False, "isNearLimit": False}
        except Exception as e:
            logger.error(f"Budget check failed for org {organization_id}: {e}")
            return {"isOverBudget": False, "isNearLimit": False}

    if budget.get('isOverBudget'):
        logger.warning(
            f"Org {organization_id} is OVER BUDGET "
            f"(${budget.get('used', 0):.2f} / ${budget.get('budget', 0):.2f})"
        )
        raise HTTPException(
            status_code=402,
            detail={
                "error": "TOKEN_BUDGET_EXCEEDED",
                "message": (
                    "Your organization's AI token budget has been exceeded. "
                    "Please contact your administrator to increase the limit."
                ),
                "used": budget.get('used', 0),
                "budget": budget.get('budget', 0),
                "percentUsed": budget.get('percentUsed', 0),
            }
        )

    return budget

def invalidate_budget_cache(organization_id: str):
    """Call after logging usage to force fresh fetch on next check."""
    if organization_id:
        _budget_cache.pop(organization_id, None)
