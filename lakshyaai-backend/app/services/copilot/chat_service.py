from __future__ import annotations

import logging
import os
from typing import Any

import requests

from app.core.config import settings
from app.core.exceptions import ExternalServiceException, ValidationException


logger = logging.getLogger("lakshyaai.copilot")


class CareerCopilotService:
    SYSTEM_PROMPT = (
        "You are a helpful AI assistant like ChatGPT. "
        "You can answer any question clearly, accurately, and conversationally."
    )
    MODEL = "openai/gpt-4o-mini"

    @classmethod
    def _load_api_key(cls) -> str:
        api_key = (os.getenv("OPENROUTER_API_KEY") or "").strip()
        key_preview = f"{api_key[:8]}...{api_key[-4:]}" if len(api_key) >= 12 else "<missing>"
        print("[Copilot] OPENROUTER_API_KEY loaded:", bool(api_key), "preview:", key_preview)

        if not api_key:
            raise ExternalServiceException("OpenRouter API key is not configured")

        return api_key

    @classmethod
    def _serialize_messages(cls, messages: list[Any]) -> list[dict[str, str]]:
        serialized: list[dict[str, str]] = [{"role": "system", "content": cls.SYSTEM_PROMPT}]

        for message in messages:
            role = getattr(message, "role", None)
            content = getattr(message, "content", None)

            if role is None and isinstance(message, dict):
                role = message.get("role")
                content = message.get("content")

            normalized_role = str(role or "").strip().lower()
            normalized_content = str(content or "").strip()

            if normalized_role not in {"user", "assistant"}:
                continue
            if not normalized_content:
                continue

            serialized.append(
                {
                    "role": normalized_role,
                    "content": normalized_content,
                }
            )

        if len(serialized) == 1:
            raise ValidationException("At least one valid message is required")

        return serialized

    @classmethod
    def _headers(cls) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {cls._load_api_key()}",
            "Content-Type": "application/json",
        }

    @classmethod
    def chat_with_ai(cls, messages: list[Any]) -> str:
        payload = {
            "model": cls.MODEL,
            "messages": cls._serialize_messages(messages),
        }
        print("[Copilot] OpenRouter request turns:", len(payload["messages"]))

        try:
            response = requests.post(
                f"{settings.openrouter_base_url}/chat/completions",
                headers=cls._headers(),
                json=payload,
                timeout=settings.llm_timeout_seconds,
            )
        except requests.RequestException as exc:
            logger.exception("Copilot OpenRouter request failed")
            raise ExternalServiceException("Failed to reach the AI assistant service") from exc

        raw_text = response.text
        print("[Copilot] OpenRouter status:", response.status_code)

        try:
            data = response.json()
        except ValueError as exc:
            print("[Copilot] OpenRouter raw response:", raw_text)
            raise ExternalServiceException("OpenRouter returned invalid JSON") from exc

        print("[Copilot] OpenRouter response:", data)

        if response.status_code >= 400:
            logger.error("Copilot OpenRouter error status=%s body=%s", response.status_code, raw_text)
            provider_message = ""
            if isinstance(data, dict):
                error_block = data.get("error")
                if isinstance(error_block, dict):
                    provider_message = str(error_block.get("message") or "").strip()

            if response.status_code == 401:
                raise ExternalServiceException(
                    "OpenRouter authentication failed. Verify OPENROUTER_API_KEY and restart the backend.",
                    details={"status_code": response.status_code, "provider_message": provider_message},
                )

            raise ExternalServiceException(
                provider_message or "AI assistant request failed",
                details={"status_code": response.status_code},
            )

        try:
            reply = str(data["choices"][0]["message"]["content"]).strip()
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            logger.exception("Copilot OpenRouter payload parse failed")
            raise ExternalServiceException("AI failed to respond") from exc

        if not reply:
            raise ExternalServiceException("AI assistant returned an empty response")

        return reply

    @classmethod
    def chat(cls, *, messages: list[Any]) -> dict[str, str]:
        reply = cls.chat_with_ai(messages)
        return {"reply": reply}
