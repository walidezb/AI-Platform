import json
import re
import logging
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from app.schemas.path import (
  GeneratedExercise, ExerciseGenerationRequest, DifficultyLevel
)
from app.config import settings

logger = logging.getLogger(__name__)

EXERCISE_SYSTEM_PROMPT = """You are an expert instructional designer
specializing in corporate learning and professional development.

Your task is to create high-quality, practical exercises that test
real job skills — not just theoretical knowledge.

EXERCISE DESIGN PRINCIPLES:
1. PRACTICAL FIRST: Every exercise must simulate a real work task
   the employee would actually perform on the job
2. CLEAR INSTRUCTIONS: An employee should know exactly what to do
   without asking clarifying questions
3. FAIR RUBRICS: Each rubric criterion must be objectively assessable
   All weights must sum to exactly 100
4. APPROPRIATE DIFFICULTY:
   - FOUNDATIONAL: Test recall of key concepts from the modules
   - APPLIED: Apply concepts to a given scenario
   - ANALYTICAL: Evaluate a situation and make recommendations
   - CREATIVE: Design or build something original
5. REALISTIC SCENARIOS: Use company/industry context to make it relevant
6. HELPFUL HINTS: 2-3 hints that guide without giving away the answer

EXERCISE TYPE RULES:
WRITTEN exercises:
  - instructions: what to write (e.g. "Write a short essay", "Explain how...")
  - scenarioContext: the situation they're responding to
  - rubric: 3-4 criteria (e.g. Clarity, Accuracy, Depth, Examples)
  - sampleAnswer: a model answer showing what excellent looks like
  - 4-6 bullet point hints

SCENARIO exercises:
  - instructions: what decision/action to take
  - scenarioContext: detailed real-world scenario (3-5 sentences)
  - rubric: 3-4 criteria (e.g. Problem Identification, Solution Quality, Justification)
  - sampleAnswer: example response with reasoning
  - hints: clues about what to consider

MULTIPLE_CHOICE exercises:
  - instructions: clear question stem
  - multipleChoiceOptions: exactly 4 options (A, B, C, D)
    Exactly 1 must be correct (isCorrect: true)
    Distractors should be plausible, not obviously wrong
    Each option must have a clear explanation
  - No rubric needed for MCQ
  - hints: 2 hints that narrow down without giving answer

DIFFICULTY CALIBRATION BY EXPERIENCE LEVEL:
BEGINNER:     1 FOUNDATIONAL + 1 APPLIED
INTERMEDIATE: 1 APPLIED + 1 ANALYTICAL
ADVANCED:     1 ANALYTICAL + 1 CREATIVE

OUTPUT FORMAT:
Return ONLY a JSON array of exercises.
No markdown, no code blocks. Start with [ and end with ].

JSON SCHEMA per exercise:
{
  "title": "string",
  "instructions": "string",
  "exerciseType": "WRITTEN|SCENARIO|MULTIPLE_CHOICE",
  "difficultyLevel": "FOUNDATIONAL|APPLIED|ANALYTICAL|CREATIVE",
  "estimatedMinutes": number,
  "scenarioContext": "string or null",
  "multipleChoiceOptions": null or [
    { "label": "A", "text": "...", "isCorrect": false, "explanation": "..." },
    { "label": "B", "text": "...", "isCorrect": true,  "explanation": "..." },
    { "label": "C", "text": "...", "isCorrect": false, "explanation": "..." },
    { "label": "D", "text": "...", "isCorrect": false, "explanation": "..." }
  ],
  "rubric": null or [
    {
      "criterion": "string",
      "weight": number,
      "description": "what this criterion measures",
      "excellent": "what 90-100% looks like",
      "acceptable": "what 70-89% looks like"
    }
  ],
  "sampleAnswer": "string or null",
  "hintsEnabled": true,
  "hints": ["hint1", "hint2", "hint3"],
  "passingScore": 70,
  "maxAttempts": 3,
  "tags": ["skill1", "skill2"]
}

CRITICAL RULES:
- All rubric weights must sum to exactly 100
- MCQ must have exactly 1 correct answer
- estimatedMinutes: WRITTEN 20-40, SCENARIO 30-60, MCQ 10-15
- hints must be genuinely helpful but not reveal the answer
- sampleAnswer must be detailed and exemplary"""

