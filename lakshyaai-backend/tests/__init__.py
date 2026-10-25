# Backend test package
import os

os.environ.setdefault("TESTING", "true")

from app.db.database import engine, create_tables
if engine.dialect.name == "sqlite":
    create_tables()
