from __future__ import annotations

from sqlalchemy.orm import Session, selectinload

from app.db import models
from app.services.role.career_intelligence_engine import CareerIntelligenceEngine


def recommend_career_path(db: Session, resume_id):
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not resume:
        raise ValueError("Resume not found")

    resume_skills = (
        db.query(models.ResumeSkill)
        .filter(models.ResumeSkill.resume_id == resume_id)
        .all()
    )
    resume_embedding = db.query(models.ResumeEmbedding).filter(
        models.ResumeEmbedding.resume_id == resume_id
    ).first()

    roles = (
        db.query(models.Role)
        .options(
            selectinload(models.Role.skills),
            selectinload(models.Role.embeddings),
        )
        .all()
    )

    matches = CareerIntelligenceEngine.rank_roles(
        roles=roles,
        resume_skills=resume_skills,
        resume_embedding=getattr(resume_embedding, "embedding", []),
        resume_ats_score=int(round(resume.ats_score or 0)),
    )
    if not matches:
        raise ValueError("No matching roles found")

    top_match = matches[0]
    return {
        "recommended_role": top_match["role_name"],
        "match_score": top_match["score"],
        "career_verdict": top_match["verdict"],
        "missing_skills": top_match["missing_skills"],
        "learning_path": [step["action"] for step in top_match["next_steps"]],
        "why": top_match["explanation"],
    }
