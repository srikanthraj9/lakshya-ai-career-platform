from __future__ import annotations

import re


class CopilotIntentEngine:
    GREETINGS = {"hi", "hello", "hey", "good morning", "good evening", "yo"}

    @classmethod
    def classify(cls, message: str) -> str:
        normalized = re.sub(r"\s+", " ", (message or "").strip().lower())
        if not normalized:
            return "general_advice"

        if normalized in cls.GREETINGS or any(normalized.startswith(greeting) for greeting in cls.GREETINGS):
            return "greeting"

        if any(keyword in normalized for keyword in {"resume", "bullet", "ats", "cv", "rewrite"}):
            return "resume_improvement"

        if any(keyword in normalized for keyword in {"project", "portfolio", "build", "app idea"}):
            return "project_help"

        if any(keyword in normalized for keyword in {"skill gap", "missing skill", "learn next", "gap", "what should i learn", "missing"}):
            return "skill_gap"

        return "general_advice"
