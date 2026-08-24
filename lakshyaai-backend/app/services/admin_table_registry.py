from typing import Dict, Any, List, Optional
from uuid import UUID
from datetime import datetime, date
from app.db import models


TABLE_REGISTRY: Dict[str, Dict[str, Any]] = {
    # =========================
    # IDENTITY & ACCESS
    # =========================
    "users": {
        "model": models.User,
        "category": "identity",
        "primary_key": "id",
        "readable_fields": [
            "id", "email", "full_name", "role", "is_active",
            "is_suspended", "suspended_reason", "is_email_verified",
            "last_login_at", "last_activity_at", "created_at", "updated_at"
        ],
        "masked_fields": ["password_hash"],
        "editable_fields": ["role", "is_active", "is_suspended", "suspended_reason", "is_email_verified", "full_name"],
        "immutable_fields": ["id", "email", "created_at", "updated_at"],
        "delete_policy": "typed_confirmation_required",
        "relationships": {
            "career_profile": {"table": "user_career_profiles", "foreign_key": "user_id"},
            "skills": {"table": "user_skills", "foreign_key": "user_id"},
            "resumes": {"table": "resumes", "foreign_key": "user_id"},
            "interview_sessions": {"table": "interview_sessions", "foreign_key": "user_id"},
            "job_applications": {"table": "job_applications", "foreign_key": "user_id"},
            "copilot_conversations": {"table": "copilot_conversations", "foreign_key": "user_id"},
        },
    },
    "email_verification_tokens": {
        "model": models.EmailVerificationToken,
        "category": "identity",
        "primary_key": "id",
        "readable_fields": ["id", "user_id", "expires_at", "created_at", "used_at"],
        "masked_fields": ["token_hash"],
        "editable_fields": [],
        "immutable_fields": ["id", "user_id", "token_hash", "expires_at", "created_at", "used_at"],
        "delete_policy": "disallowed",
        "relationships": {
            "user": {"table": "users", "foreign_key": "id", "local_key": "user_id"}
        },
    },
    "user_career_profiles": {
        "model": models.UserCareerProfile,
        "category": "career",
        "primary_key": "id",
        "readable_fields": [
            "id", "user_id", "onboarding_current_step", "onboarding_completed",
            "career_stage", "primary_goals", "education_level", "specialization",
            "graduation_year", "college", "experience_level", "target_role",
            "is_exploring_roles", "created_at", "updated_at"
        ],
        "masked_fields": [],
        "editable_fields": [
            "onboarding_current_step", "onboarding_completed", "career_stage",
            "education_level", "specialization", "graduation_year", "college",
            "experience_level", "target_role", "is_exploring_roles"
        ],
        "immutable_fields": ["id", "user_id", "created_at", "updated_at"],
        "delete_policy": "soft_delete",
        "relationships": {
            "user": {"table": "users", "foreign_key": "id", "local_key": "user_id"}
        },
    },

    # =========================
    # CAREER & SKILLS
    # =========================
    "user_skills": {
        "model": models.UserSkill,
        "category": "career",
        "primary_key": "id",
        "readable_fields": ["id", "user_id", "skill_name", "skill_category", "source", "confidence", "created_at", "updated_at"],
        "masked_fields": [],
        "editable_fields": ["skill_name", "skill_category", "source", "confidence"],
        "immutable_fields": ["id", "user_id", "created_at", "updated_at"],
        "delete_policy": "allowed",
        "relationships": {
            "user": {"table": "users", "foreign_key": "id", "local_key": "user_id"}
        },
    },
    "user_skill_progress": {
        "model": models.UserSkillProgress,
        "category": "career",
        "primary_key": "id",
        "readable_fields": ["id", "user_id", "skill_name", "frequency", "last_seen"],
        "masked_fields": [],
        "editable_fields": ["frequency"],
        "immutable_fields": ["id", "user_id", "skill_name"],
        "delete_policy": "allowed",
        "relationships": {
            "user": {"table": "users", "foreign_key": "id", "local_key": "user_id"}
        },
    },
    "user_performance_trend": {
        "model": models.UserPerformanceTrend,
        "category": "career",
        "primary_key": "id",
        "readable_fields": ["id", "user_id", "resume_id", "ats_score", "role_alignment_score", "created_at"],
        "masked_fields": [],
        "editable_fields": ["ats_score", "role_alignment_score"],
        "immutable_fields": ["id", "user_id", "resume_id", "created_at"],
        "delete_policy": "allowed",
        "relationships": {
            "user": {"table": "users", "foreign_key": "id", "local_key": "user_id"},
            "resume": {"table": "resumes", "foreign_key": "id", "local_key": "resume_id"}
        },
    },
    "user_career_state": {
        "model": models.UserCareerState,
        "category": "career",
        "primary_key": "id",
        "readable_fields": ["id", "user_id", "best_role", "score", "confidence", "updated_at"],
        "masked_fields": [],
        "editable_fields": ["best_role", "score", "confidence"],
        "immutable_fields": ["id", "user_id", "updated_at"],
        "delete_policy": "disallowed",
        "relationships": {
            "user": {"table": "users", "foreign_key": "id", "local_key": "user_id"}
        },
    },
    "career_goals": {
        "model": models.CareerGoal,
        "category": "career",
        "primary_key": "id",
        "readable_fields": [
            "id", "user_id", "target_role", "target_company", "target_salary",
            "target_date", "target_readiness_score", "priority", "is_active", "created_at", "updated_at"
        ],
        "masked_fields": [],
        "editable_fields": ["target_role", "target_company", "target_salary", "target_date", "target_readiness_score", "priority", "is_active"],
        "immutable_fields": ["id", "user_id", "created_at", "updated_at"],
        "delete_policy": "allowed",
        "relationships": {
            "user": {"table": "users", "foreign_key": "id", "local_key": "user_id"}
        },
    },
    "career_activities": {
        "model": models.CareerActivity,
        "category": "career",
        "primary_key": "id",
        "readable_fields": ["id", "user_id", "client_event_id", "activity_type", "title", "description", "created_at"],
        "masked_fields": ["activity_metadata"],
        "editable_fields": ["title", "description"],
        "immutable_fields": ["id", "user_id", "client_event_id", "activity_type", "created_at"],
        "delete_policy": "allowed",
        "relationships": {
            "user": {"table": "users", "foreign_key": "id", "local_key": "user_id"}
        },
    },
    "roadmap_progress": {
        "model": models.RoadmapProgress,
        "category": "career",
        "primary_key": "id",
        "readable_fields": ["id", "user_id", "role", "experience_level", "completed_steps", "created_at", "updated_at"],
        "masked_fields": [],
        "editable_fields": ["completed_steps"],
        "immutable_fields": ["id", "user_id", "role", "experience_level", "created_at", "updated_at"],
        "delete_policy": "allowed",
        "relationships": {
            "user": {"table": "users", "foreign_key": "id", "local_key": "user_id"}
        },
    },

    # =========================
    # RESUMES & DIAGNOSTICS
    # =========================
    "resumes": {
        "model": models.Resume,
        "category": "resume",
        "primary_key": "id",
        "readable_fields": [
            "id", "user_id", "original_filename", "file_name", "file_size",
            "mime_type", "ats_score", "overall_feedback", "uploaded_at", "created_at", "updated_at"
        ],
        "masked_fields": ["file_path", "parsed_text", "extracted_text"],
        "editable_fields": ["ats_score", "overall_feedback"],
        "immutable_fields": ["id", "user_id", "original_filename", "file_name", "uploaded_at", "created_at", "updated_at"],
        "delete_policy": "typed_confirmation_required",
        "relationships": {
            "user": {"table": "users", "foreign_key": "id", "local_key": "user_id"},
            "skills": {"table": "resume_skills", "foreign_key": "resume_id"},
            "ats_breakdown": {"table": "resume_ats_breakdown", "foreign_key": "resume_id"},
            "missing_skills": {"table": "resume_missing_skills", "foreign_key": "resume_id"},
            "rewrites": {"table": "resume_rewrites", "foreign_key": "resume_id"},
        },
    },
    "resume_skills": {
        "model": models.ResumeSkill,
        "category": "resume",
        "primary_key": "id",
        "readable_fields": ["id", "resume_id", "skill_name", "skill_category", "confidence_score"],
        "masked_fields": [],
        "editable_fields": ["skill_name", "skill_category", "confidence_score"],
        "immutable_fields": ["id", "resume_id"],
        "delete_policy": "allowed",
        "relationships": {
            "resume": {"table": "resumes", "foreign_key": "id", "local_key": "resume_id"}
        },
    },
    "resume_embeddings": {
        "model": models.ResumeEmbedding,
        "category": "resume",
        "primary_key": "id",
        "readable_fields": ["id", "resume_id", "created_at"],
        "masked_fields": ["embedding"],
        "editable_fields": [],
        "immutable_fields": ["id", "resume_id", "embedding", "created_at"],
        "delete_policy": "disallowed",
        "relationships": {
            "resume": {"table": "resumes", "foreign_key": "id", "local_key": "resume_id"}
        },
    },
    "resume_ats_breakdown": {
        "model": models.ResumeATSBreakdown,
        "category": "resume",
        "primary_key": "id",
        "readable_fields": ["id", "resume_id", "skill_score", "keyword_score", "section_score", "format_score", "action_verb_score", "created_at"],
        "masked_fields": [],
        "editable_fields": ["skill_score", "keyword_score", "section_score", "format_score", "action_verb_score"],
        "immutable_fields": ["id", "resume_id", "created_at"],
        "delete_policy": "disallowed",
        "relationships": {
            "resume": {"table": "resumes", "foreign_key": "id", "local_key": "resume_id"}
        },
    },
    "resume_missing_skills": {
        "model": models.ResumeMissingSkill,
        "category": "resume",
        "primary_key": "id",
        "readable_fields": ["id", "resume_id", "skill_name", "skill_category", "importance", "created_at"],
        "masked_fields": [],
        "editable_fields": ["skill_name", "skill_category", "importance"],
        "immutable_fields": ["id", "resume_id", "created_at"],
        "delete_policy": "allowed",
        "relationships": {
            "resume": {"table": "resumes", "foreign_key": "id", "local_key": "resume_id"}
        },
    },
    "resume_rewrites": {
        "model": models.ResumeRewrite,
        "category": "resume",
        "primary_key": "id",
        "readable_fields": ["id", "user_id", "resume_id", "title", "preview_text", "structured_data", "created_at", "updated_at"],
        "masked_fields": ["latex_content", "pdf_path", "tex_path"],
        "editable_fields": ["title"],
        "immutable_fields": ["id", "user_id", "resume_id", "created_at", "updated_at"],
        "delete_policy": "allowed",
        "relationships": {
            "user": {"table": "users", "foreign_key": "id", "local_key": "user_id"},
            "resume": {"table": "resumes", "foreign_key": "id", "local_key": "resume_id"}
        },
    },

    # =========================
    # INTERVIEWS & DEBRIEFS
    # =========================
    "interview_sessions": {
        "model": models.InterviewSession,
        "category": "interviews",
        "primary_key": "id",
        "readable_fields": [
            "id", "user_id", "role", "difficulty", "mode", "status",
            "current_index", "total_questions", "overall_score", "technical_score",
            "communication_score", "confidence_score", "feedback_summary",
            "started_at", "completed_at", "created_at", "updated_at"
        ],
        "masked_fields": ["questions", "strengths", "weaknesses"],
        "editable_fields": ["role", "difficulty", "mode", "status", "overall_score", "feedback_summary"],
        "immutable_fields": ["id", "user_id", "started_at", "created_at", "updated_at"],
        "delete_policy": "typed_confirmation_required",
        "relationships": {
            "user": {"table": "users", "foreign_key": "id", "local_key": "user_id"},
            "messages": {"table": "interview_messages", "foreign_key": "session_id"},
        },
    },
    "interview_messages": {
        "model": models.InterviewMessage,
        "category": "interviews",
        "primary_key": "id",
        "readable_fields": ["id", "session_id", "sender", "content", "feedback", "score", "question_index", "created_at"],
        "masked_fields": [],
        "editable_fields": ["feedback", "score"],
        "immutable_fields": ["id", "session_id", "sender", "content", "question_index", "created_at"],
        "delete_policy": "disallowed",
        "relationships": {
            "session": {"table": "interview_sessions", "foreign_key": "id", "local_key": "session_id"}
        },
    },
    "interview_debriefs": {
        "model": models.InterviewDebrief,
        "category": "interviews",
        "primary_key": "id",
        "readable_fields": [
            "id", "user_id", "application_id", "company_name", "round_type",
            "date", "difficulty_rating", "technical_score", "communication_score",
            "problem_solving_score", "system_design_score", "confidence_score",
            "candidate_reflection", "outcome", "created_at"
        ],
        "masked_fields": ["questions_asked", "identified_weaknesses"],
        "editable_fields": ["company_name", "round_type", "difficulty_rating", "technical_score", "candidate_reflection", "outcome"],
        "immutable_fields": ["id", "user_id", "application_id", "created_at"],
        "delete_policy": "allowed",
        "relationships": {
            "user": {"table": "users", "foreign_key": "id", "local_key": "user_id"},
            "application": {"table": "job_applications", "foreign_key": "id", "local_key": "application_id"}
        },
    },

    # =========================
    # APPLICATIONS & COMPANY INTEL
    # =========================
    "job_applications": {
        "model": models.JobApplication,
        "category": "applications",
        "primary_key": "id",
        "readable_fields": [
            "id", "user_id", "company_name", "job_title", "location", "salary_range",
            "job_url", "job_source", "stage", "status", "applied_date",
            "last_status_change", "match_score_at_application", "notes",
            "next_step_date", "next_step_notes", "outcome_notes", "created_at", "updated_at"
        ],
        "masked_fields": ["application_metadata"],
        "editable_fields": [
            "company_name", "job_title", "location", "salary_range", "job_url",
            "stage", "status", "applied_date", "match_score_at_application", "notes",
            "next_step_date", "next_step_notes", "outcome_notes"
        ],
        "immutable_fields": ["id", "user_id", "created_at", "updated_at"],
        "delete_policy": "allowed",
        "relationships": {
            "user": {"table": "users", "foreign_key": "id", "local_key": "user_id"},
            "events": {"table": "application_events", "foreign_key": "application_id"},
            "debriefs": {"table": "interview_debriefs", "foreign_key": "application_id"},
        },
    },
    "application_events": {
        "model": models.ApplicationEvent,
        "category": "applications",
        "primary_key": "id",
        "readable_fields": ["id", "application_id", "user_id", "event_type", "previous_stage", "new_stage", "title", "description", "created_at"],
        "masked_fields": ["event_metadata"],
        "editable_fields": ["title", "description"],
        "immutable_fields": ["id", "application_id", "user_id", "event_type", "created_at"],
        "delete_policy": "allowed",
        "relationships": {
            "application": {"table": "job_applications", "foreign_key": "id", "local_key": "application_id"},
            "user": {"table": "users", "foreign_key": "id", "local_key": "user_id"}
        },
    },
    "company_intelligence": {
        "model": models.CompanyIntelligence,
        "category": "intelligence",
        "primary_key": "id",
        "readable_fields": [
            "id", "name", "company_name_normalized", "domain", "logo_url",
            "tech_stack", "interview_stages", "hiring_culture_notes", "salary_benchmarks",
            "common_questions", "data_source", "confidence_score", "last_verified_at", "created_at", "updated_at"
        ],
        "masked_fields": [],
        "editable_fields": ["name", "domain", "logo_url", "tech_stack", "interview_stages", "hiring_culture_notes", "salary_benchmarks", "common_questions", "confidence_score"],
        "immutable_fields": ["id", "company_name_normalized", "created_at", "updated_at"],
        "delete_policy": "typed_confirmation_required",
        "relationships": {},
    },

    # =========================
    # INTELLIGENCE, AUTOMATION & OUTCOMES
    # =========================
    "career_recommendations": {
        "model": models.CareerRecommendation,
        "category": "intelligence",
        "primary_key": "id",
        "readable_fields": [
            "id", "user_id", "recommendation_type", "title", "description",
            "source_module", "target_module", "priority", "impact_score",
            "confidence_score", "urgency_score", "status", "action_url", "action_label", "created_at", "updated_at"
        ],
        "masked_fields": ["recommendation_metadata"],
        "editable_fields": ["title", "description", "priority", "status", "action_url", "action_label"],
        "immutable_fields": ["id", "user_id", "created_at", "updated_at"],
        "delete_policy": "allowed",
        "relationships": {
            "user": {"table": "users", "foreign_key": "id", "local_key": "user_id"}
        },
    },
    "career_automation_rules": {
        "model": models.CareerAutomationRule,
        "category": "intelligence",
        "primary_key": "id",
        "readable_fields": ["id", "user_id", "trigger_type", "action_type", "is_enabled", "last_triggered_at", "created_at", "updated_at"],
        "masked_fields": ["condition_config", "action_config"],
        "editable_fields": ["trigger_type", "action_type", "is_enabled"],
        "immutable_fields": ["id", "user_id", "created_at", "updated_at"],
        "delete_policy": "allowed",
        "relationships": {
            "user": {"table": "users", "foreign_key": "id", "local_key": "user_id"}
        },
    },
    "career_insight_snapshots": {
        "model": models.CareerInsightSnapshot,
        "category": "intelligence",
        "primary_key": "id",
        "readable_fields": ["id", "user_id", "readiness_score", "resume_score", "roadmap_progress", "interview_score", "job_readiness", "skill_coverage", "created_at"],
        "masked_fields": ["snapshot_metadata"],
        "editable_fields": ["readiness_score", "resume_score", "roadmap_progress", "interview_score"],
        "immutable_fields": ["id", "user_id", "created_at"],
        "delete_policy": "allowed",
        "relationships": {
            "user": {"table": "users", "foreign_key": "id", "local_key": "user_id"}
        },
    },
    "outcome_learning_insights": {
        "model": models.OutcomeLearningInsight,
        "category": "intelligence",
        "primary_key": "id",
        "readable_fields": ["id", "user_id", "insight_type", "title", "description", "metric_value", "source_count", "confidence_score", "valid_until", "created_at", "updated_at"],
        "masked_fields": ["data_points"],
        "editable_fields": ["title", "description", "metric_value", "confidence_score", "valid_until"],
        "immutable_fields": ["id", "user_id", "insight_type", "created_at", "updated_at"],
        "delete_policy": "allowed",
        "relationships": {
            "user": {"table": "users", "foreign_key": "id", "local_key": "user_id"}
        },
    },

    # =========================
    # COPILOT & NOTIFICATIONS
    # =========================
    "copilot_conversations": {
        "model": models.CopilotConversation,
        "category": "ai",
        "primary_key": "id",
        "readable_fields": ["id", "user_id", "title", "created_at", "updated_at"],
        "masked_fields": [],
        "editable_fields": ["title"],
        "immutable_fields": ["id", "user_id", "created_at", "updated_at"],
        "delete_policy": "allowed",
        "relationships": {
            "user": {"table": "users", "foreign_key": "id", "local_key": "user_id"},
            "messages": {"table": "copilot_messages", "foreign_key": "conversation_id"}
        },
    },
    "copilot_messages": {
        "model": models.CopilotMessage,
        "category": "ai",
        "primary_key": "id",
        "readable_fields": ["id", "conversation_id", "role", "content", "created_at"],
        "masked_fields": [],
        "editable_fields": ["content"],
        "immutable_fields": ["id", "conversation_id", "role", "created_at"],
        "delete_policy": "allowed",
        "relationships": {
            "conversation": {"table": "copilot_conversations", "foreign_key": "id", "local_key": "conversation_id"}
        },
    },
    "notifications": {
        "model": models.Notification,
        "category": "system",
        "primary_key": "id",
        "readable_fields": ["id", "user_id", "client_event_id", "type", "title", "message", "action_url", "action_text", "is_read", "created_at"],
        "masked_fields": [],
        "editable_fields": ["is_read"],
        "immutable_fields": ["id", "user_id", "client_event_id", "type", "title", "message", "created_at"],
        "delete_policy": "allowed",
        "relationships": {
            "user": {"table": "users", "foreign_key": "id", "local_key": "user_id"}
        },
    },

    # =========================
    # TAXONOMIES
    # =========================
    "roles": {
        "model": models.Role,
        "category": "catalog",
        "primary_key": "id",
        "readable_fields": ["id", "title", "category", "demand_level", "description", "average_salary"],
        "masked_fields": [],
        "editable_fields": ["title", "category", "demand_level", "description", "average_salary"],
        "immutable_fields": ["id"],
        "delete_policy": "typed_confirmation_required",
        "relationships": {
            "skills": {"table": "role_skills", "foreign_key": "role_id"},
            "embeddings": {"table": "role_embeddings", "foreign_key": "role_id"}
        },
    },
    "role_skills": {
        "model": models.RoleSkill,
        "category": "catalog",
        "primary_key": "id",
        "readable_fields": ["id", "role_id", "skill_name", "skill_category", "weight", "importance_level"],
        "masked_fields": [],
        "editable_fields": ["skill_name", "skill_category", "weight", "importance_level"],
        "immutable_fields": ["id", "role_id"],
        "delete_policy": "allowed",
        "relationships": {
            "role": {"table": "roles", "foreign_key": "id", "local_key": "role_id"}
        },
    },
    "role_embeddings": {
        "model": models.RoleEmbedding,
        "category": "catalog",
        "primary_key": "id",
        "readable_fields": ["id", "role_id"],
        "masked_fields": ["embedding"],
        "editable_fields": [],
        "immutable_fields": ["id", "role_id", "embedding"],
        "delete_policy": "disallowed",
        "relationships": {
            "role": {"table": "roles", "foreign_key": "id", "local_key": "role_id"}
        },
    },

    # =========================
    # GOVERNANCE & ADMIN
    # =========================
    "admin_audit_logs": {
        "model": models.AdminAuditLog,
        "category": "system",
        "primary_key": "id",
        "readable_fields": [
            "id", "admin_user_id", "action_type", "target_user_id",
            "resource_type", "resource_id", "action_metadata", "before_data",
            "after_data", "diff", "reason", "severity", "confirmation_value",
            "simulation_session_id", "ip_address", "user_agent", "request_id", "created_at"
        ],
        "masked_fields": [],
        "editable_fields": [],  # Strictly zero edit
        "immutable_fields": ["*"],
        "delete_policy": "disallowed",  # Strictly append-only
        "relationships": {
            "admin_user": {"table": "users", "foreign_key": "id", "local_key": "admin_user_id"}
        },
    },
    "admin_simulation_sessions": {
        "model": models.AdminSimulationSession,
        "category": "system",
        "primary_key": "id",
        "readable_fields": ["id", "admin_user_id", "target_user_id", "is_active", "expires_at", "created_at", "ended_at", "ended_reason", "last_used_at", "ip_address", "user_agent"],
        "masked_fields": ["token_hash"],
        "editable_fields": ["is_active", "ended_at", "ended_reason"],
        "immutable_fields": ["id", "admin_user_id", "target_user_id", "token_hash", "created_at"],
        "delete_policy": "disallowed",
        "relationships": {
            "admin_user": {"table": "users", "foreign_key": "id", "local_key": "admin_user_id"},
            "target_user": {"table": "users", "foreign_key": "id", "local_key": "target_user_id"}
        },
    },
    "feature_flags": {
        "model": models.FeatureFlag,
        "category": "system",
        "primary_key": "id",
        "readable_fields": ["id", "key", "name", "description", "is_enabled", "target_roles", "created_at", "updated_at"],
        "masked_fields": [],
        "editable_fields": ["name", "description", "is_enabled", "target_roles"],
        "immutable_fields": ["id", "key", "created_at", "updated_at"],
        "delete_policy": "typed_confirmation_required",
        "relationships": {},
    },
    "platform_announcements": {
        "model": models.PlatformAnnouncement,
        "category": "system",
        "primary_key": "id",
        "readable_fields": ["id", "title", "message", "type", "target_audience", "is_active", "starts_at", "expires_at", "created_at", "updated_at"],
        "masked_fields": [],
        "editable_fields": ["title", "message", "type", "target_audience", "is_active", "starts_at", "expires_at"],
        "immutable_fields": ["id", "created_at", "updated_at"],
        "delete_policy": "allowed",
        "relationships": {},
    },
    "user_feedback": {
        "model": models.UserFeedback,
        "category": "system",
        "primary_key": "id",
        "readable_fields": ["id", "user_id", "feedback_type", "module", "message", "status", "created_at", "resolved_at"],
        "masked_fields": ["metadata_json"],
        "editable_fields": ["status", "resolved_at"],
        "immutable_fields": ["id", "user_id", "feedback_type", "module", "created_at"],
        "delete_policy": "allowed",
        "relationships": {
            "user": {"table": "users", "foreign_key": "id", "local_key": "user_id"}
        },
    },
}


def serialize_record(record: Any, table_name: str) -> Dict[str, Any]:
    """
    Safely serializes a database model instance according to the TABLE_REGISTRY.
    Omit masked fields completely and provide _protected_fields metadata.
    """
    config = TABLE_REGISTRY.get(table_name)
    if not config:
        return {}

    result = {}
    for field in config["readable_fields"]:
        val = getattr(record, field, None)
        if isinstance(val, (datetime, date)):
            result[field] = val.isoformat()
        elif isinstance(val, UUID):
            result[field] = str(val)
        else:
            result[field] = val

    if config.get("masked_fields"):
        result["_protected_fields"] = config["masked_fields"]

    return result


def get_table_registry_entry(table_name: str) -> Optional[Dict[str, Any]]:
    """
    Returns the registry configuration for a table or None if not registered.
    """
    return TABLE_REGISTRY.get(table_name)

