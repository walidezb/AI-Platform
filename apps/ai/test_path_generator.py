"""
Test the path generator with a sample skill profile.
Run: python test_path_generator.py
"""
import asyncio
from app.agents.path_generator import PathGeneratorAgent

async def test():
    agent = PathGeneratorAgent()

    skill_profile = {
        "identified_role": "Frontend Developer",
        "experience_level": "INTERMEDIATE",
        "strong_areas": ["React", "HTML", "CSS"],
        "weak_areas": ["Testing", "Performance Optimization", "TypeScript"],
        "tools_used": ["VS Code", "Git", "Figma", "Chrome DevTools"],
        "learning_goals": [
            "Master TypeScript",
            "Learn testing with Jest and React Testing Library",
            "Understand web performance optimization",
        ],
        "learning_preferences": "Prefers video tutorials followed by hands-on practice",
        "recommended_domains": ["Frontend Development", "TypeScript", "Testing"],
        "estimated_path_duration_weeks": 10,
    }

    print("🔄 Generating learning path...\n")
    path = await agent.generate(skill_profile)

    if path:
        print(f"✅ Title: {path.title}")
        print(f"📚 Domain: {path.domain}")
        print(f"⏱ Duration: {path.estimatedHours} hours")
        print(f"🗺️ Milestones: {len(path.milestones)}")
        print()
        for m in path.milestones:
            print(f"  Milestone {m.sequenceOrder}: {m.title}")
            print(f"    Modules: {len(m.modules)}")
            print(f"    Exercises: {len(m.exercises)}")
            for mod in m.modules:
                print(f"    - [{mod.moduleType}] {mod.title} ({mod.estimatedMinutes}min)")
                for r in mod.resources:
                    print(f"        📎 {r.title} ({r.sourcePlatform})")
        print()
        print("✅ Path generation successful!")
    else:
        print("❌ Path generation FAILED")

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    asyncio.run(test())
