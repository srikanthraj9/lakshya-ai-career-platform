from sqlalchemy.orm import Session
from app.db import models


class SkillGapEngine:
    @staticmethod
    def _normalize_skills(skills, *, exclude_related: bool = False):
        normalized = {}
        for skill in skills:
            if exclude_related and getattr(skill, "skill_category", "") == "related_skill":
                continue
            name = getattr(skill, "skill_name", skill)
            if not name:
                continue
            normalized[str(name).strip().lower()] = str(name).strip()
        return normalized

    @staticmethod
    def compare_skill_sets(resume_skills, role_skills):
        resume_skill_map = SkillGapEngine._normalize_skills(resume_skills, exclude_related=True)
        role_skill_map = SkillGapEngine._normalize_skills(role_skills)

        resume_skill_set = set(resume_skill_map.keys())
        role_skill_set = set(role_skill_map.keys())

        matched_keys = sorted(resume_skill_set.intersection(role_skill_set))
        missing_keys = sorted(role_skill_set - resume_skill_set)

        if len(role_skill_set) == 0:
            match_score = 0
        else:
            match_score = len(matched_keys) / len(role_skill_set)

        return {
            "matched_skills": [role_skill_map.get(key) or resume_skill_map.get(key) or key for key in matched_keys],
            "missing_skills": [role_skill_map.get(key) or key for key in missing_keys],
            "match_score": round(match_score * 100, 2),
        }

    @staticmethod
    def analyze(db: Session, resume_id, role_id):

        # -------------------------
        # GET RESUME SKILLS
        # -------------------------
        resume_skills = db.query(models.ResumeSkill).filter(
            models.ResumeSkill.resume_id == resume_id
        ).all()

        # -------------------------
        # GET ROLE SKILLS
        # -------------------------
        role_skills = db.query(models.RoleSkill).filter(
            models.RoleSkill.role_id == role_id
        ).all()
        return SkillGapEngine.compare_skill_sets(resume_skills, role_skills)
