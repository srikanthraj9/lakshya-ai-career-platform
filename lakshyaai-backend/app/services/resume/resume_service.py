from __future__ import annotations

from io import BytesIO
from uuid import UUID

import pdfplumber
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NotFoundException, ProcessingException, ValidationException
from app.db import models
from app.services.resume.ats_engine import ATSEngine
from app.services.resume.embedding_engine import EmbeddingEngine
from app.services.resume.resume_feedback_engine import ResumeFeedbackEngine
from app.services.resume.resume_similarity_engine import ResumeSimilarityEngine
from app.services.resume.rewrite_engine import ResumeRewriteEngine
from app.services.resume.skill_extractor import SkillExtractor
from app.services.skills.skill_graph_engine import SkillGraphEngine


class ResumeService:
    MAX_RESUMES_PER_USER = 10

    @staticmethod
    def parse_pdf(file_bytes: bytes) -> str:
        try:
            with pdfplumber.open(BytesIO(file_bytes)) as pdf:
                return "\n".join((page.extract_text() or "").strip() for page in pdf.pages).strip()
        except Exception as exc:
            raise ProcessingException("Failed to parse PDF") from exc

    @staticmethod
    def _expand_skills(skills: list[dict]) -> list[dict]:
        skill_names = [skill["skill"] for skill in skills]
        expanded = skills[:]
        for related_skill in SkillGraphEngine.expand_skills(skill_names):
            if related_skill in skill_names:
                continue
            expanded.append(
                {
                    "skill": related_skill,
                    "category": "related_skill",
                    "confidence": 0.75,
                }
            )
        return expanded

    @staticmethod
    def _store_skills(db: Session, resume_id: UUID, skills: list[dict]) -> None:
        for skill in skills:
            db.add(
                models.ResumeSkill(
                    resume_id=resume_id,
                    skill_name=skill["skill"],
                    skill_category=skill["category"],
                    confidence_score=skill["confidence"],
                )
            )

    @staticmethod
    def _store_breakdown(db: Session, resume_id: UUID, breakdown: dict) -> None:
        db.add(
            models.ResumeATSBreakdown(
                resume_id=resume_id,
                skill_score=breakdown.get("skill_diversity", 0.0),
                keyword_score=breakdown.get("keyword_match", 0.0),
                section_score=breakdown.get("section_coverage", 0.0),
                format_score=breakdown.get("formatting", 0.0),
                action_verb_score=breakdown.get("action_verbs", 0.0),
            )
        )

    @staticmethod
    def _store_missing_skills(db: Session, resume_id: UUID, missing_skills: list[dict]) -> None:
        for skill in missing_skills:
            db.add(
                models.ResumeMissingSkill(
                    resume_id=resume_id,
                    skill_name=skill["skill"],
                    skill_category=skill["category"],
                    importance=skill["importance"],
                )
            )

    @staticmethod
    def _store_embedding(db: Session, resume_id: UUID, parsed_text: str) -> None:
        embedding = EmbeddingEngine.generate_safe(parsed_text)
        if len(embedding) == 0:
            return

        db.add(
            models.ResumeEmbedding(
                resume_id=resume_id,
                embedding=embedding,
            )
        )

    @staticmethod
    def _serialize_resume(resume: models.Resume) -> dict:
        return {
            "id": resume.id,
            "file_name": resume.file_name or resume.original_filename,
            "original_filename": resume.original_filename,
            "extracted_text": resume.extracted_text or resume.parsed_text,
            "parsed_text": resume.parsed_text,
            "ats_score": int(round(resume.ats_score or 0)),
            "created_at": resume.created_at,
            "skills": [
                {
                    "skill": skill.skill_name,
                    "category": skill.skill_category,
                    "confidence": round(skill.confidence_score or 0.0, 3),
                }
                for skill in sorted(resume.skills, key=lambda item: item.skill_name)
            ],
            "ats_breakdown": (
                {
                    "keyword_match": round(resume.ats_breakdown.keyword_score or 0.0, 2),
                    "skill_diversity": round(resume.ats_breakdown.skill_score or 0.0, 2),
                    "formatting": round(resume.ats_breakdown.format_score or 0.0, 2),
                    "action_verbs": round(resume.ats_breakdown.action_verb_score or 0.0, 2),
                    "section_coverage": round(resume.ats_breakdown.section_score or 0.0, 2),
                }
                if resume.ats_breakdown
                else None
            ),
            "missing_skills": [
                {
                    "skill": item.skill_name,
                    "category": item.skill_category or "general",
                    "importance": item.importance or 3,
                }
                for item in sorted(resume.missing_skills, key=lambda value: value.skill_name)
            ],
        }

    @staticmethod
    def _serialize_resume_list_item(resume: models.Resume) -> dict:
        return {
            "id": resume.id,
            "file_name": resume.file_name or resume.original_filename,
            "created_at": resume.created_at,
        }

    @staticmethod
    def _serialize_resume_detail(resume: models.Resume, feedback: dict) -> dict:
        breakdown = {
            "keyword_match": round(resume.ats_breakdown.keyword_score or 0.0, 2) if resume.ats_breakdown else 0.0,
            "skill_diversity": round(resume.ats_breakdown.skill_score or 0.0, 2) if resume.ats_breakdown else 0.0,
            "formatting": round(resume.ats_breakdown.format_score or 0.0, 2) if resume.ats_breakdown else 0.0,
            "action_verbs": round(resume.ats_breakdown.action_verb_score or 0.0, 2) if resume.ats_breakdown else 0.0,
            "section_coverage": round(resume.ats_breakdown.section_score or 0.0, 2) if resume.ats_breakdown else 0.0,
        }
        return {
            "id": resume.id,
            "file_name": resume.file_name or resume.original_filename,
            "original_filename": resume.original_filename,
            "created_at": resume.created_at,
            "extracted_text": resume.extracted_text or resume.parsed_text,
            "parsed_text": resume.parsed_text,
            "ats_score": int(round(resume.ats_score or 0)),
            "skills": [skill.skill_name for skill in sorted(resume.skills, key=lambda item: item.skill_name)],
            "breakdown": breakdown,
            "feedback": {
                "summary": feedback.get("summary", []),
                "weak_points": feedback.get("weak_bullet_points", []),
                "formatting": feedback.get("formatting_issues", []),
                "missing_skills": [
                    item["skill"] if isinstance(item, dict) else str(item)
                    for item in feedback.get("missing_skills", [])
                ],
            },
        }

    @staticmethod
    def _resume_query(db: Session):
        return db.query(models.Resume).options(
            joinedload(models.Resume.skills),
            joinedload(models.Resume.ats_breakdown),
            joinedload(models.Resume.missing_skills),
        )

    @classmethod
    def get_resume_for_user(cls, db: Session, resume_id: UUID, user_id: UUID) -> models.Resume:
        resume = (
            cls._resume_query(db)
            .filter(models.Resume.id == resume_id, models.Resume.user_id == user_id)
            .first()
        )
        if not resume:
            raise NotFoundException("Resume not found")
        return resume

    @classmethod
    def create_resume(
        cls,
        db: Session,
        *,
        user: models.User,
        original_filename: str,
        parsed_text: str,
        job_description: str = "",
    ) -> dict:
        cleaned_text = parsed_text.strip()
        if not cleaned_text:
            raise ValidationException("Resume text missing")
        existing_resume_count = db.query(models.Resume).filter(models.Resume.user_id == user.id).count()
        if existing_resume_count >= cls.MAX_RESUMES_PER_USER:
            raise ValidationException("Maximum 10 resumes allowed")
        try:
            extracted_skills = [skill.to_dict() for skill in SkillExtractor.extract_hybrid(cleaned_text)]
            expanded_skills = cls._expand_skills(extracted_skills)
            ats_analysis = ATSEngine.full_analysis(cleaned_text, expanded_skills, job_description)
            feedback = ResumeFeedbackEngine.generate_feedback_safe(cleaned_text, job_description, ats_analysis)

            resume = models.Resume(
                user_id=user.id,
                original_filename=original_filename,
                file_name=original_filename,
                parsed_text=cleaned_text,
                extracted_text=cleaned_text,
                ats_score=ats_analysis["score"],
                overall_feedback="\n".join(feedback["summary"][:4]),
            )

            db.add(resume)
            db.flush()

            cls._store_skills(db, resume.id, expanded_skills)
            cls._store_breakdown(db, resume.id, ats_analysis["breakdown"])
            cls._store_missing_skills(db, resume.id, ats_analysis["missing_skills"])
            cls._store_embedding(db, resume.id, cleaned_text)

            db.commit()
            stored_resume = cls.get_resume_for_user(db, resume.id, user.id)
            return cls._serialize_resume(stored_resume)
        except Exception:
            db.rollback()
            raise

    @classmethod
    def create_resume_from_pdf(
        cls,
        db: Session,
        *,
        user: models.User,
        filename: str,
        file_bytes: bytes,
        job_description: str = "",
    ) -> dict:
        parsed_text = cls.parse_pdf(file_bytes)
        return cls.create_resume(
            db,
            user=user,
            original_filename=filename,
            parsed_text=parsed_text,
            job_description=job_description,
        )

    @classmethod
    def list_resumes(cls, db: Session, user_id: UUID) -> list[dict]:
        resumes = (
            db.query(models.Resume)
            .filter(models.Resume.user_id == user_id)
            .order_by(models.Resume.created_at.desc())
            .all()
        )
        return [cls._serialize_resume_list_item(resume) for resume in resumes]

    @classmethod
    def get_selector(cls, db: Session, user_id: UUID) -> list[dict]:
        resumes = (
            db.query(models.Resume)
            .filter(models.Resume.user_id == user_id)
            .order_by(models.Resume.created_at.desc())
            .all()
        )
        return [{"id": resume.id, "name": resume.original_filename} for resume in resumes]

    @classmethod
    def get_resume(cls, db: Session, resume_id: UUID, user_id: UUID) -> dict:
        resume = cls.get_resume_for_user(db, resume_id, user_id)
        feedback = cls.get_feedback(db, resume_id, user_id)
        return cls._serialize_resume_detail(resume, feedback)

    @classmethod
    def get_feedback(cls, db: Session, resume_id: UUID, user_id: UUID, job_description: str = "") -> dict:
        resume = cls.get_resume_for_user(db, resume_id, user_id)
        ats_analysis = {
            "score": int(round(resume.ats_score or 0)),
            "missing_skills": [
                {"skill": item.skill_name, "category": item.skill_category or "general", "importance": item.importance or 3}
                for item in resume.missing_skills
            ],
        }
        feedback = ResumeFeedbackEngine.generate_feedback_safe(resume.parsed_text or "", job_description, ats_analysis)
        return {"resume_id": resume.id, **feedback}

    @classmethod
    def find_similar_resumes(cls, db: Session, resume_id: UUID, user_id: UUID, *, limit: int = 5) -> dict:
        resume = cls.get_resume_for_user(db, resume_id, user_id)
        embedding = db.query(models.ResumeEmbedding).filter(models.ResumeEmbedding.resume_id == resume_id).first()
        if not embedding:
            raise NotFoundException("Resume embedding not found")

        matches = ResumeSimilarityEngine.find_similar_resumes(
            db,
            resume_id,
            embedding.embedding,
            user_id=user_id,
            limit=limit,
        )
        return {"resume_id": resume.id, "matches": matches}

    @classmethod
    def delete_resume(cls, db: Session, resume_id: UUID, user_id: UUID) -> None:
        resume = db.query(models.Resume).filter(
            models.Resume.id == resume_id,
            models.Resume.user_id == user_id,
        ).first()
        if not resume:
            raise NotFoundException("Resume not found")
        try:
            db.delete(resume)
            db.commit()
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def rewrite_resume(
        *,
        user: models.User,
        resume_text: str,
        job_description: str = "",
    ) -> dict:
        if not resume_text.strip():
            raise ValidationException("Resume text missing")

        contact_line = " | ".join(
            part for part in [user.email, "LinkedIn", "GitHub"] if part
        )
        return ResumeRewriteEngine.rewrite_resume(
            resume_text,
            full_name=user.full_name or "Candidate",
            contact_line=contact_line,
            job_description=job_description,
        )
