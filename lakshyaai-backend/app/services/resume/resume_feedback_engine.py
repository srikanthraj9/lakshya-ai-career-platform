from __future__ import annotations

from app.core.config import settings
from app.services.llm.client import llm_client
from app.services.llm.prompts import RESUME_FEEDBACK_PROMPT
from app.services.resume.action_verb_engine import ActionVerbEngine
from app.services.resume.ats_engine import ATSEngine
from app.services.resume.format_engine import FormatEngine
from app.services.resume.missing_skill_engine import MissingSkillEngine


class ResumeFeedbackEngine:
    @staticmethod
    def _identify_weak_bullets(resume_text: str) -> list[str]:
        suggestions: list[str] = []
        for line in resume_text.splitlines():
            stripped = line.strip()
            if not stripped.startswith(("-", "*", "•")):
                continue
            bullet = stripped.lstrip("-*• ").strip()
            if len(bullet.split()) < 6:
                suggestions.append(f"Expand bullet with context and impact: {bullet}")
            if "%" not in bullet and not any(char.isdigit() for char in bullet):
                suggestions.append(f"Add measurable impact to bullet: {bullet}")
        return suggestions[:8]

    @staticmethod
    def _rule_based_feedback(resume_text: str, ats_analysis: dict) -> dict:
        formatting = FormatEngine.analyze(resume_text)
        action_verb_score = ActionVerbEngine.score(resume_text)
        weak_bullets = ResumeFeedbackEngine._identify_weak_bullets(resume_text)

        summary: list[str] = []
        if ats_analysis["score"] < 75:
            summary.append("Increase keyword coverage and section completeness to improve ATS score.")
        if action_verb_score < 65:
            summary.append("Start more bullets with strong action verbs.")
        if not weak_bullets:
            summary.append("Add quantified outcomes to the strongest experience bullets.")

        return {
            "summary": summary,
            "missing_skills": ats_analysis.get("missing_skills", []),
            "weak_bullet_points": weak_bullets,
            "formatting_issues": formatting["issues"],
            "llm_feedback": [],
        }

    @staticmethod
    def _llm_feedback(resume_text: str, job_description: str, ats_analysis: dict) -> dict:
        if not llm_client.is_configured or not settings.enable_llm_resume_feedback:
            return {}

        prompt = RESUME_FEEDBACK_PROMPT.format(
            job_description=job_description or "N/A",
            ats_score=ats_analysis["score"],
            missing_skills=", ".join(skill["skill"] for skill in ats_analysis.get("missing_skills", [])) or "None",
            resume_text=resume_text[:6000],
        )

        try:
            payload = llm_client.chat_json(
                prompt,
                temperature=0.1,
                max_tokens=900,
                timeout_seconds=settings.llm_aux_timeout_seconds,
            )
        except Exception:
            return {}

        return payload if isinstance(payload, dict) else {}

    @staticmethod
    def generate_feedback(
        resume_text: str,
        job_description: str = "",
        ats_analysis: dict | None = None,
    ) -> dict:
        if not resume_text.strip():
            return {
                "summary": ["Resume text is empty."],
                "missing_skills": [],
                "weak_bullet_points": [],
                "formatting_issues": ["Resume text is empty."],
                "llm_feedback": [],
            }

        analysis = ats_analysis or ATSEngine.full_analysis(resume_text, [], job_description)
        if not analysis.get("missing_skills") and job_description:
            analysis["missing_skills"] = [
                skill.to_dict()
                for skill in MissingSkillEngine.detect_missing_skills(resume_text, job_description)
            ]

        result = ResumeFeedbackEngine._rule_based_feedback(resume_text, analysis)
        llm_feedback = ResumeFeedbackEngine._llm_feedback(resume_text, job_description, analysis)

        for key in ("summary", "weak_bullet_points", "formatting_issues", "llm_feedback"):
            combined = result.get(key, []) + llm_feedback.get(key, [])
            seen: set[str] = set()
            deduped: list[str] = []
            for item in combined:
                if not isinstance(item, str):
                    continue
                normalized = item.strip()
                if normalized and normalized not in seen:
                    seen.add(normalized)
                    deduped.append(normalized)
            result[key] = deduped[:10]

        return result

    @staticmethod
    def generate_feedback_safe(
        resume_text: str,
        job_description: str = "",
        ats_analysis: dict | None = None,
    ) -> dict:
        try:
            return ResumeFeedbackEngine.generate_feedback(resume_text, job_description, ats_analysis)
        except Exception:
            return {
                "summary": ["Unable to generate resume feedback right now."],
                "missing_skills": [],
                "weak_bullet_points": [],
                "formatting_issues": [],
                "llm_feedback": [],
            }

    @staticmethod
    def generate_ats_feedback(
        resume_text: str,
        ats_score: float,
        missing_skills: list[dict] | None = None,
    ) -> dict:
        analysis = {
            "score": int(round(ats_score)),
            "missing_skills": missing_skills or [],
        }
        return ResumeFeedbackEngine.generate_feedback(resume_text, "", analysis)
