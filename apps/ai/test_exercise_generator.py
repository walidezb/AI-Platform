"""
Test the Exercise Generation Agent.
Run: python test_exercise_generator.py
"""
import asyncio
from app.agents.exercise_generator import ExerciseGeneratorAgent
from app.schemas.path import ExerciseGenerationRequest

async def test():
  agent = ExerciseGeneratorAgent()
  print("=== Exercise Generator Test ===\n")

  # Test 1: Single milestone
  request = ExerciseGenerationRequest(
    milestoneTitle="TypeScript Fundamentals",
    milestoneDescription="Master TypeScript core concepts: types, interfaces, and generics",
    learningObjectives=[
      "Write TypeScript interfaces for complex data structures",
      "Use generic types to build reusable components",
      "Identify and fix TypeScript type errors in existing code",
    ],
    modules=[
      { "title": "TypeScript Types & Interfaces", "moduleType": "READING" },
      { "title": "Generics Deep Dive", "moduleType": "VIDEO" },
      { "title": "TypeScript in React", "moduleType": "READING" },
    ],
    domain="Frontend Development",
    experienceLevel="INTERMEDIATE",
    jobRole="Frontend Developer",
    exerciseCount=2,
  )

  exercises = await agent.generate(request)
  print(f"✅ Generated {len(exercises)} exercises\n")

  for i, ex in enumerate(exercises):
    print(f"  Exercise {i+1}: {ex.title}")
    print(f"  Type: {ex.exerciseType} | Difficulty: {ex.difficultyLevel}")
    print(f"  Time: {ex.estimatedMinutes} min")
    print(f"  Tags: {', '.join(ex.tags)}")
    if ex.rubric:
      total_weight = sum(r.weight for r in ex.rubric)
      print(f"  Rubric: {len(ex.rubric)} criteria, weights sum={total_weight}")
      assert total_weight == 100, f"❌ Weights don't sum to 100! Got {total_weight}"
      print("  ✅ Rubric weights valid (sum=100)")
    if ex.multipleChoiceOptions:
      correct = sum(1 for o in ex.multipleChoiceOptions if o.isCorrect)
      assert correct == 1, f"❌ MCQ has {correct} correct answers!"
      print("  ✅ MCQ has exactly 1 correct answer")
    print(f"  Hints: {len(ex.hints)}")
    print()

  # Test 2: Batch generation (3 milestones in parallel)
  print("Testing batch generation (3 milestones)...")
  milestones = [
    {
      "title": "TypeScript Fundamentals",
      "description": "Core TypeScript concepts",
      "learningObjectives": ["Write type-safe code", "Use interfaces"],
      "modules": [{"title": "Types", "moduleType": "READING"}],
    },
    {
      "title": "Testing with Jest",
      "description": "Unit and integration testing",
      "learningObjectives": ["Write unit tests", "Mock dependencies"],
      "modules": [{"title": "Jest Basics", "moduleType": "VIDEO"}],
    },
    {
      "title": "React Performance",
      "description": "Optimize React application performance",
      "learningObjectives": ["Use useMemo and useCallback", "Profile renders"],
      "modules": [{"title": "React DevTools", "moduleType": "VIDEO"}],
    },
  ]

  exercise_map = await agent.generate_for_all_milestones(
    milestones=milestones,
    domain="Frontend Development",
    experience_level="INTERMEDIATE",
    job_role="Frontend Developer",
  )

  total = sum(len(v) for v in exercise_map.values())
  print(f"\n✅ Batch generated {total} exercises across {len(exercise_map)} milestones")
  for title, exs in exercise_map.items():
    print(f"  {title}: {len(exs)} exercises")

  print("\n=== All tests passed! ===")

if __name__ == "__main__":
  from dotenv import load_dotenv
  load_dotenv()
  asyncio.run(test())
