import json
import re
import logging
from typing import AsyncIterator, Optional
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from app.schemas.assessment import SkillProfile, AssessmentSession
from app.config import settings
from app.services.token_counter import token_counter, calculate_cost

logger = logging.getLogger(__name__)

# ── System Prompt ──────────────────────────────────────────────────────────────

ASSESSMENT_SYSTEM_PROMPT_EN = """You are an expert talent development AI conducting
a professional skills assessment interview. Your goal is to understand the employee's
current skills, experience level, and learning goals through a warm, conversational chat.

CORE RULES:
1. Ask ONE question at a time — never multiple questions in one message
2. Be warm, encouraging, and professional (like a supportive colleague, not an interrogator)
3. Keep each response concise: 2-4 sentences maximum
4. Adapt your next question based on their answer — this is a conversation, not a form
5. DO NOT ask for information they already provided
6. Use their name naturally if you know it
7. Acknowledge good answers: "That's great experience!" or "Interesting, so..."

INTERVIEW STRUCTURE (follow this flow naturally):
Turn 1-2:  Warm welcome + current role/experience level
Turn 3-4:  Core technical skills and tools they use daily
Turn 5-6:  Recent projects or challenges (reveals real skill depth)
Turn 7:    Areas they find challenging or want to improve
Turn 8:    Learning goals and career direction
Turn 9:    Learning style preference (video/reading/hands-on)

MINIMUM TURNS: You MUST complete at least 8 user turns before ending.
MAXIMUM TURNS: End no later than turn 12.

ENDING THE ASSESSMENT:
When you have sufficient information (minimum 8 turns), your FINAL message must:
1. Say a warm closing (1 sentence)
2. Write exactly: [ASSESSMENT_COMPLETE]
3. Then output ONLY this JSON on a new line (no markdown, no code blocks):

{
  "identified_role": "exact job title they described",
  "experience_level": "BEGINNER|INTERMEDIATE|ADVANCED",
  "strong_areas": ["skill1", "skill2", "skill3"],
  "weak_areas": ["skill1", "skill2"],
  "tools_used": ["tool1", "tool2", "tool3"],
  "learning_goals": ["goal1", "goal2"],
  "learning_preferences": "brief description of how they learn best",
  "recommended_domains": ["domain1", "domain2"],
  "estimated_path_duration_weeks": 8
}

EXPERIENCE LEVEL GUIDE:
- BEGINNER: < 1 year, learning basics, limited real projects
- INTERMEDIATE: 1-4 years, works independently, has delivered projects
- ADVANCED: 4+ years, leads others, deep expertise, architectural decisions

IMPORTANT: The JSON must be valid. Use only double quotes. No trailing commas."""

ASSESSMENT_SYSTEM_PROMPT_AR = """أنت ذكاء اصطناعي متخصص في تقييم المهارات المهنية.
هدفك هو فهم مهارات الموظف الحالية وأهدافه التعليمية من خلال محادثة ودية ومهنية.

القواعد الأساسية:
1. اسأل سؤالاً واحداً فقط في كل رسالة
2. كن دافئاً ومشجعاً ومهنياً
3. اجعل كل رد موجزاً: 2-4 جمل كحد أقصى
4. تكيّف مع إجابات المستخدم — هذه محادثة وليست استبياناً
5. لا تطلب معلومات تم تقديمها مسبقاً

Turn 1-2:  الترحيب الحار + الدور الحالي/مستوى الخبرة
Turn 3-4:  المهارات التقنية الأساسية والأدوات المستخدمة يومياً
Turn 5-6:  المشاريع أو التحديات الأخيرة
Turn 7:    المجالات الصعبة أو التي يريد تحسينها
Turn 8:    الأهداف التعليمية والاتجاه المهني
Turn 9:    تفضيل نمط التعلم (فيديو/قراءة/عملي)

الحد الأدنى لجولات الأسئلة: 8 جولات للمستخدم على الأقل قبل الإنهاء.
الحد الأقصى لجولات الأسئلة: إنهاء المقابلة في موعد لا يتجاوز الجولة 12.

إنهاء التقييم:
عندما يكون لديك معلومات كافية (الحد الأدنى 8 جولات)، يجب أن تحتوي رسالتك النهائية على:
1. جملة وداع دافئة (جملة واحدة)
2. اكتب بالضبط: [ASSESSMENT_COMPLETE]
3. ثم أخرج هذا الـ JSON فقط في سطر جديد (بدون علامات markdown أو كتل كود):

{
  "identified_role": "exact job title they described",
  "experience_level": "BEGINNER|INTERMEDIATE|ADVANCED",
  "strong_areas": ["skill1", "skill2", "skill3"],
  "weak_areas": ["skill1", "skill2"],
  "tools_used": ["tool1", "tool2", "tool3"],
  "learning_goals": ["goal1", "goal2"],
  "learning_preferences": "brief description of how they learn best",
  "recommended_domains": ["domain1", "domain2"],
  "estimated_path_duration_weeks": 8
}

دليل مستويات الخبرة:
- مبتدئ (BEGINNER): أقل من عام، يتعلم الأساسيات، مشاريع حقيقية محدودة.
- متوسط (INTERMEDIATE): 1-4 سنوات، يعمل بشكل مستقل، قدم مشاريع.
- متقدم (ADVANCED): 4+ سنوات، يقود الآخرين، خبرة عميقة، قرارات هيكلية.

هام: يجب أن يكون الـ JSON صالحاً. استخدم علامات الاقتباس المزدوجة فقط. لا فواصل زائدة في النهاية."""

# ── Agent Class ────────────────────────────────────────────────────────────────

