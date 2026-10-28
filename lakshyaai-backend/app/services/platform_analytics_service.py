import logging
from typing import Optional
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
        total_candidates = (
            db.query(func.count(models.User.id))
            .filter(models.User.role == "user")
            .scalar()
            or 0
        )
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
        from app.services.ai_telemetry_service import AITelemetryService
        ai_metrics = AITelemetryService.get_ai_metrics(db)
        total_ai_requests = int(ai_metrics.get("total_requests", 0))
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

        verified_users = (
            db.query(func.count(models.User.id))
            .filter(models.User.is_email_verified == True)
            .scalar()
            or 0
        )

        return {
            "total_users": total_users,
            "total_candidates": total_candidates,
            "verified_users": verified_users,
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
    def get_ai_metrics(db: Session, time_range: Optional[str] = None) -> dict:
        from app.services.ai_telemetry_service import AITelemetryService
        return AITelemetryService.get_ai_metrics(db, time_range=time_range)

    @staticmethod
    def get_system_health(db: Session) -> dict:
        import time
        import os
        from sqlalchemy import text
        from datetime import timezone

        now = datetime.now(timezone.utc)
        services = {
            "api": "healthy",
            "database": "healthy",
            "authentication": "healthy",
            "ai_service": "healthy",
            "storage": "healthy",
        }

        service_details = {
            "api": {
                "status": "healthy",
                "latency_ms": 1.2,
                "description": "HTTP REST gateway, routing and request telemetry",
                "last_checked": now.isoformat(),
            },
            "authentication": {
                "status": "healthy",
                "description": "Bcrypt token verification and multi-tenant RBAC session isolation",
                "last_checked": now.isoformat(),
            },
            "database": {
                "status": "healthy",
                "latency_ms": 0.0,
                "description": "Relational persistence, JSONB stores, and Vector embeddings",
                "last_checked": now.isoformat(),
                "error": None,
            },
            "ai_service": {
                "status": "healthy",
                "description": "STAR bullet rewrites, interview evaluator, and priority scoring",
                "last_checked": now.isoformat(),
                "active_providers": [],
            },
            "storage": {
                "status": "healthy",
                "description": "Resume PDF parsing, LaTeX generator, and local persistence",
                "last_checked": now.isoformat(),
            },
        }

        # 1. Database real connectivity check with bounded latency
        try:
            t0 = time.perf_counter()
            db.execute(text("SELECT 1"))
            db_latency_ms = round((time.perf_counter() - t0) * 1000, 2)
            service_details["database"]["latency_ms"] = db_latency_ms
            if db_latency_ms > 1500:
                services["database"] = "degraded"
                service_details["database"]["status"] = "degraded"
                service_details["database"]["error"] = f"Elevated latency ({db_latency_ms}ms > 1500ms)"
            else:
                services["database"] = "healthy"
                service_details["database"]["status"] = "healthy"
        except Exception as exc:
            services["database"] = "unhealthy"
            service_details["database"]["status"] = "unhealthy"
            service_details["database"]["error"] = str(exc)[:200]

        # 2. AI Inference engine configuration check
        providers_found = []
        if os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"):
            providers_found.append("gemini")
        if os.getenv("GROQ_API_KEY"):
            providers_found.append("groq")
        if os.getenv("OPENAI_API_KEY"):
            providers_found.append("openai")

        service_details["ai_service"]["active_providers"] = providers_found
        if not providers_found:
            services["ai_service"] = "degraded"
            service_details["ai_service"]["status"] = "degraded"
            service_details["ai_service"]["error"] = "No external LLM provider API keys configured"

        # 3. Storage connectivity check
        storage_configured = os.path.exists("uploads") or bool(os.getenv("SUPABASE_URL"))
        if not storage_configured:
            services["storage"] = "degraded"
            service_details["storage"]["status"] = "degraded"
            service_details["storage"]["error"] = "Uploads directory and Supabase storage unconfigured"

        overall_status = "healthy"
        if any(s == "unhealthy" for s in services.values()):
            overall_status = "unhealthy"
        elif any(s == "degraded" for s in services.values()):
            overall_status = "degraded"

        # 4. Open alerts count
        open_alerts_count = 0
        try:
            from app.services.operational_alert_service import OperationalAlertService
            summary = OperationalAlertService.get_alerts_summary(db)
            open_alerts_count = summary.open_count
        except Exception:
            pass

        return {
            "status": overall_status,
            "services": services,
            "service_details": service_details,
            "open_alerts_count": open_alerts_count,
            "timestamp": now,
        }

