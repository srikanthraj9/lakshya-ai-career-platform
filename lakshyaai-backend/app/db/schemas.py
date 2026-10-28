from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional, Union
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator, field_validator


class Token(BaseModel):
    access_token: str
    token_type: str


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=8, description="Password must be at least 8 characters long")



class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: UUID
    full_name: Optional[str] = None
    email: EmailStr
    role: Optional[str] = "user"
    is_suspended: bool = False
    is_email_verified: bool = False
    onboarding_completed: bool = False
    onboarding_current_step: int = 1
    auth_provider: Optional[str] = "password"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RegisterResponse(BaseModel):
    id: UUID
    full_name: Optional[str] = None
    email: EmailStr
    is_email_verified: bool = False
    message: str = "Account created successfully. Please verify your email to continue."
    email_sent: bool = True
    delivery_status: Optional[str] = "sent"
    access_token: Optional[str] = None
    token_type: Optional[str] = "bearer"


class VerificationStatusResponse(BaseModel):
    is_email_verified: bool
    email: Optional[str] = None
    onboarding_completed: Optional[bool] = None


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ResendVerificationResponse(BaseModel):
    success: bool
    message: str
    email_sent: bool = True
    delivery_status: Optional[str] = "sent"


class EmailVerificationResponse(BaseModel):
    success: bool
    message: str
    is_email_verified: bool = True


class OnboardingStepSave(BaseModel):
    step: int = Field(ge=1, le=8)
    career_stage: Optional[str] = None
    primary_goals: Optional[list[str]] = None
    education_level: Optional[str] = None
    specialization: Optional[str] = None
    graduation_year: Optional[str] = None
    college: Optional[str] = None
    experience_level: Optional[str] = None
    target_role: Optional[str] = None
    is_exploring_roles: Optional[bool] = None
    skills: Optional[list[str]] = None


class UserCareerProfileResponse(BaseModel):
    user_id: UUID
    onboarding_current_step: int = 1
    onboarding_completed: bool = False
    career_stage: Optional[str] = None
    primary_goals: list[str] = []
    education_level: Optional[str] = None
    specialization: Optional[str] = None
    graduation_year: Optional[str] = None
    college: Optional[str] = None
    experience_level: Optional[str] = None
    target_role: Optional[str] = None
    is_exploring_roles: bool = False
    skills: list[str] = []
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class OnboardingCompleteRequest(BaseModel):
    career_stage: Optional[str] = None
    primary_goals: Optional[list[str]] = None
    education_level: Optional[str] = None
    specialization: Optional[str] = None
    graduation_year: Optional[str] = None
    college: Optional[str] = None
    experience_level: Optional[str] = None
    target_role: Optional[str] = None
    is_exploring_roles: Optional[bool] = None
    skills: Optional[list[str]] = None



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
    ats_score: Optional[int] = None
    base_quality_score: Optional[int] = None
    version_number: int = 1
    version_label: Optional[str] = None
    parent_resume_id: Optional[UUID] = None


class ResumeResponse(BaseModel):
    id: UUID
    file_name: str
    original_filename: str
    extracted_text: Optional[str] = None
    parsed_text: Optional[str] = None
    ats_score: Optional[int] = None
    base_quality_score: Optional[int] = None
    version_number: int = 1
    version_label: Optional[str] = None
    parent_resume_id: Optional[UUID] = None
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
    base_quality_score: Optional[int] = None
    version_number: int = 1
    version_label: Optional[str] = None
    parent_resume_id: Optional[UUID] = None
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


class ResumeAssessRequest(BaseModel):
    target_role_id: Optional[str] = None
    target_role_title: Optional[str] = None
    job_description: Optional[str] = None


class ResumeAssessmentDimensionResponse(BaseModel):
    dimension_key: str
    raw_score: float
    weighted_score: float
    weight_factor: float
    evaluation_status: str
    diagnostic_notes: Optional[str] = None


class ResumeSkillEvidenceResponse(BaseModel):
    skill_name: str
    excerpt_text: str
    section_name: str
    confidence: float
    is_inferred: bool


