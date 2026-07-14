from fastapi import APIRouter
from app.services.redis_service import redis_service
from app.config import settings

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health():
    redis_ok = await redis_service.health_check()
    return {
        "status": "ok" if redis_ok else "degraded",
        "environment": settings.ENVIRONMENT,
        "services": {
            "api": "ok",
            "redis": "ok" if redis_ok else "error",
            "openai": "configured" if settings.OPENAI_API_KEY else "missing",
        }
    }
