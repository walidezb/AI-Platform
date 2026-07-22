import json
import logging
from openai import AsyncOpenAI
from app.config import settings

from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

SYSTEM_PROMPT = """
You are an expert learning evaluator and professional mentor.
Your task is to fairly and constructively evaluate a learner's
exercise submission based on a structured rubric.

You must:
1. Score each rubric criterion individually (0–100)
2. Compute a weighted final score
3. Write specific, actionable feedback (not generic praise)
4. Identify what was done well AND what needs improvement
5. Be encouraging but honest — do not inflate scores

Feedback tone:
- Professional and supportive (like a senior colleague)
- Specific: reference the learner's actual words/content
- Actionable: tell them exactly how to improve
- Concise: 3–5 sentences max per section

Always respond with valid JSON — no markdown, no preamble.
"""

class ExerciseEvaluatorAgent:

  async def evaluate(
    self,
    submission_text:  str,
    exercise_title:   str,
    instructions:     str,
    exercise_type:    str,
    rubric:           dict,
    scenario_context: Optional[str] = None,
    expected_output:  Optional[dict] = None,
    passing_score:    float = 70.0,
  ) -> dict:
    """
    Evaluate a WRITTEN or SCENARIO exercise submission.

    Returns:
      {
        score: float (0–100),
        passed: bool,
        feedback: str,
        criteriaScores: { criterion: score },
        strengths: [str],
        improvements: [str],
        mentorNote: str,
        tokensUsed: int,
      }
    """

    # Build rubric description for the prompt
    rubric_text = self._format_rubric(rubric)

    # Build context block
    context_block = ""
    if scenario_context:
      context_block = f"\n\nSCENARIO CONTEXT:\n{scenario_context}"

    if expected_output:
      context_block += (
        f"\n\nEXPECTED OUTPUT / IDEAL ANSWER INDICATORS:\n"
        f"{json.dumps(expected_output, indent=2)}"
      )

    user_prompt = f"""
EXERCISE: {exercise_title}
TYPE: {exercise_type}
{context_block}

INSTRUCTIONS GIVEN TO LEARNER:
{instructions}

RUBRIC:
{rubric_text}

PASSING SCORE: {passing_score}%

LEARNER SUBMISSION:
---
{submission_text}
---

Evaluate the submission and respond with this exact JSON:
{{
  "criteriaScores": {{
    "<criterion_name>": <score_0_to_100>
  }},
  "finalScore": <weighted_average_0_to_100>,
  "passed": <true if finalScore >= {passing_score}>,
  "overallFeedback": "<3-5 sentences: overall assessment>",
  "strengths": [
    "<specific thing done well>",
    "<another strength>"
  ],
  "improvements": [
    "<specific actionable improvement>",
    "<another improvement>"
  ],
  "mentorNote": "<1 encouraging sentence for the learner>"
}}
"""

    for attempt in range(3):
      try:
        response = await client.chat.completions.create(
          model="gpt-4o",
          messages=[
            { "role": "system", "content": SYSTEM_PROMPT },
            { "role": "user",   "content": user_prompt },
          ],
          temperature=0.3,           # low temp for consistent scoring
          max_tokens=1000,
          response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content
        result = json.loads(raw)

        # Validate required fields
        required = ['criteriaScores','finalScore','passed',
                    'overallFeedback','strengths','improvements']
        if not all(k in result for k in required):
          raise ValueError(f"Missing fields in response: {raw[:200]}")

        # Clamp score to 0–100
        result['finalScore'] = max(0.0, min(100.0, float(result['finalScore'])))
        result['passed']     = result['finalScore'] >= passing_score

        # Build full feedback string
        feedback = self._build_feedback_string(result)

        tokens_used = response.usage.total_tokens if response.usage else 0

        logger.info(
          f"Evaluated '{exercise_title}': "
          f"score={result['finalScore']:.1f} "
          f"passed={result['passed']} "
          f"tokens={tokens_used}"
        )

        return {
          "score":          result['finalScore'],
          "passed":         result['passed'],
          "feedback":       feedback,
          "criteriaScores": result['criteriaScores'],
          "strengths":      result.get('strengths', []),
          "improvements":   result.get('improvements', []),
          "mentorNote":     result.get('mentorNote', ''),
          "tokensUsed":     tokens_used,
        }

      except json.JSONDecodeError as e:
        logger.warning(f"JSON parse error on attempt {attempt+1}: {e}")
        if attempt == 2:
          return self._fallback_result(passing_score)

      except Exception as e:
        logger.error(f"Evaluation error on attempt {attempt+1}: {e}")
        if attempt == 2:
          return self._fallback_result(passing_score)

    return self._fallback_result(passing_score)

  def _format_rubric(self, rubric: dict) -> str:
    """Format rubric dict into a readable string for the prompt."""
    if not rubric:
      return "- Accuracy (40%)\n- Completeness (40%)\n- Clarity (20%)"

    lines = []
    for criterion, details in rubric.items():
      if isinstance(details, dict):
        weight = details.get('weight', details.get('percentage', ''))
        desc   = details.get('description', details.get('criteria', str(details)))
        weight_str = f" ({weight}%)" if weight else ""
        lines.append(f"- {criterion}{weight_str}: {desc}")
      else:
        lines.append(f"- {criterion}: {details}")
    return '\n'.join(lines)

  def _build_feedback_string(self, result: dict) -> str:
    """Combine AI output into a single feedback string."""
    parts = [result['overallFeedback']]

    if result.get('strengths'):
      strengths = '\n'.join(f"  ✓ {s}" for s in result['strengths'])
      parts.append(f"\n\n**What you did well:**\n{strengths}")

    if result.get('improvements'):
      improvements = '\n'.join(f"  → {i}" for i in result['improvements'])
      parts.append(f"\n\n**Areas to improve:**\n{improvements}")

    if result.get('mentorNote'):
      parts.append(f"\n\n💡 {result['mentorNote']}")

    return ''.join(parts)

  def _fallback_result(self, passing_score: float) -> dict:
    """
    Return a graceful fallback if AI evaluation fails completely.
    Does NOT pass the learner — flags for manual review.
    """
    logger.error("Exercise evaluation failed — using fallback")
    return {
      "score":          0.0,
      "passed":         False,
      "feedback":       (
        "We were unable to automatically evaluate your submission "
        "at this time. Please try resubmitting in a few minutes. "
        "If the issue persists, contact your manager."
      ),
      "criteriaScores": {},
      "strengths":      [],
      "improvements":   [],
      "mentorNote":     "",
      "tokensUsed":     0,
      "error":          True,
    }
