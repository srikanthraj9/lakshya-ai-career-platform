from __future__ import annotations

import requests

from app.core.config import settings
from app.core.exceptions import ValidationException


def transcribe_audio(*, file_bytes: bytes, filename: str, content_type: str | None = None) -> str:
    if not file_bytes:
        raise ValidationException("Uploaded audio file is empty")

    if not filename:
        raise ValidationException("Audio file name is required")

    if content_type and not content_type.startswith("audio/") and content_type != "application/octet-stream":
        raise ValidationException("Only audio uploads are supported")

    api_key = (settings.openai_api_key or "").strip()
    if not api_key:
        return ""

    try:
        response = requests.post(
            f"{settings.openai_base_url}/audio/transcriptions",
            headers={
                "Authorization": f"Bearer {api_key}",
            },
            data={
                "model": "whisper-1",
                "response_format": "json",
            },
            files={
                "file": (
                    filename,
                    file_bytes,
                    content_type or "audio/webm",
                ),
            },
            timeout=settings.llm_timeout_seconds,
        )
        if response.status_code >= 400:
            print(response.text)
            return ""

        data = response.json()
        return str(data.get("text") or "").strip()
    except (requests.RequestException, ValueError) as exc:
        print(str(exc))
        return ""
