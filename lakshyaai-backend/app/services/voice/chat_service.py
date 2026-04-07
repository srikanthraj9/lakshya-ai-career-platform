from __future__ import annotations

import os
from typing import Any

import requests

from app.core.config import settings
from app.core.exceptions import ExternalServiceException, ValidationException


OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = "openai/gpt-4o-mini"
SYSTEM_PROMPT = "You are a helpful voice assistant like ChatGPT."


def _normalize_messages(messages: list[Any]) -> list[dict[str, str]]:
    normalized_messages: list[dict[str, str]] = []

    for message in messages:
        if isinstance(message, dict):
            role = str(message.get("role") or "").strip().lower()
            content = str(message.get("content") or "").strip()
        else:
            role = str(getattr(message, "role", "") or "").strip().lower()
            content = str(getattr(message, "content", "") or "").strip()

        if role not in {"user", "assistant"} or not content:
            continue

        normalized_messages.append({"role": role, "content": content})

    return normalized_messages


def chat_with_ai(messages: list[Any]) -> str:
    api_key = (os.getenv("OPENROUTER_API_KEY") or "").strip()
    if not api_key:
        raise ExternalServiceException("OpenRouter API key is not configured")

    normalized_messages = _normalize_messages(messages)
    if not normalized_messages:
        raise ValidationException("At least one valid conversation message is required")

    response = requests.post(
        OPENROUTER_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": OPENROUTER_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                *normalized_messages,
            ],
        },
        timeout=settings.llm_timeout_seconds,
    )

    try:
        data = response.json()
    except ValueError as exc:
        print("Response:", response.text)
        raise ExternalServiceException("OpenRouter returned invalid JSON") from exc

    print("Response:", data)

    if response.status_code >= 400:
        provider_message = ""
        if isinstance(data, dict):
            error_payload = data.get("error")
            if isinstance(error_payload, dict):
                provider_message = str(error_payload.get("message") or "").strip()
        raise ExternalServiceException(provider_message or "Voice assistant request failed")

    try:
        reply = str(data["choices"][0]["message"]["content"]).strip()
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        print("ERROR:", data)
        raise ExternalServiceException("AI failed to respond") from exc

    if not reply:
        raise ExternalServiceException("AI failed to respond")

    return reply
