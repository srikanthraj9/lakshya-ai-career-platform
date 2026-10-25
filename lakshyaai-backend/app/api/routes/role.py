import logging
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from app.core.dependencies import get_current_user
from app.core.permissions import require_admin
from app.db import models
from app.db.database import get_db
from app.db.schemas import (
    AlignmentResponse,
    RoleCreate,
    RoleResponse,
    RoleSkillCreate,
    RoleSkillResponse,
    RoadmapRequest,
    RoadmapResponse,
)
from app.services.resume.embedding_engine import EmbeddingEngine
from app.services.role.career_intelligence_engine import CareerIntelligenceEngine
from app.services.role.skill_gap_engine import SkillGapEngine
from app.services.role.user_career_state_service import UserCareerStateService
from app.services.roadmap.roadmap_engine import RoadmapEngine

router = APIRouter(prefix="/roles", tags=["Roles"])
logger = logging.getLogger("lakshyaai.roles")


def _role_response_payload(role: models.Role) -> dict[str, object]:
    profile = CareerIntelligenceEngine.build_role_profile(role, getattr(role, "skills", []))
    return {
        "id": role.id,
        "name": role.name,
        "title": profile["title"],
        "category": profile["category"],
        "demand_level": profile["demand_level"],
        "core_skills": profile["core_skills"],
        "advanced_skills": profile["advanced_skills"],
        "description": profile["description"],
        "average_salary": profile["average_salary"],
        "created_at": role.created_at,
    }


def _role_identity_key(name: str) -> str:
    return CareerIntelligenceEngine.canonical_role_key(name)


def _find_existing_role_by_key(db: Session, role_key: str) -> models.Role | None:
    roles = db.query(models.Role).all()
    for existing_role in roles:
        existing_key = _role_identity_key(existing_role.title or existing_role.name or "")
        if existing_key and existing_key == role_key:
            return existing_role
    return None


def _upsert_role_skill_records(db: Session, role: models.Role, skills: list[str], *, importance_level: int) -> None:
    existing_skill_names = {
        (skill.skill_name or "").strip().lower()
        for skill in db.query(models.RoleSkill).filter(models.RoleSkill.role_id == role.id).all()
    }

    for skill_name in skills:
        normalized = (skill_name or "").strip()
        if not normalized or normalized.lower() in existing_skill_names:
            continue
        db.add(
            models.RoleSkill(
                role_id=role.id,
                skill_name=normalized,
                skill_category="core_skill" if importance_level >= 4 else "advanced_skill",
                weight=1.0,
                importance_level=importance_level,
            )
        )
        existing_skill_names.add(normalized.lower())


def _refresh_role_embedding(db: Session, role: models.Role) -> None:
    role_skills = list(getattr(role, "skills", []) or [])
    embedding_text = CareerIntelligenceEngine.role_embedding_text(role, role_skills)
    vector = EmbeddingEngine.generate_safe(embedding_text)
    if not vector:
        return

    role_embedding = (
        db.query(models.RoleEmbedding)
        .filter(models.RoleEmbedding.role_id == role.id)
        .first()
    )
    if role_embedding:
        role_embedding.embedding = vector
    else:
        db.add(models.RoleEmbedding(role_id=role.id, embedding=vector))


def _ensure_resume_embedding(db: Session, resume: models.Resume) -> list[float]:
    resume_embedding = (
        db.query(models.ResumeEmbedding)
        .filter(models.ResumeEmbedding.resume_id == resume.id)
        .first()
    )
    if resume_embedding and resume_embedding.embedding is not None:
        logger.info(
            "Existing resume embedding found resume_id=%s embedding_type=%s embedding_length=%s",
            resume.id,
            type(resume_embedding.embedding).__name__,
            len(resume_embedding.embedding),
        )
        return list(resume_embedding.embedding)

    if not (resume.parsed_text or resume.extracted_text):
        return []

    generated = EmbeddingEngine.generate_safe(resume.parsed_text or resume.extracted_text or "")
    if not generated:
        return []

    try:
        if resume_embedding:
            resume_embedding.embedding = generated
        else:
            db.add(models.ResumeEmbedding(resume_id=resume.id, embedding=generated))
        db.commit()
    except Exception as exc:
        logger.warning("Could not persist resume embedding for resume_id=%s: %s", resume.id, exc)
        db.rollback()

    return generated


