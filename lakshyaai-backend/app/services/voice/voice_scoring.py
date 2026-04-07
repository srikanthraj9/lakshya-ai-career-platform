from __future__ import annotations

import json
import os
import re

import requests

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = "openai/gpt-4o-mini"
SYSTEM_PROMPT = "You are a professional interview coach"


def _empty_response(feedback: str) -> dict[str, object]:
    return {
        "transcript": "",
        "scores": {
            "technical": 0,
            "communication": 0,
            "confidence": 0,
        },
        "feedback": feedback,
    }


def _extract_json(content: str) -> dict[str, object]:
    try:
        parsed = json.loads(content)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        match = re.search(r"```(?:json)?\s*(.+?)\s*```", content, re.DOTALL | re.IGNORECASE)
        if not match:
            return {}

        try:
            parsed = json.loads(match.group(1))
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}


def _bounded_score(value: object, default: int) -> int:
    try:
        numeric = int(float(str(value)))
    except (TypeError, ValueError):
        return default
    return max(0, min(100, numeric))


def _format_feedback(payload: dict[str, object], raw_content: str) -> str:
    strengths = payload.get("strengths")
    improvements = payload.get("improvements")
    confidence_level = str(payload.get("confidence_level") or "").strip()
    summary = str(payload.get("summary") or "").strip()

    formatted_sections: list[str] = []
    if summary:
        formatted_sections.append(summary)
    if isinstance(strengths, list) and strengths:
        formatted_sections.append("Strengths: " + "; ".join(str(item) for item in strengths))
    if isinstance(improvements, list) and improvements:
        formatted_sections.append("Improvements: " + "; ".join(str(item) for item in improvements))
    if confidence_level:
        formatted_sections.append(f"Confidence level: {confidence_level}")

    return "\n\n".join(formatted_sections) if formatted_sections else raw_content


def _evaluation_unavailable_response(transcript: str) -> dict[str, object]:
    return {
        "transcript": transcript,
        "scores": {
            "technical": 0,
            "communication": 0,
            "confidence": 0,
        },
        "feedback": "AI evaluation is currently unavailable. Please try again.",
    }


def score_voice_answer(*, transcript: str, question: str = "", role: str = "Software Engineer") -> dict[str, object]:
    normalized_transcript = transcript.strip()
    if not normalized_transcript:
        return _empty_response("No answer detected. Please speak clearly.")

    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return _evaluation_unavailable_response(normalized_transcript)

    prompt = (
        "Evaluate the following spoken interview answer.\n\n"
        f"Target role: {role.strip() or 'Software Engineer'}\n"
        f"Interview question: {question.strip() or 'General interview question'}\n\n"
        f"Transcript:\n{normalized_transcript}\n\n"
        "Return valid JSON with these fields:\n"
        "- technical_score: integer 0-100\n"
        "- communication_score: integer 0-100\n"
        "- confidence_score: integer 0-100\n"
        "- overall_score: integer 0-100\n"
        "- strengths: array of short strings\n"
        "- improvements: array of short strings\n"
        "- confidence_level: short string\n"
        "- summary: concise coaching feedback paragraph\n"
    )

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
    }

    try:
        response = requests.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=30,
        )
    except requests.RequestException as exc:
        print(str(exc))
        return _evaluation_unavailable_response(normalized_transcript)

    if response.status_code >= 400:
        print(response.text)
        return _evaluation_unavailable_response(normalized_transcript)

    try:
        data = response.json()
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError, ValueError):
        print(response.text)
        return _evaluation_unavailable_response(normalized_transcript)

    parsed = _extract_json(content)
    if not parsed:
        return {
            "transcript": normalized_transcript,
            "scores": {
                "technical": 0,
                "communication": 0,
                "confidence": 0,
            },
            "feedback": content,
        }

    overall_score = _bounded_score(parsed.get("overall_score"), 0)
    technical_score = _bounded_score(parsed.get("technical_score"), overall_score)
    communication_score = _bounded_score(parsed.get("communication_score"), overall_score)
    confidence_score = _bounded_score(parsed.get("confidence_score"), overall_score)

    return {
        "transcript": normalized_transcript,
        "scores": {
            "technical": technical_score,
            "communication": communication_score,
            "confidence": confidence_score,
        },
        "feedback": _format_feedback(parsed, content),
    }
