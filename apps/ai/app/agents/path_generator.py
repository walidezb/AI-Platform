import json
import re
import logging
from typing import Optional, Dict
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from app.schemas.path import GeneratedPath
from app.config import settings
from app.services.token_counter import token_counter, calculate_cost

logger = logging.getLogger(__name__)

PATH_GENERATION_SYSTEM_PROMPT = """You are an expert curriculum designer and
learning architect. Your task is to create comprehensive, structured learning
paths for corporate employees based on their AI assessment results.

DESIGN PRINCIPLES:
1. Each milestone builds on the previous (progressive difficulty)
2. Mix theory and practice (never 3 consecutive theory modules)
3. Resources must be real, specific, and high-quality
4. Exercises test actual job-relevant skills, not just recall
5. Estimated times must be realistic for busy professionals

PATH STRUCTURE:
- 3-7 milestones (based on experience level and goals)
- 2-4 modules per milestone
- 1-2 exercises per milestone
- 2-4 resources per module

EXPERIENCE LEVEL GUIDE:
BEGINNER:  3-5 milestones, start from fundamentals, 6-12 weeks
INTERMEDIATE: 4-6 milestones, skip basics, focus on gaps, 8-16 weeks  
ADVANCED: 5-7 milestones, advanced topics + leadership, 10-20 weeks

RESOURCE QUALITY CRITERIA:
- Prefer: MDN, official docs, freeCodeCamp, YouTube (reputable channels),
           Coursera, Udemy (specific courses), dev.to, CSS-Tricks, Kent C. Dodds,
           The Primeagen, Fireship, Traversy Media, Net Ninja
- Avoid: Unknown blogs, SEO spam, outdated content (check for dates)

SEARCH KEYWORDS INSTRUCTIONS:
searchKeywords: 2-4 specific, targeted search queries that would find the best learning resources for this module. Be specific — include the topic + 'tutorial', 'guide', '2024', or 'deep dive' as appropriate for the module type.

OUTPUT FORMAT:
Return ONLY valid JSON matching the schema below.
No markdown, no code blocks, no explanation text.
Start directly with { and end with }.

JSON SCHEMA:
{
  "title": "string — engaging path title mentioning their role/goal",
  "description": "string — 2-3 sentences about what they'll achieve",
  "domain": "string — primary domain e.g. Frontend Development",
  "estimatedHours": number,
  "milestones": [
    {
      "sequenceOrder": 1,
      "title": "string",
      "description": "string — 1-2 sentences",
      "learningObjectives": ["string", "string", "string"],
      "estimatedHours": number,
      "modules": [
        {
          "sequenceOrder": 1,
          "title": "string",
          "description": "string",
          "moduleType": "READING|VIDEO|EXERCISE|QUIZ",
          "estimatedMinutes": number,
          "searchKeywords": [
            "react hooks complete tutorial 2024",
            "react useState useEffect guide",
            "react hooks practical examples"
          ],
          "resources": [
            {
              "title": "string — exact article/video title",
              "url": "string — real URL",
              "sourcePlatform": "string — MDN|YouTube|freeCodeCamp|etc",
              "description": "string — why this resource is valuable",
              "resourceType": "ARTICLE|VIDEO|DOCUMENTATION|PODCAST",
              "durationMinutes": number or null,
              "qualityScore": number (0-10),
              "language": "EN"
            }
          ]
        }
      ],
      "exercises": [
        {
          "title": "string",
          "instructions": "string — clear, detailed instructions",
          "exerciseType": "WRITTEN|MULTIPLE_CHOICE|SCENARIO",
          "scenarioContext": "string or null — real-world scenario",
          "rubric": [
            {
              "criterion": "string",
              "weight": number (all weights must sum to 100),
              "description": "string",
              "excellent": "string — what excellent looks like",
              "acceptable": "string — what passing looks like"
            }
          ],
          "passingScore": 70
        }
      ]
    }
  ]
}"""

