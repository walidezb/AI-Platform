from fastapi import APIRouter, HTTPException
from app.agents.exercise_generator import ExerciseGeneratorAgent
from app.schemas.path import ExerciseGenerationRequest

router = APIRouter(prefix="/exercise", tags=["Exercises"])

@router.post("/generate")
async def generate_exercises(request: ExerciseGenerationRequest):
  """
  Generate exercises for a single milestone on demand.
  Used when re-generating exercises or adding extra practice.
  """
  agent = ExerciseGeneratorAgent()
  exercises = await agent.generate(request)

  if not exercises:
    raise HTTPException(500, "Exercise generation failed")

  return {
    "success": True,
    "milestoneTitle": request.milestoneTitle,
    "exercises": [e.model_dump() for e in exercises],
    "count": len(exercises),
  }

@router.post("/generate-batch")
async def generate_exercises_batch(data: dict):
  """Generate exercises for multiple milestones at once."""
  agent = ExerciseGeneratorAgent()

  exercise_map = await agent.generate_for_all_milestones(
    milestones=data["milestones"],
    domain=data["domain"],
    experience_level=data["experienceLevel"],
    job_role=data["jobRole"],
    language=data.get("language", "EN"),
  )

  return {
    "success": True,
    "exercises": {
      title: [e.model_dump() for e in exercises]
      for title, exercises in exercise_map.items()
    },
    "totalExercises": sum(len(v) for v in exercise_map.values()),
  }
