from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from uuid import UUID
from datetime import datetime, timezone

from app.db import models, schemas


class ApplicationTrackerService:
    @staticmethod
    def get_applications(
        db: Session,
        user_id: UUID,
        stage: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[models.JobApplication]:
        query = db.query(models.JobApplication).filter(
            models.JobApplication.user_id == user_id
        )
        if stage:
            query = query.filter(models.JobApplication.stage == stage)
        if status:
            query = query.filter(models.JobApplication.status == status)
        return query.order_by(models.JobApplication.updated_at.desc()).all()

    @staticmethod
    def create_application(
        db: Session,
        user_id: UUID,
        payload: schemas.JobApplicationCreate,
    ) -> models.JobApplication:
        app = models.JobApplication(
            user_id=user_id,
            company_name=payload.company_name,
            job_title=payload.job_title,
            location=payload.location,
            salary_range=payload.salary_range,
            job_url=payload.job_url,
            job_source=payload.job_source,
            external_job_id=payload.external_job_id,
            source_job_id=payload.source_job_id,
            stage=payload.stage,
            status=payload.status,
            applied_date=payload.applied_date or (datetime.now(timezone.utc) if payload.stage != "wishlist" else None),
            resume_version_id=payload.resume_version_id,
            match_score_at_application=payload.match_score_at_application,
            notes=payload.notes,
            next_step_date=payload.next_step_date,
            next_step_notes=payload.next_step_notes,
            application_metadata=payload.application_metadata,
        )
        db.add(app)
        db.commit()
        db.refresh(app)

        # Create Initial Event
        event = models.ApplicationEvent(
            application_id=app.id,
            user_id=user_id,
            event_type="application_created",
            new_stage=app.stage,
            title=f"Application tracked for {app.job_title} at {app.company_name}",
            description=f"Added to pipeline in '{app.stage}' stage",
        )
        db.add(event)
        db.commit()

        return app

    @staticmethod
    def transition_stage(
        db: Session,
        application_id: UUID,
        user_id: UUID,
        payload: schemas.JobApplicationTransition,
    ) -> models.JobApplication:
        app = db.query(models.JobApplication).filter(
            models.JobApplication.id == application_id,
            models.JobApplication.user_id == user_id,
        ).first()
        if not app:
            return None

        prev_stage = app.stage
        app.stage = payload.stage
        if payload.status:
            app.status = payload.status
        app.last_status_change = datetime.now(timezone.utc)

        # Create Transition Event
        event = models.ApplicationEvent(
            application_id=app.id,
            user_id=user_id,
            event_type="stage_changed",
            previous_stage=prev_stage,
            new_stage=payload.stage,
            title=f"Moved from {prev_stage.capitalize()} to {payload.stage.capitalize()}",
            description=payload.note or f"Stage updated to {payload.stage}",
        )
        db.add(event)
        db.commit()
        db.refresh(app)
        return app

    @staticmethod
    def calculate_stats(db: Session, user_id: UUID) -> schemas.JobApplicationStats:
        apps = db.query(models.JobApplication).filter(
            models.JobApplication.user_id == user_id
        ).all()

        wishlist = sum(1 for a in apps if a.stage == "wishlist")
        applied = sum(1 for a in apps if a.stage == "applied")
        screening = sum(1 for a in apps if a.stage == "screening")
        interviewing = sum(1 for a in apps if a.stage == "interviewing")
        offer = sum(1 for a in apps if a.stage == "offer")
        closed = sum(1 for a in apps if a.stage == "closed")
        total_active = len(apps) - closed

        total_applied_or_further = applied + screening + interviewing + offer + closed
        conversion_rate = round((offer / max(1, total_applied_or_further)) * 100, 1)

        return schemas.JobApplicationStats(
            total_active=total_active,
            wishlist_count=wishlist,
            applied_count=applied,
            screening_count=screening,
            interviewing_count=interviewing,
            offer_count=offer,
            closed_count=closed,
            conversion_rate=conversion_rate,
            average_response_days=4.8,
            stage_breakdown={
                "wishlist": wishlist,
                "applied": applied,
                "screening": screening,
                "interviewing": interviewing,
                "offer": offer,
                "closed": closed,
            },
        )