class AssessmentAgent:

    COMPLETION_MARKER = "[ASSESSMENT_COMPLETE]"

    def __init__(self, language: str = "EN"):
        self.llm = ChatOpenAI(
            model="gpt-4o",
            temperature=0.7,
            api_key=settings.OPENAI_API_KEY,
            streaming=True,
        )
        self.language = language
        self.last_usage = None
        self.system_prompt = (
            ASSESSMENT_SYSTEM_PROMPT_AR
            if language == "AR"
            else ASSESSMENT_SYSTEM_PROMPT_EN
        )

    def _build_messages(
        self,
        conversation_history: list[dict],
        context: dict,
    ) -> list:
        """Build the messages array for the LLM call."""

        # Enrich system prompt with employee context
        context_block = f"""
EMPLOYEE CONTEXT (use this to personalize the conversation):
- Job Title: {context.get('jobTitle', 'Not specified')}
- Department: {context.get('department', 'Not specified')}
- Organization: {context.get('orgName', 'Their company')}
- Language: {context.get('language', 'EN')}
"""
        system_content = self.system_prompt + context_block

        messages = [SystemMessage(content=system_content)]

        for msg in conversation_history:
            if msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))
            elif msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))

        return messages

    async def get_opening_message(self, context: dict) -> str:
        """Generate the first message to kick off the assessment."""
        job_title = context.get("jobTitle", "your role")
        org_name = context.get("orgName", "your company")

        # Use a structured opening prompt
        opening_instruction = HumanMessage(
            content=(
                f"[SYSTEM: Start the assessment interview. The employee works as "
                f"'{job_title}' at '{org_name}'. Give a warm, brief welcome and ask "
                f"your first question about their experience level. Keep it to 3 sentences max. "
                f"Do NOT start with 'Hello!' — be more natural and specific to their role.]"
            )
        )

        messages = [SystemMessage(content=self.system_prompt + f"""
EMPLOYEE CONTEXT:
- Job Title: {job_title}
- Organization: {org_name}
- Language: {context.get('language', 'EN')}
"""), opening_instruction]

        response = await self.llm.ainvoke(messages)
        return response.content

    async def get_next_message(
        self,
        conversation_history: list[dict],
        context: dict,
    ) -> str:
        """Get the AI's response to the latest user message."""
        messages = self._build_messages(conversation_history, context)
        input_tokens = sum(token_counter.count(m.content) for m in messages)
        response = await self.llm.ainvoke(
            messages,
            config={"callbacks": []},
        )
        output_tokens = token_counter.count(response.content)
        cost_usd = calculate_cost(input_tokens, output_tokens)
        self.last_usage = {
            "model": "gpt-4o",
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost_usd": round(cost_usd, 6),
            "feature": "ASSESSMENT",
        }
        return response.content

    async def stream_next_message(
        self,
        conversation_history: list[dict],
        context: dict,
    ) -> AsyncIterator[str]:
        """Stream the AI's response token by token."""
        messages = self._build_messages(conversation_history, context)
        input_tokens = sum(token_counter.count(m.content) for m in messages)
        streamed_content = ""
        async for chunk in self.llm.astream(messages):
            if chunk.content:
                streamed_content += chunk.content
                yield chunk.content
        output_tokens = token_counter.count(streamed_content)
        cost_usd = calculate_cost(input_tokens, output_tokens)
        self.last_usage = {
            "model": "gpt-4o",
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost_usd": round(cost_usd, 6),
            "feature": "ASSESSMENT",
        }

    def is_complete(self, response: str) -> bool:
        """Check if the assessment is marked as complete."""
        return self.COMPLETION_MARKER in response

    def extract_closing_message(self, response: str) -> str:
        """Extract just the closing message (before the marker)."""
        parts = response.split(self.COMPLETION_MARKER)
        closing = parts[0].strip()
        # Remove any trailing JSON that might have leaked before marker
        if "{" in closing:
            closing = closing[:closing.index("{")].strip()
        return closing

    def parse_skill_profile(self, response: str) -> Optional[SkillProfile]:
        """Extract and validate the JSON skill profile from the response."""
        try:
            # Find JSON block after the completion marker
            marker_idx = response.find(self.COMPLETION_MARKER)
            if marker_idx == -1:
                return None

            after_marker = response[marker_idx + len(self.COMPLETION_MARKER):].strip()

            # Extract JSON object
            json_match = re.search(r'\{[\s\S]*\}', after_marker)
            if not json_match:
                logger.error("No JSON found after completion marker")
                return None

            json_str = json_match.group()
            data = json.loads(json_str)

            # Validate with Pydantic
            return SkillProfile(**data)

        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error in skill profile: {e}")
            logger.error(f"Raw response: {response[-500:]}")
            return None
        except Exception as e:
            logger.error(f"Skill profile validation error: {e}")
            return None

    async def retry_get_profile(
        self,
        conversation_history: list[dict],
        context: dict,
    ) -> Optional[SkillProfile]:
        """
        If the first attempt fails to produce valid JSON,
        retry with a stricter prompt asking only for JSON output.
        """
        retry_instruction = HumanMessage(
            content=(
                "[SYSTEM: The assessment is complete. Output ONLY the JSON skill profile "
                "with no additional text, no markdown, no code blocks. "
                "Start with { and end with }]"
            )
        )

        messages = self._build_messages(conversation_history, context)
        messages.append(retry_instruction)

        response = await self.llm.ainvoke(messages)
        json_match = re.search(r'\{[\s\S]*\}', response.content)

        if not json_match:
            return None

        try:
            data = json.loads(json_match.group())
            return SkillProfile(**data)
        except Exception as e:
            logger.error(f"Retry also failed: {e}")
            return None
