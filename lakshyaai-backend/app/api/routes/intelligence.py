from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.db import models, schemas
from app.services.career_intelligence_service import CareerIntelligenceService

router = APIRouter(prefix="/intelligence", tags=["intelligence"])


@router.get("", response_model=schemas.CareerIntelligenceResponse)
def get_career_intelligence(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CareerIntelligenceService.get_intelligence(db, current_user)


@router.post("/refresh", response_model=schemas.CareerIntelligenceResponse)
def refresh_career_intelligence(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CareerIntelligenceService.get_intelligence(db, current_user)


# =========================
# RECOMMENDATIONS
# =========================

@router.get("/recommendations", response_model=List[schemas.CareerRecommendationResponse])
def get_recommendations(
    status: Optional[str] = "active",
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    intel = CareerIntelligenceService.get_intelligence(db, current_user)
    if status:
        return [r for r in intel.recommendations if r.status == status]
    return intel.recommendations


@router.patch("/recommendations/{recommendation_id}", response_model=schemas.CareerRecommendationResponse)
def update_recommendation_status(
    recommendation_id: UUID,
    payload: schemas.CareerRecommendationUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rec = db.query(models.CareerRecommendation).filter(
        models.CareerRecommendation.id == recommendation_id,
        models.CareerRecommendation.user_id == current_user.id,
    ).first()

    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    rec.status = payload.status
    if payload.status == "completed":
        rec.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(rec)

    meta = rec.recommendation_metadata or {}
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

    return schemas.CareerRecommendationResponse(
        id=rec.id,
        client_event_id=rec.client_event_id,
        recommendation_type=rec.recommendation_type,
        title=rec.title,
        description=rec.description,
        source_module=rec.source_module,
        target_module=rec.target_module,
        priority=rec.priority,
        impact_score=rec.impact_score,
        confidence_score=rec.confidence_score,
        urgency_score=rec.urgency_score,
        status=rec.status,
        action_url=rec.action_url,
        action_label=rec.action_label,
        reason=reason_schema,
        recommendation_metadata=meta.get("metadata", {}),
        created_at=rec.created_at,
        updated_at=rec.updated_at,
        completed_at=rec.completed_at,
    )


# =========================
# CAREER GOALS
# =========================

@router.get("/goals", response_model=List[schemas.CareerGoalResponse])
def get_career_goals(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goals = db.query(models.CareerGoal).filter(
        models.CareerGoal.user_id == current_user.id
    ).order_by(models.CareerGoal.created_at.desc()).all()
    return goals


@router.post("/goals", response_model=schemas.CareerGoalResponse)
def create_career_goal(
    payload: schemas.CareerGoalCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.is_active:
        # Deactivate previous active goals
        db.query(models.CareerGoal).filter(
            models.CareerGoal.user_id == current_user.id,
            models.CareerGoal.is_active == True,
        ).update({"is_active": False}, synchronize_session=False)

    goal = models.CareerGoal(
        user_id=current_user.id,
        target_role=payload.target_role,
        target_company=payload.target_company,
        target_salary=payload.target_salary,
        target_date=payload.target_date,
        target_readiness_score=payload.target_readiness_score,
        priority=payload.priority,
        is_active=payload.is_active,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.patch("/goals/{goal_id}", response_model=schemas.CareerGoalResponse)
def update_career_goal(
    goal_id: UUID,
    payload: schemas.CareerGoalUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = db.query(models.CareerGoal).filter(
        models.CareerGoal.id == goal_id,
        models.CareerGoal.user_id == current_user.id,
    ).first()

    if not goal:
        raise HTTPException(status_code=404, detail="Career goal not found")

    if payload.is_active:
        db.query(models.CareerGoal).filter(
            models.CareerGoal.user_id == current_user.id,
            models.CareerGoal.id != goal_id,
            models.CareerGoal.is_active == True,
        ).update({"is_active": False}, synchronize_session=False)

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(goal, field, value)

    db.commit()
    db.refresh(goal)
    return goal


# =========================
# AUTOMATION RULES
# =========================

@router.get("/automation-rules", response_model=List[schemas.CareerAutomationRuleResponse])
def get_automation_rules(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rules = db.query(models.CareerAutomationRule).filter(
        models.CareerAutomationRule.user_id == current_user.id
    ).all()
    return rules


@router.post("/automation-rules", response_model=schemas.CareerAutomationRuleResponse)
def create_automation_rule(
    payload: schemas.CareerAutomationRuleCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rule = models.CareerAutomationRule(
        user_id=current_user.id,
        trigger_type=payload.trigger_type,
        condition_config=payload.condition_config,
        action_type=payload.action_type,
        action_config=payload.action_config,
        is_enabled=payload.is_enabled,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.patch("/automation-rules/{rule_id}", response_model=schemas.CareerAutomationRuleResponse)
def update_automation_rule(
    rule_id: UUID,
    payload: schemas.CareerAutomationRuleUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rule = db.query(models.CareerAutomationRule).filter(
        models.CareerAutomationRule.id == rule_id,
        models.CareerAutomationRule.user_id == current_user.id,
    ).first()

    if not rule:
        raise HTTPException(status_code=404, detail="Automation rule not found")

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(rule, field, value)

    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/automation-rules/{rule_id}")
def delete_automation_rule(
    rule_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deleted = db.query(models.CareerAutomationRule).filter(
        models.CareerAutomationRule.id == rule_id,
        models.CareerAutomationRule.user_id == current_user.id,
    ).delete(synchronize_session=False)

    if not deleted:
        raise HTTPException(status_code=404, detail="Automation rule not found")

    db.commit()
    return {"message": "Automation rule deleted successfully"}
