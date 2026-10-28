import os
import sys

# Fail-closed test environment guard: enforce isolated test database for all pytest executions
os.environ["TESTING"] = "true"
if "supabase.com" in os.environ.get("DATABASE_URL", ""):
    os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL", "sqlite:///./test_isolated.db")

from app.db.database import engine, create_tables

# Strict assertion: Ensure test runtime never connects to live Supabase
assert "supabase.com" not in str(engine.url), "FATAL: Test runner attempted connection to live Supabase database!"

if engine.dialect.name == "sqlite":
    create_tables()
