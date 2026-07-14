"""
Quick test to verify the assessment agent works
before wiring it to the frontend.
Run: python test_agent.py
"""
import asyncio
from app.agents.assessment_agent import AssessmentAgent

async def test():
    agent = AssessmentAgent(language="EN")

    context = {
        "jobTitle": "Frontend Developer",
        "department": "Engineering",
        "orgName": "Acme Corp",
        "language": "EN",
    }

    print("=== Assessment Agent Test ===\n")

    # Get opening message
    opening = await agent.get_opening_message(context)
    print(f"AI: {opening}\n")

    # Simulate a conversation
    history = [{"role": "assistant", "content": opening}]

    test_responses = [
        "I'm a frontend developer with 3 years of experience",
        "I mainly use React and TypeScript",
        "I've built e-commerce sites and dashboards",
        "I struggle with testing and performance optimization",
        "I want to learn system design and backend development",
        "I work on payment flows and product catalog features",
        "I prefer watching videos and then practicing hands-on",
        "I want to become a full-stack developer within a year",
    ]

    for user_msg in test_responses:
        print(f"User: {user_msg}")
        history.append({"role": "user", "content": user_msg})
        response = await agent.get_next_message(history, context)
        history.append({"role": "assistant", "content": response})
        print(f"AI: {response}\n")

        if agent.is_complete(response):
            print("=== ASSESSMENT COMPLETE ===")
            profile = agent.parse_skill_profile(response)
            if profile:
                print(f"Skill Profile: {profile.model_dump_json(indent=2)}")
            else:
                print("ERROR: Could not parse skill profile!")
            break

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    asyncio.run(test())
