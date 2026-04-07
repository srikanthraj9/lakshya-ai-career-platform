from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class Token(BaseModel):
    access_token: str
    token_type: str


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: UUID
    full_name: Optional[str]
    email: EmailStr
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ResumeSkillResponse(BaseModel):
    skill: str
    category: str
    confidence: float


class ResumeATSBreakdownResponse(BaseModel):
    keyword_match: float = 0.0
    skill_diversity: float = 0.0
    formatting: float = 0.0
    action_verbs: float = 0.0
    section_coverage: float = 0.0


class ResumeMissingSkillResponse(BaseModel):
    skill: str
    category: str
    importance: int = 3


class ResumeCreate(BaseModel):
    original_filename: str
    parsed_text: str
    job_description: Optional[str] = None


class ResumeSelectorItem(BaseModel):
    id: UUID
    name: str


class ResumeListItemResponse(BaseModel):
    id: UUID
    file_name: str
    created_at: datetime


class ResumeResponse(BaseModel):
    id: UUID
    file_name: str
    original_filename: str
    extracted_text: Optional[str] = None
    parsed_text: Optional[str] = None
    ats_score: Optional[int] = None
    created_at: datetime
    skills: list[ResumeSkillResponse] = Field(default_factory=list)
    ats_breakdown: Optional[ResumeATSBreakdownResponse] = None
    missing_skills: list[ResumeMissingSkillResponse] = Field(default_factory=list)


class ResumeDetailFeedbackResponse(BaseModel):
    summary: list[str] = Field(default_factory=list)
    weak_points: list[str] = Field(default_factory=list)
    formatting: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)


class ResumeDetailResponse(BaseModel):
    id: UUID
    file_name: str
    original_filename: str
    created_at: datetime
    extracted_text: Optional[str] = None
    parsed_text: Optional[str] = None
    ats_score: Optional[int] = None
    skills: list[str] = Field(default_factory=list)
    breakdown: ResumeATSBreakdownResponse = Field(default_factory=ResumeATSBreakdownResponse)
    feedback: ResumeDetailFeedbackResponse = Field(default_factory=ResumeDetailFeedbackResponse)


class ResumeSimilarityMatch(BaseModel):
    resume_id: UUID
    filename: str
    similarity: float


class ResumeSimilarityResponse(BaseModel):
    resume_id: UUID
    matches: list[ResumeSimilarityMatch] = Field(default_factory=list)


class ResumeFeedbackResponse(BaseModel):
    resume_id: UUID
    summary: list[str] = Field(default_factory=list)
    missing_skills: list[ResumeMissingSkillResponse] = Field(default_factory=list)
    weak_bullet_points: list[str] = Field(default_factory=list)
    formatting_issues: list[str] = Field(default_factory=list)
    llm_feedback: list[str] = Field(default_factory=list)


class ResumeRewriteRequest(BaseModel):
    text: str = Field(min_length=1)
    job_description: Optional[str] = None

    @model_validator(mode="after")
    def normalize_text(self) -> "ResumeRewriteRequest":
        self.text = self.text.strip()
        if not self.text:
            raise ValueError("text is required")
        if self.job_description is not None:
            self.job_description = self.job_description.strip() or None
        return self


class ResumeRewriteEducationEntry(BaseModel):
    college: str = ""
    degree: str = ""
    year: str = ""
    cgpa: str = ""


class ResumeRewriteExperienceEntry(BaseModel):
    role: str = ""
    company: str = ""
    duration: str = ""
    points: list[str] = Field(default_factory=list)


class ResumeRewriteProjectEntry(BaseModel):
    title: str = ""
    duration: str = ""
    points: list[str] = Field(default_factory=list)


class ResumeRewriteSkillGroups(BaseModel):
    programming: list[str] = Field(default_factory=list)
    web: list[str] = Field(default_factory=list)
    cs: list[str] = Field(default_factory=list)
    databases: list[str] = Field(default_factory=list)
    tools: list[str] = Field(default_factory=list)
    professional: list[str] = Field(default_factory=list)


