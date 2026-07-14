from typing import Optional
import json
import redis.asyncio as aioredis
from datetime import datetime
from app.config import settings
from app.schemas.assessment import AssessmentSession

class RedisService:
    def __init__(self):
        self.client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
        self.SESSION_TTL = 7200  # 2 hours

    def _session_key(self, assessment_id: str) -> str:
        return f"assessment:session:{assessment_id}"

    async def create_session(self, session: AssessmentSession) -> None:
        key = self._session_key(session.assessmentId)
        await self.client.setex(
            key,
            self.SESSION_TTL,
            session.model_dump_json()
        )

    async def get_session(self, assessment_id: str) -> Optional[AssessmentSession]:
        key = self._session_key(assessment_id)
        data = await self.client.get(key)
        if not data:
            return None
        return AssessmentSession.model_validate_json(data)

    async def update_session(self, session: AssessmentSession) -> None:
        key = self._session_key(session.assessmentId)
        # Reset TTL on update (keep alive while active)
        await self.client.setex(
            key,
            self.SESSION_TTL,
            session.model_dump_json()
        )

    async def delete_session(self, assessment_id: str) -> None:
        key = self._session_key(assessment_id)
        await self.client.delete(key)

    async def health_check(self) -> bool:
        try:
            await self.client.ping()
            return True
        except Exception:
            return False

# Singleton instance
redis_service = RedisService()
