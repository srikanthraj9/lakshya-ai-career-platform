import os
import unittest
from alembic.config import Config
from alembic import command
from sqlalchemy import create_engine, inspect


class TestMigrationIntegrity(unittest.TestCase):
    ISOLATED_MIGRATION_DB = "test_alembic_isolated.db"

    @classmethod
    def setUpClass(cls):
        if os.path.exists(cls.ISOLATED_MIGRATION_DB):
            try:
                os.remove(cls.ISOLATED_MIGRATION_DB)
            except OSError:
                pass

    @classmethod
    def tearDownClass(cls):
        if os.path.exists(cls.ISOLATED_MIGRATION_DB):
            try:
                os.remove(cls.ISOLATED_MIGRATION_DB)
            except OSError:
                pass

    def test_migration_upgrade_and_downgrade_isolated(self):
        # Configure Alembic against strictly isolated local SQLite
        db_path = os.path.abspath(self.ISOLATED_MIGRATION_DB)
        sqlite_url = f"sqlite:///{db_path}"
        os.environ["TESTING"] = "true"
        os.environ["TEST_DATABASE_URL"] = sqlite_url

        alembic_cfg = Config("alembic.ini")
        alembic_cfg.set_main_option("sqlalchemy.url", sqlite_url)

        # Run upgrade to head
        command.upgrade(alembic_cfg, "head")

        engine = create_engine(sqlite_url)
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        # Verify new tables exist
        self.assertIn("resume_analyses", tables)
        self.assertIn("resume_analysis_dimensions", tables)
        self.assertIn("resume_skill_evidence", tables)

        # Verify new columns on resumes
        resume_cols = {col["name"] for col in inspector.get_columns("resumes")}
        self.assertIn("parent_resume_id", resume_cols)
        self.assertIn("version_number", resume_cols)
        self.assertIn("version_label", resume_cols)
        self.assertIn("base_quality_score", resume_cols)

        # Verify new columns on resume_skills
        skill_cols = {col["name"] for col in inspector.get_columns("resume_skills")}
        self.assertIn("is_inferred", skill_cols)
        self.assertIn("extraction_source", skill_cols)

        engine.dispose()

        # Run downgrade to previous head (d9e0f1a2b3c4)
        command.downgrade(alembic_cfg, "d9e0f1a2b3c4")

        engine_downgraded = create_engine(sqlite_url)
        inspector_downgraded = inspect(engine_downgraded)
        tables_after_downgrade = inspector_downgraded.get_table_names()

        self.assertNotIn("resume_analyses", tables_after_downgrade)
        self.assertNotIn("resume_analysis_dimensions", tables_after_downgrade)
        self.assertNotIn("resume_skill_evidence", tables_after_downgrade)

        engine_downgraded.dispose()


if __name__ == "__main__":
    unittest.main()
