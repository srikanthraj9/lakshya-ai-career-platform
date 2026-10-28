import json
import logging
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.exceptions import ExternalServiceException, ValidationException
from app.db import models
from app.db.database import get_db
from app.db.schemas import (
    CopilotChatRequest,
    CopilotConversationDetailResponse,
    CopilotConversationResponse,
    CopilotResponse,
)
import time
from app.services.copilot import CareerCopilotService
from app.services.ai_telemetry_service import AITelemetryService

logger = logging.getLogger("lakshyaai.api.copilot")
router = APIRouter(prefix="/copilot", tags=["Copilot"])


@router.get("/conversations", response_model=List[CopilotConversationResponse])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        conversations = (
            db.query(models.CopilotConversation)
            .filter(models.CopilotConversation.user_id == current_user.id)
            .order_by(models.CopilotConversation.updated_at.desc())
            .all()
        )
        return conversations
    except Exception as exc:
        logger.exception("Failed to list copilot conversations user_id=%s", current_user.id)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/conversations", response_model=CopilotConversationResponse)
def create_conversation(
    title: str = "Career Advice",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        conversation = models.CopilotConversation(
            user_id=current_user.id,
            title=title.strip() or "Career Advice",
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        return conversation
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to create copilot conversation user_id=%s", current_user.id)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/conversations/{conversation_id}", response_model=CopilotConversationDetailResponse)
def get_conversation(
    conversation_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    conversation = (
        db.query(models.CopilotConversation)
        .filter(
            models.CopilotConversation.id == conversation_id,
            models.CopilotConversation.user_id == current_user.id,
        )
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return conversation


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    conversation = (
        db.query(models.CopilotConversation)
        .filter(
            models.CopilotConversation.id == conversation_id,
            models.CopilotConversation.user_id == current_user.id,
        )
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    try:
        db.delete(conversation)
        db.commit()
        return {"message": "Conversation deleted successfully"}
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to delete conversation id=%s", conversation_id)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.patch("/conversations/{conversation_id}", response_model=CopilotConversationResponse)
def rename_conversation(
    conversation_id: UUID,
    title: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    conversation = (
        db.query(models.CopilotConversation)
        .filter(
            models.CopilotConversation.id == conversation_id,
            models.CopilotConversation.user_id == current_user.id,
        )
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    try:
        conversation.title = title.strip() or "Career Discussion"
        db.commit()
        db.refresh(conversation)
        return conversation
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to rename conversation id=%s", conversation_id)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/chat", response_model=CopilotResponse)
async def copilot_chat(
    request: CopilotChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    logger.info("Copilot chat message received user_id=%s turns=%s", current_user.id, len(request.messages))

    # Find or create conversation
    conversation = None
    if request.conversation_id:
        conversation = (
            db.query(models.CopilotConversation)
            .filter(
                models.CopilotConversation.id == request.conversation_id,
                models.CopilotConversation.user_id == current_user.id,
            )
            .first()
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

    if not conversation:
        # Generate initial title from first message
        first_user_msg = next((m.content for m in request.messages if m.role == "user"), "Career Advice")
        title = (first_user_msg[:40] + "...") if len(first_user_msg) > 40 else first_user_msg
        conversation = models.CopilotConversation(
            user_id=current_user.id,
            title=title or "Career Advice",
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # Get latest user message to persist
    latest_user_msg = next((m.content for m in reversed(request.messages) if m.role == "user"), "")
    if latest_user_msg:
        user_db_msg = models.CopilotMessage(
            conversation_id=conversation.id,
            role="user",
            content=latest_user_msg,
        )
        db.add(user_db_msg)
        db.commit()

    # Build candidate background context from active profile and request payload
    candidate_context: dict = dict(request.candidate_context or {})
    try:
        if not candidate_context.get("target_role"):
            active_goal = (
                db.query(models.CareerGoal)
                .filter(models.CareerGoal.user_id == current_user.id)
                .first()
            )
            if active_goal and active_goal.target_role:
                candidate_context["target_role"] = active_goal.target_role

        if not candidate_context.get("target_role"):
            career_profile = (
                db.query(models.UserCareerProfile)
                .filter(models.UserCareerProfile.user_id == current_user.id)
                .first()
            )
            if career_profile and career_profile.target_role:
                candidate_context["target_role"] = career_profile.target_role
                if career_profile.experience_level and not candidate_context.get("experience_level"):
                    candidate_context["experience_level"] = career_profile.experience_level

        latest_resume = (
            db.query(models.Resume)
            .filter(models.Resume.user_id == current_user.id)
            .order_by(models.Resume.created_at.desc())
            .first()
        )
        if latest_resume:
            if not candidate_context.get("target_role") and latest_resume.target_role:
                candidate_context["target_role"] = latest_resume.target_role
            if latest_resume.ats_score is not None and "ats_score" not in candidate_context:
                candidate_context["ats_score"] = int(round(latest_resume.ats_score))
            if latest_resume.career_verdict and "career_verdict" not in candidate_context:
                candidate_context["career_verdict"] = latest_resume.career_verdict
            if latest_resume.file_name and "active_resume_file" not in candidate_context:
                candidate_context["active_resume_file"] = latest_resume.file_name

            # Resume verified skills from relational table
            if not candidate_context.get("skills"):
                db_resume_skills = [
                    s.skill_name for s in (latest_resume.skills or [])
                    if getattr(s, "skill_name", None)
                ]
                if db_resume_skills:
                    candidate_context["skills"] = db_resume_skills
                elif latest_resume.detected_skills:
                    try:
                        candidate_context["skills"] = (
                            json.loads(latest_resume.detected_skills)
                            if isinstance(latest_resume.detected_skills, str)
                            else latest_resume.detected_skills
                        )
                    except Exception:
                        pass

            # Resume missing skills from relational table
            if not candidate_context.get("skill_gaps"):
                db_missing = [
                    ms.skill_name for ms in (latest_resume.missing_skills or [])
                    if getattr(ms, "skill_name", None)
                ]
                if db_missing:
                    candidate_context["skill_gaps"] = db_missing

        # Active career state if present
        career_state = (
            db.query(models.UserCareerState)
            .filter(models.UserCareerState.user_id == current_user.id)
            .first()
        )
        if career_state:
            if career_state.best_role and not candidate_context.get("target_role"):
                candidate_context["target_role"] = career_state.best_role
            if career_state.score is not None and "readiness_score" not in candidate_context:
                candidate_context["readiness_score"] = career_state.score
            if career_state.confidence and "confidence" not in candidate_context:
                candidate_context["confidence"] = career_state.confidence

        if not candidate_context.get("skills"):
            user_skills = [
                s.skill_name
                for s in (current_user.skills or [])
                if getattr(s, "skill_name", None)
            ]
            if user_skills:
                candidate_context["skills"] = user_skills
    except Exception as ctx_err:
        logger.warning("Could not assemble background profile context: %s", ctx_err)

    # Get AI response with telemetry
    start_time = time.perf_counter()
    reply = ""
    ai_status = "success"
    ai_error = None
    try:
        reply_dict = await CareerCopilotService.async_chat(
            messages=request.messages,
            candidate_context=candidate_context or None,
            mode=request.mode or "career",
        )
        reply = reply_dict.get("reply", "")
    except ValidationException as val_exc:
        ai_status = "failure"
        ai_error = val_exc
        logger.warning("Copilot validation error: %s", val_exc)
        raise HTTPException(status_code=400, detail=str(val_exc)) from val_exc
    except ExternalServiceException as ext_exc:
        ai_status = "failure"
        ai_error = ext_exc
        logger.error("Copilot external LLM service error: %s", ext_exc)
        raise HTTPException(status_code=502, detail=str(ext_exc)) from ext_exc
    except Exception as exc:
        ai_status = "failure"
        ai_error = exc
        logger.exception("Unexpected error during Copilot chat: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Career Copilot is temporarily unavailable. Please verify API configuration or try again shortly.",
        ) from exc
    finally:
        duration_ms = (time.perf_counter() - start_time) * 1000.0
        try:
            from app.core.config import settings
            provider_name = "groq" if getattr(settings, "groq_api_key", None) else "openrouter"
            AITelemetryService.record_request(
                db,
                feature_type="copilot",
                provider=provider_name,
                model_name=getattr(settings, "groq_model", "llama-3.3-70b-versatile"),
                duration_ms=duration_ms,
                status=ai_status,
                error=ai_error,
                user_id=current_user.id,
            )
            db.commit()
        except Exception as tel_err:
            logger.warning("Could not persist copilot AI telemetry: %s", tel_err)

    # Persist assistant reply
    assistant_db_msg = models.CopilotMessage(
        conversation_id=conversation.id,
        role="assistant",
        content=reply,
    )
    db.add(assistant_db_msg)
    db.commit()

    return {
        "reply": reply,
        "conversation_id": conversation.id,
    }