def _build_alignment_payload(
    db: Session,
    resume: models.Resume,
    target_role: str | None = None,
) -> dict[str, object]:
    logger.info("Step 1: fetching resume skills and embeddings for resume_id=%s", resume.id)
    resume_skills = (
        db.query(models.ResumeSkill)
        .filter(models.ResumeSkill.resume_id == resume.id)
        .all()
    )
    resume_embedding = _ensure_resume_embedding(db, resume)
    logger.info("Step 2: loading roles for intelligence engine resume_id=%s", resume.id)
    roles = (
        db.query(models.Role)
        .options(
            selectinload(models.Role.skills),
            selectinload(models.Role.embeddings),
        )
        .all()
    )

    logger.info("Step 3: running intelligence engine resume_id=%s target_role=%s", resume.id, target_role)
    matches = CareerIntelligenceEngine.rank_roles(
        roles=roles,
        resume_skills=resume_skills,
        resume_embedding=resume_embedding,
        resume_ats_score=int(round(resume.ats_score or 0)),
    ) or []

    resume_skill_names = [
        str(item["display"])
        for item in CareerIntelligenceEngine._normalize_skill_map(resume_skills, exclude_related=True).values()
    ]
    career_decision = CareerIntelligenceEngine.build_career_decision(matches, resume_skills, target_role=target_role) or {}
    top_match = matches[0] if matches else {}
    career_state = None

    if resume.user_id is not None:
        try:
            career_state = UserCareerStateService.upsert(
                db,
                user_id=resume.user_id,
                best_role=str(career_decision.get("target_role", "")),
                score=int(top_match.get("score", 0)),
                confidence=str(career_decision.get("confidence", "Low")),
            )
        except Exception as exc:
            logger.warning("Could not upsert user career state: %s", exc)
            db.rollback()

    return {
        "resume_id": resume.id,
        "resume_skills": resume_skill_names,
        "career_decision": career_decision,
        "career_state": UserCareerStateService.serialize(career_state),
        "matches": matches,
    }


def _load_user_resume(db: Session, *, resume_id: UUID, user_id: UUID) -> models.Resume:
    logger.info("Resume ID: %s", resume_id)
    logger.info("Step 1: fetching resume resume_id=%s user_id=%s", resume_id, user_id)
    resume = (
        db.query(models.Resume)
        .filter(
            models.Resume.id == resume_id,
            models.Resume.user_id == user_id,
        )
        .first()
    )

    if not resume:
        logger.warning("Resume not found resume_id=%s user_id=%s", resume_id, user_id)
        raise HTTPException(status_code=404, detail="Resume not found")

    return resume


def _run_alignment_or_raise(
    db: Session,
    *,
    resume_id: UUID,
    current_user: models.User,
    target_role: str | None = None,
) -> dict[str, object]:
    try:
        resume = _load_user_resume(db, resume_id=resume_id, user_id=current_user.id)
        logger.info("Step 2: running intelligence engine resume_id=%s", resume_id)
        payload = _build_alignment_payload(db, resume, target_role=target_role)
        if payload is None:
            logger.error("Alignment engine returned no payload resume_id=%s", resume_id)
            raise HTTPException(status_code=500, detail="Career intelligence engine returned no response")
        return payload
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("ERROR: failed to build alignment payload for resume_id=%s", resume_id)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/")
def create_role(
    role: RoleCreate,
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(require_admin),
):
    del admin_user

    role_name = (role.title or role.name or "").strip()
    role_key = _role_identity_key(role_name)
    existing_role = _find_existing_role_by_key(db, role_key)

    if existing_role:
        raise HTTPException(status_code=400, detail="Role already exists with a similar normalized title")

    new_role = models.Role(
        name=role_name,
        title=role_name,
        category=(role.category or "Software Engineering").strip(),
        demand_level=(role.demand_level or "Medium").strip().title(),
        core_skills=[skill.strip() for skill in role.core_skills if skill.strip()],
        advanced_skills=[skill.strip() for skill in role.advanced_skills if skill.strip()],
        description=role.description,
        average_salary=role.average_salary,
    )

    db.add(new_role)
    db.commit()
    db.refresh(new_role)

    _upsert_role_skill_records(db, new_role, new_role.core_skills or [], importance_level=5)
    _upsert_role_skill_records(db, new_role, new_role.advanced_skills or [], importance_level=3)
    refreshed_role = (
        db.query(models.Role)
        .options(selectinload(models.Role.skills))
        .filter(models.Role.id == new_role.id)
        .first()
    )
    if refreshed_role:
        CareerIntelligenceEngine.sync_role_skill_fields(refreshed_role, refreshed_role.skills)
        _refresh_role_embedding(db, refreshed_role)

    db.commit()

    return {
        "message": "Role created successfully",
        "role_id": new_role.id,
    }


@router.get("/", response_model=list[RoleResponse])
def get_roles(db: Session = Depends(get_db)):
    roles = (
        db.query(models.Role)
        .options(selectinload(models.Role.skills))
        .order_by(models.Role.created_at.desc())
        .all()
    )
    return [_role_response_payload(role) for role in roles]


@router.get("/{role_id}", response_model=RoleResponse)
def get_role(role_id: UUID, db: Session = Depends(get_db)):
    role = (
        db.query(models.Role)
        .options(selectinload(models.Role.skills))
        .filter(models.Role.id == role_id)
        .first()
    )

    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    return _role_response_payload(role)


