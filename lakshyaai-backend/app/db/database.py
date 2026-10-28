import os
import re
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

KNOWN_PRODUCTION_HOST = "aws-0-ap-northeast-2.pooler.supabase.com"

current_env = os.getenv("ENVIRONMENT", "").strip().lower()
staging_env_path = Path(__file__).resolve().parent.parent.parent / ".env.staging"
prod_env_path = Path(__file__).resolve().parent.parent.parent / ".env"

if current_env == "staging" and staging_env_path.exists():
    load_dotenv(staging_env_path, override=True)
elif prod_env_path.exists():
    load_dotenv(prod_env_path)
load_dotenv()


def _clean_database_url(url: str | None) -> str | None:
    if not url:
        return url
    cleaned = re.sub(r"[?&]pgbouncer=true", "", url)
    if "?" not in cleaned and "&" in cleaned:
        cleaned = cleaned.replace("&", "?", 1)
    return cleaned


RAW_DB_URL = os.getenv("STAGING_DATABASE_URL") if current_env == "staging" and os.getenv("STAGING_DATABASE_URL") else os.getenv("DATABASE_URL")
DATABASE_URL = _clean_database_url(RAW_DB_URL)

# ---------------------------------------------------------------------------
# FAIL-CLOSED TEST ISOLATION & LIVE DATABASE PROTECTION GUARD
# ---------------------------------------------------------------------------
is_testing_context = (
    os.getenv("TESTING", "").strip().lower() == "true"
    or os.getenv("PYTEST_CURRENT_TEST") is not None
    or any("pytest" in str(arg).lower() or "unittest" in str(arg).lower() for arg in sys.argv)
)

if current_env == "staging":
    # Refuse to connect to production database when ENVIRONMENT is staging
    if DATABASE_URL and (KNOWN_PRODUCTION_HOST in DATABASE_URL.lower() or ("pooler.supabase.com" in DATABASE_URL.lower() and "staging" not in DATABASE_URL.lower() and os.getenv("CONFIRM_STAGING_MIGRATION", "").lower() != "true")):
        raise RuntimeError("[SECURITY GUARD] Refusing to connect to production database while ENVIRONMENT=staging. Execution aborted.")

if is_testing_context:
    # Fail-closed: Never allow automated tests to bind to a live Supabase database
    if DATABASE_URL and ("supabase.com" in DATABASE_URL.lower() or "pooler.supabase" in DATABASE_URL.lower()):
        test_db_url = os.getenv("TEST_DATABASE_URL", "sqlite:///./test_isolated.db")
        print(f"[SECURITY GUARD] Prevented live Supabase access from test runner. Using isolated test DB: {test_db_url}")
        DATABASE_URL = test_db_url

# Fallback to local SQLite if unconfigured or default placeholder password present (dev/testing only)
if not DATABASE_URL or "your-db-password" in DATABASE_URL:
    if current_env == "staging":
        raise RuntimeError("[SECURITY GUARD] Staging environment requires a valid DATABASE_URL pointing to an isolated staging PostgreSQL database. Fallback rejected.")
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


def create_tables(target_engine=None):
    """
    Create all tables from SQLAlchemy models.
    Useful for development environments and testing suites.
    """
    from app.db import models  # noqa: F401
    target = target_engine or engine
    Base.metadata.create_all(bind=target)


# Auto-initialize tables when running against SQLite (development or test fallback)
if DATABASE_URL.startswith("sqlite"):
    try:
        from app.db import models  # noqa: F401
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