from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
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
        print("Database connection error:", str(e))
        return False


# =========================
# NEW: CREATE ALL TABLES
# =========================

def create_tables():
    """
    Create all tables from SQLAlchemy models.
    Useful for development environments.
    """
    Base.metadata.create_all(bind=engine)


# =========================
# NEW: DROP ALL TABLES (DEV ONLY)
# =========================

def drop_tables():
    """
    Drop all tables (use carefully).
    Mainly for development resets.
    """
    Base.metadata.drop_all(bind=engine)