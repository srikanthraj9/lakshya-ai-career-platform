from __future__ import annotations

import logging
import re
from typing import Iterable
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db import models
from app.services.jobs.job_provider import JobProvider


logger = logging.getLogger("lakshyaai.jobs.engine")


class JobRecommendationEngine:
    MAX_RESULTS = 10
    MAX_LIVE_RESULTS = 20
    TECH_SIGNAL_SKILLS = {
        "python",
        "java",
        "javascript",
        "typescript",
        "react",
        "node.js",
        "node",
        "fastapi",
        "django",
        "flask",
        "postgresql",
        "sql",
        "docker",
        "aws",
        "git",
        "rest api",
        "machine learning",
        "data analysis",
        "pandas",
        "numpy",
    }
    TECH_TITLE_KEYWORDS = {
        "engineer",
        "developer",
        "software",
        "backend",
        "back-end",
        "frontend",
        "front-end",
        "full stack",
        "fullstack",
        "web",
        "data",
        "analytics",
        "machine learning",
        "ml",
        "ai",
        "platform",
        "devops",
        "cloud",
        "qa",
        "security",
    }
    TRACK_KEYWORDS = {
        "backend": {"backend", "back-end", "api", "platform", "python", "django", "fastapi", "flask"},
        "frontend": {"frontend", "front-end", "react", "ui", "web", "javascript", "typescript"},
        "data": {"data", "analytics", "machine learning", "ml", "ai", "python", "pandas", "sql"},
        "fullstack": {"full stack", "fullstack", "software", "developer", "engineer", "react", "api"},
    }

    @staticmethod
    def _normalize_skill(skill: str) -> str:
        return re.sub(r"\s+", " ", (skill or "").strip().lower())

    @classmethod
    def _normalize_skills(cls, skills: Iterable[str]) -> list[str]:
        normalized: list[str] = []
        seen: set[str] = set()
        for skill in skills:
            normalized_skill = cls._normalize_skill(skill)
            if normalized_skill and normalized_skill not in seen:
                seen.add(normalized_skill)
                normalized.append(normalized_skill)
        return normalized

    @staticmethod
    def _load_resume_or_404(db: Session, *, resume_id: UUID, user_id: UUID) -> models.Resume:
        resume = (
            db.query(models.Resume)
            .filter(models.Resume.id == resume_id, models.Resume.user_id == user_id)
            .first()
        )
        if resume is None:
            raise HTTPException(status_code=404, detail="Resume not found")
        return resume

    @classmethod
    def _load_resume_skills(cls, db: Session, *, resume_id: UUID) -> list[str]:
        skill_rows = (
            db.query(models.ResumeSkill)
            .filter(models.ResumeSkill.resume_id == resume_id)
            .order_by(models.ResumeSkill.confidence_score.desc().nullslast())
            .all()
        )
        return cls._normalize_skills(skill.skill_name for skill in skill_rows)

    @staticmethod
    def _job_text(job: dict) -> str:
        description = JobProvider.strip_html(job.get("description") or "")
        tags = " ".join(tag for tag in (job.get("tags") or []) if isinstance(tag, str))
        title = job.get("title") or ""
        company = job.get("company_name") or ""
        category = job.get("category") or ""
        return f"{title} {company} {category} {tags} {description}".lower()

    @classmethod
    def _infer_preferred_tracks(cls, skills: list[str], best_role: str) -> set[str]:
        lower_best_role = (best_role or "").lower()
        tracks: set[str] = set()

        if any(skill in skills for skill in {"python", "fastapi", "django", "flask", "rest api", "postgresql", "docker"}):
            tracks.add("backend")
        if any(skill in skills for skill in {"react", "javascript", "typescript", "html", "css"}):
            tracks.add("frontend")
        if any(skill in skills for skill in {"pandas", "numpy", "data analysis", "machine learning", "sql"}):
            tracks.add("data")
        if "full stack" in lower_best_role or ("backend" in tracks and "frontend" in tracks):
            tracks.add("fullstack")

        for track in cls.TRACK_KEYWORDS:
            if track in lower_best_role.replace("-", ""):
                tracks.add(track)

        return tracks

    @classmethod
    def _is_tech_resume(cls, skills: list[str]) -> bool:
        return any(skill in cls.TECH_SIGNAL_SKILLS for skill in skills)

    @classmethod
    def _has_tech_title_signal(cls, job: dict) -> bool:
        title_text = " ".join(
            [
                job.get("title") or "",
                job.get("category") or "",
            ]
        ).lower()
        return any(keyword in title_text for keyword in cls.TECH_TITLE_KEYWORDS)

    @classmethod
    def _score_job(cls, job: dict, *, skills: list[str], preferred_tracks: set[str], tech_resume: bool) -> dict | None:
        if not skills:
            return None

        job_text = cls._job_text(job)
        title_text = " ".join(
            [
                job.get("title") or "",
                job.get("category") or "",
            ]
        ).lower()

        if tech_resume and not cls._has_tech_title_signal(job):
            logger.info("Skipping non-tech job title=%s for tech resume", job.get("title"))
            return None

        matched_skills = [skill for skill in skills if skill in job_text]
        if not matched_skills:
            return None

        unique_matched = cls._normalize_skills(matched_skills)
        tag_values = cls._normalize_skills(job.get("tags") or [])
        track_hits = sum(
            1
            for track in preferred_tracks
            if any(keyword in title_text for keyword in cls.TRACK_KEYWORDS.get(track, set()))
        )
        title_hits = sum(1 for keyword in cls.TECH_TITLE_KEYWORDS if keyword in title_text)
        score = min(
            100,
            max(25, len(unique_matched) * 18 + track_hits * 12 + min(title_hits, 3) * 4 + len(tag_values[:3]) * 2),
        )
        why = (
            f"This job mentions {', '.join(unique_matched[:4])}, which overlaps with your resume skills."
        )
        logger.info(
            "Job match title=%s matched_skills=%s score=%s",
            job.get("title"),
            unique_matched,
            score,
        )
        return {
            "id": str(job.get("id") or ""),
            "title": job.get("title") or "Untitled role",
            "company": (job.get("company_name") or "").strip(),
            "location": job.get("candidate_required_location") or "Remote",
            "url": job.get("url") or "",
            "job_type": job.get("job_type") or "",
            "source": "Remotive",
            "match_score": score,
            "matched_skills": unique_matched,
            "skill_tags": tag_values[:8],
            "why": why,
            "published_at": job.get("publication_date"),
        }

    @classmethod
    def recommend_jobs(cls, db: Session, *, resume_id: UUID, user_id: UUID) -> dict[str, object]:
        resume = cls._load_resume_or_404(db, resume_id=resume_id, user_id=user_id)
        resume_skills = cls._load_resume_skills(db, resume_id=resume.id)
        career_state = (
            db.query(models.UserCareerState)
            .filter(models.UserCareerState.user_id == user_id)
            .first()
        )
        best_role = career_state.best_role if career_state else ""
        preferred_tracks = cls._infer_preferred_tracks(resume_skills, best_role)
        tech_resume = cls._is_tech_resume(resume_skills)
        logger.info("Resume skills for jobs resume_id=%s skills=%s", resume_id, resume_skills)

        if not resume_skills:
            logger.warning("No resume skills found for jobs resume_id=%s", resume_id)
            return {
                "resume_id": resume.id,
                "resume_skills": [],
                "jobs": [],
            }

        live_jobs = JobProvider.fetch_remote_jobs()
        scored_jobs = [
            scored
            for scored in (
                cls._score_job(
                    job,
                    skills=resume_skills,
                    preferred_tracks=preferred_tracks,
                    tech_resume=tech_resume,
                )
                for job in live_jobs
            )
            if scored is not None
        ]
        scored_jobs.sort(key=lambda item: item["match_score"], reverse=True)
        logger.info("Filtered live jobs resume_id=%s matched_count=%s", resume_id, len(scored_jobs))
        return {
            "resume_id": resume.id,
            "resume_skills": resume_skills,
            "jobs": scored_jobs[: cls.MAX_RESULTS],
        }

    @classmethod
    def get_live_jobs(cls) -> list[dict[str, object]]:
        live_jobs = JobProvider.fetch_remote_jobs()
        results: list[dict[str, object]] = []
        for job in live_jobs[: cls.MAX_LIVE_RESULTS]:
            results.append(
                {
                    "id": str(job.get("id") or ""),
                    "title": job.get("title") or "Untitled role",
                    "company": (job.get("company_name") or "").strip(),
                    "location": job.get("candidate_required_location") or "Remote",
                    "url": job.get("url") or "",
                    "job_type": job.get("job_type") or "",
                    "source": "Remotive",
                    "match_score": 0,
                    "matched_skills": [],
                    "skill_tags": cls._normalize_skills(job.get("tags") or [])[:8],
                    "why": "Live role from Remotive's public remote jobs feed.",
                    "published_at": job.get("publication_date"),
                }
            )
        return results
