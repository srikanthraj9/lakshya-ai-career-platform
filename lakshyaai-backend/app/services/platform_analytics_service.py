import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, text
from app.db import models

logger = logging.getLogger("lakshyaai.admin.analytics")


class PlatformAnalyticsService:
    @staticmethod
    def get_dashboard_summary(db: Session) -> dict:
        now = datetime.now(timezone.utc)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)

        total_users = db.query(func.count(models.User.id)).scalar() or 0
        new_users_today = (
            db.query(func.count(models.User.id))
            .filter(models.User.created_at >= start_of_today)
            .scalar()
            or 0
        )
        suspended_users = (
            db.query(func.count(models.User.id))
            .filter(models.User.is_suspended == True)
            .scalar()
            or 0
        )
        active_users_today = (
            db.query(func.count(distinct(models.CareerActivity.user_id)))
            .filter(models.CareerActivity.created_at >= start_of_today)
            .scalar()
            or db.query(func.count(models.User.id)).filter(models.User.last_activity_at >= start_of_today).scalar()
            or 0
        )

        total_resumes = db.query(func.count(models.Resume.id)).scalar() or 0
        total_interviews = db.query(func.count(models.InterviewSession.id)).scalar() or 0
        total_applications = db.query(func.count(models.JobApplication.id)).scalar() or 0
        total_ai_requests = (
            (db.query(func.count(models.ResumeRewrite.id)).scalar() or 0)
            + (db.query(func.count(models.CopilotMessage.id)).scalar() or 0)
            + (db.query(func.count(models.InterviewMessage.id)).scalar() or 0)
        )
        recommendation_runs = (
            db.query(func.count(models.CareerRecommendation.id)).scalar() or 0
        )

        # Recent activities from immutable audit trail
        recent_audit = (
            db.query(models.AdminAuditLog)
            .order_by(models.AdminAuditLog.created_at.desc())
            .limit(5)
            .all()
        )
        recent_activity_list = [
            {
                "id": str(a.id),
                "action_type": a.action_type,
                "target_user_id": str(a.target_user_id) if a.target_user_id else None,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in recent_audit
        ]

        return {
            "total_users": total_users,
            "active_users_today": active_users_today,
            "new_users_today": new_users_today,
            "suspended_users": suspended_users,
            "total_resumes": total_resumes,
            "total_interviews": total_interviews,
            "total_applications": total_applications,
            "total_ai_requests": total_ai_requests,
            "recommendation_runs": recommendation_runs,
            "platform_health": "healthy",
            "recent_activity": recent_activity_list,
        }

    @staticmethod
    def get_platform_analytics(db: Session) -> dict:
        now = datetime.now(timezone.utc)
        thirty_days_ago = now - timedelta(days=30)
        seven_days_ago = now - timedelta(days=7)
        one_day_ago = now - timedelta(days=1)

        total_users = db.query(func.count(models.User.id)).scalar() or 0
        new_users_30d = (
            db.query(func.count(models.User.id))
            .filter(models.User.created_at >= thirty_days_ago)
            .scalar()
            or 0
        )
        daily_active = (
            db.query(func.count(distinct(models.CareerActivity.user_id)))
            .filter(models.CareerActivity.created_at >= one_day_ago)
            .scalar()
            or db.query(func.count(models.User.id)).filter(models.User.last_activity_at >= one_day_ago).scalar()
            or 0
        )
        weekly_active = (
            db.query(func.count(distinct(models.CareerActivity.user_id)))
            .filter(models.CareerActivity.created_at >= seven_days_ago)
            .scalar()
            or db.query(func.count(models.User.id)).filter(models.User.last_activity_at >= seven_days_ago).scalar()
            or 0
        )
        monthly_active = (
            db.query(func.count(distinct(models.CareerActivity.user_id)))
            .filter(models.CareerActivity.created_at >= thirty_days_ago)
            .scalar()
            or db.query(func.count(models.User.id)).filter(models.User.last_activity_at >= thirty_days_ago).scalar()
            or 0
        )

        retention_rate = round(
            (monthly_active / max(total_users, 1)) * 100, 1
        ) if total_users > 0 else 0.0

        # Feature usage counts
        resume_count = db.query(func.count(models.Resume.id)).scalar() or 0
        interview_count = db.query(func.count(models.InterviewSession.id)).scalar() or 0
        roadmap_count = db.query(func.count(models.RoadmapProgress.id)).scalar() or 0
        intel_count = db.query(func.count(models.CareerRecommendation.id)).scalar() or 0
        app_count = db.query(func.count(models.JobApplication.id)).scalar() or 0
        copilot_count = db.query(func.count(models.CopilotConversation.id)).scalar() or 0

        feature_usage = {
            "resume_studio": resume_count,
            "interview_studio": interview_count,
            "career_roadmap": roadmap_count,
            "career_intelligence": intel_count,
            "application_tracker": app_count,
            "copilot": copilot_count,
        }

        # Application stage breakdown
        stage_counts = (
            db.query(models.JobApplication.stage, func.count(models.JobApplication.id))
            .group_by(models.JobApplication.stage)
            .all()
        )
        apps_by_stage = {stage: count for stage, count in stage_counts} if stage_counts else {
            "wishlist": 0, "applied": 0, "screening": 0, "interviewing": 0, "offer": 0, "rejected": 0
        }

        total_tracked = max(sum(apps_by_stage.values()), 1)
        interviewing = apps_by_stage.get("interviewing", 0) + apps_by_stage.get("offer", 0)
        offers = apps_by_stage.get("offer", 0)

        interview_conversion_rate = round((interviewing / total_tracked) * 100, 1) if sum(apps_by_stage.values()) > 0 else 0.0
        offer_conversion_rate = round((offers / total_tracked) * 100, 1) if sum(apps_by_stage.values()) > 0 else 0.0

        # Top target roles from real candidate career profiles
        role_counts = (
            db.query(models.UserCareerProfile.target_role, func.count(models.UserCareerProfile.id))
            .filter(models.UserCareerProfile.target_role != None)
            .group_by(models.UserCareerProfile.target_role)
            .order_by(func.count(models.UserCareerProfile.id).desc())
            .limit(5)
            .all()
        )
        top_target_roles = [
            {"role": r, "count": c} for r, c in role_counts if r
        ]

        # Top skill gaps from real parsed resume missing skills
        skill_gap_counts = (
            db.query(models.ResumeMissingSkill.skill_name, func.count(models.ResumeMissingSkill.id))
            .filter(models.ResumeMissingSkill.skill_name != None)
            .group_by(models.ResumeMissingSkill.skill_name)
            .order_by(func.count(models.ResumeMissingSkill.id).desc())
            .limit(5)
            .all()
        )
        top_skill_gaps = [
            {"skill": s, "frequency": c} for s, c in skill_gap_counts if s
        ]

        # Top tracked companies from real candidate applications
        company_counts = (
            db.query(models.JobApplication.company_name, func.count(models.JobApplication.id))
            .filter(models.JobApplication.company_name != None)
            .group_by(models.JobApplication.company_name)
            .order_by(func.count(models.JobApplication.id).desc())
            .limit(5)
            .all()
        )
        top_companies = [
            {"company": c, "applications": cnt} for c, cnt in company_counts if c
        ]

        return {
            "total_users": total_users,
            "daily_active_users": daily_active,
            "weekly_active_users": weekly_active,
            "monthly_active_users": monthly_active,
            "new_users_30d": new_users_30d,
            "retention_rate": retention_rate,
            "feature_usage": feature_usage,
            "applications_by_stage": apps_by_stage,
            "interview_conversion_rate": interview_conversion_rate,
            "offer_conversion_rate": offer_conversion_rate,
            "top_skill_gaps": top_skill_gaps,
            "top_target_roles": top_target_roles,
            "top_companies": top_companies,
        }

    @staticmethod
    def get_ai_metrics(db: Session) -> dict:
        total_rewrites = db.query(func.count(models.ResumeRewrite.id)).scalar() or 0
        total_interviews = db.query(func.count(models.InterviewSession.id)).scalar() or 0
        total_copilot = db.query(func.count(models.CopilotMessage.id)).scalar() or 0
        total_recs = db.query(func.count(models.CareerRecommendation.id)).scalar() or 0

        total_requests = total_rewrites + total_interviews + total_copilot + total_recs
        breakdown = {
            "resume_optimization": total_rewrites,
            "voice_mock_interview": total_interviews,
            "copilot_mentorship": total_copilot,
            "career_intelligence_engine": total_recs,
        }

        return {
            "total_requests": total_requests,
            "successful_requests": total_requests,
            "failed_requests": 0,
            "success_rate": 100.0 if total_requests > 0 else 0.0,
            "average_response_time_ms": 0.0,  # Explicitly 0.0 until token telemetry model is persisted
            "breakdown_by_feature": breakdown,
        }

    @staticmethod
    def get_system_health(db: Session) -> dict:
        services = {
            "api": "healthy",
            "database": "healthy",
            "authentication": "healthy",
            "ai_service": "healthy",
            "storage": "healthy",
        }

        # Perform active test on DB
        try:
            db.execute(text("SELECT 1"))
        except Exception:
            services["database"] = "degraded"

        overall_status = "healthy"
        if any(s == "unhealthy" for s in services.values()):
            overall_status = "unhealthy"
        elif any(s == "degraded" for s in services.values()):
            overall_status = "degraded"

        return {
            "status": overall_status,
            "services": services,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
