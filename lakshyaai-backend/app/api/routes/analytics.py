from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.db.database import get_db
from app.db import models
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# =========================
# ATS SCORE TREND
# =========================

@router.get("/ats-trend")
def get_ats_trend(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):

    trends = (
        db.query(models.UserPerformanceTrend)
        .filter(models.UserPerformanceTrend.user_id == current_user.id)
        .order_by(models.UserPerformanceTrend.created_at)
        .all()
    )

    # -------------------------
    # SAFE FALLBACK
    # -------------------------

    if not trends:

        resumes = (
            db.query(models.Resume.created_at, models.Resume.ats_score)
            .filter(models.Resume.user_id == current_user.id)
            .order_by(models.Resume.created_at)
            .all()
        )

        return [
            {
                "date": r.created_at,
                "score": r.ats_score
            }
            for r in resumes if r.ats_score
        ]

    return trends


# =========================
# SKILL PROGRESS
# =========================

@router.get("/skill-growth")
def get_skill_growth(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):

    skills = (
        db.query(models.UserSkillProgress)
        .filter(models.UserSkillProgress.user_id == current_user.id)
        .order_by(models.UserSkillProgress.frequency.desc())
        .all()
    )

    # -------------------------
    # SAFE FALLBACK
    # -------------------------

    if not skills:

        resume_skills = (
            db.query(models.ResumeSkill.skill_name)
            .join(models.Resume, models.ResumeSkill.resume_id == models.Resume.id)
            .filter(models.Resume.user_id == current_user.id)
            .all()
        )

        skill_map = {}

        for s in resume_skills:
            skill_map[s.skill_name] = skill_map.get(s.skill_name, 0) + 1

        return [
            {
                "skill": k,
                "count": v
            }
            for k, v in skill_map.items()
        ]

    return skills


# =========================
# PERFORMANCE SUMMARY
# =========================

@router.get("/summary")
def get_performance_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):

    total_resumes = (
        db.query(func.count(models.Resume.id))
        .filter(models.Resume.user_id == current_user.id)
        .scalar()
        or 0
    )

    avg_ats = (
        db.query(models.UserPerformanceTrend)
        .filter(models.UserPerformanceTrend.user_id == current_user.id)
        .with_entities(models.UserPerformanceTrend.ats_score)
        .all()
    )

    avg_score = 0.0

    if avg_ats:
        avg_score = sum([x.ats_score for x in avg_ats]) / len(avg_ats)

    # =========================
    # SAFE FALLBACK
    # =========================

    if not avg_ats:

        resume_scores = (
            db.query(models.Resume.ats_score)
            .filter(models.Resume.user_id == current_user.id)
            .all()
        )

        if resume_scores:
            valid_scores = [x.ats_score for x in resume_scores if x.ats_score is not None]
            if valid_scores:
                avg_score = sum(valid_scores) / len(valid_scores)

    # =========================
    # COUNT UNIQUE SKILLS
    # =========================

    skill_count = (
        db.query(func.count(func.distinct(models.ResumeSkill.skill_name)))
        .join(models.Resume, models.ResumeSkill.resume_id == models.Resume.id)
        .filter(models.Resume.user_id == current_user.id)
        .scalar()
        or 0
    )

    # =========================
    # INTERVIEW SCORE
    # =========================

    interview_score = 0.0

    try:
        interview_scores = (
            db.query(models.InterviewSession.overall_score)
            .filter(
                models.InterviewSession.user_id == current_user.id,
                models.InterviewSession.overall_score.isnot(None),
            )
            .all()
        )

        if interview_scores:
            valid_interview_scores = [x.overall_score for x in interview_scores if x.overall_score is not None]
            if valid_interview_scores:
                interview_score = sum(valid_interview_scores) / len(valid_interview_scores)

    except Exception:
        interview_score = 0.0

    return {
        "ats_score": round(avg_score, 2),
        "total_resumes": total_resumes,
        "skill_count": skill_count,
        "interview_score": round(interview_score, 2)
    }


# =========================
# DASHBOARD OVERVIEW
# =========================

@router.get("/dashboard")
def get_dashboard_overview(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):

    total_resumes = (
        db.query(func.count(models.Resume.id))
        .filter(models.Resume.user_id == current_user.id)
        .scalar()
        or 0
    )

    trends = (
        db.query(models.UserPerformanceTrend)
        .filter(models.UserPerformanceTrend.user_id == current_user.id)
        .order_by(models.UserPerformanceTrend.created_at)
        .all()
    )

    ats_scores = [t.ats_score for t in trends]

    # -------------------------
    # FALLBACK FOR ATS TREND
    # -------------------------

    if not ats_scores:

        resumes = (
            db.query(models.Resume.ats_score)
            .filter(models.Resume.user_id == current_user.id)
            .all()
        )

        ats_scores = [r.ats_score for r in resumes if r.ats_score]

    skills = (
        db.query(models.UserSkillProgress)
        .filter(models.UserSkillProgress.user_id == current_user.id)
        .order_by(models.UserSkillProgress.frequency.desc())
        .all()
    )

    skill_list = [
        {
            "skill": s.skill_name,
            "frequency": s.frequency
        }
        for s in skills
    ]

    # -------------------------
    # FALLBACK FOR SKILLS
    # -------------------------

    if not skill_list:

        resume_skills = (
            db.query(models.ResumeSkill.skill_name)
            .join(models.Resume, models.ResumeSkill.resume_id == models.Resume.id)
            .filter(models.Resume.user_id == current_user.id)
            .all()
        )

        skill_map = {}

        for s in resume_skills:
            skill_map[s.skill_name] = skill_map.get(s.skill_name, 0) + 1

        skill_list = [
            {"skill": k, "frequency": v}
            for k, v in skill_map.items()
        ]

    avg_score = 0.0

    if ats_scores:
        avg_score = sum(ats_scores) / len(ats_scores)

    return {
        "total_resumes": total_resumes,
        "average_ats_score": round(avg_score, 2),
        "ats_trend": ats_scores,
        "skills": skill_list
    }