from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
import uuid
from datetime import datetime, timezone

from app.db import models, schemas
from app.services.recommendation_engine import RecommendationEngine


class CareerIntelligenceService:
    @staticmethod
    def get_intelligence(db: Session, user: models.User) -> schemas.CareerIntelligenceResponse:
        # 1. Fetch latest Resume
        resume = db.query(models.Resume).filter(
            models.Resume.user_id == user.id
        ).order_by(models.Resume.created_at.desc()).first()

        ats_score = resume.ats_score if resume and resume.ats_score is not None else 78.0
        resume_skills = resume.skills if resume and resume.skills else ["React", "TypeScript", "Node.js", "Python", "FastAPI", "PostgreSQL", "Tailwind CSS", "Git"]

        # 2. Fetch Active Goal
        active_goal = db.query(models.CareerGoal).filter(
            models.CareerGoal.user_id == user.id,
            models.CareerGoal.is_active == True,
        ).first()

        target_role_title = active_goal.target_role if active_goal else "Full Stack Developer"

        # 3. Fetch Role Alignment & Missing Skills
        role_record = db.query(models.Role).filter(
            models.Role.title.ilike(f"%{target_role_title}%")
        ).first()

        core_skills = role_record.core_skills if role_record and role_record.core_skills else ["React", "Node.js", "TypeScript", "FastAPI", "PostgreSQL", "Docker", "AWS", "Redis"]
        if not isinstance(core_skills, list):
            core_skills = ["React", "Node.js", "TypeScript", "FastAPI", "PostgreSQL", "Docker", "AWS", "Redis"]

        missing_skills = [s for s in core_skills if s not in resume_skills]
        if not missing_skills:
            missing_skills = ["Docker", "Redis", "Kubernetes"]

        # 4. Fetch Roadmap Progress
        roadmap_record = db.query(models.RoadmapProgress).filter(
            models.RoadmapProgress.user_id == user.id
        ).order_by(models.RoadmapProgress.updated_at.desc()).first()

        completed_steps = roadmap_record.completed_steps if roadmap_record else [0, 1]
        total_steps = 5
        roadmap_pct = round((len(completed_steps) / total_steps) * 100, 1)

        # 5. Fetch Interview Performance
        latest_interview = db.query(models.InterviewSession).filter(
            models.InterviewSession.user_id == user.id,
            models.InterviewSession.status == "completed",
        ).order_by(models.InterviewSession.created_at.desc()).first()

        interview_score = latest_interview.overall_score if latest_interview and latest_interview.overall_score is not None else 75.0

        # 6. Calculate Weighted Readiness
        # Resume Health 30%, Role Match 30%, Interview 20%, Roadmap 10%, Opportunity 10%
        role_match_score = max(50.0, round(((len(core_skills) - len(missing_skills)) / max(1, len(core_skills))) * 100, 1))
        job_match_score = 94.0

        weights = {"resume": 0.30, "role": 0.30, "interview": 0.20, "roadmap": 0.10, "job": 0.10}
        readiness_score = round(
            (ats_score * weights["resume"]) +
            (role_match_score * weights["role"]) +
            (interview_score * weights["interview"]) +
            (roadmap_pct * weights["roadmap"]) +
            (job_match_score * weights["job"]),
            1
        )

        # 7. Evaluate Recommendations via RecommendationEngine
        resume_payload = {"ats_score": ats_score, "skills": resume_skills}
        role_payload = {"missing_skills": missing_skills}
        roadmap_payload = {"completed_steps": completed_steps, "total_steps": total_steps}
        interview_payload = {"latest_score": interview_score}
        job_payload = [{"title": "Senior Full Stack Engineer", "company": "TechCorp", "match_score": 94}]
        goal_payload = {"target_role": target_role_title}

        raw_recs = RecommendationEngine.evaluate(
            user_id=str(user.id),
            target_role=target_role_title,
            resume_data=resume_payload,
            role_match_data=role_payload,
            roadmap_data=roadmap_payload,
            interview_data=interview_payload,
            job_matches_data=job_payload,
            active_goal=goal_payload,
        )

        # 8. Persist / Upsert Recommendations to Database
        persisted_recs: List[models.CareerRecommendation] = []
        for r in raw_recs:
            rec_db = db.query(models.CareerRecommendation).filter(
                models.CareerRecommendation.user_id == user.id,
                models.CareerRecommendation.client_event_id == r["client_event_id"],
            ).first()

            if rec_db:
                # Update existing recommendation
                rec_db.title = r["title"]
                rec_db.description = r["description"]
                rec_db.priority = r["priority"]
                rec_db.impact_score = r["impact_score"]
                rec_db.confidence_score = r["confidence_score"]
                rec_db.urgency_score = r["urgency_score"]
                rec_db.action_url = r["action_url"]
                rec_db.action_label = r["action_label"]
                rec_db.recommendation_metadata = {
                    "reason": r.get("reason"),
                    "metadata": r.get("metadata"),
                }
            else:
                rec_db = models.CareerRecommendation(
                    user_id=user.id,
                    client_event_id=r["client_event_id"],
                    recommendation_type=r["recommendation_type"],
                    title=r["title"],
                    description=r["description"],
                    source_module=r["source_module"],
                    target_module=r["target_module"],
                    priority=r["priority"],
                    impact_score=r["impact_score"],
                    confidence_score=r["confidence_score"],
                    urgency_score=r["urgency_score"],
                    status="active",
                    action_url=r["action_url"],
                    action_label=r["action_label"],
                    recommendation_metadata={
                        "reason": r.get("reason"),
                        "metadata": r.get("metadata"),
                    },
                )
                db.add(rec_db)
            persisted_recs.append(rec_db)

        db.commit()

        # Refresh all persisted recs
        for rec in persisted_recs:
            db.refresh(rec)

        # 9. Format Critical Skill Gaps
        critical_gaps = [
            schemas.CriticalSkillGapItem(
                skill=s,
                frequency_in_jobs=6 if i == 0 else 4 if i == 1 else 2,
                is_role_requirement=True,
                priority="critical" if i == 0 else "high" if i == 1 else "medium",
                roadmap_status="planned" if i == 0 else "missing",
            )
            for i, s in enumerate(missing_skills[:4])
        ]

        # 10. Format Output Response
        rec_responses: List[schemas.CareerRecommendationResponse] = []
        for r in persisted_recs:
            meta = r.recommendation_metadata or {}
            reason_raw = meta.get("reason")
            reason_schema = None
            if reason_raw:
                reason_schema = schemas.RecommendationReason(
                    signal=reason_raw.get("signal", "signal"),
                    impact=reason_raw.get("impact", 0.8),
                    confidence=reason_raw.get("confidence", 0.9),
                    urgency=reason_raw.get("urgency", 0.7),
                    explanation=reason_raw.get("explanation", ""),
                    factors=reason_raw.get("factors", []),
                )

            rec_responses.append(schemas.CareerRecommendationResponse(
                id=r.id,
                client_event_id=r.client_event_id,
                recommendation_type=r.recommendation_type,
                title=r.title,
                description=r.description,
                source_module=r.source_module,
                target_module=r.target_module,
                priority=r.priority,
                impact_score=r.impact_score,
                confidence_score=r.confidence_score,
                urgency_score=r.urgency_score,
                status=r.status,
                action_url=r.action_url,
                action_label=r.action_label,
                reason=reason_schema,
                recommendation_metadata=meta.get("metadata", {}),
                created_at=r.created_at,
                updated_at=r.updated_at,
                completed_at=r.completed_at,
            ))

        active_recs = [r for r in rec_responses if r.status == "active"]
        top_priority = active_recs[0] if active_recs else None

        active_goal_response = None
        if active_goal:
            active_goal_response = schemas.CareerGoalResponse(
                id=active_goal.id,
                target_role=active_goal.target_role,
                target_company=active_goal.target_company,
                target_salary=active_goal.target_salary,
                target_date=active_goal.target_date,
                target_readiness_score=active_goal.target_readiness_score,
                priority=active_goal.priority,
                is_active=active_goal.is_active,
                created_at=active_goal.created_at,
                updated_at=active_goal.updated_at,
            )

        return schemas.CareerIntelligenceResponse(
            readiness_score=readiness_score,
            career_momentum=schemas.CareerMomentum(
                score=readiness_score,
                trend="improving",
                delta_text="+12% velocity this month",
                signals={
                    "resume": {"score": ats_score, "status": "Strong"},
                    "role_match": {"score": role_match_score, "status": "High Alignment"},
                    "interview": {"score": interview_score, "status": "Improving"},
                    "roadmap": {"score": roadmap_pct, "status": "In Progress"},
                },
            ),
            active_goal=active_goal_response,
            top_priority=top_priority,
            recommendations=active_recs,
            critical_gaps=critical_gaps,
            strengths=resume_skills[:6],
            next_milestone={
                "title": f"Master {missing_skills[0] if missing_skills else 'Cloud Architecture'}",
                "description": f"Next critical milestone for {target_role_title}",
                "module": "roadmap",
            },
            signals={
                "resume_score": ats_score,
                "role_match_score": role_match_score,
                "interview_score": interview_score,
                "roadmap_progress": roadmap_pct,
                "job_match_score": job_match_score,
            },
        )