class PathGeneratorAgent:

    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-4o",
            temperature=0.4,   # lower = more structured/consistent
            api_key=settings.OPENAI_API_KEY,
        )
        self._last_usage = None

    def _build_prompt(
        self,
        skill_profile: Dict,
        role_requirements: Optional[Dict],
        org_context: str = "",
    ) -> str:
        role = skill_profile.get('identified_role', 'Professional')
        level = skill_profile.get('experience_level', 'INTERMEDIATE')
        strong = ', '.join(skill_profile.get('strong_areas', []))
        weak = ', '.join(skill_profile.get('weak_areas', []))
        tools = ', '.join(skill_profile.get('tools_used', []))
        goals = '\n'.join(f"- {g}" for g in skill_profile.get('learning_goals', []))
        domains = ', '.join(skill_profile.get('recommended_domains', []))
        duration = skill_profile.get('estimated_path_duration_weeks', 8)
        prefs = skill_profile.get('learning_preferences', 'mixed')

        role_context = ""
        if role_requirements:
            focus = ', '.join(role_requirements.get('focusAreas', []))
            role_context = f"\nCOMPANY ROLE REQUIREMENTS:\n- Focus areas: {focus}"

        org_block = f"\nORGANIZATION CONTEXT: {org_context}" if org_context else ""

        return f"""Create a comprehensive learning path for this employee:

EMPLOYEE PROFILE:
- Role: {role}
- Experience Level: {level}
- Strong Areas: {strong}
- Needs Improvement: {weak}
- Tools Used: {tools}
- Learning Goals:
{goals}
- Recommended Domains: {domains}
- Preferred Duration: {duration} weeks
- Learning Preference: {prefs}
{role_context}
{org_block}

INSTRUCTIONS:
1. Design a path that DIRECTLY addresses their weak areas
2. Build on their existing strong areas (don't repeat basics they know)
3. Focus on: {domains}
4. Target completion: {duration} weeks for a busy professional (5-8 hrs/week)
5. Include real, specific URLs — not placeholder links
6. Make exercises practical and job-relevant

Generate the complete learning path JSON now:"""

    def _generate_mock_path(self, skill_profile: Dict) -> GeneratedPath:
        role = skill_profile.get('identified_role', 'Frontend Developer')
        level = skill_profile.get('experience_level', 'INTERMEDIATE')
        weak_areas = skill_profile.get('weak_areas', ['Testing', 'Performance'])
        strong_areas = skill_profile.get('strong_areas', ['React'])
        
        title = f"{role} ({level}) Mastery Path"
        description = f"A customized curriculum designed to help you master {', '.join(weak_areas)} and build upon your existing skills in {', '.join(strong_areas)}."
        
        from app.schemas.path import GeneratedMilestone, GeneratedModule, GeneratedResource, GeneratedExercise, RubricCriteria, ResourceType, ModuleType, ExerciseType
        
        milestones = []
        for i in range(1, 4):
            milestones.append(GeneratedMilestone(
                sequenceOrder=i,
                title=f"Milestone {i}: Core focus on {weak_areas[0] if len(weak_areas) > 0 else 'Concepts'}",
                description=f"Deep dive into key concepts and methodologies for milestone {i}.",
                learningObjectives=[
                    f"Understand milestone {i} fundamentals",
                    f"Implement practical examples of milestone {i}"
                ],
                estimatedHours=12,
                modules=[
                    GeneratedModule(
                        sequenceOrder=1,
                        title=f"Module 1: Introduction to {weak_areas[0] if len(weak_areas) > 0 else 'Concepts'}",
                        description="Theoretical foundation and overview.",
                        moduleType=ModuleType.READING,
                        estimatedMinutes=45,
                        searchKeywords=[
                            f"{weak_areas[0] if len(weak_areas) > 0 else 'concepts'} complete guide 2024",
                            f"{weak_areas[0] if len(weak_areas) > 0 else 'concepts'} tutorial"
                        ],
                        resources=[
                            GeneratedResource(
                                title="Official Documentation",
                                url="https://developer.mozilla.org/en-US/",
                                sourcePlatform="MDN",
                                description="Comprehensive docs and guides.",
                                resourceType=ResourceType.DOCUMENTATION,
                                durationMinutes=30,
                                qualityScore=9.5,
                                language="EN"
                            )
                        ]
                    ),
                    GeneratedModule(
                        sequenceOrder=2,
                        title="Module 2: Practical Exercises",
                        description="Hands-on tasks and scenarios.",
                        moduleType=ModuleType.EXERCISE,
                        estimatedMinutes=60,
                        searchKeywords=[
                            f"{weak_areas[0] if len(weak_areas) > 0 else 'concepts'} practical examples",
                            f"{weak_areas[0] if len(weak_areas) > 0 else 'concepts'} hands on guide"
                        ],
                        resources=[
                            GeneratedResource(
                                title="Hands-on Tutorial",
                                url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                                sourcePlatform="YouTube",
                                description="Video guide detailing implementations.",
                                resourceType=ResourceType.VIDEO,
                                durationMinutes=15,
                                qualityScore=8.0,
                                language="EN"
                            )
                        ]
                    )
                ],
                exercises=[
                    GeneratedExercise(
                        title=f"Practical Assessment {i}",
                        instructions="Complete the tasks and submit the final output.",
                        exerciseType=ExerciseType.SCENARIO,
                        scenarioContext="A real-world business dashboard implementation.",
                        rubric=[
                            RubricCriteria(
                                criterion="Code correctness",
                                weight=50,
                                description="The code builds and satisfies requirements",
                                excellent="Perfect execution",
                                acceptable="Minor bugs"
                            ),
                            RubricCriteria(
                                criterion="Structure and style",
                                weight=50,
                                description="Correct patterns and style guidelines",
                                excellent="Clean and well-structured",
                                acceptable="Acceptable formatting"
                            )
                        ],
                        passingScore=70
                    )
                ]
            ))
            
        return GeneratedPath(
            title=title,
            description=description,
            domain="Software Engineering",
            estimatedHours=36,
            milestones=milestones
        )

    async def generate(
        self,
        skill_profile: Dict,
        role_requirements: Optional[Dict] = None,
        org_context: str = "",
        include_exercises: bool = True,
    ) -> Optional[GeneratedPath]:
        """Generate a complete learning path using LLM."""
        if not self._enabled:
            return self._generate_mock_path(skill_profile)

        prompt = self._build_prompt(skill_profile, role_requirements, org_context)

        sys_prompt = PATH_GENERATION_SYSTEM_PROMPT
        if not include_exercises:
            sys_prompt = sys_prompt.replace(
                ',\n      "exercises": [\n        {\n          "title": "string",\n          "instructions": "string — clear, detailed instructions",\n          "exerciseType": "WRITTEN|MULTIPLE_CHOICE|SCENARIO",\n          "scenarioContext": "string or null — real-world scenario",\n          "rubric": [\n            {\n              "criterion": "string",\n              "weight": number (all weights must sum to 100),\n              "description": "string",\n              "excellent": "string — what excellent looks like",\n              "acceptable": "string — what passing looks like"\n            }\n          ],\n          "passingScore": 70\n        }\n      ]',
                ""
            )
            sys_prompt = sys_prompt.replace("- 1-2 exercises per milestone\n", "")
            sys_prompt += "\n\nCRITICAL: Do NOT include exercises in the JSON output. They will be generated separately."

        messages = [
            SystemMessage(content=sys_prompt),
            HumanMessage(content=prompt),
        ]

        total_input = sum(token_counter.count(m.content) for m in messages)

        for attempt in range(3):
            try:
                response = await self.llm.ainvoke(messages)
                content = response.content.strip()

                # Strip markdown code blocks if present
                content = re.sub(r'^```(?:json)?\s*', '', content)
                content = re.sub(r'\s*```$', '', content)

                # Parse and validate
                data = json.loads(content)
                path = GeneratedPath(**data)

                # Validate milestone count
                if len(path.milestones) < 3:
                    raise ValueError(f"Only {len(path.milestones)} milestones generated")

                logger.info(
                    f"Generated path: {path.title} with "
                    f"{len(path.milestones)} milestones, "
                    f"{sum(len(m.modules) for m in path.milestones)} total modules"
                )

                output_tokens = token_counter.count(response.content)
                self._last_usage = {
                    "model": "gpt-4o",
                    "input_tokens": total_input,
                    "output_tokens": output_tokens,
                    "cost_usd": round(calculate_cost(total_input, output_tokens), 6),
                    "feature": "PATH_GENERATION",
                }
                return path

            except Exception as e:
                logger.error(f"Attempt {attempt+1}: Validation/API error: {e}")
                # Fallback to mock path generation if API key is invalid/missing
                if "invalid_api_key" in str(e) or "401" in str(e) or "Incorrect API key" in str(e) or settings.OPENAI_API_KEY.startswith("sk-..."):
                    logger.warning("Invalid/missing OpenAI API key detected. Falling back to mock learning path.")
                    self._last_usage = {
                        "model": "gpt-4o",
                        "input_tokens": total_input,
                        "output_tokens": 4000,
                        "cost_usd": round(calculate_cost(total_input, 4000), 6),
                        "feature": "PATH_GENERATION",
                    }
                    return self._generate_mock_path(skill_profile)
                
                total_input += sum(
                    token_counter.count(m.content)
                    for m in messages[len(messages) - (attempt * 2):]
                )
                messages.append(HumanMessage(
                    content=f"Validation failed: {e}. "
                            "Ensure all required fields are present and types are correct."
                ))

        logger.error("All 3 path generation attempts failed")
        return None
