from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from uuid import UUID
from datetime import datetime, timezone
import hashlib

from fastapi import HTTPException
from app.db import models, schemas


class OutcomeLearningService:
    @staticmethod
    def create_debrief(
        db: Session,
        user_id: UUID,
        application_id: UUID,
        payload: schemas.InterviewDebriefCreate,
    ) -> models.InterviewDebrief:
        app = db.query(models.JobApplication).filter(
            models.JobApplication.id == application_id,
            models.JobApplication.user_id == user_id,
        ).first()
        if not app:
            raise HTTPException(status_code=404, detail="Application not found")

        debrief = models.InterviewDebrief(
            user_id=user_id,
            application_id=application_id,
            company_name=payload.company_name,
            round_type=payload.round_type,
            difficulty_rating=payload.difficulty_rating,
            technical_score=payload.technical_score,
            communication_score=payload.communication_score,
            problem_solving_score=payload.problem_solving_score,
            system_design_score=payload.system_design_score,
            confidence_score=payload.confidence_score,
            questions_asked=payload.questions_asked,
            candidate_reflection=payload.candidate_reflection,
            identified_weaknesses=payload.identified_weaknesses,
            outcome=payload.outcome,
        )
        db.add(debrief)

        # Add an application event
        event = models.ApplicationEvent(
            application_id=application_id,
            user_id=user_id,
            event_type="debrief_created",
            title=f"Interview debrief logged for {payload.round_type}",
            description=f"Outcome: {payload.outcome.capitalize()} • Difficulty: {payload.difficulty_rating}/5",
            event_metadata={
                "weaknesses": payload.identified_weaknesses,
                "technical_score": payload.technical_score,
            },
        )
        db.add(event)
        db.commit()
        db.refresh(debrief)

        # Trigger Pattern Analysis
        OutcomeLearningService.analyze_and_generate_insights(db, user_id)

        return debrief

    @staticmethod
    def analyze_and_generate_insights(db: Session, user_id: UUID) -> List[schemas.OutcomeLearningInsightResponse]:
        debriefs = db.query(models.InterviewDebrief).filter(
            models.InterviewDebrief.user_id == user_id
        ).all()

        insights: List[schemas.OutcomeLearningInsightResponse] = []

        # 1. Weakness Pattern Insight
        all_weaknesses = []
        for d in debriefs:
            if d.identified_weaknesses:
                all_weaknesses.extend(d.identified_weaknesses)

        if all_weaknesses:
            from collections import Counter
            counts = Counter(all_weaknesses)
            top_weakness, freq = counts.most_common(1)[0]
            fp = hashlib.md5(f"weakness:{top_weakness}:{user_id}".encode("utf-8")).hexdigest()

            rec = db.query(models.OutcomeLearningInsight).filter(
                models.OutcomeLearningInsight.user_id == user_id,
                models.OutcomeLearningInsight.fingerprint == fp,
            ).first()

            desc = f"Identified as a recurring challenge across {freq} real-world interview rounds."
            if not rec:
                rec = models.OutcomeLearningInsight(
                    user_id=user_id,
                    insight_type="weakness_pattern",
                    title=f"Interview Pattern: {top_weakness} Needs Validation",
                    description=desc,
                    metric_value=float(freq),
                    source_count=len(debriefs),
                    confidence_score=88.0,
                    fingerprint=fp,
                )
                db.add(rec)
                db.commit()
                db.refresh(rec)

        # 2. Conversion Velocity Insight
        apps = db.query(models.JobApplication).filter(
            models.JobApplication.user_id == user_id
        ).all()

        interviewing_count = sum(1 for a in apps if a.stage in ["screening", "interviewing", "offer"])
        applied_count = sum(1 for a in apps if a.stage in ["applied", "screening", "interviewing", "offer", "closed"])

        if applied_count > 0:
            pass_rate = round((interviewing_count / applied_count) * 100, 1)
            fp_rate = hashlib.md5(f"pass_rate:{user_id}".encode("utf-8")).hexdigest()

            rec_rate = db.query(models.OutcomeLearningInsight).filter(
                models.OutcomeLearningInsight.user_id == user_id,
                models.OutcomeLearningInsight.fingerprint == fp_rate,
            ).first()

            if not rec_rate:
                rec_rate = models.OutcomeLearningInsight(
                    user_id=user_id,
                    insight_type="interview_pass_rate",
                    title="Screening Pass Rate Correlation",
                    description=f"{pass_rate}% of your applications advanced to technical screens.",
                    metric_value=pass_rate,
                    source_count=applied_count,
                    confidence_score=90.0,
                    fingerprint=fp_rate,
                )
                db.add(rec_rate)
                db.commit()
                db.refresh(rec_rate)

        all_insights = db.query(models.OutcomeLearningInsight).filter(
            models.OutcomeLearningInsight.user_id == user_id
        ).order_by(models.OutcomeLearningInsight.created_at.desc()).all()

        return [
            schemas.OutcomeLearningInsightResponse(
                id=i.id,
                insight_type=i.insight_type,
                title=i.title,
                description=i.description,
                metric_value=i.metric_value,
                data_points=i.data_points or {},
                source_count=i.source_count,
                confidence_score=i.confidence_score,
                fingerprint=i.fingerprint,
                created_at=i.created_at,
            )
            for i in all_insights
        ]
