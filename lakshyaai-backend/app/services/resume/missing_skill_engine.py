from __future__ import annotations

from collections import Counter

from app.constants.skills import canonicalize_skill, get_skill_category
from app.services.resume.contracts import MissingSkill
from app.services.resume.skill_extractor import SkillExtractor


class MissingSkillEngine:
    @staticmethod
    def normalize(text: str) -> str:
        return text.lower().strip()

    @staticmethod
    def detect_missing_skills(
        resume_text: str,
        job_description: str = "",
        *,
        limit: int = 10,
    ) -> list[MissingSkill]:
        if not job_description.strip():
            return []

        resume_skills = {skill.skill for skill in SkillExtractor.extract_hybrid(resume_text)}
        jd_skills = SkillExtractor.extract_hybrid(job_description)
        skill_frequency = Counter(skill.skill for skill in jd_skills)

        missing: list[MissingSkill] = []
        for skill_name, frequency in skill_frequency.most_common():
            canonical = canonicalize_skill(skill_name)
            if canonical in resume_skills:
                continue

            importance = 5 if frequency >= 3 else 4 if frequency == 2 else 3
            missing.append(
                MissingSkill(
                    skill=canonical,
                    category=get_skill_category(canonical),
                    importance=importance,
                )
            )
            if len(missing) >= limit:
                break

        return missing
