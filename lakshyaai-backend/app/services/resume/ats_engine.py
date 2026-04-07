from __future__ import annotations

from collections.abc import Sequence

from app.services.resume.action_verb_engine import ActionVerbEngine
from app.services.resume.contracts import ATSBreakdown, ExtractedSkill
from app.services.resume.format_engine import FormatEngine
from app.services.resume.keyword_engine import KeywordEngine
from app.services.resume.missing_skill_engine import MissingSkillEngine
from app.services.resume.section_engine import SectionEngine


class ATSEngine:
    @staticmethod
    def _normalize_skills(extracted_skills: Sequence[ExtractedSkill | dict]) -> list[ExtractedSkill]:
        normalized: list[ExtractedSkill] = []
        for skill in extracted_skills:
            if isinstance(skill, ExtractedSkill):
                normalized.append(skill)
                continue

            normalized.append(
                ExtractedSkill(
                    skill=skill.get("skill") or skill.get("skill_name", ""),
                    category=skill.get("category") or skill.get("skill_category", "general"),
                    confidence=float(skill.get("confidence") or skill.get("confidence_score", 0.0)),
                    source=skill.get("source", "keyword"),
                    frequency=int(skill.get("frequency", 1)),
                )
            )
        return [skill for skill in normalized if skill.skill]

    @classmethod
    def calculate(cls, extracted_skills: Sequence[ExtractedSkill | dict]) -> float:
        skills = cls._normalize_skills(extracted_skills)
        if not skills:
            return 0.0

        unique_skills = {skill.skill for skill in skills}
        categories = {skill.category for skill in skills}
        avg_confidence = sum(skill.confidence for skill in skills) / len(skills)

        volume_score = min((len(unique_skills) / 12) * 60, 60)
        diversity_score = min((len(categories) / 6) * 30, 30)
        confidence_score = avg_confidence * 10

        return round(min(volume_score + diversity_score + confidence_score, 100), 2)

    @classmethod
    def calculate_pro_ats(
        cls,
        resume_text: str,
        extracted_skills: Sequence[ExtractedSkill | dict],
        job_description: str = "",
    ) -> dict:
        skill_diversity = cls.calculate(extracted_skills)
        keyword_match = KeywordEngine.score(resume_text, job_description)
        section_coverage = SectionEngine.score(resume_text)
        formatting = FormatEngine.score(resume_text)
        action_verbs = ActionVerbEngine.score(resume_text)

        breakdown = ATSBreakdown(
            keyword_match=keyword_match,
            skill_diversity=skill_diversity,
            formatting=formatting,
            action_verbs=action_verbs,
            section_coverage=section_coverage,
        )

        final_score = round(
            min(
                keyword_match * 0.35
                + skill_diversity * 0.25
                + formatting * 0.20
                + action_verbs * 0.10
                + section_coverage * 0.10,
                100,
            )
        )

        return {
            "score": int(final_score),
            "ats_score": int(final_score),
            "breakdown": breakdown.to_dict(),
        }

    @classmethod
    def full_analysis(
        cls,
        resume_text: str,
        extracted_skills: Sequence[ExtractedSkill | dict],
        job_description: str = "",
    ) -> dict:
        pro_ats = cls.calculate_pro_ats(resume_text, extracted_skills, job_description)
        missing_skills = MissingSkillEngine.detect_missing_skills(resume_text, job_description)

        return {
            "score": pro_ats["score"],
            "ats_score": pro_ats["ats_score"],
            "breakdown": pro_ats["breakdown"],
            "missing_skills": [skill.to_dict() for skill in missing_skills],
        }
