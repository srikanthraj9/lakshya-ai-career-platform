from __future__ import annotations

import json
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.core.dependencies import get_current_user
from app.core.exceptions import ProcessingException, ValidationException
from app.db import models
from app.db.schemas import VoiceAnswerResponse, VoiceChatMessage, VoiceChatResponse, VoiceQuestionResponse
from app.services.voice.chat_service import chat_with_ai
from app.services.voice.question_generator import generate_question
from app.services.voice.speech_to_text import transcribe_audio
from app.services.voice.voice_scoring import score_voice_answer

router = APIRouter(prefix="/voice", tags=["Voice"])
logger = logging.getLogger("lakshyaai.voice")
DEFAULT_ROLE = "Software Engineer"
MIN_AUDIO_BYTES = 6_000

SUPPORTED_AUDIO_EXTENSIONS = {
    ".webm",
    ".wav",
    ".mp3",
    ".m4a",
    ".ogg",
}


def _parse_messages(raw_messages: str | None) -> list[dict[str, str]]:
    if not raw_messages:
        return []

    try:
        payload = json.loads(raw_messages)
    except json.JSONDecodeError as exc:
        raise ValidationException("Invalid conversation history payload") from exc

    if not isinstance(payload, list):
        raise ValidationException("Conversation history must be a list")

    normalized_messages: list[dict[str, str]] = []
    for item in payload:
        message = VoiceChatMessage.model_validate(item)
        normalized_messages.append(
            {
                "role": message.role,
                "content": message.content,
            }
        )

    return normalized_messages


def _resolve_role(role: str | None, user: models.User) -> str:
    if role and role.strip() and role.strip() != DEFAULT_ROLE:
        return role.strip()
    if user.career_profile and user.career_profile.target_role:
        return user.career_profile.target_role
    return role.strip() if role and role.strip() else DEFAULT_ROLE


@router.get("/question", response_model=VoiceQuestionResponse)
async def get_voice_question(
    role: str = DEFAULT_ROLE,
    current_user: models.User = Depends(get_current_user),
):
    try:
        resolved_role = _resolve_role(role, current_user)
        logger.info("Voice question requested user_id=%s role=%s", current_user.id, resolved_role)
        return {
            "role": resolved_role,
            "question": generate_question(resolved_role),
        }
    except Exception as exc:
        logger.exception("Voice question generation failed user_id=%s", current_user.id)
        raise ProcessingException("Failed to generate interview question") from exc


@router.post("/analyze", response_model=VoiceAnswerResponse)
async def analyze_voice_answer(
    file: UploadFile = File(...),
    question: Annotated[str | None, Form()] = None,
    role: Annotated[str | None, Form()] = None,
    transcript: Annotated[str | None, Form()] = None,
    current_user: models.User = Depends(get_current_user),
):
    if not file.filename:
        raise ValidationException("Audio file is required")

    lower_name = file.filename.lower()
    if not any(lower_name.endswith(extension) for extension in SUPPORTED_AUDIO_EXTENSIONS):
        raise ValidationException("Unsupported audio format. Upload webm, wav, mp3, m4a, or ogg.")

    file_bytes = await file.read()
    if not file_bytes:
        raise ValidationException("Uploaded audio file is empty")
    if len(file_bytes) < MIN_AUDIO_BYTES:
        raise ValidationException("No voice detected. Please speak clearly.")

    try:
        resolved_role = _resolve_role(role, current_user)
        resolved_question = question.strip() if question else ""
        logger.info(
            "Voice answer received user_id=%s filename=%s size=%s role=%s",
            current_user.id,
            file.filename,
            len(file_bytes),
            resolved_role,
        )
        resolved_transcript = transcript.strip() if transcript else ""
        if not resolved_transcript:
            resolved_transcript = transcribe_audio(
                file_bytes=file_bytes,
                filename=file.filename,
                content_type=file.content_type,
            )

        response = score_voice_answer(
            transcript=resolved_transcript,
            question=resolved_question,
            role=resolved_role,
        )
        logger.info("Voice answer analyzed user_id=%s", current_user.id)
        return response
    except ValidationException:
        raise
    except Exception as exc:
        logger.exception("Voice answer analysis failed user_id=%s", current_user.id)
        raise ProcessingException("Failed to analyze voice answer") from exc


@router.post("/chat", response_model=VoiceChatResponse)
async def voice_chat(
    file: UploadFile = File(...),
    messages: Annotated[str | None, Form()] = None,
    transcript: Annotated[str | None, Form()] = None,
    current_user: models.User = Depends(get_current_user),
):
    if not file.filename:
        raise ValidationException("Audio file is required")

    lower_name = file.filename.lower()
    if not any(lower_name.endswith(extension) for extension in SUPPORTED_AUDIO_EXTENSIONS):
        raise ValidationException("Unsupported audio format. Upload webm, wav, mp3, m4a, or ogg.")

    file_bytes = await file.read()
    if not file_bytes:
        raise ValidationException("Uploaded audio file is empty")

    try:
        logger.info(
            "Voice chat request user_id=%s filename=%s size=%s",
            current_user.id,
            file.filename,
            len(file_bytes),
        )

        transcript_text = transcribe_audio(
            file_bytes=file_bytes,
            filename=file.filename,
            content_type=file.content_type,
        )

        if not transcript_text and transcript:
            transcript_text = transcript.strip()

        if len(file_bytes) < MIN_AUDIO_BYTES and not transcript_text:
            raise ValidationException("No voice detected. Please speak clearly.")

        if not transcript_text:
            raise ValidationException("No voice detected. Please speak clearly.")

        conversation = _parse_messages(messages)
        conversation.append({"role": "user", "content": transcript_text})
        reply = chat_with_ai(conversation)

        logger.info("Voice chat completed user_id=%s", current_user.id)
        return {
            "transcript": transcript_text,
            "reply": reply,
        }
    except ValidationException:
        raise
    except Exception as exc:
        logger.exception("Voice chat failed user_id=%s", current_user.id)
        raise ProcessingException("Failed to process voice chat") from exc
