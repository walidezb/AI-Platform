import logging
import httpx
import asyncio
import uuid
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.agents.path_generator import PathGeneratorAgent
from app.agents.resource_curator import ResourceCuratorAgent
from app.agents.exercise_generator import ExerciseGeneratorAgent
from app.schemas.path import PathGenerationRequest, GeneratedPath
from app.services.usage_logger import log_usage_to_api
from app.services.pinecone_service import pinecone_service
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
    exercise_agent = ExerciseGeneratorAgent()

    # Stage 1: Generate path structure (no exercises)
    path = await agent.generate(
        skill_profile=request.skillProfile,
        role_requirements=request.roleRequirements,
        include_exercises=False,
    )

    if not path:
        raise HTTPException(500, "Failed to generate learning path after 3 attempts")

    # Stage 2: Curate all resources (NEW — replaces stub)
    language = request.skillProfile.get("learning_preferences", "EN")
    if "video" in language.lower():
        language = "EN"  # normalize

    path.milestones = await curator.curate_all_modules(
        path_milestones=path.milestones,
        domain=path.domain,
        experience_level=request.skillProfile.get("experience_level", "INTERMEDIATE"),
        language=language if language in ["EN", "AR"] else "EN",
    )

    # Stage 3: Generate exercises (dedicated agent)
    exercise_map = await exercise_agent.generate_for_all_milestones(
        milestones=[m.model_dump() for m in path.milestones],
        domain=path.domain,
        experience_level=request.skillProfile.get("experience_level", "INTERMEDIATE"),
        job_role=request.skillProfile.get("identified_role", "Professional"),
        language=language if language in ["EN", "AR"] else "EN",
    )
    for milestone in path.milestones:
        milestone.exercises = exercise_map.get(milestone.title, [])

    logger.info(
        f"Path generation complete: {path.title}, "
        f"{len(path.milestones)} milestones, "
        f"{sum(len(m.modules) for m in path.milestones)} modules, "
        f"{sum(sum(len(mod.resources) for mod in m.modules) for m in path.milestones)} resources"
    )

    # ── PINECONE: Dedup + Batch Upsert ──────────────────
    level = request.skillProfile.get("experience_level", "INTERMEDIATE")

    # Collect all resources across all milestones
    all_resources = []
    dedup_map = {}   # url → existing_resource_id (if duplicate)

    for milestone in path.milestones:
        for module in milestone.modules:
            for resource in module.resources:
                # Check for duplicate by URL first (fast check)
                if resource.url in dedup_map:
                    continue

                # Semantic duplicate check via Pinecone
                is_dup, existing_id = await pinecone_service.is_duplicate(
                    resource=resource.model_dump(),
                    domain=path.domain,
                )

                if is_dup and existing_id:
                    dedup_map[resource.url] = existing_id
                    logger.info(f"Duplicate resource detected: {resource.title[:50]}")
                else:
                    # Assign temporary ID for upsert
                    tmp_id = str(uuid.uuid4())
                    dedup_map[resource.url] = None  # new resource
                    all_resources.append({
                        "id": tmp_id,
                        "resource": resource.model_dump(),
                        "domain": path.domain,
                        "level": level,
                        "orgId": request.organizationId,
                    })

    # Batch upsert all new resources
    if all_resources:
        upserted = await pinecone_service.upsert_resources_batch(all_resources)
        logger.info(f"Upserted {upserted} new resources to Pinecone")

    # Save to DB (includes dedup_map for reuse)
    background_tasks.add_task(
        save_path_to_api,
        assessment_id=request.assessmentId,
        user_id=request.userId,
        org_id=request.organizationId,
        path=path,
        dedup_map=dedup_map,
    )

    # Log AI usage
    if agent._last_usage:
        background_tasks.add_task(
            log_usage_to_api,
            org_id=request.organizationId,
            user_id=request.userId,
            feature=agent._last_usage["feature"],
            model=agent._last_usage["model"],
            input_tokens=agent._last_usage["input_tokens"],
            output_tokens=agent._last_usage["output_tokens"],
            cost_usd=agent._last_usage["cost_usd"],
        )

    total_exercises = sum(len(v) for v in exercise_map.values())
    total_resources = sum(
        len(mod.resources)
        for m in path.milestones
        for mod in m.modules
    )

    return {
        "success": True,
        "pathTitle": path.title,
        "milestoneCount": len(path.milestones),
        "estimatedHours": path.estimatedHours,
        "totalResources": total_resources,
        "totalExercises": total_exercises,
        "newResources": len(all_resources),
        "deduplicatedResources": len(dedup_map) - len(all_resources),
    }

async def save_path_to_api(
    assessment_id: str,
    user_id: str,
    org_id: str,
    path: GeneratedPath,
    dedup_map: dict,
):
    """POST the generated path to NestJS for DB persistence."""
    url = f"{settings.API_URL}/internal/paths/save"
    headers = {"X-Internal-Secret": settings.INTERNAL_SERVICE_SECRET}

    payload = {
        "assessmentId": assessment_id,
        "userId": user_id,
        "organizationId": org_id,
        "path": path.model_dump(),
        "dedupMap": dedup_map,
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