class ResumeRewriteStructuredResponse(BaseModel):
    name: str = ""
    phone: str = ""
    email: str = ""
    linkedin: str = ""
    github: str = ""
    portfolio: str = ""
    summary: str = ""
    education: list[ResumeRewriteEducationEntry] = Field(default_factory=list)
    experience: list[ResumeRewriteExperienceEntry] = Field(default_factory=list)
    projects: list[ResumeRewriteProjectEntry] = Field(default_factory=list)
    skills: ResumeRewriteSkillGroups = Field(default_factory=ResumeRewriteSkillGroups)
    certifications: list[str] = Field(default_factory=list)


class ResumeRewriteResponse(BaseModel):
    original: str
    rewritten: str
    structured: ResumeRewriteStructuredResponse
    latex: str
    pdf_url: str
    tex_url: str
    document_id: str


class RoadmapRequest(BaseModel):
    target_role: str = Field(min_length=1)
    experience_level: str = Field(min_length=1)

    @model_validator(mode="after")
    def normalize_fields(self) -> "RoadmapRequest":
        self.target_role = self.target_role.strip()
        self.experience_level = self.experience_level.strip()
        if not self.target_role:
            raise ValueError("target_role is required")
        if not self.experience_level:
            raise ValueError("experience_level is required")
        return self


class RoadmapStep(BaseModel):
    step: str
    resources: list[str] = Field(default_factory=list)
    duration: str = ""


class RoadmapResponse(BaseModel):
    roadmap: list[RoadmapStep] = Field(default_factory=list)


class RoleCreate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    category: Optional[str] = "Software Engineering"
    demand_level: Optional[str] = "Medium"
    core_skills: list[str] = Field(default_factory=list)
    advanced_skills: list[str] = Field(default_factory=list)
    description: str
    average_salary: Optional[float] = None

    @model_validator(mode="after")
    def validate_identifier(self) -> "RoleCreate":
        if not (self.name or self.title):
            raise ValueError("Either name or title is required")
        return self


class RoleResponse(BaseModel):
    id: UUID
    name: Optional[str] = None
    title: Optional[str] = None
    category: Optional[str] = None
    demand_level: Optional[str] = None
    core_skills: list[str] = Field(default_factory=list)
    advanced_skills: list[str] = Field(default_factory=list)
    description: str
    average_salary: Optional[float] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CareerAction(BaseModel):
    priority: str = "medium"
    category: str = "general"
    skill: Optional[str] = None
    action: str
    rationale: str = ""
    estimated_weeks: int = 1
    video: str = ""
    project: str = ""
    time: str = ""


class UserCareerStateResponse(BaseModel):
    id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    best_role: str = ""
    score: int = 0
    confidence: str = "Low"
    updated_at: Optional[datetime] = None


class CareerDecision(BaseModel):
    target_role: str = ""
    career_verdict: str = ""
    confidence: str = ""
    confidence_label: str = ""
    decision_guidance: str = ""
    why: str = ""
    focus_skills: list[str] = Field(default_factory=list)
    readiness_band: str = ""
    resume_skill_count: int = 0
    career_path: list[str] = Field(default_factory=list)


class RoleMatch(BaseModel):
    role_id: UUID
    rank: int = 0
    canonical_role_key: str = ""
    role: str
    role_name: str
    category: Optional[str] = None
    demand_level: Optional[str] = None
    description: str
    average_salary: Optional[float] = None
    similarity: float
    score: int = 0
    confidence: str = ""
    skill_score: int = 0
    semantic_score: int = 0
    readiness_score: int = 0
    score_label: str = ""
    core_skills: list[str] = Field(default_factory=list)
    advanced_skills: list[str] = Field(default_factory=list)
    matched_core_skills: list[str] = Field(default_factory=list)
    matched_advanced_skills: list[str] = Field(default_factory=list)
    matched_skills: list[str] = Field(default_factory=list)
    missing_core_skills: list[str] = Field(default_factory=list)
    missing_advanced_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    core_skill_coverage: int = 0
    advanced_skill_coverage: int = 0
    strengths: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    verdict: str = ""
    verdict_reason: str = ""
    explanation: str = ""
    recommendation: str = ""
    career_path: list[str] = Field(default_factory=list)
    next_steps: list[CareerAction] = Field(default_factory=list)


