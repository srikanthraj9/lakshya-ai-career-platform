import unittest
import uuid
from app.services.audit_service import sanitize_metadata


class TestAdminAuditLogging(unittest.TestCase):
    def test_sensitive_metadata_redaction(self):
        raw_meta = {
            "target_email": "user@example.com",
            "password": "supersecretpassword",
            "access_token": "ey123456.jwt.token",
            "reason": "Violation of terms",
            "nested": {
                "jwt_secret": "my-secret-key",
                "safe_field": 123,
            },
        }

        sanitized = sanitize_metadata(raw_meta)
        self.assertEqual(sanitized["target_email"], "user@example.com")
        self.assertEqual(sanitized["password"], "[REDACTED]")
        self.assertEqual(sanitized["access_token"], "[REDACTED]")
        self.assertEqual(sanitized["reason"], "Violation of terms")
        self.assertEqual(sanitized["nested"]["jwt_secret"], "[REDACTED]")
        self.assertEqual(sanitized["nested"]["safe_field"], 123)


if __name__ == "__main__":
    unittest.main()
