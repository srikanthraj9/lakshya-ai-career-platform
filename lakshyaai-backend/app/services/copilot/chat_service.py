from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.services.copilot.context_engine import CopilotContextEngine
from app.services.copilot.intent_engine import CopilotIntentEngine
from app.services.copilot.memory_store import copilot_memory
from app.services.copilot.response_formatter import CopilotResponseFormatter
from app.services.llm.client import llm_client


logger = logging.getLogger("lakshyaai.copilot")


class CareerCopilotService:
    SYSTEM_PROMPT = (
        "You are an expert AI Career Coach. Respond conversationally like a sharp human mentor. "
        "Analyze the user's profile and answer only what the user is asking. "
        "Do not repeat a full report unless explicitly requested. "
        "Use the profile data intelligently, not mechanically. "
        "If the user greets you, reply naturally without dumping profile data. "
        "If the user asks about resume improvement, focus on resume advice. "
        "If the user asks about skill gaps, explain the missing skills and why they matter in real jobs. "
        "If the user asks for project help, suggest concrete portfolio projects tied to target roles. "
        "Return JSON only with keys: reply, suggestions, optional_sections, resources."
    )

    @staticmethod
    def _conversation_key(*, user_id: UUID, resume_id: UUID) -> str:
        return f"{user_id}:{resume_id}"

    @staticmethod
    def _history_block(history: list[dict[str, str]]) -> str:
        if not history:
            return "[]"
        return json.dumps(history[-5:], ensure_ascii=True)

    @staticmethod
    def _client_context_dict(client_context: Any) -> dict[str, Any]:
        if client_context is None:
            return {}
        if hasattr(client_context, "model_dump"):
            return client_context.model_dump(exclude_none=True)
        if isinstance(client_context, dict):
            return client_context
        return {}

    @classmethod
    def _relevant_section_hint(cls, intent: str) -> str:
        if intent == "greeting":
            return "Return only a warm reply and 2-3 relevant suggestions. optional_sections should usually be empty."
        if intent == "resume_improvement":
            return (
                "Focus on resume quality. optional_sections may include resume_focus and recommended_actions. "
                "Do not include unrelated sections."
            )
        if intent == "skill_gap":
            return (
                "Focus on the most important missing skills. optional_sections may include key_gaps, recommended_actions, "
                "and real_world_context."
            )
        if intent == "project_help":
            return (
                "Focus on project suggestions that strengthen the user's profile. optional_sections may include project_ideas, "
                "recommended_actions, and real_world_context."
            )
        return (
            "Give strategic career guidance. optional_sections may include profile_summary, strengths, key_gaps, "
            "recommended_actions, and real_world_context, but only when relevant."
        )

    @classmethod
    def _reasoning_prompt(
        cls,
        *,
        profile: dict[str, Any],
        question: str,
        intent: str,
        history: list[dict[str, str]],
        previous_suggestions: list[str],
    ) -> str:
        compact_profile = {
            "resume_name": profile.get("resume_name"),
            "ats_score": profile.get("ats_score"),
            "skills": profile.get("skills", [])[:15],
            "target_role": profile.get("target_role"),
            "career_verdict": profile.get("career_verdict"),
            "confidence": profile.get("confidence"),
            "focus_skills": profile.get("focus_skills", [])[:6],
            "strengths": profile.get("strengths", [])[:4],
            "skill_gaps": profile.get("skill_gaps", [])[:6],
            "matched_skills": profile.get("matched_skills", [])[:6],
            "top_matches": profile.get("top_matches", [])[:3],
        }
        return (
            "User profile JSON:\n"
            f"{json.dumps(compact_profile, ensure_ascii=True)}\n\n"
            "Conversation history (last turns):\n"
            f"{cls._history_block(history)}\n\n"
            "Previously suggested follow-ups:\n"
            f"{json.dumps(previous_suggestions[-5:], ensure_ascii=True)}\n\n"
            f"Detected intent: {intent}\n"
            f"User question: {question}\n\n"
            "Instructions:\n"
            "- Be concise, insightful, and specific.\n"
            "- Adapt to the user's exact question.\n"
            "- Avoid repeating earlier advice unless it directly answers the current question.\n"
            "- Use real-world context about how companies use the relevant skills.\n"
            "- Prefer actionable tasks over generic learning advice.\n"
            f"- {cls._relevant_section_hint(intent)}\n"
            "- optional_sections must be an object with keys you choose. Each value must be an object with title, optional body, and optional items array.\n"
            "- suggestions must be personalized follow-up questions.\n"
            "- resources must be a short list of objects with title, url, and reason.\n"
            "- Never output raw Python dicts or raw JSON inside reply/body/item strings.\n"
        )

    @classmethod
    def _llm_response(
        cls,
        *,
        profile: dict[str, Any],
        question: str,
        intent: str,
        history: list[dict[str, str]],
        previous_suggestions: list[str],
    ) -> dict[str, Any]:
        payload = llm_client.chat_json(
            cls._reasoning_prompt(
                profile=profile,
                question=question,
                intent=intent,
                history=history,
                previous_suggestions=previous_suggestions,
            ),
            system_prompt=cls.SYSTEM_PROMPT,
            temperature=0.45,
            max_tokens=1100,
        )
        if not isinstance(payload, dict):
            raise ValueError("Copilot LLM returned a non-object response")
        return payload

    @classmethod
    def chat(
        cls,
        db: Session,
        *,
        user_id: UUID,
        resume_id: UUID,
        message: str,
        context_profile: Any = None,
    ) -> dict[str, Any]:
        client_context = cls._client_context_dict(context_profile)
        profile = CopilotContextEngine.build_profile(
            db,
            resume_id=resume_id,
            user_id=user_id,
            client_context=client_context,
        )
        intent = CopilotIntentEngine.classify(message)
        memory_key = cls._conversation_key(user_id=user_id, resume_id=resume_id)
        history = copilot_memory.history(memory_key, limit=6)
        previous_suggestions = copilot_memory.suggested_topics(memory_key, limit=8)

        logger.info(
            "Copilot chat request user_id=%s resume_id=%s intent=%s history_turns=%s",
            user_id,
            resume_id,
            intent,
            len(history),
        )

        if llm_client.is_configured:
            try:
                llm_payload = cls._llm_response(
                    profile=profile,
                    question=message,
                    intent=intent,
                    history=history,
                    previous_suggestions=previous_suggestions,
                )
            except Exception:
                logger.exception("Copilot LLM failed, using fallback formatter")
                llm_payload = None
        else:
            logger.warning("Copilot LLM not configured, using fallback formatter")
            llm_payload = None

        formatted = CopilotResponseFormatter.format_response(
            payload=llm_payload,
            intent=intent,
            question=message,
            profile=profile,
            previous_suggestions=previous_suggestions,
        )

        copilot_memory.remember_turn(memory_key, role="user", content=message)
        copilot_memory.remember_turn(memory_key, role="assistant", content=formatted["reply"])
        copilot_memory.remember_suggestions(memory_key, formatted.get("suggestions", []))

        return {
            **formatted,
            "memory_turns": len(copilot_memory.history(memory_key, limit=10)),
        }
