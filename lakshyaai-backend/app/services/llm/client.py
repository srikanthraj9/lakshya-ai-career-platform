from __future__ import annotations

import json
import re
from typing import Any

import requests

from app.core.config import settings
from app.core.exceptions import ExternalServiceException


class LLMClient:
    def __init__(self) -> None:
        if settings.openai_api_key:
            self.provider = "openai"
            self.api_key = settings.openai_api_key
            self.base_url = settings.openai_base_url
        elif settings.openrouter_api_key:
            self.provider = "openrouter"
            self.api_key = settings.openrouter_api_key
            self.base_url = settings.openrouter_base_url
        else:
            self.provider = "disabled"
            self.api_key = None
            self.base_url = ""

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    def _build_model_name(self, model: str | None) -> str:
        configured_model = model or settings.llm_model
        if self.provider == "openai" and configured_model.startswith("openai/"):
            return configured_model.split("/", 1)[1]
        return configured_model

    def _headers(self) -> dict[str, str]:
        if not self.api_key:
            raise ExternalServiceException("LLM provider is not configured")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        if self.provider == "openrouter":
            headers["HTTP-Referer"] = "https://lakshyaai.local"
            headers["X-Title"] = "LakshyaAI Resume Intelligence"
        return headers

    def chat(
        self,
        prompt: str,
        *,
        system_prompt: str | None = None,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int = 1400,
        timeout_seconds: int | None = None,
    ) -> str:
        if not self.is_configured:
            return ""

        messages: list[dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload: dict[str, Any] = {
            "model": self._build_model_name(model),
            "messages": messages,
            "temperature": settings.llm_temperature if temperature is None else temperature,
            "max_tokens": max_tokens,
        }

        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=self._headers(),
                json=payload,
                timeout=timeout_seconds or settings.llm_timeout_seconds,
            )
        except requests.exceptions.RequestException as err:
            raise ExternalServiceException(f"LLM network error: {err}") from err

        if response.status_code >= 400:
            raise ExternalServiceException(
                "LLM request failed",
                details={"status_code": response.status_code, "provider": self.provider},
            )

        data = response.json()
        try:
            return data["choices"][0]["message"]["content"].strip()
        except (KeyError, IndexError, TypeError) as exc:
            raise ExternalServiceException("Invalid LLM response payload") from exc

    def chat_json(
        self,
        prompt: str,
        *,
        system_prompt: str | None = None,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int = 1600,
        timeout_seconds: int | None = None,
    ) -> dict[str, Any] | list[Any]:
        content = self.chat(
            prompt,
            system_prompt=system_prompt,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout_seconds=timeout_seconds,
        )
        if not content:
            return {}

        return self._parse_json_content(content)

    @staticmethod
    def _parse_json_content(content: str) -> dict[str, Any] | list[Any]:
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            match = re.search(r"```(?:json)?\s*(.+?)\s*```", content, re.DOTALL | re.IGNORECASE)
            if match:
                return json.loads(match.group(1))

            start = content.find("{")
            end = content.rfind("}")
            if start != -1 and end != -1 and end > start:
                return json.loads(content[start : end + 1])

            start = content.find("[")
            end = content.rfind("]")
            if start != -1 and end != -1 and end > start:
                return json.loads(content[start : end + 1])

            raise ExternalServiceException("Unable to parse structured LLM response")


llm_client = LLMClient()
