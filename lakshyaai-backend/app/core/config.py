import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv
from pydantic import BaseModel, Field

# Ensure environment variables are loaded
staging_env_path = Path(__file__).resolve().parents[2] / ".env.staging"
prod_env_path = Path(__file__).resolve().parents[2] / ".env"

if os.getenv("ENVIRONMENT", "").strip().lower() == "staging" and staging_env_path.exists():
    load_dotenv(staging_env_path, override=True)
elif prod_env_path.exists():
    load_dotenv(prod_env_path)
load_dotenv()


class Settings(BaseModel):
    PROJECT_NAME: str = "Lakshya AI Backend"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    API_V1_PREFIX: str = "/api"

    # Database
    DATABASE_URL: str = (
        os.getenv("STAGING_DATABASE_URL")
        if os.getenv("ENVIRONMENT", "").strip().lower() == "staging" and os.getenv("STAGING_DATABASE_URL")
        else os.getenv(
            "DATABASE_URL",
            "postgresql://postgres:postgres@localhost:5432/lakshyaai",
        )
    )

    # Security & JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "lakshya-ai-default-jwt-development-secret-key-32-chars-minimum")
    ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    # CORS
    CORS_ORIGINS: List[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000",
        ).split(",")
        if origin.strip()
    ]

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    RATE_LIMIT_PER_MINUTE_AUTH: int = int(os.getenv("RATE_LIMIT_PER_MINUTE_AUTH", "15"))
    RATE_LIMIT_PER_MINUTE_AI: int = int(os.getenv("RATE_LIMIT_PER_MINUTE_AI", "30"))

    # AI & Services
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "gemini")
    AI_API_KEY: str = os.getenv("AI_API_KEY", "")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_base_url: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "")
    openrouter_base_url: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    groq_base_url: str = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
    groq_model: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    llm_model: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
    llm_temperature: float = float(os.getenv("LLM_TEMPERATURE", "0.2"))
    llm_timeout_seconds: int = int(os.getenv("LLM_TIMEOUT_SECONDS", "30"))
    llm_aux_timeout_seconds: int = Field(default_factory=lambda: int(os.getenv("LLM_AUX_TIMEOUT_SECONDS", "30")))
    enable_llm_resume_feedback: bool = Field(default_factory=lambda: os.getenv("ENABLE_LLM_RESUME_FEEDBACK", "true").lower() == "true")
    enable_llm_skill_extraction: bool = Field(default_factory=lambda: os.getenv("ENABLE_LLM_SKILL_EXTRACTION", "true").lower() == "true")

    # Resume Optimization & Rewriting
    resume_rewrite_chunk_chars: int = Field(default_factory=lambda: int(os.getenv("RESUME_REWRITE_CHUNK_CHARS", "8192")))
    resume_rewrite_output_dir: str = Field(default_factory=lambda: os.getenv("RESUME_REWRITE_OUTPUT_DIR", "storage/rewrites"))
    latex_command: str = Field(default_factory=lambda: os.getenv("LATEX_COMMAND", "pdflatex"))

    # Embeddings
    embedding_dimension: int = int(os.getenv("EMBEDDING_DIMENSION", "1536"))
    sentence_transformer_model: str = os.getenv("SENTENCE_TRANSFORMER_MODEL", "all-MiniLM-L6-v2")
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    embedding_provider: str = os.getenv("EMBEDDING_PROVIDER", "sentence_transformers")

    # Admin Bootstrap
    ADMIN_EMAILS: List[str] = [
        email.strip().lower()
        for email in os.getenv(
            "ADMIN_EMAILS",
            "srikanthuppalapati09@gmail.com,admin@lakshya.ai",
        ).split(",")
        if email.strip()
    ]

    # SMTP Email Configuration
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173")

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"


settings = Settings()