class AlignmentResponse(BaseModel):
    resume_id: UUID
    resume_skills: list[str] = Field(default_factory=list)
    career_decision: CareerDecision = Field(default_factory=CareerDecision)
    career_state: UserCareerStateResponse = Field(default_factory=UserCareerStateResponse)
    matches: list[RoleMatch]


class RoleSkillCreate(BaseModel):
    skill_name: str
    skill_category: Optional[str] = None
    weight: Optional[float] = 1.0
    importance_level: Optional[int] = 3


class RoleSkillResponse(BaseModel):
    id: UUID
    role_id: UUID
    skill_name: str
    skill_category: Optional[str]
    weight: Optional[float]
    importance_level: Optional[int]

    model_config = ConfigDict(from_attributes=True)


class InterviewStartRequest(BaseModel):
    role: str = Field(min_length=1)
    difficulty: str = Field(min_length=1)
    mode: str = Field(min_length=1)

    @model_validator(mode="after")
    def normalize_fields(self) -> "InterviewStartRequest":
        self.role = self.role.strip()
        self.difficulty = self.difficulty.strip().lower()
        self.mode = self.mode.strip().lower()
        if not self.role:
            raise ValueError("role is required")
        if self.difficulty not in {"easy", "medium", "hard"}:
            raise ValueError("difficulty must be easy, medium, or hard")
        if self.mode not in {"text", "voice"}:
            raise ValueError("mode must be text or voice")
        return self


class InterviewNextRequest(BaseModel):
    session_id: str = Field(min_length=1)
    answer: str = Field(min_length=1)

    @model_validator(mode="after")
    def normalize_fields(self) -> "InterviewNextRequest":
        self.session_id = self.session_id.strip()
        self.answer = self.answer.strip()
        if not self.session_id:
            raise ValueError("session_id is required")
        if not self.answer:
            raise ValueError("answer is required")
        return self


class InterviewStartResponse(BaseModel):
    session_id: str
    role: str
    difficulty: str
    mode: str
    question: str
    question_index: int = 1
    total_questions: int = 0
    remaining_seconds: int = 30


class InterviewNextResponse(BaseModel):
    session_id: str
    feedback: str
    score: int
    question: str = ""
    question_index: int = 0
    total_questions: int = 0
    completed: bool = False
    report_url: str | None = None


class InterviewReportResponse(BaseModel):
    session_id: str
    role: str
    difficulty: str
    mode: str
    technical_score: int
    communication_score: int
    confidence_score: int
    overall_score: int
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    questions_answered: int = 0
    summary: str = ""


class JobListingResponse(BaseModel):
    id: str
    title: str
    company: str
    location: str
    url: str
    job_type: str = ""
    source: str = "Remotive"
    match_score: int = 0
    matched_skills: list[str] = Field(default_factory=list)
    skill_tags: list[str] = Field(default_factory=list)
    why: str = ""
    published_at: Optional[str] = None


class JobRecommendationResponse(BaseModel):
    resume_id: UUID
    resume_skills: list[str] = Field(default_factory=list)
    jobs: list[JobListingResponse] = Field(default_factory=list)


class CopilotContextProfile(BaseModel):
    resume_name: str = ""
    target_role: str = ""
    focus_skills: list[str] = Field(default_factory=list)
    notes: str = ""


class CopilotChatRequest(BaseModel):
    resume_id: UUID
    user_id: Optional[UUID] = None
    message: str = Field(min_length=1)
    context_profile: Optional[CopilotContextProfile] = None

    @model_validator(mode="after")
    def normalize_fields(self) -> "CopilotChatRequest":
        self.message = self.message.strip()
        if not self.message:
            raise ValueError("message is required")
        return self


class CopilotResource(BaseModel):
    title: str
    url: str = ""
    reason: str = ""


class CopilotSection(BaseModel):
    title: str
    body: str = ""
    items: list[str] = Field(default_factory=list)


class CopilotResponse(BaseModel):
    reply: str
    intent: str = "general_advice"
    suggestions: list[str] = Field(default_factory=list)
    optional_sections: dict[str, CopilotSection] = Field(default_factory=dict)
    resources: list[CopilotResource] = Field(default_factory=list)
    memory_turns: int = 0
