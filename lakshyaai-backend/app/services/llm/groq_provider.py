from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
from typing import Any

import httpx

from app.core.config import settings
from app.core.exceptions import ExternalServiceException, ValidationException

logger = logging.getLogger("lakshyaai.groq")


class GroqProvider:
    """
    Centralized, high-performance Groq LLM provider adapter.
    Features:
    - Connection-pooled asynchronous & synchronous clients
    - Bounded retries with exponential backoff on transient errors (429, 503)
    - Zero retry on permanent client errors (400, 401, 403, 404, 422)
    - Sensitive data redaction in structured logging
    - Robust JSON schema extraction from markdown and bracket delimiters
    - Clean resource management and lifecycle hooks
    """

    DEFAULT_MODEL = "llama-3.3-70b-versatile"
    FALLBACK_MODELS: tuple[str, ...] = (
        "openai/gpt-oss-120b",
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-20b",
    )
    MAX_RETRIES = 2
    INITIAL_BACKOFF = 0.5

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        default_model: str | None = None,
    ) -> None:
        self._explicit_key = api_key
        self._explicit_base_url = base_url
        self._explicit_model = default_model
        self._async_client: httpx.AsyncClient | None = None
        self._sync_client: httpx.Client | None = None

    @property
    def api_key(self) -> str:
        if self._explicit_key is not None:
            return self._explicit_key.strip()
        if "GROQ_API_KEY" in os.environ:
            return os.environ["GROQ_API_KEY"].strip()
        return (getattr(settings, "groq_api_key", "") or "").strip()

    @property
    def base_url(self) -> str:
        return (
            self._explicit_base_url
            or os.getenv("GROQ_BASE_URL", "")
            or getattr(settings, "groq_base_url", "")
            or "https://api.groq.com/openai/v1"
        ).rstrip("/")

    @property
    def default_model(self) -> str:
        return (
            self._explicit_model
            or os.getenv("GROQ_MODEL", "")
            or getattr(settings, "groq_model", "")
            or self.DEFAULT_MODEL
        )

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    def _get_headers(self) -> dict[str, str]:
        if not self.is_configured:
            raise ExternalServiceException("Groq API key is not configured")
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "LakshyaAI-Backend/1.0",
        }

    def _get_async_client(self, timeout_seconds: float) -> httpx.AsyncClient:
        timeout = httpx.Timeout(timeout_seconds, connect=5.0, write=10.0, pool=5.0)
        if self._async_client is None or self._async_client.is_closed:
            limits = httpx.Limits(max_keepalive_connections=20, max_connections=50)
            self._async_client = httpx.AsyncClient(timeout=timeout, limits=limits)
        return self._async_client

    def _get_sync_client(self, timeout_seconds: float) -> httpx.Client:
        timeout = httpx.Timeout(timeout_seconds, connect=5.0, write=10.0, pool=5.0)
        if self._sync_client is None or self._sync_client.is_closed:
            limits = httpx.Limits(max_keepalive_connections=20, max_connections=50)
            self._sync_client = httpx.Client(timeout=timeout, limits=limits)
        return self._sync_client

    async def close(self) -> None:
        """Close managed connection pools cleanly."""
        if self._async_client is not None and not self._async_client.is_closed:
            await self._async_client.aclose()
            self._async_client = None
        if self._sync_client is not None and not self._sync_client.is_closed:
            self._sync_client.close()
            self._sync_client = None

    def _build_payload(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int = 1400,
        response_format: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        target_model = model or self.default_model
        payload: dict[str, Any] = {
            "model": target_model,
            "messages": messages,
            "temperature": settings.llm_temperature if temperature is None else temperature,
            "max_tokens": max_tokens,
        }
        if response_format:
            payload["response_format"] = response_format
        return payload

    async def complete(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int = 1400,
        response_format: dict[str, str] | None = None,
        timeout_seconds: float | None = None,
    ) -> str:
        """Execute an asynchronous chat completion with bounded retries."""
        if not self.is_configured:
            raise ExternalServiceException("Groq API key is not configured")

        payload = self._build_payload(
            messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format=response_format,
        )
        timeout = timeout_seconds or float(settings.llm_timeout_seconds)
        client = self._get_async_client(timeout)
        endpoint = f"{self.base_url}/chat/completions"

        logger.debug(
            "Dispatching async Groq request turns=%d model=%s",
            len(messages),
            payload["model"],
        )

        last_exception: Exception | None = None
        for attempt in range(self.MAX_RETRIES + 1):
            try:
                start_time = time.perf_counter()
                response = await client.post(
                    endpoint,
                    headers=self._get_headers(),
                    json=payload,
                )
                duration_ms = (time.perf_counter() - start_time) * 1000

                # Success
                if response.status_code == 200:
                    data = response.json()
                    logger.debug(
                        "Groq request completed status=200 duration=%.1fms model=%s",
                        duration_ms,
                        payload["model"],
                    )
                    return self._extract_content(data)

                # Transient rate-limit or overload: evaluate retry
                if response.status_code in {429, 503} and attempt < self.MAX_RETRIES:
                    retry_after = self._parse_retry_after(response.headers.get("Retry-After"))
                    sleep_time = retry_after or (self.INITIAL_BACKOFF * (2**attempt))
                    logger.warning(
                        "Groq returned %d; retrying in %.2fs (attempt %d/%d)",
                        response.status_code,
                        sleep_time,
                        attempt + 1,
                        self.MAX_RETRIES,
                    )
                    await asyncio.sleep(sleep_time)
                    continue

                # Model unavailable / not accessible fallback
                if response.status_code == 404 and any(
                    phrase in response.text.lower()
                    for phrase in ("does not exist", "not have access", "model_not_found")
                ):
                    switched = False
                    for fb in self.FALLBACK_MODELS:
                        if fb != payload["model"]:
                            logger.warning(
                                "Groq model '%s' unavailable on key; switching to fallback '%s'",
                                payload["model"],
                                fb,
                            )
                            payload["model"] = fb
                            switched = True
                            break
                    if switched:
                        continue

                # Non-retryable error handling
                self._handle_error_response(response)

            except httpx.TimeoutException as exc:
                last_exception = exc
                logger.warning("Groq request timed out (attempt %d/%d)", attempt + 1, self.MAX_RETRIES)
                if attempt < self.MAX_RETRIES:
                    await asyncio.sleep(self.INITIAL_BACKOFF * (2**attempt))
                    continue
                raise ExternalServiceException(
                    "AI assistant response timed out. Please try again.",
                    details={"provider": "groq", "timeout": timeout},
                ) from exc

            except httpx.RequestError as exc:
                last_exception = exc
                logger.error("Groq network request error: %s", exc)
                if attempt < self.MAX_RETRIES:
                    await asyncio.sleep(self.INITIAL_BACKOFF * (2**attempt))
                    continue
                raise ExternalServiceException("Failed to reach the AI service") from exc

        if last_exception:
            raise ExternalServiceException(f"AI service request failed: {last_exception}") from last_exception
        raise ExternalServiceException("AI request could not be completed")

    def complete_sync(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int = 1400,
        response_format: dict[str, str] | None = None,
        timeout_seconds: float | None = None,
    ) -> str:
        """Execute a synchronous chat completion with bounded retries."""
        if not self.is_configured:
            raise ExternalServiceException("Groq API key is not configured")

        payload = self._build_payload(
            messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format=response_format,
        )
        timeout = timeout_seconds or float(settings.llm_timeout_seconds)
        client = self._get_sync_client(timeout)
        endpoint = f"{self.base_url}/chat/completions"

        logger.debug(
            "Dispatching sync Groq request turns=%d model=%s",
            len(messages),
            payload["model"],
        )

        last_exception: Exception | None = None
        for attempt in range(self.MAX_RETRIES + 1):
            try:
                start_time = time.perf_counter()
                response = client.post(
                    endpoint,
                    headers=self._get_headers(),
                    json=payload,
                )
                duration_ms = (time.perf_counter() - start_time) * 1000

                if response.status_code == 200:
                    data = response.json()
                    logger.debug(
                        "Groq sync request completed status=200 duration=%.1fms model=%s",
                        duration_ms,
                        payload["model"],
                    )
                    return self._extract_content(data)

                if response.status_code in {429, 503} and attempt < self.MAX_RETRIES:
                    retry_after = self._parse_retry_after(response.headers.get("Retry-After"))
                    sleep_time = retry_after or (self.INITIAL_BACKOFF * (2**attempt))
                    logger.warning(
                        "Groq sync returned %d; retrying in %.2fs (attempt %d/%d)",
                        response.status_code,
                        sleep_time,
                        attempt + 1,
                        self.MAX_RETRIES,
                    )
                    time.sleep(sleep_time)
                    continue

                # Model unavailable / not accessible fallback
                if response.status_code == 404 and any(
                    phrase in response.text.lower()
                    for phrase in ("does not exist", "not have access", "model_not_found")
                ):
                    switched = False
                    for fb in self.FALLBACK_MODELS:
                        if fb != payload["model"]:
                            logger.warning(
                                "Groq model '%s' unavailable on key; switching to fallback '%s'",
                                payload["model"],
                                fb,
                            )
                            payload["model"] = fb
                            switched = True
                            break
                    if switched:
                        continue

                self._handle_error_response(response)

            except httpx.TimeoutException as exc:
                last_exception = exc
                logger.warning("Groq sync request timed out (attempt %d/%d)", attempt + 1, self.MAX_RETRIES)
                if attempt < self.MAX_RETRIES:
                    time.sleep(self.INITIAL_BACKOFF * (2**attempt))
                    continue
                raise ExternalServiceException(
                    "AI assistant response timed out. Please try again.",
                    details={"provider": "groq", "timeout": timeout},
                ) from exc

            except httpx.RequestError as exc:
                last_exception = exc
                logger.error("Groq sync network error: %s", exc)
                if attempt < self.MAX_RETRIES:
                    time.sleep(self.INITIAL_BACKOFF * (2**attempt))
                    continue
                raise ExternalServiceException("Failed to reach the AI service") from exc

        if last_exception:
            raise ExternalServiceException(f"AI service request failed: {last_exception}") from last_exception
        raise ExternalServiceException("AI request could not be completed")

    @staticmethod
    def _ensure_json_keyword(messages: list[dict[str, str]]) -> list[dict[str, str]]:
        if any("json" in m.get("content", "").lower() for m in messages):
            return messages
        formatted = [dict(m) for m in messages]
        if formatted and formatted[-1].get("role") == "user":
            formatted[-1]["content"] = f"{formatted[-1]['content']}\nOutput response strictly as valid JSON."
        else:
            formatted.append({"role": "user", "content": "Output response strictly as valid JSON."})
        return formatted

    async def complete_json(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int = 1600,
        timeout_seconds: float | None = None,
    ) -> dict[str, Any] | list[Any]:
        """Execute async completion and parse validated JSON output."""
        formatted_messages = self._ensure_json_keyword(messages)
        raw_text = await self.complete(
            formatted_messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
            timeout_seconds=timeout_seconds,
        )
        return self._parse_json(raw_text)

    def complete_json_sync(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int = 1600,
        timeout_seconds: float | None = None,
    ) -> dict[str, Any] | list[Any]:
        """Execute sync completion and parse validated JSON output."""
        formatted_messages = self._ensure_json_keyword(messages)
        raw_text = self.complete_sync(
            formatted_messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
            timeout_seconds=timeout_seconds,
        )
        return self._parse_json(raw_text)

    @staticmethod
    def _extract_content(data: dict[str, Any]) -> str:
        try:
            choices = data.get("choices")
            if not choices or not isinstance(choices, list):
                raise ExternalServiceException("AI response contains no choices")
            content = choices[0].get("message", {}).get("content", "")
            cleaned = str(content or "").strip()
            if not cleaned:
                raise ExternalServiceException("AI assistant returned an empty response")
            return cleaned
        except (KeyError, IndexError, TypeError) as exc:
            logger.error("Failed to parse Groq response structure: %s", exc)
            raise ExternalServiceException("AI service returned an unparseable response") from exc

    @staticmethod
    def _parse_retry_after(header_val: str | None) -> float | None:
        if not header_val:
            return None
        try:
            val = float(header_val)
            return min(val, 5.0)  # Bound to 5s max sleep
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _handle_error_response(response: httpx.Response) -> None:
        status = response.status_code
        logger.error("Groq provider error status=%d", status)

        try:
            body = response.json()
        except Exception:
            body = {}

        error_msg = ""
        if isinstance(body, dict):
            err_dict = body.get("error")
            if isinstance(err_dict, dict):
                error_msg = str(err_dict.get("message") or "").strip()

        if status == 401:
            raise ExternalServiceException(
                "AI provider authentication failed. Check GROQ_API_KEY configuration.",
                details={"status_code": status, "provider": "groq"},
            )
        if status == 429:
            raise ExternalServiceException(
                "AI service is currently rate limited. Please try again shortly.",
                details={"status_code": status, "provider": "groq"},
            )
        if status >= 500:
            raise ExternalServiceException(
                "AI provider is experiencing technical difficulties. Please try again.",
                details={"status_code": status, "provider": "groq"},
            )

        raise ExternalServiceException(
            error_msg or "AI assistant request failed",
            details={"status_code": status, "provider": "groq"},
        )

    @classmethod
    def _parse_json(cls, raw: str) -> dict[str, Any] | list[Any]:
        cleaned = raw.strip()
        # Direct parse attempt
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        # Markdown block attempt (```json ... ```)
        match = re.search(r"```(?:json)?\s*(.+?)\s*```", cleaned, re.DOTALL | re.IGNORECASE)
        if match:
            try:
                return json.loads(match.group(1).strip())
            except json.JSONDecodeError:
                pass

        # Balanced brace / bracket scan
        for start_char, end_char in [("{", "}"), ("[", "]")]:
            start = cleaned.find(start_char)
            end = cleaned.rfind(end_char)
            if start != -1 and end != -1 and end > start:
                try:
                    return json.loads(cleaned[start : end + 1])
                except json.JSONDecodeError:
                    pass

        logger.warning("Groq response was not valid JSON")
        raise ExternalServiceException("Failed to parse structured AI output")


groq_provider = GroqProvider()
