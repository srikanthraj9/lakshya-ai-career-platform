from sqlalchemy.orm import Session
from app.db import models


class SkillProgressEngine:

    @staticmethod
    def get_skill_progress(db: Session, user_id):

        resumes = db.query(models.Resume).filter(
            models.Resume.user_id == user_id
        ).all()

        ats_scores = [r.ats_score for r in resumes if r.ats_score]

        skills = db.query(models.ResumeSkill).join(
            models.Resume,
            models.ResumeSkill.resume_id == models.Resume.id
        ).filter(
            models.Resume.user_id == user_id
        ).all()

        skill_list = list(set([s.skill_name for s in skills]))

        return {
            "ats_trend": ats_scores,
            "skills_learned": skill_list
        }