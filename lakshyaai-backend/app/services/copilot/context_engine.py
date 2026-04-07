from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session, selectinload

from app.db import models
from app.services.resume.embedding_engine import EmbeddingEngine
from app.services.role.career_intelligence_engine import CareerIntelligenceEngine


class CopilotContextEngine:
    @staticmethod
    def load_resume_or_404(db: Session, *, resume_id: UUID, user_id: UUID) -> models.Resume:
        resume = (
            db.query(models.Resume)
            .filter(models.Resume.id == resume_id, models.Resume.user_id == user_id)
            .first()
        )
        if resume is None:
            raise HTTPException(status_code=404, detail="Resume not found")
        return resume

    @staticmethod
    def ensure_resume_embedding(db: Session, resume: models.Resume) -> list[float]:
        resume_embedding = (
            db.query(models.ResumeEmbedding)
            .filter(models.ResumeEmbedding.resume_id == resume.id)
            .first()
        )
        if resume_embedding and resume_embedding.embedding is not None:
            return list(resume_embedding.embedding)

        source_text = resume.parsed_text or resume.extracted_text or ""
        if not source_text.strip():
            return []

        embedding = EmbeddingEngine.generate_safe(source_text)
        if not embedding:
            return []

        if resume_embedding:
            resume_embedding.embedding = embedding
        else:
            db.add(models.ResumeEmbedding(resume_id=resume.id, embedding=embedding))
        db.commit()
        return embedding

    @classmethod
    def build_profile(
        cls,
        db: Session,
        *,
        resume_id: UUID,
        user_id: UUID,
        client_context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        resume = cls.load_resume_or_404(db, resume_id=resume_id, user_id=user_id)
        resume_skills = (
            db.query(models.ResumeSkill)
            .filter(models.ResumeSkill.resume_id == resume.id)
            .all()
        )
        roles = (
            db.query(models.Role)
            .options(selectinload(models.Role.skills), selectinload(models.Role.embeddings))
            .all()
        )
        matches = CareerIntelligenceEngine.rank_roles(
            roles=roles,
            resume_skills=resume_skills,
            resume_embedding=cls.ensure_resume_embedding(db, resume),
            resume_ats_score=int(round(resume.ats_score or 0)),
        ) or []
        career_decision = CareerIntelligenceEngine.build_career_decision(matches, resume_skills) or {}
        normalized_skills = CareerIntelligenceEngine._normalize_skill_map(resume_skills, exclude_related=True)
        resume_skill_names = [str(item["display"]) for item in normalized_skills.values()]
        top_match = matches[0] if matches else {}

        client_context = client_context or {}
        return {
            "resume_id": str(resume.id),
            "resume_name": client_context.get("resume_name") or resume.file_name or resume.original_filename or "Resume",
            "ats_score": int(round(resume.ats_score or 0)),
            "summary_text": (resume.parsed_text or resume.extracted_text or "")[:1200],
            "skills": resume_skill_names,
            "target_role": str(career_decision.get("target_role", "")),
            "career_verdict": str(career_decision.get("career_verdict", "")),
            "confidence": str(career_decision.get("confidence", "")),
            "focus_skills": list(career_decision.get("focus_skills", []) or top_match.get("missing_skills", [])),
            "strengths": list(top_match.get("strengths", []) or []),
            "skill_gaps": list(top_match.get("missing_skills", []) or []),
            "matched_skills": list(top_match.get("matched_skills", []) or []),
            "recommendations": list(top_match.get("next_steps", []) or []),
            "top_matches": [
                {
                    "role": item.get("role_name") or item.get("role"),
                    "score": item.get("score"),
                    "verdict": item.get("verdict"),
                    "matched_skills": item.get("matched_skills", [])[:5],
                    "missing_skills": item.get("missing_skills", [])[:5],
                }
                for item in matches[:3]
            ],
            "client_context": client_context,
        }
