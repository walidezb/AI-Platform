from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from enum import Enum

class ExperienceLevel(str, Enum):
    BEGINNER = "BEGINNER"
    INTERMEDIATE = "INTERMEDIATE"
    ADVANCED = "ADVANCED"

class SkillProfile(BaseModel):
    identified_role: str = Field(description="The employee's job role/title")
    experience_level: ExperienceLevel
    strong_areas: List[str] = Field(description="Skills they are confident in")
    weak_areas: List[str] = Field(description="Skills they need to improve")
    tools_used: List[str] = Field(description="Tools and technologies they use daily")
    learning_goals: List[str] = Field(description="What they want to learn")
    learning_preferences: str = Field(description="How they prefer to learn")
    recommended_domains: List[str] = Field(
        description="Top 2-3 learning domains to focus on"
    )
    estimated_path_duration_weeks: int = Field(ge=1, le=52)

class StartAssessmentRequest(BaseModel):
    userId: str
    organizationId: str
    assessmentId: str
    jobTitle: Optional[str] = None
    department: Optional[str] = None
    orgName: Optional[str] = None
    language: str = "EN"

class SendMessageRequest(BaseModel):
    userMessage: str = Field(min_length=1, max_length=2000)

class MessageResponse(BaseModel):
    message: str
    isComplete: bool
    skillProfile: Optional[SkillProfile] = None
    turnCount: int

class AssessmentSession(BaseModel):
    assessmentId: str
    userId: str
    organizationId: str
    jobTitle: Optional[str] = None
    department: Optional[str] = None
    language: str
    conversationHistory: List[Dict]
    turnCount: int
    status: str  # "active" | "completed"
    createdAt: str
