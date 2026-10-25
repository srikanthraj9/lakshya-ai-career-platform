import os
import re
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(ENV_PATH)
load_dotenv()


def _clean_database_url(url: str | None) -> str | None:
    if not url:
        return url
    cleaned = re.sub(r"[?&]pgbouncer=true", "", url)
    if "?" not in cleaned and "&" in cleaned:
        cleaned = cleaned.replace("&", "?", 1)
    return cleaned


RAW_DB_URL = os.getenv("DATABASE_URL")
DATABASE_URL = _clean_database_url(RAW_DB_URL)

# Fallback to local SQLite if unconfigured or default placeholder password present
if not DATABASE_URL or "your-db-password" in DATABASE_URL:
    DATABASE_URL = "sqlite:///./lakshyaai.db"

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
else:
    connect_args["connect_timeout"] = 5

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args=connect_args,
)


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =========================
# NEW: DATABASE HEALTH CHECK
# =========================

def check_database_connection():
    """
    Simple health check to verify DB connectivity.
    Useful for monitoring or startup validation.
    """
    try:
        with engine.connect() as connection:
            return True
    except Exception as e:
        msg = str(e)
        sanitized = re.sub(r":([^/@:\s]+)@", r":***@", msg)
        print("Database connection error:", sanitized)
        return False


def create_tables():
    """
    Create all tables from SQLAlchemy models.
    Useful for development environments and testing suites.
    """
    from app.db import models  # noqa: F401
    Base.metadata.create_all(bind=engine)


# Auto-initialize tables when running against SQLite (development or test fallback)
if DATABASE_URL.startswith("sqlite"):
    try:
        create_tables()
    except Exception:
        pass


# =========================
# NEW: DROP ALL TABLES (DEV ONLY)
# =========================

def drop_tables():
    """
    Drop all tables (use carefully).
    Mainly for development resets.
    """
    Base.metadata.drop_all(bind=engine)