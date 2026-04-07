from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


def _get_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


def _get_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


def _get_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    openrouter_api_key: str | None = os.getenv("OPENROUTER_API_KEY")
    openai_api_key: str | None = os.getenv("OPENAI_API_KEY")
    openrouter_base_url: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    openai_base_url: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    llm_model: str = os.getenv("LLM_MODEL", "openai/gpt-4o-mini")
    llm_temperature: float = _get_float("LLM_TEMPERATURE", 0.2)
    llm_timeout_seconds: int = _get_int("LLM_TIMEOUT_SECONDS", 60)
    llm_aux_timeout_seconds: int = _get_int("LLM_AUX_TIMEOUT_SECONDS", 8)
    enable_llm_skill_extraction: bool = _get_bool("ENABLE_LLM_SKILL_EXTRACTION", False)
    enable_llm_resume_feedback: bool = _get_bool("ENABLE_LLM_RESUME_FEEDBACK", False)
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "openai/text-embedding-3-small")
    embedding_dimension: int = _get_int("EMBEDDING_DIMENSION", 1536)
    embedding_provider: str = os.getenv("EMBEDDING_PROVIDER", "").strip().lower()
    sentence_transformer_model: str = os.getenv(
        "SENTENCE_TRANSFORMER_MODEL",
        "sentence-transformers/all-MiniLM-L6-v2",
    )
    resume_rewrite_chunk_chars: int = _get_int("RESUME_REWRITE_CHUNK_CHARS", 6000)
    resume_rewrite_output_dir: str = os.getenv("RESUME_REWRITE_OUTPUT_DIR", "generated/resume_rewrites")
    latex_command: str = os.getenv("LATEX_COMMAND", "pdflatex")


settings = Settings()

OPENROUTER_API_KEY = settings.openrouter_api_key
OPENAI_API_KEY = settings.openai_api_key
