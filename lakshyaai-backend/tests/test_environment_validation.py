import os
import unittest
from unittest.mock import patch
from scripts.validate_environment import validate_environment


class TestEnvironmentValidation(unittest.TestCase):
    def test_valid_production_configuration_passes(self):
        """Synthetic valid production configuration passes all gates."""
        synthetic_env = {
            "ENVIRONMENT": "production",
            "DATABASE_URL": "postgresql://app_user:synthetic_strong_pw_123@db.prod.internal:5432/lakshyaai",
            "SECRET_KEY": "a" * 32,  # 32 characters synthetic strong secret
            "CORS_ORIGINS": "https://lakshya-ai.onrender.com,https://app.lakshyaai.com",
            "RATE_LIMIT_ENABLED": "true",
        }
        with patch.dict(os.environ, synthetic_env, clear=True):
            self.assertTrue(validate_environment(raise_on_error=False))

    def test_missing_signing_secret_rejected_in_production(self):
        """Missing SECRET_KEY in production causes failure."""
        synthetic_env = {
            "ENVIRONMENT": "production",
            "DATABASE_URL": "postgresql://user:pass@db.prod.internal:5432/lakshyaai",
            "SECRET_KEY": "",
            "CORS_ORIGINS": "https://lakshya-ai.onrender.com",
        }
        with patch.dict(os.environ, synthetic_env, clear=True):
            self.assertFalse(validate_environment(raise_on_error=False))
            with self.assertRaises(RuntimeError):
                validate_environment(raise_on_error=True)

    def test_default_known_secret_rejected_in_production(self):
        """Known default development secrets fail production validation."""
        for bad_secret in ["supersecretkey", "dev_secret_key_change_in_prod", "your-super-secret-jwt-key-change-in-production"]:
            synthetic_env = {
                "ENVIRONMENT": "production",
                "DATABASE_URL": "postgresql://user:pass@db.prod.internal:5432/lakshyaai",
                "SECRET_KEY": bad_secret,
                "CORS_ORIGINS": "https://lakshya-ai.onrender.com",
            }
            with patch.dict(os.environ, synthetic_env, clear=True):
                self.assertFalse(validate_environment(raise_on_error=False), f"Failed to reject {bad_secret}")

    def test_short_secret_rejected_in_production(self):
        """Secret with fewer than 32 characters is rejected in production/staging."""
        synthetic_env = {
            "ENVIRONMENT": "production",
            "DATABASE_URL": "postgresql://user:pass@db.prod.internal:5432/lakshyaai",
            "SECRET_KEY": "short_secret_under_32_chars",
            "CORS_ORIGINS": "https://lakshya-ai.onrender.com",
        }
        with patch.dict(os.environ, synthetic_env, clear=True):
            self.assertFalse(validate_environment(raise_on_error=False))

    def test_missing_database_url_rejected_in_production(self):
        """Missing DATABASE_URL fails production validation."""
        synthetic_env = {
            "ENVIRONMENT": "production",
            "SECRET_KEY": "a" * 32,
            "CORS_ORIGINS": "https://lakshya-ai.onrender.com",
        }
        with patch.dict(os.environ, synthetic_env, clear=True):
            self.assertFalse(validate_environment(raise_on_error=False))

    def test_localhost_database_rejected_in_production(self):
        """Localhost DATABASE_URL in production is prohibited."""
        synthetic_env = {
            "ENVIRONMENT": "production",
            "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/lakshyaai",
            "SECRET_KEY": "a" * 32,
            "CORS_ORIGINS": "https://lakshya-ai.onrender.com",
        }
        with patch.dict(os.environ, synthetic_env, clear=True):
            self.assertFalse(validate_environment(raise_on_error=False))

    def test_missing_cors_origins_rejected_in_production(self):
        """Missing CORS_ORIGINS fails production validation."""
        synthetic_env = {
            "ENVIRONMENT": "production",
            "DATABASE_URL": "postgresql://user:pass@db.prod.internal:5432/lakshyaai",
            "SECRET_KEY": "a" * 32,
            "CORS_ORIGINS": "",
        }
        with patch.dict(os.environ, synthetic_env, clear=True):
            self.assertFalse(validate_environment(raise_on_error=False))

    def test_wildcard_cors_prohibited_in_production(self):
        """Wildcard CORS (*) is rejected in production."""
        synthetic_env = {
            "ENVIRONMENT": "production",
            "DATABASE_URL": "postgresql://user:pass@db.prod.internal:5432/lakshyaai",
            "SECRET_KEY": "a" * 32,
            "CORS_ORIGINS": "*",
        }
        with patch.dict(os.environ, synthetic_env, clear=True):
            self.assertFalse(validate_environment(raise_on_error=False))

    def test_wildcard_cors_prohibited_in_staging(self):
        """Wildcard CORS (*) is rejected in staging."""
        synthetic_env = {
            "ENVIRONMENT": "staging",
            "DATABASE_URL": "postgresql://staging_user:strong_pw@staging-db.internal:5432/lakshyaai_staging",
            "SECRET_KEY": "a" * 32,
            "CORS_ORIGINS": "*",
        }
        with patch.dict(os.environ, synthetic_env, clear=True):
            self.assertFalse(validate_environment(raise_on_error=False))

    def test_missing_cors_origins_rejected_in_staging(self):
        """Missing CORS_ORIGINS fails staging validation."""
        synthetic_env = {
            "ENVIRONMENT": "staging",
            "DATABASE_URL": "postgresql://staging_user:strong_pw@staging-db.internal:5432/lakshyaai_staging",
            "SECRET_KEY": "a" * 32,
            "CORS_ORIGINS": "",
        }
        with patch.dict(os.environ, synthetic_env, clear=True):
            self.assertFalse(validate_environment(raise_on_error=False))

    def test_staging_rejects_production_supabase_database_url(self):
        """Staging environment rejects production Supabase pooler URL."""
        synthetic_env = {
            "ENVIRONMENT": "staging",
            "DATABASE_URL": "postgresql://postgres.xxx:strong_pw@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres",
            "SECRET_KEY": "b" * 32,
            "CORS_ORIGINS": "https://lakshya-ai-staging.onrender.com",
            "RATE_LIMIT_ENABLED": "true",
        }
        with patch.dict(os.environ, synthetic_env, clear=True):
            self.assertFalse(validate_environment(raise_on_error=False))

    def test_staging_with_isolated_database_passes(self):
        """Staging environment passes with genuine isolated PostgreSQL database."""
        synthetic_env = {
            "ENVIRONMENT": "staging",
            "DATABASE_URL": "postgresql://staging_user:strong_pw@staging-db.internal:5432/lakshyaai_staging",
            "SECRET_KEY": "b" * 32,
            "CORS_ORIGINS": "https://lakshya-ai-staging.onrender.com",
            "RATE_LIMIT_ENABLED": "true",
        }
        with patch.dict(os.environ, synthetic_env, clear=True):
            self.assertTrue(validate_environment(raise_on_error=False))

    def test_staging_rejects_sqlite_database(self):
        """Staging environment rejects SQLite database."""
        synthetic_env = {
            "ENVIRONMENT": "staging",
            "DATABASE_URL": "sqlite:///./test_isolated.db",
            "SECRET_KEY": "b" * 32,
            "CORS_ORIGINS": "https://lakshya-ai-staging.onrender.com",
            "RATE_LIMIT_ENABLED": "true",
        }
        with patch.dict(os.environ, synthetic_env, clear=True):
            self.assertFalse(validate_environment(raise_on_error=False))

    def test_migration_safety_guard_blocks_known_production_host(self):
        """Alembic migration safety guard rejects known production host even if CONFIRM_STAGING_MIGRATION=true."""
        from scripts.validate_environment import assert_migration_safety
        prod_url = "postgresql://postgres.xxx:strong_pw@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"
        with patch.dict(os.environ, {"CONFIRM_STAGING_MIGRATION": "true", "ENVIRONMENT": "staging"}):
            with self.assertRaises(RuntimeError) as ctx:
                assert_migration_safety(prod_url)
            self.assertIn("Detected remote production database", str(ctx.exception))

    def test_migration_safety_guard_blocks_unconfirmed_remote_database(self):
        """Alembic migration safety guard rejects remote DB without staging or prod confirmation."""
        from scripts.validate_environment import assert_migration_safety
        remote_url = "postgresql://user:pass@some-unknown-host.com:5432/mydb"
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(RuntimeError) as ctx:
                assert_migration_safety(remote_url)
            self.assertIn("without verified staging or production confirmation", str(ctx.exception))

    def test_migration_safety_guard_allows_confirmed_isolated_staging(self):
        """Alembic migration safety guard permits confirmed isolated staging PostgreSQL host."""
        from scripts.validate_environment import assert_migration_safety
        staging_url = "postgresql://staging_user:strong_pw@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
        with patch.dict(os.environ, {"CONFIRM_STAGING_MIGRATION": "true", "ENVIRONMENT": "staging"}):
            # Should not raise exception
            try:
                assert_migration_safety(staging_url)
            except RuntimeError as e:
                self.fail(f"assert_migration_safety raised RuntimeError unexpectedly: {e}")

    def test_migration_safety_guard_allows_local_sqlite(self):
        """Alembic migration safety guard unconditionally permits local SQLite URLs."""
        from scripts.validate_environment import assert_migration_safety
        local_url = "sqlite:///./test_local.db"
        try:
            assert_migration_safety(local_url)
        except RuntimeError as e:
            self.fail(f"assert_migration_safety raised RuntimeError for local SQLite: {e}")


if __name__ == "__main__":
    unittest.main()
