# Backend test package
import os

os.environ["TESTING"] = "true"
if "supabase.com" in os.environ.get("DATABASE_URL", ""):
    os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL", "sqlite:///./test_isolated.db")

from app.db.database import engine, create_tables
if engine.dialect.name == "sqlite":
    create_tables()