class ResumeAssessmentResponse(BaseModel):
    id: UUID
    resume_id: UUID
    scoring_mode: str
    overall_score: int
    match_verdict: str
    target_role_id: Optional[str] = None
    target_role_title: Optional[str] = None
    algorithm_version: str
    dimensions: list[ResumeAssessmentDimensionResponse] = Field(default_factory=list)
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[ResumeMissingSkillResponse] = Field(default_factory=list)
    skill_evidence: list[ResumeSkillEvidenceResponse] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    created_at: datetime


class ResumeAssessmentListItem(BaseModel):
    id: UUID
    resume_id: UUID
    scoring_mode: str
    overall_score: int
    match_verdict: Optional[str] = None
    target_role_title: Optional[str] = None
    algorithm_version: str
    created_at: datetime


class ResumeSaveVersionRequest(BaseModel):
    version_label: Optional[str] = None
    target_role_title: Optional[str] = None
    job_description: Optional[str] = None


class ResumeSaveVersionResponse(BaseModel):
    new_resume_id: UUID
    parent_resume_id: UUID
    version_number: int
    version_label: str
    file_name: str
    base_quality_score: int
    job_match_score: Optional[int] = None
    score_delta: Optional[int] = None
    delta_explanation: Optional[str] = None
    validation_warnings: list[str] = Field(default_factory=list)
    created_at: datetime



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
    current_skills: list[str] | None = None
    missing_skills: list[str] | None = None

    @model_validator(mode="after")
    def normalize_fields(self) -> "RoadmapRequest":
        self.target_role = self.target_role.strip()
        self.experience_level = self.experience_level.strip()
        if not self.target_role:
            raise ValueError("target_role is required")
        if not self.experience_level:
            raise ValueError("experience_level is required")
        if self.current_skills is not None:
            self.current_skills = [s.strip() for s in self.current_skills if isinstance(s, str) and s.strip()]
        if self.missing_skills is not None:
            self.missing_skills = [s.strip() for s in self.missing_skills if isinstance(s, str) and s.strip()]
        return self


class RoadmapStep(BaseModel):
    step: str
    title: Optional[str] = None
    resources: list[Any] = Field(default_factory=list)
    duration: str = ""
    stage: Optional[str] = None
    skills: list[str] = Field(default_factory=list)
    why_it_matters: Optional[str] = None
    prerequisites: list[str] = Field(default_factory=list)
    beginner_friendly_explanation: Optional[str] = None
    practical_project: Optional[str] = None
    checklist: list[str] = Field(default_factory=list)
    completion_criteria: Optional[str] = None


class RoadmapResponse(BaseModel):
    roadmap: list[RoadmapStep] = Field(default_factory=list)
    track: str = "general"
    is_personalized: bool = False
    role_supported: bool = True
    recommended_next_action: Optional[str] = None
    estimated_total_duration: Optional[str] = None


RoadmapStep.model_rebuild()
RoadmapResponse.model_rebuild()



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
    skills: list[str] | None = None
    job_description: str | None = None

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
        if self.skills is not None:
            self.skills = [s.strip() for s in self.skills if isinstance(s, str) and s.strip()]
        if self.job_description:
            self.job_description = self.job_description.strip()
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


class VoiceScoreResponse(BaseModel):
    technical: int
    communication: int
    confidence: int


class VoiceAnswerResponse(BaseModel):
    transcript: str
    scores: VoiceScoreResponse
    feedback: str


class VoiceQuestionResponse(BaseModel):
    role: str
    question: str


class VoiceChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)

    @model_validator(mode="after")
    def normalize_fields(self) -> "VoiceChatMessage":
        self.content = self.content.strip()
        if not self.content:
            raise ValueError("content is required")
        return self


class VoiceChatResponse(BaseModel):
    transcript: str
    reply: str
    session_id: Optional[UUID] = None


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


class CopilotChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)

    @model_validator(mode="after")
    def normalize_fields(self) -> "CopilotChatMessage":
        self.content = self.content.strip()
        if not self.content:
            raise ValueError("content is required")
        return self


class CopilotChatRequest(BaseModel):
    messages: list[CopilotChatMessage] = Field(min_length=1)
    conversation_id: Optional[UUID] = None
    mode: Optional[str] = "career"
    candidate_context: Optional[dict[str, Any]] = None


class CopilotResponse(BaseModel):
    reply: str
    conversation_id: Optional[UUID] = None


class InterviewSessionListItem(BaseModel):
    id: UUID
    role: str
    difficulty: str
    mode: str
    status: str
    overall_score: Optional[float] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    total_questions: int
    current_index: int

    model_config = ConfigDict(from_attributes=True)


