import logging
import httpx
import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.agents.path_generator import PathGeneratorAgent
from app.agents.resource_curator import ResourceCuratorAgent
from app.schemas.path import PathGenerationRequest, GeneratedPath
from app.config import settings

router = APIRouter(prefix="/path", tags=["Path Generation"])
logger = logging.getLogger(__name__)

@router.post("/generate")
async def generate_path(
    request: PathGenerationRequest,
    background_tasks: BackgroundTasks,
):
    """
    Generate a complete learning path from a skill profile.
    Called by NestJS BullMQ processor (authenticated via internal secret).
    """
    logger.info(
        f"Generating path for user {request.userId}, "
        f"role: {request.skillProfile.get('identified_role')}"
    )

    agent = PathGeneratorAgent()
    curator = ResourceCuratorAgent()

    # Stage 1: Generate path structure
    path = await agent.generate(
        skill_profile=request.skillProfile,
        role_requirements=request.roleRequirements,
    )

    if not path:
        raise HTTPException(500, "Failed to generate learning path after 3 attempts")

    # Stage 2: Score resources for each module
    for milestone in path.milestones:
        for module in milestone.modules:
            module.resources = await curator.validate_and_score(module.resources)

    logger.info(
        f"Path generation complete: {path.title}, "
        f"{len(path.milestones)} milestones, "
        f"{sum(len(m.modules) for m in path.milestones)} modules, "
        f"{sum(sum(len(mod.resources) for mod in m.modules) for m in path.milestones)} resources"
    )

    # Stage 3: Save to DB via NestJS
    background_tasks.add_task(
        save_path_to_api,
        assessment_id=request.assessmentId,
        user_id=request.userId,
        org_id=request.organizationId,
        path=path,
    )

    return {
        "success": True,
        "pathTitle": path.title,
        "milestoneCount": len(path.milestones),
        "estimatedHours": path.estimatedHours,
    }

async def save_path_to_api(
    assessment_id: str,
    user_id: str,
    org_id: str,
    path: GeneratedPath,
):
    """POST the generated path to NestJS for DB persistence."""
    url = f"{settings.API_URL}/internal/paths/save"
    headers = {"X-Internal-Secret": settings.INTERNAL_SERVICE_SECRET}

    payload = {
        "assessmentId": assessment_id,
        "userId": user_id,
        "organizationId": org_id,
        "path": path.model_dump(),
    }

    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code == 200 or res.status_code == 201:
                    logger.info(f"Path saved to DB for user {user_id}")
                    return
                logger.warning(f"Save attempt {attempt+1} returned {res.status_code}: {res.text}")
        except Exception as e:
            logger.error(f"Save attempt {attempt+1} failed: {e}")

        await asyncio.sleep(2 ** attempt)

    logger.error(f"All path save attempts failed for user {user_id}")
