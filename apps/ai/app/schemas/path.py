from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from enum import Enum

class ResourceType(str, Enum):
    ARTICLE = "ARTICLE"
    VIDEO = "VIDEO"
    DOCUMENTATION = "DOCUMENTATION"
    PODCAST = "PODCAST"

class ModuleType(str, Enum):
    READING = "READING"
    VIDEO = "VIDEO"
    EXERCISE = "EXERCISE"
    QUIZ = "QUIZ"

class ExerciseType(str, Enum):
    WRITTEN = "WRITTEN"
    MULTIPLE_CHOICE = "MULTIPLE_CHOICE"
    SCENARIO = "SCENARIO"

class GeneratedResource(BaseModel):
    title: str
    url: str
    sourcePlatform: str
    description: str
    resourceType: ResourceType
    durationMinutes: Optional[int] = None
    qualityScore: float = Field(ge=0, le=10)
    language: str = "EN"

class GeneratedModule(BaseModel):
    sequenceOrder: int
    title: str
    description: str
    moduleType: ModuleType
    estimatedMinutes: int = Field(ge=15, le=240)
    resources: List[GeneratedResource]

class RubricCriteria(BaseModel):
    criterion: str
    weight: int           # percentage (all must sum to 100)
    description: str
    excellent: str        # what excellent looks like
    acceptable: str       # what passing looks like

class GeneratedExercise(BaseModel):
    title: str
    instructions: str
    exerciseType: ExerciseType
    scenarioContext: Optional[str] = None
    rubric: List[RubricCriteria]
    passingScore: float = 70

class GeneratedMilestone(BaseModel):
    sequenceOrder: int
    title: str
    description: str
    learningObjectives: List[str] = Field(min_length=2, max_length=5)
    estimatedHours: int = Field(ge=1, le=20)
    modules: List[GeneratedModule]
    exercises: List[GeneratedExercise]

class GeneratedPath(BaseModel):
    title: str = Field(description="Engaging, specific path title")
    description: str = Field(description="2-3 sentence path overview")
    domain: str = Field(description="Primary learning domain")
    estimatedHours: int
    milestones: List[GeneratedMilestone] = Field(min_length=3, max_length=8)

class PathGenerationRequest(BaseModel):
    assessmentId: str
    userId: str
    organizationId: str
    skillProfile: Dict
    roleRequirements: Optional[Dict] = None

class PathSaveRequest(BaseModel):
    assessmentId: str
    userId: str
    organizationId: str
    path: GeneratedPath