class InterviewMessageResponse(BaseModel):
    id: UUID
    sender: str
    content: str
    feedback: Optional[str] = None
    score: Optional[float] = None
    question_index: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InterviewSessionDetailResponse(BaseModel):
    id: UUID
    role: str
    difficulty: str
    mode: str
    status: str
    overall_score: Optional[float] = None
    technical_score: Optional[float] = None
    communication_score: Optional[float] = None
    confidence_score: Optional[float] = None
    feedback_summary: Optional[str] = None
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    questions: list[str] = Field(default_factory=list)
    current_index: int
    total_questions: int
    messages: list[InterviewMessageResponse] = Field(default_factory=list)
    started_at: datetime
    completed_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CopilotConversationResponse(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CopilotMessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    role: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CopilotConversationDetailResponse(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[CopilotMessageResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class ResumeRewriteListItem(BaseModel):
    id: UUID
    title: str
    pdf_url: str
    tex_url: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =========================
# CAREER ACTIVITIES (PERSISTENCE)
# =========================

class CareerActivityCreate(BaseModel):
    client_event_id: Optional[str] = None
    activity_type: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=255)
    description: str
    activity_metadata: dict = Field(default_factory=dict)


class CareerActivityResponse(BaseModel):
    id: UUID
    client_event_id: Optional[str] = None
    activity_type: str
    title: str
    description: str
    activity_metadata: dict = Field(default_factory=dict)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =========================
# ROADMAP PROGRESS (PERSISTENCE)
# =========================

class RoadmapProgressCreate(BaseModel):
    role: str = Field(min_length=1, max_length=255)
    experience_level: str = Field(min_length=1, max_length=64)
    completed_steps: list[int] = Field(default_factory=list)


class RoadmapProgressResponse(BaseModel):
    id: UUID
    role: str
    experience_level: str
    completed_steps: list[int] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =========================
# NOTIFICATIONS (PERSISTENCE)
# =========================

class NotificationCreate(BaseModel):
    client_event_id: Optional[str] = None
    type: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=255)
    message: str
    action_url: Optional[str] = None
    action_text: Optional[str] = None


class NotificationResponse(BaseModel):
    id: UUID
    client_event_id: Optional[str] = None
    type: str
    title: str
    message: str
    action_url: Optional[str] = None
    action_text: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =========================
# CAREER GOALS
# =========================

class CareerGoalCreate(BaseModel):
    target_role: str = Field(min_length=1, max_length=255)
    target_company: Optional[str] = None
    target_salary: Optional[str] = None
    target_date: Optional[datetime] = None
    target_readiness_score: float = Field(default=90.0, ge=1, le=100)
    priority: str = Field(default="high")
    is_active: bool = True


class CareerGoalUpdate(BaseModel):
    target_role: Optional[str] = None
    target_company: Optional[str] = None
    target_salary: Optional[str] = None
    target_date: Optional[datetime] = None
    target_readiness_score: Optional[float] = None
    priority: Optional[str] = None
    is_active: Optional[bool] = None


class CareerGoalResponse(BaseModel):
    id: UUID
    target_role: str
    target_company: Optional[str] = None
    target_salary: Optional[str] = None
    target_date: Optional[datetime] = None
    target_readiness_score: float
    priority: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =========================
# CAREER RECOMMENDATIONS
# =========================

class RecommendationReason(BaseModel):
    signal: str
    impact: float
    confidence: float
    urgency: float
    explanation: str
    factors: list[str] = Field(default_factory=list)


class CareerRecommendationResponse(BaseModel):
    id: UUID
    client_event_id: Optional[str] = None
    recommendation_type: str
    title: str
    description: str
    source_module: str
    target_module: str
    priority: str
    impact_score: float
    confidence_score: float
    urgency_score: float
    status: str
    action_url: Optional[str] = None
    action_label: Optional[str] = None
    reason: Optional[RecommendationReason] = None
    recommendation_metadata: dict = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CareerRecommendationUpdate(BaseModel):
    status: str = Field(pattern="^(active|completed|dismissed|expired|superseded)$")


# =========================
# CAREER AUTOMATION RULES
# =========================

class CareerAutomationRuleCreate(BaseModel):
    trigger_type: str = Field(min_length=1, max_length=64)
    condition_config: dict = Field(default_factory=dict)
    action_type: str = Field(min_length=1, max_length=64)
    action_config: dict = Field(default_factory=dict)
    is_enabled: bool = True


class CareerAutomationRuleUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    condition_config: Optional[dict] = None
    action_config: Optional[dict] = None


class CareerAutomationRuleResponse(BaseModel):
    id: UUID
    trigger_type: str
    condition_config: dict
    action_type: str
    action_config: dict
    is_enabled: bool
    last_triggered_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =========================
# CAREER INSIGHT SNAPSHOTS & UNIFIED INTELLIGENCE
# =========================

class CareerInsightSnapshotResponse(BaseModel):
    id: UUID
    readiness_score: float
    resume_score: Optional[float] = None
    roadmap_progress: Optional[float] = None
    interview_score: Optional[float] = None
    job_readiness: Optional[float] = None
    skill_coverage: Optional[float] = None
    snapshot_metadata: dict = Field(default_factory=dict)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CriticalSkillGapItem(BaseModel):
    skill: str
    frequency_in_jobs: int
    is_role_requirement: bool
    priority: str
    roadmap_status: str  # missing, planned, completed


class CareerMomentum(BaseModel):
    score: float
    trend: str  # improving, stable, declining
    delta_text: str
    signals: dict = Field(default_factory=dict)


class CareerIntelligenceResponse(BaseModel):
    readiness_score: float
    career_momentum: CareerMomentum
    active_goal: Optional[CareerGoalResponse] = None
    top_priority: Optional[CareerRecommendationResponse] = None
    recommendations: list[CareerRecommendationResponse] = Field(default_factory=list)
    critical_gaps: list[CriticalSkillGapItem] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    next_milestone: Optional[dict] = None
    signals: dict = Field(default_factory=dict)


# =========================
# APPLICATION TRACKER & EXECUTION
# =========================

class JobApplicationCreate(BaseModel):
    company_name: str = Field(min_length=1, max_length=255)
    job_title: str = Field(min_length=1, max_length=255)
    location: Optional[str] = None
    salary_range: Optional[str] = None
    job_url: Optional[str] = None
    job_source: str = Field(default="manual")
    external_job_id: Optional[str] = None
    source_job_id: Optional[UUID] = None
    stage: str = Field(default="wishlist")  # wishlist, applied, screening, interviewing, offer, closed
    status: str = Field(default="active")  # active, offer_accepted, offer_declined, rejected, withdrawn, expired
    applied_date: Optional[datetime] = None
    resume_version_id: Optional[UUID] = None
    match_score_at_application: float = 0.0
    notes: Optional[str] = None
    next_step_date: Optional[datetime] = None
    next_step_notes: Optional[str] = None
    outcome_notes: Optional[str] = None
    application_metadata: dict = Field(default_factory=dict)


class JobApplicationUpdate(BaseModel):
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    job_url: Optional[str] = None
    stage: Optional[str] = None
    status: Optional[str] = None
    applied_date: Optional[datetime] = None
    resume_version_id: Optional[UUID] = None
    match_score_at_application: Optional[float] = None
    notes: Optional[str] = None
    next_step_date: Optional[datetime] = None
    next_step_notes: Optional[str] = None
    outcome_notes: Optional[str] = None
    application_metadata: Optional[dict] = None


class JobApplicationTransition(BaseModel):
    stage: str
    status: Optional[str] = None
    note: Optional[str] = None


class ApplicationEventResponse(BaseModel):
    id: UUID
    application_id: UUID
    event_type: str
    previous_stage: Optional[str] = None
    new_stage: Optional[str] = None
    title: str
    description: Optional[str] = None
    event_metadata: dict = Field(default_factory=dict)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InterviewDebriefCreate(BaseModel):
    company_name: str
    round_type: str
    difficulty_rating: int = Field(default=3, ge=1, le=5)
    technical_score: Optional[float] = Field(default=None, ge=1, le=10)
    communication_score: Optional[float] = Field(default=None, ge=1, le=10)
    problem_solving_score: Optional[float] = Field(default=None, ge=1, le=10)
    system_design_score: Optional[float] = Field(default=None, ge=1, le=10)
    confidence_score: Optional[float] = Field(default=None, ge=1, le=10)
    questions_asked: list[str] = Field(default_factory=list)
    candidate_reflection: Optional[str] = None
    identified_weaknesses: list[str] = Field(default_factory=list)
    outcome: str = Field(default="pending")  # passed, rejected, pending


class InterviewDebriefResponse(BaseModel):
    id: UUID
    application_id: UUID
    company_name: str
    round_type: str
    date: datetime
    difficulty_rating: int
    technical_score: Optional[float] = None
    communication_score: Optional[float] = None
    problem_solving_score: Optional[float] = None
    system_design_score: Optional[float] = None
    confidence_score: Optional[float] = None
    questions_asked: list[str] = Field(default_factory=list)
    candidate_reflection: Optional[str] = None
    identified_weaknesses: list[str] = Field(default_factory=list)
    outcome: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class JobApplicationResponse(BaseModel):
    id: UUID
    company_name: str
    job_title: str
    location: Optional[str] = None
    salary_range: Optional[str] = None
    job_url: Optional[str] = None
    job_source: str
    external_job_id: Optional[str] = None
    source_job_id: Optional[UUID] = None
    stage: str
    status: str
    applied_date: Optional[datetime] = None
    last_status_change: datetime
    resume_version_id: Optional[UUID] = None
    match_score_at_application: float
    notes: Optional[str] = None
    next_step_date: Optional[datetime] = None
    next_step_notes: Optional[str] = None
    outcome_notes: Optional[str] = None
    application_metadata: dict = Field(default_factory=dict)
    events: list[ApplicationEventResponse] = Field(default_factory=list)
    debriefs: list[InterviewDebriefResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class JobApplicationStats(BaseModel):
    total_active: int
    wishlist_count: int
    applied_count: int
    screening_count: int
    interviewing_count: int
    offer_count: int
    closed_count: int
    conversion_rate: float
    average_response_days: float
    stage_breakdown: dict = Field(default_factory=dict)


class CompanyIntelligenceResponse(BaseModel):
    id: UUID
    name: str
    company_name_normalized: str
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    tech_stack: list[str] = Field(default_factory=list)
    interview_stages: list[dict] = Field(default_factory=list)
    hiring_culture_notes: Optional[str] = None
    salary_benchmarks: dict = Field(default_factory=dict)
    common_questions: list[str] = Field(default_factory=list)
    data_source: str
    source_url: Optional[str] = None
    confidence_score: float
    last_verified_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OutcomeLearningInsightResponse(BaseModel):
    id: UUID
    insight_type: str
    title: str
    description: str
    metric_value: float
    data_points: dict = Field(default_factory=dict)
    source_count: int
    confidence_score: float
    fingerprint: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CareerSignal(BaseModel):
    source: str  # application_outcome, resume, interview, roadmap, job_match
    signal_type: str  # interview_weakness, missing_keyword, response_rate, rejection_pattern
    skill: Optional[str] = None
    severity: float = 0.5  # 0 to 1
    confidence: float = 0.8
    metadata: dict = Field(default_factory=dict)


# =========================
# ADMIN CONTROL CENTER SCHEMAS
# =========================

class AdminUserListItem(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str] = None
    role: str = "user"
    is_active: bool = True
    is_suspended: bool = False
    suspended_reason: Optional[str] = None
    is_email_verified: bool = False
    onboarding_completed: bool = False
    target_role: Optional[str] = None
    ats_score: Optional[float] = None
    readiness_score: Optional[float] = None
    applications_count: int = 0
    interviews_count: int = 0
    last_activity_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminUserListResponse(BaseModel):
    users: list[AdminUserListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class AdminUserDetailResponse(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool
    is_suspended: bool
    suspended_reason: Optional[str] = None
    is_email_verified: bool
    onboarding_completed: bool
    target_role: Optional[str] = None
    career_profile: Optional[dict] = None
    skills: list[str] = Field(default_factory=list)
    resumes_count: int = 0
    latest_ats_score: Optional[float] = None
    interviews_count: int = 0
    latest_interview_score: Optional[float] = None
    applications_count: int = 0
    active_goals_count: int = 0
    recommendations_count: int = 0
    readiness_score: Optional[float] = None
    created_at: datetime
    last_activity_at: Optional[datetime] = None


class AdminUserResumeItem(BaseModel):
    id: UUID
    original_filename: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    ats_score: Optional[float] = None
    overall_feedback: Optional[str] = None
    uploaded_at: Optional[datetime] = None
    skills_count: int = 0
    missing_skills_count: int = 0


class AdminUserInterviewItem(BaseModel):
    id: UUID
    role: str
    difficulty: str
    mode: str
    status: str
    overall_score: Optional[float] = None
    technical_score: Optional[float] = None
    communication_score: Optional[float] = None
    feedback_summary: Optional[str] = None
    messages_count: int = 0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class AdminUserApplicationItem(BaseModel):
    id: UUID
    company_name: str
    job_title: str
    location: Optional[str] = None
    salary_range: Optional[str] = None
    stage: str
    status: str
    applied_date: Optional[datetime] = None
    match_score_at_application: float = 0.0
    notes: Optional[str] = None
    events_count: int = 0
    debriefs_count: int = 0


class AdminUserCopilotItem(BaseModel):
    id: UUID
    title: str
    messages_count: int = 0
    last_message_preview: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class AdminUserActivityItem(BaseModel):
    id: UUID
    activity_type: str
    title: str
    description: str
    created_at: datetime


class AdminUserUpdateRequest(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None
    is_email_verified: Optional[bool] = None


class AdminUserSuspendRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


class AdminUserBulkStatusRequest(BaseModel):
    user_ids: list[UUID] = Field(min_length=1, max_length=100)
    action: Literal["suspend", "activate"]
    reason: Optional[str] = Field(default="Bulk administrative status update", max_length=500)


class AdminUserBulkStatusItem(BaseModel):
    user_id: str
    email: str
    status: str
    success: bool
    error: Optional[str] = None


class AdminUserBulkStatusResponse(BaseModel):
    action: str
    total_requested: int
    successful_count: int
    failed_count: int
    results: list[AdminUserBulkStatusItem]


class AdminDashboardStats(BaseModel):
    total_users: int
    total_candidates: int = 0
    verified_users: int = 0
    active_users_today: int
    new_users_today: int
    suspended_users: int
    total_resumes: int
    total_interviews: int
    total_applications: int
    total_ai_requests: int
    recommendation_runs: int
    platform_health: str
    recent_activity: list[dict] = Field(default_factory=list)


class PlatformAnalyticsStats(BaseModel):
    total_users: int
    daily_active_users: int
    weekly_active_users: int
    monthly_active_users: int
    new_users_30d: int
    retention_rate: float
    feature_usage: dict = Field(default_factory=dict)
    applications_by_stage: dict = Field(default_factory=dict)
    interview_conversion_rate: float = 0.0
    offer_conversion_rate: float = 0.0
    top_skill_gaps: list[dict] = Field(default_factory=list)
    top_target_roles: list[dict] = Field(default_factory=list)
    top_companies: list[dict] = Field(default_factory=list)


class AIUsageStats(BaseModel):
    total_requests: int
    successful_requests: int
    failed_requests: int
    success_rate: float
    average_response_time_ms: Optional[float] = None
    p50_latency_ms: Optional[float] = None
    p95_latency_ms: Optional[float] = None
    p99_latency_ms: Optional[float] = None
    telemetry_source: Optional[str] = "ai_request_telemetry"
    sample_size: int = 0
    breakdown_by_feature: dict = Field(default_factory=dict)
    breakdown_by_provider: dict = Field(default_factory=dict)
    recent_errors: list[dict] = Field(default_factory=list)
    total_prompt_tokens: int = 0
    total_completion_tokens: int = 0
    total_tokens: int = 0
    token_metered_requests: int = 0
    unmetered_requests: int = 0
    estimated_cost_usd: float = 0.0
    breakdown_by_model: dict = Field(default_factory=dict)
    pricing_assumptions: dict = Field(default_factory=dict)
    time_range: Optional[str] = None


class SystemHealthResponse(BaseModel):
    status: str  # healthy, degraded, unhealthy
    services: dict = Field(default_factory=dict)
    service_details: dict = Field(default_factory=dict)
    open_alerts_count: int = 0
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class FeatureFlagCreate(BaseModel):
    key: str = Field(min_length=2, max_length=64)
    name: str = Field(min_length=2, max_length=128)
    description: Optional[str] = None
    is_enabled: bool = True
    target_roles: list[str] = Field(default_factory=lambda: ["user", "admin", "super_admin"])


class FeatureFlagUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_enabled: Optional[bool] = None
    target_roles: Optional[list[str]] = None


class FeatureFlagResponse(BaseModel):
    id: UUID
    key: str
    name: str
    description: Optional[str] = None
    is_enabled: bool
    target_roles: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlatformAnnouncementCreate(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    message: str = Field(min_length=5)
    type: str = "info"  # info, success, warning, maintenance
    target_audience: str = "all"  # all, users, admins
    is_active: bool = True
    expires_at: Optional[datetime] = None


class PlatformAnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    message: Optional[str] = None
    type: Optional[str] = None
    target_audience: Optional[str] = None
    is_active: Optional[bool] = None
    expires_at: Optional[datetime] = None


class PlatformAnnouncementResponse(BaseModel):
    id: UUID
    title: str
    message: str
    type: str
    target_audience: str
    is_active: bool
    starts_at: datetime
    expires_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminAuditLogResponse(BaseModel):
    id: UUID
    admin_user_id: Optional[UUID] = None
    admin_email: Optional[str] = None
    action_type: str
    target_user_id: Optional[UUID] = None
    target_email: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    action_metadata: dict = Field(default_factory=dict)
    before_data: Optional[dict] = None
    after_data: Optional[dict] = None
    diff: Optional[dict] = None
    reason: Optional[str] = None
    severity: str = "info"
    confirmation_value: Optional[str] = None
    simulation_session_id: Optional[UUID] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None
    created_at: datetime

    @field_validator("action_metadata", mode="before")
    @classmethod
    def sanitize_action_metadata(cls, v: Any) -> dict:
        if v is None:
            return {}
        from app.services.audit_service import sanitize_metadata
        res = sanitize_metadata(v)
        return res if isinstance(res, dict) else {}

    @field_validator("before_data", "after_data", "diff", mode="before")
    @classmethod
    def sanitize_sensitive_payloads(cls, v: Any) -> Any:
        if v is None:
            return None
        from app.services.audit_service import sanitize_metadata
        return sanitize_metadata(v)

    model_config = ConfigDict(from_attributes=True)


class AdminAuditLogListResponse(BaseModel):
    items: list[AdminAuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class AdminSimulationStartRequest(BaseModel):
    target_user_id: UUID
    reason: Optional[str] = "Admin diagnostic investigation"
    duration_minutes: int = Field(default=30, ge=5, le=120)


class AdminSimulationSessionResponse(BaseModel):
    id: UUID
    admin_user_id: UUID
    target_user_id: UUID
    token: Optional[str] = None  # Returned only on creation
    is_active: bool
    expires_at: datetime
    created_at: datetime
    ended_at: Optional[datetime] = None
    ended_reason: Optional[str] = None
    target_user_email: Optional[str] = None
    target_user_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DatabaseTableMetadata(BaseModel):
    table_name: str
    category: str
    record_count: int
    readable_fields: list[str]
    masked_fields: list[str]
    editable_fields: list[str]
    immutable_fields: list[str]
    delete_policy: str
    relationships: dict = Field(default_factory=dict)


class DatabaseRecordMutationRequest(BaseModel):
    table_name: str
    record_id: str
    updates: dict
    reason: str = Field(min_length=5, max_length=1000)
    confirmation_value: Optional[str] = None


class AdminTableMutationRequest(BaseModel):
    updates: dict
    reason: str = Field(min_length=3, max_length=1000)


class AdminTableDeleteRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=1000)
    confirmation_value: Optional[str] = None



class DatabaseRecordMutationResponse(BaseModel):
    table_name: str
    record_id: str
    diff: dict
    reason: str
    audit_log_id: UUID
    updated_record: dict


class UserFeedbackCreate(BaseModel):
    feedback_type: str  # helpful, unhelpful, issue, idea
    module: Optional[str] = None
    message: Optional[str] = None
    metadata_json: dict = Field(default_factory=dict)


class UserFeedbackResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    feedback_type: str
    module: Optional[str] = None
    message: Optional[str] = None
    metadata_json: dict = Field(default_factory=dict)
    status: str
    created_at: datetime


# =========================
# PROFILE, SETTINGS & SKILL PASSPORT SCHEMAS
# =========================

class UserSkillCreate(BaseModel):
    skill_name: str = Field(min_length=1, max_length=120)
    skill_category: Optional[str] = "technical"
    source: Optional[str] = "manual"
    confidence: Optional[float] = Field(default=1.0, ge=0.0, le=1.0)


class UserSkillResponse(BaseModel):
    id: UUID
    user_id: UUID
    skill_name: str
    skill_category: Optional[str] = "technical"
    source: str = "manual"
    confidence: float = 1.0
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8)


class UserProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    target_role: Optional[str] = None
    experience_level: Optional[str] = None
    education_level: Optional[str] = None
    college: Optional[str] = None
    graduation_year: Optional[str] = None
    career_stage: Optional[str] = None
    primary_goals: Optional[list[str]] = None
    headline: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    work_preference: Optional[str] = None
    employment_type: Optional[str] = None
    portfolio_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None


class UserSettingsUpdateRequest(BaseModel):
    notification_preferences: Optional[dict] = None
    privacy_settings: Optional[dict] = None
    appearance_settings: Optional[dict] = None
    career_preferences: Optional[dict] = None


class UserSettingsResponse(BaseModel):
    notification_preferences: dict = Field(default_factory=dict)
    privacy_settings: dict = Field(default_factory=dict)
    appearance_settings: dict = Field(default_factory=dict)
    career_preferences: dict = Field(default_factory=dict)


class PassportShareResponse(BaseModel):
    is_public: bool
    share_token: Optional[str] = None
    share_url: Optional[str] = None


class SharedSkillPassportResponse(BaseModel):
    full_name: str
    headline: Optional[str] = None
    target_role: Optional[str] = None
    experience_level: Optional[str] = None
    skills: list[dict] = Field(default_factory=list)
    alignment_score: Optional[float] = None
    shared_at: datetime


class AccountDeletionRequest(BaseModel):
    confirmation: str = Field(..., description="Must explicitly be 'DELETE' to confirm irreversible deletion")
    password: Optional[str] = Field(None, description="Current password for password-authenticated accounts")
    deletion_token: Optional[str] = Field(None, description="Short-lived, single-use authorization token for OAuth accounts")


class DeletionTokenResponse(BaseModel):
    deletion_token: str
    expires_in_seconds: int = 300
    auth_provider: str
    message: str = "Short-lived deletion authorization token issued. Single-use and valid for 5 minutes."


class AccountDeletionResponse(BaseModel):
    success: bool = True
    message: str = "Account and all associated personal data have been permanently deleted."
    deleted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==============================================================================
# OPERATIONAL ALERTS & INTELLIGENT ALERT CENTER
# ==============================================================================

class OperationalAlertItem(BaseModel):
    id: str
    alert_type: str  # SERVICE_HEALTH_FAILURE, SERVICE_DEGRADATION, AI_PROVIDER_ERROR_BURST, AUTH_SECURITY_ANOMALY, GOVERNANCE_CRITICAL_EVENT
    severity: str  # critical, warning, info
    title: str
    description: str
    source_service: str  # api, database, ai_service, authentication, storage, governance
    status: str = "open"  # open, acknowledged, resolved
    created_at: datetime
    updated_at: datetime
    related_resource_type: Optional[str] = None
    related_resource_id: Optional[str] = None
    acknowledged_by_admin_email: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved_by_admin_email: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    metadata: dict = Field(default_factory=dict)


class OperationalAlertListResponse(BaseModel):
    items: list[OperationalAlertItem]
    total: int
    open_count: int
    acknowledged_count: int
    resolved_count: int
    critical_count: int
    warning_count: int
    info_count: int
    last_refreshed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OperationalAlertSummaryResponse(BaseModel):
    open_count: int
    acknowledged_count: int
    resolved_count: int
    critical_count: int
    warning_count: int
    info_count: int
    unresolved_alerts: list[OperationalAlertItem]
    last_refreshed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OperationalAlertTransitionRequest(BaseModel):
    status: str = Field(..., pattern="^(acknowledged|resolved)$")
    resolution_notes: Optional[str] = Field(None, max_length=1000)

    @model_validator(mode="after")
    def validate_resolution_notes(self) -> "OperationalAlertTransitionRequest":
        if self.status == "resolved":
            if not self.resolution_notes or not self.resolution_notes.strip():
                raise ValueError("Resolution notes are required when resolving an alert.")
        return self




