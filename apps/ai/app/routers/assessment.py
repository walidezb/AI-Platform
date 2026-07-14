import logging
import httpx
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.schemas.assessment import (
    StartAssessmentRequest, SendMessageRequest,
    MessageResponse, AssessmentSession
)
from app.agents.assessment_agent import AssessmentAgent
from app.services.redis_service import redis_service
from app.config import settings

router = APIRouter(prefix="/assessment", tags=["Assessment"])
logger = logging.getLogger(__name__)

# ── POST /assessment/start ─────────────────────────────────────────────────────

@router.post("/start")
async def start_assessment(request: StartAssessmentRequest):
    """Initialize an assessment session and return the AI's opening message."""

    # Check if session already exists (resuming)
    existing = await redis_service.get_session(request.assessmentId)
    if existing and existing.status == "active":
        # Return the last AI message for resume
        last_ai_msg = next(
            (m for m in reversed(existing.conversationHistory)
             if m["role"] == "assistant"),
            None
        )
        return {
            "assessmentId": request.assessmentId,
            "firstMessage": last_ai_msg["content"] if last_ai_msg else "Let's continue!",
            "isResuming": True,
            "turnCount": existing.turnCount,
        }

    # Create new session
    agent = AssessmentAgent(language=request.language)
    context = {
        "jobTitle": request.jobTitle,
        "department": request.department,
        "orgName": request.orgName,
        "language": request.language,
    }

    try:
        opening_message = await agent.get_opening_message(context)
    except Exception as e:
        logger.error(f"Failed to generate opening message: {e}")
        raise HTTPException(500, "AI service unavailable. Please try again.")

    # Store session in Redis
    session = AssessmentSession(
        assessmentId=request.assessmentId,
        userId=request.userId,
        organizationId=request.organizationId,
        jobTitle=request.jobTitle,
        department=request.department,
        language=request.language,
        conversationHistory=[
            {"role": "assistant", "content": opening_message}
        ],
        turnCount=0,
        status="active",
        createdAt=datetime.now(timezone.utc).isoformat(),
    )
    await redis_service.create_session(session)

    return {
        "assessmentId": request.assessmentId,
        "firstMessage": opening_message,
        "isResuming": False,
        "turnCount": 0,
    }

# ── POST /assessment/{id}/message ──────────────────────────────────────────────

@router.post("/{assessment_id}/message", response_model=MessageResponse)
async def send_message(
    assessment_id: str,
    request: SendMessageRequest,
    background_tasks: BackgroundTasks,
):
    """Process a user message and return the AI's response."""

    # Get session
    session = await redis_service.get_session(assessment_id)
    if not session:
        raise HTTPException(404, "Assessment session not found or expired")
    if session.status == "completed":
        raise HTTPException(400, "Assessment already completed")

    # Add user message to history
    session.conversationHistory.append({
        "role": "user",
        "content": request.userMessage,
    })
    session.turnCount += 1

    # Get AI response
    agent = AssessmentAgent(language=session.language)
    context = {
        "jobTitle": session.jobTitle,
        "department": session.department,
        "language": session.language,
    }

    try:
        ai_response = await agent.get_next_message(
            session.conversationHistory,
            context,
        )
    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        raise HTTPException(500, "AI service error. Please try again.")

    # Check if assessment is complete
    is_complete = agent.is_complete(ai_response)
    skill_profile = None
    display_message = ai_response

    if is_complete:
        # Extract closing message for display
        display_message = agent.extract_closing_message(ai_response)

        # Parse skill profile
        skill_profile = agent.parse_skill_profile(ai_response)

        if not skill_profile:
            # Retry once with stricter prompt
            logger.warning(f"First parse failed, retrying for {assessment_id}")
            skill_profile = await agent.retry_get_profile(
                session.conversationHistory, context
            )

        if skill_profile:
            session.status = "completed"
            # Notify NestJS API in background (non-blocking)
            background_tasks.add_task(
                notify_assessment_complete,
                assessment_id=assessment_id,
                user_id=session.userId,
                org_id=session.organizationId,
                skill_profile=skill_profile.model_dump(),
                conversation_history=session.conversationHistory,
            )
        else:
            logger.error(f"Could not parse skill profile for {assessment_id}")
            # Don't mark complete — let them continue (edge case)
            is_complete = False

    # Add AI response to history (use display message)
    session.conversationHistory.append({
        "role": "assistant",
        "content": display_message,
    })

    # Save session
    await redis_service.update_session(session)

    return MessageResponse(
        message=display_message,
        isComplete=is_complete,
        skillProfile=skill_profile,
        turnCount=session.turnCount,
    )

