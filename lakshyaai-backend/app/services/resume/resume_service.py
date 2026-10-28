from __future__ import annotations

import re
import time
from io import BytesIO
from uuid import UUID

import pdfplumber
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NotFoundException, ProcessingException, ValidationException
from app.db import models
from app.services.resume.ats_engine import ATSEngine
from app.services.resume.embedding_engine import EmbeddingEngine
from app.services.resume.missing_skill_engine import MissingSkillEngine
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
        expanded = []
        for s in skills:
            item = dict(s)
            item.setdefault("is_inferred", False)
            item.setdefault("extraction_source", "direct")
            expanded.append(item)

        for related_skill in SkillGraphEngine.expand_skills(skill_names):
            if related_skill in skill_names:
                continue
            expanded.append(
                {
                    "skill": related_skill,
                    "category": "related_skill",
                    "confidence": 0.65,
                    "is_inferred": True,
                    "extraction_source": "skill_graph",
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
                    is_inferred=bool(skill.get("is_inferred", False)),
                    extraction_source=skill.get("extraction_source", "direct"),
                )
            )

    @staticmethod
    def _extract_and_store_evidence(
        db: Session,
        resume_id: UUID,
        text: str,
        proven_skills: list[dict],
    ) -> list[models.ResumeSkillEvidence]:
        evidence_list = []
        for s in proven_skills:
            skill_name = s.get("skill") or s.get("skill_name", "")
            if not skill_name:
                continue
            pattern = re.compile(rf"(?<!\w){re.escape(skill_name)}(?!\w)", re.IGNORECASE)
            match = pattern.search(text)
            if match:
                start_idx = match.start()
                end_idx = match.end()
                line_start = text.rfind("\n", 0, start_idx)
                line_start = 0 if line_start == -1 else line_start + 1
                line_end = text.find("\n", end_idx)
                line_end = len(text) if line_end == -1 else line_end
                excerpt = text[line_start:line_end].strip()
                if len(excerpt) > 200:
                    snip_s = max(0, start_idx - 60)
                    snip_e = min(len(text), end_idx + 60)
                    excerpt = "..." + text[snip_s:snip_e].strip() + "..."

                preceding = text[:start_idx].lower()
                sec = "skills"
                if "experience" in preceding and preceding.rfind("experience") > preceding.rfind("skills"):
                    sec = "experience"
                elif "projects" in preceding and preceding.rfind("projects") > preceding.rfind("skills"):
                    sec = "projects"
                elif "education" in preceding and preceding.rfind("education") > preceding.rfind("skills"):
                    sec = "education"

                evidence = models.ResumeSkillEvidence(
                    resume_id=resume_id,
                    skill_name=skill_name,
                    excerpt_text=excerpt or skill_name,
                    section_name=sec,
                    start_char_offset=start_idx,
                    end_char_offset=end_idx,
                    extraction_source="direct",
                    confidence=float(s.get("confidence", 1.0)),
                    is_inferred=False,
                )
                db.add(evidence)
                evidence_list.append(evidence)
        return evidence_list

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
            "base_quality_score": int(round(resume.base_quality_score)) if resume.base_quality_score is not None else None,
            "version_number": resume.version_number or 1,
            "version_label": resume.version_label or f"v{resume.version_number or 1}.0",
            "parent_resume_id": resume.parent_resume_id,
            "created_at": resume.created_at,
            "skills": [
                {
                    "skill": skill.skill_name,
                    "category": skill.skill_category,
                    "confidence": round(skill.confidence_score or 0.0, 3),
                    "is_inferred": getattr(skill, "is_inferred", False),
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
        ats_val = getattr(resume, "ats_score", None)
        base_quality = getattr(resume, "base_quality_score", None)
        version_num = getattr(resume, "version_number", None) or 1
        version_lbl = getattr(resume, "version_label", None) or f"v{version_num}.0"
        parent_id = getattr(resume, "parent_resume_id", None)
        return {
            "id": getattr(resume, "id", None),
            "file_name": getattr(resume, "file_name", None) or getattr(resume, "original_filename", None),
            "created_at": getattr(resume, "created_at", None),
            "ats_score": int(round(ats_val)) if ats_val is not None else None,
            "base_quality_score": int(round(base_quality)) if base_quality is not None else None,
            "version_number": version_num,
            "version_label": version_lbl,
            "parent_resume_id": parent_id,
        }

    @staticmethod
    def _serialize_resume_detail(resume: models.Resume, feedback: dict) -> dict:
        breakdown = {
            "keyword_match": round(resume.ats_breakdown.keyword_score or 0.0, 2) if getattr(resume, "ats_breakdown", None) else 0.0,
            "skill_diversity": round(resume.ats_breakdown.skill_score or 0.0, 2) if getattr(resume, "ats_breakdown", None) else 0.0,
            "formatting": round(resume.ats_breakdown.format_score or 0.0, 2) if getattr(resume, "ats_breakdown", None) else 0.0,
            "action_verbs": round(resume.ats_breakdown.action_verb_score or 0.0, 2) if getattr(resume, "ats_breakdown", None) else 0.0,
            "section_coverage": round(resume.ats_breakdown.section_score or 0.0, 2) if getattr(resume, "ats_breakdown", None) else 0.0,
        }
        base_quality = getattr(resume, "base_quality_score", None)
        version_num = getattr(resume, "version_number", None) or 1
        version_lbl = getattr(resume, "version_label", None) or f"v{version_num}.0"
        parent_id = getattr(resume, "parent_resume_id", None)
        return {
            "id": getattr(resume, "id", None),
            "file_name": getattr(resume, "file_name", None) or getattr(resume, "original_filename", None),
            "original_filename": getattr(resume, "original_filename", None),
            "created_at": getattr(resume, "created_at", None),
            "extracted_text": getattr(resume, "extracted_text", None) or getattr(resume, "parsed_text", None),
            "parsed_text": getattr(resume, "parsed_text", None),
            "ats_score": int(round(getattr(resume, "ats_score", 0) or 0)),
            "base_quality_score": int(round(base_quality)) if base_quality is not None else None,
            "version_number": version_num,
            "version_label": version_lbl,
            "parent_resume_id": parent_id,
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
        file_path: str | None = None,
        file_size: int | None = None,
        mime_type: str = "application/pdf",
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

            base_quality = ats_analysis["score"] if not job_description else None

            resume = models.Resume(
                user_id=user.id,
                original_filename=original_filename,
                file_name=original_filename,
                file_path=file_path,
                file_size=file_size,
                mime_type=mime_type,
                parsed_text=cleaned_text,
                extracted_text=cleaned_text,
                ats_score=ats_analysis["score"],
                base_quality_score=base_quality,
                version_number=1,
                version_label="v1.0 (Original)",
                overall_feedback="\n".join(feedback["summary"][:4]),
            )

            db.add(resume)
            db.flush()

            cls._store_skills(db, resume.id, expanded_skills)
            cls._extract_and_store_evidence(db, resume.id, cleaned_text, extracted_skills)
            cls._store_breakdown(db, resume.id, ats_analysis["breakdown"])
            cls._store_missing_skills(db, resume.id, ats_analysis["missing_skills"])
            cls._store_embedding(db, resume.id, cleaned_text)

            # Persist initial assessment run
            scoring_mode = ats_analysis.get("scoring_mode", ATSEngine.MODE_BASE_QUALITY)
            initial_analysis = models.ResumeAnalysis(
                resume_id=resume.id,
                user_id=user.id,
                scoring_mode=scoring_mode,
                target_job_description=job_description if job_description else None,
                overall_score=ats_analysis["score"],
                match_verdict=ats_analysis.get("verdict", "Good Quality"),
                algorithm_version="v2.0-ats-intelligence",
            )
            db.add(initial_analysis)
            db.flush()

            for dim_key, dim_val in ats_analysis.get("dimensions", {}).items():
                db.add(
                    models.ResumeAnalysisDimension(
                        analysis_id=initial_analysis.id,
                        dimension_key=dim_key,
                        raw_score=float(dim_val.get("raw_score", 0.0)),
                        weighted_score=float(dim_val.get("weighted_score", 0.0)),
                        weight_factor=float(dim_val.get("weight", 0.0)),
                        evaluation_status=dim_val.get("status", "evaluated"),
                        diagnostic_notes=dim_val.get("notes"),
                    )
                )

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
        from app.services.storage.file_storage import FileStorageService
        import uuid

        parsed_text = cls.parse_pdf(file_bytes)
        temp_resume_id = uuid.uuid4()
        file_path, file_size = FileStorageService.save_resume_file(
            user_id=user.id,
            resume_id=temp_resume_id,
            filename=filename,
            file_bytes=file_bytes,
        )

        return cls.create_resume(
            db,
            user=user,
            original_filename=filename,
            parsed_text=parsed_text,
            job_description=job_description,
            file_path=file_path,
            file_size=file_size,
            mime_type="application/pdf",
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

    @classmethod
    def assess_resume(
        cls,
        db: Session,
        *,
        user_id: UUID,
        resume_id: UUID,
        target_role_id: str | None = None,
        target_role_title: str | None = None,
        job_description: str | None = None,
    ) -> dict:
        start_time = time.perf_counter()
        resume = cls.get_resume_for_user(db, resume_id, user_id)
        resume_text = resume.parsed_text or resume.extracted_text or ""
        if not resume_text.strip():
            raise ValidationException("Resume text is empty or missing")

        extracted_skills = [skill.to_dict() for skill in SkillExtractor.extract_hybrid(resume_text)]
        expanded_skills = cls._expand_skills(extracted_skills)

        has_target = bool(job_description and job_description.strip()) or bool(target_role_title and target_role_title.strip())

        if has_target:
            jd = (job_description or "").strip()
            if not jd and target_role_title:
                jd = f"Target Role: {target_role_title}. Key core and preferred skills for {target_role_title}."
            analysis_result = ATSEngine.calculate_job_match(resume_text, expanded_skills, jd)
            scoring_mode = ATSEngine.MODE_JOB_MATCH
            missing_skills = MissingSkillEngine.detect_missing_skills(resume_text, jd)
        else:
            analysis_result = ATSEngine.calculate_base_quality(resume_text, expanded_skills)
            scoring_mode = ATSEngine.MODE_BASE_QUALITY
            missing_skills = []
            resume.base_quality_score = analysis_result["score"]

        duration_ms = int((time.perf_counter() - start_time) * 1000)
        overall_score = analysis_result["score"]
        match_verdict = analysis_result["verdict"]

        resume.ats_score = overall_score

        try:
            analysis_record = models.ResumeAnalysis(
                resume_id=resume.id,
                user_id=user_id,
                scoring_mode=scoring_mode,
                target_role_id=target_role_id,
                target_role_title=target_role_title,
                target_job_description=job_description if job_description else None,
                overall_score=overall_score,
                match_verdict=match_verdict,
                algorithm_version="v2.0-ats-intelligence",
                execution_duration_ms=duration_ms,
            )
            db.add(analysis_record)
            db.flush()

            for dim_key, dim_val in analysis_result.get("dimensions", {}).items():
                db.add(
                    models.ResumeAnalysisDimension(
                        analysis_id=analysis_record.id,
                        dimension_key=dim_key,
                        raw_score=float(dim_val.get("raw_score", 0.0)),
                        weighted_score=float(dim_val.get("weighted_score", 0.0)),
                        weight_factor=float(dim_val.get("weight", 0.0)),
                        evaluation_status=dim_val.get("status", "evaluated"),
                        diagnostic_notes=dim_val.get("notes"),
                    )
                )

            # Backfill any missing skill evidence
            existing_evidence_skills = {
                ev.skill_name for ev in db.query(models.ResumeSkillEvidence).filter(models.ResumeSkillEvidence.resume_id == resume.id).all()
            }
            needed_evidence = [s for s in extracted_skills if s["skill"] not in existing_evidence_skills]
            if needed_evidence:
                cls._extract_and_store_evidence(db, resume.id, resume_text, needed_evidence)

            db.commit()
        except Exception:
            db.rollback()
            raise

        evidence_records = (
            db.query(models.ResumeSkillEvidence)
            .filter(models.ResumeSkillEvidence.resume_id == resume.id)
            .all()
        )

        proven_names = [s["skill"] for s in extracted_skills]

        recommendations = []
        if scoring_mode == ATSEngine.MODE_BASE_QUALITY:
            dim_fmt = analysis_result["dimensions"].get("formatting", {})
            dim_verb = analysis_result["dimensions"].get("action_verbs", {})
            dim_sec = analysis_result["dimensions"].get("section_coverage", {})
            if dim_fmt.get("raw_score", 100) < 80:
                recommendations.append("Enhance layout: Ensure professional email, phone, and standard bullet formatting are cleanly structured.")
            if dim_verb.get("raw_score", 100) < 70:
                recommendations.append("Strengthen bullet points: Begin bullet points with strong action verbs (e.g., 'Architected', 'Spearheaded') and quantified impact metrics.")
            if dim_sec.get("raw_score", 100) < 80:
                recommendations.append("Add missing canonical sections: Include dedicated Summary, Experience, Education, and Projects sections.")
            if not has_target:
                recommendations.append("Select a target role or supply a job description to assess keyword matching and missing role requirements.")
        else:
            if missing_skills:
                top_missing = ", ".join(s.skill for s in missing_skills[:4])
                recommendations.append(f"Add critical missing skills required for this role: {top_missing}.")
            dim_kw = analysis_result["dimensions"].get("keyword_relevance", {})
            if dim_kw.get("raw_score", 100) < 60:
                recommendations.append("Align technical terminology and accomplishment descriptions with the target job description.")

        return {
            "id": analysis_record.id,
            "resume_id": resume.id,
            "scoring_mode": scoring_mode,
            "overall_score": overall_score,
            "match_verdict": match_verdict,
            "target_role_id": target_role_id,
            "target_role_title": target_role_title,
            "algorithm_version": "v2.0-ats-intelligence",
            "dimensions": [
                {
                    "dimension_key": k,
                    "raw_score": v["raw_score"],
                    "weighted_score": v["weighted_score"],
                    "weight_factor": v["weight"],
                    "evaluation_status": v["status"],
                    "diagnostic_notes": v.get("notes"),
                }
                for k, v in analysis_result.get("dimensions", {}).items()
            ],
            "matched_skills": proven_names,
            "missing_skills": [s.to_dict() for s in missing_skills],
            "skill_evidence": [
                {
                    "skill_name": ev.skill_name,
                    "excerpt_text": ev.excerpt_text,
                    "section_name": ev.section_name,
                    "confidence": ev.confidence,
                    "is_inferred": ev.is_inferred,
                }
                for ev in evidence_records
            ],
            "recommendations": recommendations,
            "created_at": analysis_record.created_at,
        }

    @classmethod
    def get_assessments_for_resume(
        cls,
        db: Session,
        *,
        user_id: UUID,
        resume_id: UUID,
    ) -> list[dict]:
        resume = cls.get_resume_for_user(db, resume_id, user_id)
        records = (
            db.query(models.ResumeAnalysis)
            .filter(models.ResumeAnalysis.resume_id == resume.id, models.ResumeAnalysis.user_id == user_id)
            .order_by(models.ResumeAnalysis.created_at.desc())
            .all()
        )
        return [
            {
                "id": rec.id,
                "resume_id": rec.resume_id,
                "scoring_mode": rec.scoring_mode,
                "overall_score": int(round(rec.overall_score)),
                "match_verdict": rec.match_verdict,
                "target_role_title": rec.target_role_title,
                "algorithm_version": rec.algorithm_version,
                "created_at": rec.created_at,
            }
            for rec in records
        ]

    @classmethod
    def get_assessment_detail(
        cls,
        db: Session,
        *,
        user_id: UUID,
        resume_id: UUID,
        assessment_id: UUID,
    ) -> dict:
        resume = cls.get_resume_for_user(db, resume_id, user_id)
        record = (
            db.query(models.ResumeAnalysis)
            .options(joinedload(models.ResumeAnalysis.dimensions))
            .filter(
                models.ResumeAnalysis.id == assessment_id,
                models.ResumeAnalysis.resume_id == resume.id,
                models.ResumeAnalysis.user_id == user_id,
            )
            .first()
        )
        if not record:
            raise NotFoundException("Assessment record not found")

        evidence_records = (
            db.query(models.ResumeSkillEvidence)
            .filter(models.ResumeSkillEvidence.resume_id == resume.id)
            .all()
        )
        proven_skills = [
            s.skill_name for s in resume.skills if not getattr(s, "is_inferred", False) and getattr(s, "skill_category", "") != "related_skill"
        ]

        missing_skills = []
        if record.target_job_description:
            missing_skills = MissingSkillEngine.detect_missing_skills(resume.parsed_text or "", record.target_job_description)

        return {
            "id": record.id,
            "resume_id": record.resume_id,
            "scoring_mode": record.scoring_mode,
            "overall_score": int(round(record.overall_score)),
            "match_verdict": record.match_verdict or "Good Quality",
            "target_role_id": record.target_role_id,
            "target_role_title": record.target_role_title,
            "algorithm_version": record.algorithm_version,
            "dimensions": [
                {
                    "dimension_key": d.dimension_key,
                    "raw_score": d.raw_score,
                    "weighted_score": d.weighted_score,
                    "weight_factor": d.weight_factor,
                    "evaluation_status": d.evaluation_status,
                    "diagnostic_notes": d.diagnostic_notes,
                }
                for d in record.dimensions
            ],
            "matched_skills": proven_skills,
            "missing_skills": [s.to_dict() for s in missing_skills],
            "skill_evidence": [
                {
                    "skill_name": ev.skill_name,
                    "excerpt_text": ev.excerpt_text,
                    "section_name": ev.section_name,
                    "confidence": ev.confidence,
                    "is_inferred": ev.is_inferred,
                }
                for ev in evidence_records
            ],
            "recommendations": [
                f"Evaluation calculated with algorithm {record.algorithm_version} ({record.scoring_mode} mode)."
            ],
            "created_at": record.created_at,
        }

    @classmethod
    def save_rewrite_version(
        cls,
        db: Session,
        *,
        user: models.User,
        document_id: str,
        version_label: str | None = None,
        target_role_title: str | None = None,
        job_description: str | None = None,
    ) -> dict:
        """
        Milestone 4: AI Rewrite Versioning.
        Saves rewritten resume text as a new Resume record linked through version lineage.
        Includes fact-checking safeguards against fabricated employers and degrees.
        """
        from app.services.resume.rewrite_storage import ResumeRewriteStorage

        # Verify ownership of rewrite document
        manifest = ResumeRewriteStorage.get_manifest(document_id)
        if manifest.get("owner_id") and manifest.get("owner_id") != str(user.id):
            raise ValidationException("You do not have access to this rewrite document")

        # Also verify database rewrite record if present
        try:
            doc_uuid = UUID(document_id)
            rewrite_rec = db.query(models.ResumeRewrite).filter(
                models.ResumeRewrite.id == doc_uuid,
                models.ResumeRewrite.user_id == user.id,
            ).first()
        except ValueError:
            rewrite_rec = None

        rewritten_text = ""
        if rewrite_rec and rewrite_rec.preview_text:
            rewritten_text = rewrite_rec.preview_text.strip()
        if not rewritten_text:
            preview_path = ResumeRewriteStorage.get_preview_path(document_id)
            if preview_path.exists():
                rewritten_text = preview_path.read_text(encoding="utf-8").strip()

        if not rewritten_text:
            raise ValidationException("Rewritten resume content is empty or cannot be retrieved")

        # Find parent / source resume for lineage
        parent_resume = (
            db.query(models.Resume)
            .filter(models.Resume.user_id == user.id)
            .order_by(models.Resume.created_at.desc())
            .first()
        )

        validation_warnings = []
        original_text = (parent_resume.parsed_text or parent_resume.extracted_text or "") if parent_resume else ""

        # Fact-checking safeguard: verify experience/company and degree mentions against original text
        if original_text:
            structured_data = rewrite_rec.structured_data if rewrite_rec else {}
            experience_entries = structured_data.get("experience", []) if isinstance(structured_data, dict) else []
            for exp in experience_entries:
                company = exp.get("company", "").strip()
                if company and len(company) > 3 and company.lower() not in original_text.lower():
                    validation_warnings.append(
                        f"Unverified employer claim: '{company}' was not detected in original resume text. Please review."
                    )
            education_entries = structured_data.get("education", []) if isinstance(structured_data, dict) else []
            for edu in education_entries:
                college = edu.get("college", "").strip()
                if college and len(college) > 3 and college.lower() not in original_text.lower():
                    validation_warnings.append(
                        f"Unverified educational institution: '{college}' was not detected in original resume text."
                    )

        parent_version = parent_resume.version_number if parent_resume and parent_resume.version_number else 1
        new_version_number = parent_version + 1
        default_label = f"v{new_version_number}.0 (AI Rewrite)"
        if target_role_title:
            default_label = f"v{new_version_number}.0 ({target_role_title})"
        chosen_label = version_label.strip() if version_label and version_label.strip() else default_label

        base_filename = parent_resume.file_name or parent_resume.original_filename if parent_resume else "Resume.pdf"
        stem = base_filename.rsplit(".", 1)[0]
        ext = base_filename.rsplit(".", 1)[1] if "." in base_filename else "pdf"
        new_filename = f"{stem}_v{new_version_number}.{ext}"

        # Extract skills and calculate scores
        extracted_skills = [skill.to_dict() for skill in SkillExtractor.extract_hybrid(rewritten_text)]
        expanded_skills = cls._expand_skills(extracted_skills)

        base_analysis = ATSEngine.calculate_base_quality(rewritten_text, expanded_skills)
        new_base_score = base_analysis["score"]

        has_target = bool(job_description and job_description.strip()) or bool(target_role_title and target_role_title.strip())
        new_job_score = None
        if has_target:
            jd = (job_description or "").strip()
            if not jd and target_role_title:
                jd = f"Target Role: {target_role_title}. Key skills required for {target_role_title}."
            job_analysis = ATSEngine.calculate_job_match(rewritten_text, expanded_skills, jd)
            new_job_score = job_analysis["score"]
            active_score = new_job_score
            active_analysis = job_analysis
            active_mode = ATSEngine.MODE_JOB_MATCH
        else:
            active_score = new_base_score
            active_analysis = base_analysis
            active_mode = ATSEngine.MODE_BASE_QUALITY

        try:
            new_resume = models.Resume(
                user_id=user.id,
                parent_resume_id=parent_resume.id if parent_resume else None,
                version_number=new_version_number,
                version_label=chosen_label,
                original_filename=new_filename,
                file_name=new_filename,
                parsed_text=rewritten_text,
                extracted_text=rewritten_text,
                ats_score=active_score,
                base_quality_score=new_base_score,
                overall_feedback="Generated via AI Rewrite and saved as an authoritative version.",
            )
            db.add(new_resume)
            db.flush()

            cls._store_skills(db, new_resume.id, expanded_skills)
            cls._extract_and_store_evidence(db, new_resume.id, rewritten_text, extracted_skills)
            cls._store_breakdown(db, new_resume.id, active_analysis["breakdown"])
            cls._store_embedding(db, new_resume.id, rewritten_text)

            # Store assessment run
            analysis_record = models.ResumeAnalysis(
                resume_id=new_resume.id,
                user_id=user.id,
                scoring_mode=active_mode,
                target_role_title=target_role_title,
                target_job_description=job_description if job_description else None,
                overall_score=active_score,
                match_verdict=active_analysis.get("verdict", "Good Quality"),
                algorithm_version="v2.0-ats-intelligence",
            )
            db.add(analysis_record)
            db.flush()

            for dim_key, dim_val in active_analysis.get("dimensions", {}).items():
                db.add(
                    models.ResumeAnalysisDimension(
                        analysis_id=analysis_record.id,
                        dimension_key=dim_key,
                        raw_score=float(dim_val.get("raw_score", 0.0)),
                        weighted_score=float(dim_val.get("weighted_score", 0.0)),
                        weight_factor=float(dim_val.get("weight", 0.0)),
                        evaluation_status=dim_val.get("status", "evaluated"),
                        diagnostic_notes=dim_val.get("notes"),
                    )
                )

            # Compute authentic score delta
            score_delta = None
            delta_explanation = None
            if parent_resume:
                old_base = parent_resume.base_quality_score or parent_resume.ats_score
                if old_base is not None and not has_target:
                    score_delta = int(round(new_base_score - old_base))
                    if score_delta >= 0:
                        delta_explanation = f"Base Quality increased by +{score_delta} points through improved section completeness, action verbs, and format hygiene."
                    else:
                        delta_explanation = f"Base Quality changed by {score_delta} points."
                elif has_target:
                    delta_explanation = "Job-specific ATS match calculated against target role. Direct delta requires comparing identical target role criteria."
                else:
                    delta_explanation = "Baseline comparison unavailable."

            db.commit()
        except Exception:
            db.rollback()
            raise

        return {
            "new_resume_id": new_resume.id,
            "parent_resume_id": parent_resume.id if parent_resume else new_resume.id,
            "version_number": new_version_number,
            "version_label": chosen_label,
            "file_name": new_filename,
            "base_quality_score": int(round(new_base_score)),
            "job_match_score": int(round(new_job_score)) if new_job_score is not None else None,
            "score_delta": score_delta,
            "delta_explanation": delta_explanation,
            "validation_warnings": validation_warnings,
            "created_at": new_resume.created_at,
        }