@router.post("/{role_id}/skills")
def add_role_skills(
    role_id: UUID,
    skills: List[RoleSkillCreate],
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(require_admin),
):
    del admin_user

    role = db.query(models.Role).filter(models.Role.id == role_id).first()

    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    created_skills = []

    for skill in skills:
        new_skill = models.RoleSkill(
            role_id=role_id,
            skill_name=skill.skill_name,
            skill_category=skill.skill_category,
            weight=skill.weight,
            importance_level=skill.importance_level,
        )

        db.add(new_skill)
        created_skills.append(new_skill)

    db.commit()

    refreshed_role = (
        db.query(models.Role)
        .options(selectinload(models.Role.skills))
        .filter(models.Role.id == role_id)
        .first()
    )
    if refreshed_role:
        CareerIntelligenceEngine.sync_role_skill_fields(refreshed_role, refreshed_role.skills)
        _refresh_role_embedding(db, refreshed_role)
        db.commit()

    return {
        "message": "Skills added successfully",
        "skills_added": len(created_skills),
    }


@router.get("/{role_id}/skills", response_model=List[RoleSkillResponse])
def get_role_skills(role_id: UUID, db: Session = Depends(get_db)):
    skills = db.query(models.RoleSkill).filter(models.RoleSkill.role_id == role_id).all()
    return skills


@router.delete("/skills/{skill_id}")
def delete_role_skill(
    skill_id: UUID,
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(require_admin),
):
    del admin_user

    skill = db.query(models.RoleSkill).filter(models.RoleSkill.id == skill_id).first()

    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    role_id = skill.role_id
    db.delete(skill)
    db.commit()

    refreshed_role = (
        db.query(models.Role)
        .options(selectinload(models.Role.skills))
        .filter(models.Role.id == role_id)
        .first()
    )
    if refreshed_role:
        CareerIntelligenceEngine.sync_role_skill_fields(refreshed_role, refreshed_role.skills)
        _refresh_role_embedding(db, refreshed_role)
        db.commit()

    return {
        "message": "Skill deleted successfully"
    }


@router.get("/align/{resume_id}", response_model=AlignmentResponse)
def align_resume_to_roles(
    resume_id: UUID,
    target_role: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return _run_alignment_or_raise(db, resume_id=resume_id, current_user=current_user, target_role=target_role)


@router.get("/intelligence/{resume_id}", response_model=AlignmentResponse)
def career_intelligence(
    resume_id: UUID,
    target_role: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return _run_alignment_or_raise(db, resume_id=resume_id, current_user=current_user, target_role=target_role)


@router.get("/intelligence/{resume_id}/align", response_model=AlignmentResponse)
def career_intelligence_align_alias(
    resume_id: UUID,
    target_role: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    logger.info("Using compatibility route /roles/intelligence/%s/align", resume_id)
    return _run_alignment_or_raise(db, resume_id=resume_id, current_user=current_user, target_role=target_role)


@router.get("/analyze/{resume_id}", response_model=AlignmentResponse)
def career_intelligence_analyze_alias(
    resume_id: UUID,
    target_role: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    logger.info("Using compatibility route /roles/analyze/%s", resume_id)
    return _run_alignment_or_raise(db, resume_id=resume_id, current_user=current_user, target_role=target_role)


@router.get("/skill-gap/{resume_id}/{role_id}")
def skill_gap_analysis(
    resume_id: UUID,
    role_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    resume = db.query(models.Resume).filter(
        models.Resume.id == resume_id,
        models.Resume.user_id == current_user.id,
    ).first()

    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    role = db.query(models.Role).filter(models.Role.id == role_id).first()

    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    analysis = SkillGapEngine.analyze(db, resume_id, role_id)

    return {
        "resume_id": resume_id,
        "role_id": role_id,
        "analysis": analysis,
    }


@router.get("/career-path/{resume_id}")
def career_path_recommendation(
    resume_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    resume = db.query(models.Resume).filter(
        models.Resume.id == resume_id,
        models.Resume.user_id == current_user.id,
    ).first()

    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    intelligence = _build_alignment_payload(db, resume)
    return {
        "resume_id": resume_id,
        "career_recommendation": intelligence["career_decision"],
        "matches": intelligence["matches"],
    }


@router.post("/career-path", response_model=RoadmapResponse)
def generate_career_path_alias(
    request: RoadmapRequest,
    current_user: models.User = Depends(get_current_user),
):
    """Compatibility alias delegating to RoadmapEngine.generate."""
    return RoadmapEngine.generate(
        target_role=request.target_role,
        experience_level=request.experience_level,
        current_skills=request.current_skills,
        missing_skills=request.missing_skills,
    )

