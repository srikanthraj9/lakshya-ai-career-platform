import unittest
import time
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from app.db.database import check_database_connection, _clean_database_url


class TestDatabaseResilience(unittest.TestCase):
    def test_clean_database_url_removes_pgbouncer_flag(self):
        url = "postgresql://user:pass@localhost:5432/dbname?pgbouncer=true&sslmode=require"
        cleaned = _clean_database_url(url)
        self.assertNotIn("pgbouncer=true", cleaned)
        self.assertIn("sslmode=require", cleaned)

    def test_clean_database_url_handles_none_and_empty(self):
        self.assertIsNone(_clean_database_url(None))
        self.assertEqual(_clean_database_url(""), "")

    def test_unreachable_db_connect_timeout_is_bounded(self):
        # 192.0.2.1 is reserved for documentation/testing (RFC 5737) and drops packets
        test_engine = create_engine(
            "postgresql://fakeuser:fakepass@192.0.2.1:5432/fakedb",
            connect_args={"connect_timeout": 1},
        )
        start_time = time.time()
        try:
            with test_engine.connect() as conn:
                pass
            failed = False
        except Exception:
            failed = True
        elapsed = time.time() - start_time
        
        self.assertTrue(failed, "Connection to 192.0.2.1 should fail")
        # Should complete within ~3 seconds, definitely not hanging indefinitely
        self.assertLess(elapsed, 5.0, f"Connection timeout took {elapsed:.2f}s, expected < 5s")

    def test_check_database_connection_sanitizes_credentials_on_error(self):
        fake_url = "postgresql://my_test_user:super_secret_password_12345@db.xyz.supabase.co:5432/fakedb"
        mock_engine = MagicMock()
        mock_engine.connect.side_effect = Exception(f"Connection failed: {fake_url}")
        
        with patch("app.db.database.engine", mock_engine):
            import io
            import sys
            captured_stdout = io.StringIO()
            sys_stdout_backup = sys.stdout
            try:
                sys.stdout = captured_stdout
                result = check_database_connection()
            finally:
                sys.stdout = sys_stdout_backup
                
            self.assertFalse(result)
            output = captured_stdout.getvalue()
            self.assertNotIn("super_secret_password_12345", output)
            self.assertIn("my_test_user:***@db.xyz.supabase.co:5432", output)


if __name__ == "__main__":
    unittest.main()
