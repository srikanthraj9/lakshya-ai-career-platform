from __future__ import annotations

from typing import Any


class CopilotResponseFormatter:
    SKILL_REAL_WORLD_CONTEXT = {
        "sql": "SQL is part of day-to-day backend work because teams need joins, aggregations, and reporting logic behind APIs and dashboards.",
        "postgresql": "PostgreSQL is common in production systems for transactions, schema design, and performance tuning in data-heavy applications.",
        "docker": "Docker is used across startups and larger teams to package services consistently and ship the same app from local development to production.",
        "fastapi": "FastAPI is useful in real backend teams for building typed APIs, internal tooling, and ML-facing services with clear validation.",
        "react": "React is widely used for product interfaces, admin dashboards, and workflow-heavy tools where teams need fast iteration.",
        "typescript": "TypeScript helps engineering teams move faster with fewer runtime mistakes in large frontend and full-stack codebases.",
        "python": "Python is heavily used for backend services, automation, data tooling, and ML pipelines in product teams.",
        "aws": "AWS matters because many companies deploy APIs, storage, queues, and databases there, so cloud familiarity translates directly to job readiness.",
    }

    @staticmethod
    def _normalize_text(value: Any) -> str:
        if isinstance(value, str):
            cleaned = " ".join(value.replace("\n", " ").split()).strip()
            if cleaned.startswith("{") or cleaned.startswith("["):
                return ""
            return cleaned
        if isinstance(value, (int, float, bool)):
            return str(value)
        return ""

    @classmethod
    def _normalize_list(cls, value: Any) -> list[str]:
        if isinstance(value, str):
            text = cls._normalize_text(value)
            return [text] if text else []
        if not isinstance(value, list):
            return []
        items: list[str] = []
        for item in value:
            if isinstance(item, str):
                text = cls._normalize_text(item)
                if text:
                    items.append(text)
            elif isinstance(item, dict):
                for key in ("title", "text", "action", "reason", "description", "body"):
                    text = cls._normalize_text(item.get(key))
                    if text:
                        items.append(text)
                        break
        return items

    @classmethod
    def _skill_context(cls, skill: str) -> str:
        normalized = (skill or "").strip().lower()
        if normalized in cls.SKILL_REAL_WORLD_CONTEXT:
            return cls.SKILL_REAL_WORLD_CONTEXT[normalized]
        return f"{skill} shows up in real engineering work when teams ship features, debug systems, and improve reliability."

    @classmethod
    def _default_sections(cls, *, intent: str, profile: dict[str, Any]) -> dict[str, dict[str, Any]]:
        target_role = cls._normalize_text(profile.get("target_role")) or "your next target role"
        strengths = cls._normalize_list(profile.get("strengths")) or [
            f"You already have visible alignment with {target_role} through {', '.join(profile.get('matched_skills', [])[:3]) or 'your existing technical base'}."
        ]
        gaps = cls._normalize_list(profile.get("focus_skills") or profile.get("skill_gaps"))
        recommendations = profile.get("recommendations") or []
        action_items = []
        for index, step in enumerate(recommendations[:3], start=1):
            if isinstance(step, dict):
                action = cls._normalize_text(step.get("action"))
                project = cls._normalize_text(step.get("project"))
                if action and project:
                    action_items.append(f"Step {index}: {action} Build this as proof: {project}")
                elif action:
                    action_items.append(f"Step {index}: {action}")
        if not action_items:
            action_items = [
                f"Step {index}: Build a proof-driven project around {skill} and write measurable resume bullets from it."
                for index, skill in enumerate(gaps[:3], start=1)
            ]

        sections: dict[str, dict[str, Any]] = {}
        if intent in {"general_advice", "resume_improvement"}:
            sections["profile_summary"] = {
                "title": "Profile Summary",
                "body": (
                    f"Right now you are closest to {target_role}. Your profile is directionally solid, "
                    f"but recruiters will still want stronger evidence in {', '.join(gaps[:3]) or 'project depth and positioning'}."
                ),
            }
        if intent in {"general_advice", "skill_gap"} and gaps:
            sections["key_gaps"] = {
                "title": "Key Gaps",
                "items": [f"{skill}: {cls._skill_context(skill)}" for skill in gaps[:4]],
            }
        if intent in {"general_advice", "resume_improvement"}:
            sections["strengths"] = {
                "title": "Strengths",
                "items": strengths[:4],
            }
        if intent in {"general_advice", "project_help", "skill_gap", "resume_improvement"}:
            sections["recommended_actions"] = {
                "title": "Recommended Actions",
                "items": action_items[:4],
            }
        if intent in {"general_advice", "project_help", "skill_gap"} and gaps:
            sections["real_world_context"] = {
                "title": "Real-World Context",
                "items": [cls._skill_context(skill) for skill in gaps[:3]],
            }
        return sections

    @classmethod
    def _normalize_sections(cls, value: Any) -> dict[str, dict[str, Any]]:
        if not isinstance(value, dict):
            return {}
        sections: dict[str, dict[str, Any]] = {}
        for key, raw_section in value.items():
            if not isinstance(raw_section, dict):
                continue
            title = cls._normalize_text(raw_section.get("title")) or key.replace("_", " ").title()
            body = cls._normalize_text(raw_section.get("body"))
            items = cls._normalize_list(raw_section.get("items"))
            if not title or (not body and not items):
                continue
            sections[key] = {
                "title": title,
                "body": body,
                "items": items[:5],
            }
        return sections

    @classmethod
    def _normalize_resources(cls, value: Any, *, profile: dict[str, Any]) -> list[dict[str, str]]:
        resources: list[dict[str, str]] = []
        if isinstance(value, list):
            for item in value:
                if not isinstance(item, dict):
                    continue
                title = cls._normalize_text(item.get("title"))
                if not title:
                    continue
                resources.append(
                    {
                        "title": title,
                        "url": cls._normalize_text(item.get("url")),
                        "reason": cls._normalize_text(item.get("reason")),
                    }
                )
        if resources:
            return resources[:4]

        fallback: list[dict[str, str]] = []
        for step in (profile.get("recommendations") or [])[:3]:
            if not isinstance(step, dict):
                continue
            title = cls._normalize_text(step.get("skill") or step.get("action"))
            if not title:
                continue
            fallback.append(
                {
                    "title": title,
                    "url": cls._normalize_text(step.get("video")),
                    "reason": cls._normalize_text(step.get("project") or step.get("rationale")),
                }
            )
        return fallback[:4]

    @classmethod
    def fallback_response(cls, *, intent: str, question: str, profile: dict[str, Any]) -> dict[str, Any]:
        target_role = cls._normalize_text(profile.get("target_role")) or "the strongest next-fit role"
        gaps = cls._normalize_list(profile.get("focus_skills") or profile.get("skill_gaps"))

        if intent == "greeting":
            reply = (
                f"Hi. I’ve reviewed your profile and you look closest to {target_role}. "
                f"I can help with resume fixes, project ideas, missing skills, or interview prep."
            )
            sections: dict[str, dict[str, Any]] = {}
        elif intent == "resume_improvement":
            reply = (
                f"For {target_role}, your resume needs sharper proof, not more buzzwords. "
                f"I would focus on measurable outcomes and clearer evidence around {', '.join(gaps[:2]) or 'your target skills'}."
            )
            sections = cls._default_sections(intent=intent, profile=profile)
        elif intent == "project_help":
            reply = (
                f"The fastest way to strengthen your profile for {target_role} is to build one project that proves "
                f"{', '.join(gaps[:2]) or 'production-style execution'} in a realistic workflow."
            )
            sections = cls._default_sections(intent=intent, profile=profile)
        elif intent == "skill_gap":
            reply = (
                f"The highest-leverage gap for you is {', '.join(gaps[:2]) or 'stronger execution depth'}. "
                f"I would close that through one concrete build instead of passive study."
            )
            sections = cls._default_sections(intent=intent, profile=profile)
        else:
            reply = (
                f"Based on your current profile, {target_role} is the most sensible direction. "
                f"Your next improvement should center on {', '.join(gaps[:2]) or 'better project proof and role targeting'}."
            )
            sections = cls._default_sections(intent=intent, profile=profile)

        suggestions = []
        if gaps:
            suggestions.append(f"Do you want a project plan to practice {gaps[0]}?")
        suggestions.append(f"Should I help tailor your resume for {target_role}?")
        suggestions.append("Do you want me to suggest two role-specific project ideas?")

        return {
            "reply": reply,
            "intent": intent,
            "suggestions": suggestions[:3],
            "optional_sections": sections,
            "resources": cls._normalize_resources([], profile=profile),
        }

    @classmethod
    def format_response(
        cls,
        *,
        payload: dict[str, Any] | None,
        intent: str,
        question: str,
        profile: dict[str, Any],
        previous_suggestions: list[str] | None = None,
    ) -> dict[str, Any]:
        if not isinstance(payload, dict):
            payload = {}

        fallback = cls.fallback_response(intent=intent, question=question, profile=profile)
        reply = cls._normalize_text(payload.get("reply")) or fallback["reply"]
        suggestions = cls._normalize_list(payload.get("suggestions")) or list(fallback["suggestions"])
        if previous_suggestions:
            previous = {item.lower() for item in previous_suggestions}
            suggestions = [item for item in suggestions if item.lower() not in previous]
        if not suggestions:
            suggestions = list(fallback["suggestions"])

        sections = cls._normalize_sections(payload.get("optional_sections"))
        if not sections:
            sections = fallback["optional_sections"]

        resources = cls._normalize_resources(payload.get("resources"), profile=profile)

        return {
            "reply": reply,
            "intent": intent,
            "suggestions": suggestions[:4],
            "optional_sections": sections,
            "resources": resources,
        }