# ── POST /assessment/{id}/message/stream ──────────────────────────────────────

from fastapi.responses import StreamingResponse

@router.post("/{assessment_id}/message/stream")
async def send_message_stream(
    assessment_id: str,
    request: SendMessageRequest,
    background_tasks: BackgroundTasks,
):
    """
    Stream the AI response token by token using Server-Sent Events.
    Client receives a stream of data: events.
    """

    # Get session
    session = await redis_service.get_session(assessment_id)
    if not session:
        raise HTTPException(404, "Assessment session not found or expired")
    if session.status == "completed":
        raise HTTPException(400, "Assessment already completed")

    # Add user message to history
    session.conversationHistory.append({
        "role": "user",
        "content": request.userMessage,
    })
    session.turnCount += 1

    agent = AssessmentAgent(language=session.language)
    context = {
        "jobTitle": session.jobTitle,
        "department": session.department,
        "language": session.language,
    }

    # Collect full response for post-processing
    full_response_parts = []

    async def generate():
        nonlocal full_response_parts

        try:
            # Stream tokens
            async for token in agent.stream_next_message(
                session.conversationHistory,
                context,
            ):
                full_response_parts.append(token)

                # Send token as SSE event
                import json as _json
                yield f"data: {_json.dumps({'token': token, 'type': 'token'})}\n\n"

            # Full response assembled
            full_response = "".join(full_response_parts)
            is_complete = agent.is_complete(full_response)
            skill_profile = None
            display_message = full_response

            if is_complete:
                display_message = agent.extract_closing_message(full_response)

                # Parse skill profile
                skill_profile = agent.parse_skill_profile(full_response)
                if not skill_profile:
                    skill_profile = await agent.retry_get_profile(
                        session.conversationHistory, context
                    )

                if skill_profile:
                    session.status = "completed"
                    # Send completion event with profile
                    yield f"data: {_json.dumps({'type': 'complete', 'skillProfile': skill_profile.model_dump()})}\n\n"

                    # Notify NestJS in background
                    background_tasks.add_task(
                        notify_assessment_complete,
                        assessment_id=assessment_id,
                        user_id=session.userId,
                        org_id=session.organizationId,
                        skill_profile=skill_profile.model_dump(),
                        conversation_history=session.conversationHistory,
                    )
                else:
                    # Parsing failed — don't mark complete
                    is_complete = False
                    yield f"data: {_json.dumps({'type': 'error', 'message': 'Profile parsing failed'})}\n\n"

            # Save updated session (use display message without JSON blob)
            session.conversationHistory.append({
                "role": "assistant",
                "content": display_message,
            })
            await redis_service.update_session(session)

            # Send done event
            yield f"data: {_json.dumps({'type': 'done', 'isComplete': is_complete, 'turnCount': session.turnCount})}\n\n"

        except Exception as e:
            logger.error(f"Streaming error for {assessment_id}: {e}")
            yield f"data: {_json.dumps({'type': 'error', 'message': 'AI service error'})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # important for nginx
        },
    )


# ── GET /assessment/{id}/status ────────────────────────────────────────────────

@router.get("/{assessment_id}/status")
async def get_status(assessment_id: str):
    session = await redis_service.get_session(assessment_id)
    if not session:
        raise HTTPException(404, "Session not found")
    return {
        "assessmentId": assessment_id,
        "status": session.status,
        "turnCount": session.turnCount,
        "createdAt": session.createdAt,
    }

# ── Background Task: Notify NestJS ────────────────────────────────────────────

async def notify_assessment_complete(
    assessment_id: str,
    user_id: str,
    org_id: str,
    skill_profile: dict,
    conversation_history: list[dict],
):
    """Notify the NestJS API that assessment is complete (with retries)."""
    url = f"{settings.API_URL}/internal/assessments/{assessment_id}/complete"
    payload = {
        "skillProfile": skill_profile,
        "conversationLog": conversation_history,
        "userId": user_id,
        "organizationId": org_id,
    }
    headers = {"X-Internal-Secret": settings.INTERNAL_SERVICE_SECRET}

    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                if response.status_code == 200:
                    logger.info(f"Assessment {assessment_id} notified to API successfully")
                    return
                logger.warning(f"API notification attempt {attempt+1} returned {response.status_code}")
        except Exception as e:
            logger.error(f"API notification attempt {attempt+1} failed: {e}")

        if attempt < 2:
            import asyncio
            await asyncio.sleep(2 ** attempt)  # 1s, 2s, 4s backoff

    logger.error(f"All notification attempts failed for assessment {assessment_id}")