class ExerciseGeneratorAgent:

  def __init__(self):
    self.llm = ChatOpenAI(
      model="gpt-4o",
      temperature=0.5,
      api_key=settings.OPENAI_API_KEY,
    )

  def _determine_exercise_mix(self, level: str) -> list[DifficultyLevel]:
    """Return appropriate difficulty levels for experience level."""
    mixes = {
      "BEGINNER":     [DifficultyLevel.FOUNDATIONAL, DifficultyLevel.APPLIED],
      "INTERMEDIATE": [DifficultyLevel.APPLIED, DifficultyLevel.ANALYTICAL],
      "ADVANCED":     [DifficultyLevel.ANALYTICAL, DifficultyLevel.CREATIVE],
    }
    return mixes.get(level, mixes["INTERMEDIATE"])

  def _build_prompt(self, request: ExerciseGenerationRequest) -> str:
    objectives = "\n".join(f"- {obj}" for obj in request.learningObjectives)
    modules_text = "\n".join(
      f"- [{m.get('moduleType','READING')}] {m.get('title','')}"
      for m in request.modules
    )
    difficulty_mix = self._determine_exercise_mix(request.experienceLevel)
    mix_text = " + ".join(d.value for d in difficulty_mix)

    return f"""Generate {request.exerciseCount} exercises for this milestone:

MILESTONE: {request.milestoneTitle}
DESCRIPTION: {request.milestoneDescription}

LEARNING OBJECTIVES:
{objectives}

MODULES IN THIS MILESTONE (content the learner has studied):
{modules_text}

CONTEXT:
- Domain: {request.domain}
- Experience Level: {request.experienceLevel}
- Job Role: {request.jobRole}
- Language: {request.language}

REQUIRED DIFFICULTY MIX: {mix_text}

INSTRUCTIONS:
1. Create {request.exerciseCount} exercises
2. First exercise difficulty: {difficulty_mix[0].value}
3. Second exercise difficulty: {difficulty_mix[1].value if len(difficulty_mix) > 1 else difficulty_mix[0].value}
4. Exercises must test the specific learning objectives above
5. Use the modules content as the knowledge base
6. Make scenarios relevant to a {request.jobRole} working in {request.domain}
7. All rubric weights must sum to exactly 100

Generate the exercises JSON array now:"""

  async def generate(
    self,
    request: ExerciseGenerationRequest,
  ) -> list[GeneratedExercise]:
    """Generate exercises for a single milestone."""
    prompt = self._build_prompt(request)
    messages = [
      SystemMessage(content=EXERCISE_SYSTEM_PROMPT),
      HumanMessage(content=prompt),
    ]

    for attempt in range(3):
      try:
        response = await self.llm.ainvoke(messages)
        content = response.content.strip()

        # Strip markdown if present
        content = re.sub(r'^```(?:json)?\s*', '', content)
        content = re.sub(r'\s*```$', '', content)

        # Parse array
        data = json.loads(content)
        if not isinstance(data, list):
          raise ValueError("Expected JSON array")

        # Validate each exercise
        exercises = []
        for ex_data in data:
          try:
            # Validate rubric weights sum to 100
            if ex_data.get("rubric"):
              total_weight = sum(r["weight"] for r in ex_data["rubric"])
              if total_weight != 100:
                # Auto-fix: normalize weights
                factor = 100 / total_weight
                for r in ex_data["rubric"]:
                  r["weight"] = round(r["weight"] * factor)
                # Ensure exact sum
                diff = 100 - sum(r["weight"] for r in ex_data["rubric"])
                ex_data["rubric"][0]["weight"] += diff

            # Validate MCQ has exactly one correct answer
            if ex_data.get("multipleChoiceOptions"):
              correct = sum(
                1 for o in ex_data["multipleChoiceOptions"]
                if o.get("isCorrect")
              )
              if correct != 1:
                logger.warning(f"MCQ has {correct} correct answers, fixing")
                for i, o in enumerate(ex_data["multipleChoiceOptions"]):
                  o["isCorrect"] = (i == 1)  # default: B is correct

            exercises.append(GeneratedExercise(**ex_data))
          except Exception as e:
            logger.error(f"Exercise validation error: {e}")
            continue

        if not exercises:
          raise ValueError("No valid exercises generated")

        logger.info(
          f"Generated {len(exercises)} exercises for "
          f"'{request.milestoneTitle[:40]}'"
        )
        return exercises

      except json.JSONDecodeError as e:
        logger.error(f"Attempt {attempt+1}: JSON parse error: {e}")
        messages.append(HumanMessage(
          content=f"JSON was invalid: {e}. Return ONLY a valid JSON array."
        ))
      except Exception as e:
        logger.error(f"Attempt {attempt+1}: Error: {e}")
        messages.append(HumanMessage(
          content=f"Error: {e}. Fix and return valid JSON array."
        ))

    logger.error(f"Exercise generation failed for '{request.milestoneTitle}'")
    return self._fallback_exercises(request)

  def _fallback_exercises(
    self,
    request: ExerciseGenerationRequest,
  ) -> list[GeneratedExercise]:
    """Return minimal fallback exercises if AI generation fails."""
    logger.warning(
      f"Using fallback exercises for milestone: {request.milestoneTitle}"
    )
    return [
      GeneratedExercise(
        title=f"Reflection: {request.milestoneTitle}",
        instructions=(
          "Reflect on what you've learned in this milestone. "
          "Write 3-5 sentences summarizing the key concepts "
          "and how you would apply them in your role."
        ),
        exerciseType="WRITTEN",
        difficultyLevel=DifficultyLevel.FOUNDATIONAL,
        estimatedMinutes=20,
        scenarioContext=None,
        rubric=[
          {
            "criterion": "Comprehension",
            "weight": 50,
            "description": "Shows understanding of key concepts",
            "excellent": "Accurately explains all key concepts",
            "acceptable": "Explains most concepts with minor gaps",
          },
          {
            "criterion": "Application",
            "weight": 50,
            "description": "Connects learning to real-world role",
            "excellent": "Clear, specific connection to job tasks",
            "acceptable": "General connection to role identified",
          },
        ],
        sampleAnswer=(
          "In this milestone, I learned about "
          f"{request.learningObjectives[0] if request.learningObjectives else 'key concepts'}. "
          "I would apply this by..."
        ),
        hints=[
          "Think about specific tasks in your daily work",
          "Reference the modules you completed",
        ],
        passingScore=70,
        maxAttempts=3,
        tags=["reflection", "comprehension"],
      )
    ]

  async def generate_for_all_milestones(
    self,
    milestones: list[dict],
    domain: str,
    experience_level: str,
    job_role: str,
    language: str = "EN",
  ) -> dict[str, list[GeneratedExercise]]:
    """
    Generate exercises for ALL milestones concurrently.
    Returns a dict: { milestoneTitle → [exercises] }
    """
    import asyncio

    async def generate_for_milestone(milestone: dict):
      modules_summary = [
        {
          "title": m.get("title", ""),
          "moduleType": m.get("moduleType", "READING"),
        }
        for m in milestone.get("modules", [])
      ]

      request = ExerciseGenerationRequest(
        milestoneTitle=milestone["title"],
        milestoneDescription=milestone["description"],
        learningObjectives=milestone.get("learningObjectives", []),
        modules=modules_summary,
        domain=domain,
        experienceLevel=experience_level,
        jobRole=job_role,
        exerciseCount=2,
        language=language,
      )

      exercises = await self.generate(request)
      return milestone["title"], exercises

    # Run all milestone generations concurrently
    results = await asyncio.gather(
      *[generate_for_milestone(m) for m in milestones],
      return_exceptions=True,
    )

    exercise_map = {}
    for result in results:
      if isinstance(result, Exception):
        logger.error(f"Milestone exercise generation failed: {result}")
        continue
      milestone_title, exercises = result
      exercise_map[milestone_title] = exercises

    total = sum(len(v) for v in exercise_map.values())
    logger.info(
      f"Generated {total} exercises across "
      f"{len(exercise_map)} milestones"
    )
    return exercise_map
