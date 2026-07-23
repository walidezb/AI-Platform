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
    searchKeywords: list[str] = Field(
        default=[],
        description=(
            "2-4 specific search queries to find the best "
            "resources for this module. "
            "Example: ['react hooks tutorial 2024', "
            "'useEffect deep dive', 'react hooks best practices']"
        )
    )
    resources: List[GeneratedResource]

class RubricCriteria(BaseModel):
    criterion: str
    weight: int           # percentage (all must sum to 100)
    description: str
    excellent: str        # what excellent looks like
    acceptable: str       # what passing looks like

class DifficultyLevel(str, Enum):
    FOUNDATIONAL = "FOUNDATIONAL"   # recall + basic comprehension
    APPLIED = "APPLIED"             # apply to a scenario
    ANALYTICAL = "ANALYTICAL"       # analyze + evaluate
    CREATIVE = "CREATIVE"           # design + create original work

class MultipleChoiceOption(BaseModel):
    label: str            # "A", "B", "C", "D"
    text: str             # option text
    isCorrect: bool
    explanation: str      # why this is right/wrong

class GeneratedExercise(BaseModel):
    title: str
    instructions: str = Field(description="Clear, detailed instructions")
    exerciseType: ExerciseType
    difficultyLevel: DifficultyLevel
    estimatedMinutes: int = Field(ge=10, le=120)
    scenarioContext: Optional[str] = Field(
        None,
        description="Real-world scenario that frames the exercise"
    )
    # For MULTIPLE_CHOICE type
    multipleChoiceOptions: Optional[List[MultipleChoiceOption]] = None
    # For WRITTEN and SCENARIO types
    rubric: Optional[List[RubricCriteria]] = None
    sampleAnswer: Optional[str] = Field(
        None,
        description="Example of an excellent answer (for written exercises)"
    )
    hintsEnabled: bool = True
    hints: List[str] = Field(
        default=[],
        description="2-3 hints shown on demand if learner is stuck"
    )
    passingScore: float = 70
    maxAttempts: int = 3
    tags: List[str] = Field(
        default=[],
        description="Skills tested by this exercise"
    )

class GeneratedMilestone(BaseModel):
    sequenceOrder: int
    title: str
    description: str
    learningObjectives: List[str] = Field(min_length=2, max_length=5)
    estimatedHours: int = Field(ge=1, le=20)
    modules: List[GeneratedModule]
    exercises: List[GeneratedExercise] = Field(default_factory=list)

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
    orgContext: Optional[str] = ""

class PathSaveRequest(BaseModel):
    assessmentId: str
    userId: str
    organizationId: str
    path: GeneratedPath

class ExerciseGenerationRequest(BaseModel):
    milestoneTitle: str
    milestoneDescription: str
    learningObjectives: List[str]
    modules: List[Dict]         # module titles + types for context
    domain: str
    experienceLevel: str
    jobRole: str
    exerciseCount: int = 2      # how many to generate per milestone
    language: str = "EN"

class ExerciseGenerationResult(BaseModel):
    milestoneTitle: str
    exercises: List[GeneratedExercise]
