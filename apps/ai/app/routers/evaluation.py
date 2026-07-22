from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from app.agents.exercise_evaluator import ExerciseEvaluatorAgent
from app.services.api_client import update_submission
from app.services.ai_usage_logger import log_usage
from app.config import settings
import logging

from typing import Optional

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/exercises", tags=["evaluation"])

class EvaluationRequest(BaseModel):
  submissionId:    str
  submissionText:  str
  exerciseId:      str
  exerciseTitle:   str
  instructions:    str
  exerciseType:    str           # WRITTEN | SCENARIO
  rubric:          dict
  passingScore:    float = 70.0
  scenarioContext: Optional[str] = None
  expectedOutput:  Optional[dict] = None
  userId:          str
  organizationId:  str
  milestoneId:     str

@router.post("/evaluate")
async def evaluate_exercise(
  request: EvaluationRequest,
  x_internal_secret: str = Header(None, alias="x-internal-secret"),
):
  # Verify internal secret
  if x_internal_secret != settings.INTERNAL_SERVICE_SECRET:
    raise HTTPException(status_code=401, detail="Unauthorized")

  logger.info(
    f"Evaluating submission {request.submissionId} "
    f"for exercise '{request.exerciseTitle}'"
  )

  agent = ExerciseEvaluatorAgent()

  result = await agent.evaluate(
    submission_text  = request.submissionText,
    exercise_title   = request.exerciseTitle,
    instructions     = request.instructions,
    exercise_type    = request.exerciseType,
    rubric           = request.rubric,
    scenario_context = request.scenarioContext,
    expected_output  = request.expectedOutput,
    passing_score    = request.passingScore,
  )

  # Log AI usage
  if result['tokensUsed'] > 0:
    await log_usage(
      organization_id = request.organizationId,
      user_id         = request.userId,
      feature         = "QUIZ_EVALUATION",
      model_used      = "gpt-4o",
      tokens_input    = result['tokensUsed'] // 2,   # approx
      tokens_output   = result['tokensUsed'] // 2,
    )

  # Push result back to NestJS
  success = await update_submission(
    submission_id = request.submissionId,
    score         = result['score'],
    feedback      = result['feedback'],
    passed        = result['passed'],
    milestone_id  = request.milestoneId,
    user_id       = request.userId,
  )

  if not success:
    logger.error(
      f"Failed to update submission {request.submissionId} in NestJS"
    )
    raise HTTPException(status_code=500, detail="Failed to save evaluation")

  return {
    "submissionId": request.submissionId,
    "score":        result['score'],
    "passed":       result['passed'],
    "feedback":     result['feedback'],
    "tokensUsed":   result['tokensUsed'],
  }
