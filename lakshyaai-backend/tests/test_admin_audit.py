import unittest
import uuid
from datetime import datetime, timezone
from app.services.audit_service import sanitize_metadata
from app.db.schemas import AdminAuditLogResponse


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

    def test_extended_credentials_and_token_redaction(self):
        """Verify bearer, salt, access keys, connection strings, and API keys are redacted."""
        raw = {
            "salt_val": "somesalt123",
            "access_key_id": "AKIAIOSFODNN7EXAMPLE",
            "db_uri": "postgresql://admin:super_secret_pw@db.example.com:5432/mydb",
            "nested_list": [
                {"bearer_header": "Bearer some_token_value"},
                {"safe_item": "status_ok"},
                "gsk_abcdef1234567890abcdef1234567890",
            ],
            "raw_str_key": "sk-proj-123456789012345678901234567890",
        }

        sanitized = sanitize_metadata(raw)
        self.assertEqual(sanitized["salt_val"], "[REDACTED]")
        self.assertEqual(sanitized["access_key_id"], "[REDACTED]")
        self.assertIn("[REDACTED_CREDENTIALS]", sanitized["db_uri"])
        self.assertNotIn("super_secret_pw", sanitized["db_uri"])
        self.assertEqual(sanitized["nested_list"][0]["bearer_header"], "[REDACTED]")
        self.assertEqual(sanitized["nested_list"][1]["safe_item"], "status_ok")
        self.assertIn("[REDACTED_API_KEY]", sanitized["nested_list"][2])
        self.assertIn("[REDACTED_API_KEY]", sanitized["raw_str_key"])

    def test_schema_serialization_sanitization(self):
        """Verify AdminAuditLogResponse applies sanitization server-side upon model validation."""
        response_model = AdminAuditLogResponse(
            id=uuid.uuid4(),
            action_type="USER_PASSWORD_RESET",
            action_metadata={
                "password_hash": "$2b$12$abcdef...",
                "smtp_password": "super_secret_smtp",
                "safe_key": "safe_value",
            },
            before_data={
                "email": "user@example.com",
                "secret_token": "secret_123",
            },
            after_data={
                "email": "user@example.com",
                "secret_token": "secret_456",
            },
            diff={
                "secret_token": {
                    "before": "secret_123",
                    "after": "secret_456",
                }
            },
            created_at=datetime.now(timezone.utc),
        )

        data = response_model.model_dump()
        self.assertEqual(data["action_metadata"]["password_hash"], "[REDACTED]")
        self.assertEqual(data["action_metadata"]["smtp_password"], "[REDACTED]")
        self.assertEqual(data["action_metadata"]["safe_key"], "safe_value")
        self.assertEqual(data["before_data"]["secret_token"], "[REDACTED]")
        self.assertEqual(data["after_data"]["secret_token"], "[REDACTED]")
        self.assertEqual(data["diff"]["secret_token"], "[REDACTED]")

    def test_deeply_nested_and_mixed_structures(self):
        """Verify deeply nested dicts, lists of dicts, lists of strings, and arrays are recursively sanitized."""
        raw = {
            "level1": {
                "level2": {
                    "level3": {
                        "userPassword": "nested_secret_pass",
                        "safe_flag": True,
                        "nestedItems": [
                            {"apiKey": "sk-1234567890abcdef1234567890"},
                            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnopqrstuvwxyz123456",
                            {"safe_name": "developer"},
                        ],
                        "tokenList": ["secret_token_1", "secret_token_2"],
                    }
                }
            },
            "array_of_arrays": [
                [{"REFRESH_TOKEN": "refresh_abc_123"}],
                ["normal_string", "postgres://user:super_secret_pw@db.prod.internal:5432/main"],
            ],
        }

        sanitized = sanitize_metadata(raw)
        self.assertEqual(sanitized["level1"]["level2"]["level3"]["userPassword"], "[REDACTED]")
        self.assertEqual(sanitized["level1"]["level2"]["level3"]["safe_flag"], True)
        self.assertEqual(sanitized["level1"]["level2"]["level3"]["nestedItems"][0]["apiKey"], "[REDACTED]")
        self.assertIn("[REDACTED_TOKEN]", sanitized["level1"]["level2"]["level3"]["nestedItems"][1])
        self.assertNotIn("eyJhbGci", sanitized["level1"]["level2"]["level3"]["nestedItems"][1])
        self.assertEqual(sanitized["level1"]["level2"]["level3"]["nestedItems"][2]["safe_name"], "developer")
        # tokenList key itself contains "token", so the whole list is redacted
        self.assertEqual(sanitized["level1"]["level2"]["level3"]["tokenList"], "[REDACTED]")
        self.assertEqual(sanitized["array_of_arrays"][0][0]["REFRESH_TOKEN"], "[REDACTED]")
        self.assertEqual(sanitized["array_of_arrays"][1][0], "normal_string")
        self.assertIn("[REDACTED_CREDENTIALS]", sanitized["array_of_arrays"][1][1])
        self.assertNotIn("super_secret_pw", sanitized["array_of_arrays"][1][1])

    def test_case_insensitive_and_camelcase_credential_keys(self):
        """Verify alternative casing (accessToken, access_token, ACCESS_TOKEN, etc.) are all redacted."""
        raw = {
            "accessToken": "secret1",
            "access_token": "secret2",
            "ACCESS_TOKEN": "secret3",
            "ClientSecret": "secret4",
            "CLIENT_SECRET": "secret5",
            "dbPassword": "secret6",
            "DB_PASSWORD": "secret7",
            "Authorization": "secret8",
            "privateKey": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgk...",
            "normalField": "keep_this_intact",
        }
        sanitized = sanitize_metadata(raw)
        for k in ["accessToken", "access_token", "ACCESS_TOKEN", "ClientSecret", "CLIENT_SECRET", "dbPassword", "DB_PASSWORD", "Authorization", "privateKey"]:
            self.assertEqual(sanitized[k], "[REDACTED]", f"Key {k} was not redacted!")
        self.assertEqual(sanitized["normalField"], "keep_this_intact")

    def test_embedded_credential_strings_in_text(self):
        """Verify credentials embedded inside sentences or connection URIs get redacted."""
        raw = {
            "log_line_1": "Failed request with header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiJ9.secret_signature_1234567890",
            "log_line_2": "Connection failed to postgresql://postgres:prod_super_pw_99@db.internal:5432/core?ssl=true",
            "log_line_3": "Error calling groq with key: gsk_abcdef1234567890abcdef1234567890 and timeout",
            "log_line_4": "Query parameters: user=admin&password=my_secret_password_here&format=json",
            "raw_certificate_pem": "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0...",
        }
        sanitized = sanitize_metadata(raw)
        self.assertNotIn("eyJhbGci", sanitized["log_line_1"])
        self.assertIn("[REDACTED_TOKEN]", sanitized["log_line_1"])

        self.assertNotIn("prod_super_pw_99", sanitized["log_line_2"])
        self.assertIn("[REDACTED_CREDENTIALS]", sanitized["log_line_2"])

        self.assertNotIn("gsk_abcdef1234567890abcdef1234567890", sanitized["log_line_3"])
        self.assertIn("[REDACTED_API_KEY]", sanitized["log_line_3"])

        self.assertNotIn("my_secret_password_here", sanitized["log_line_4"])
        self.assertIn("password=[REDACTED]", sanitized["log_line_4"])

        self.assertEqual(sanitized["raw_certificate_pem"], "[REDACTED_PRIVATE_KEY]")

    def test_empty_null_and_malformed_inputs(self):
        """Verify empty dicts, None values, unexpected types, and deep nesting recursion limits."""
        self.assertIsNone(sanitize_metadata(None))
        self.assertEqual(sanitize_metadata({}), {})
        self.assertEqual(sanitize_metadata([]), [])
        self.assertEqual(sanitize_metadata(123), 123)
        self.assertEqual(sanitize_metadata(True), True)

        # Test recursion depth cutoff
        deep = {"level": "init"}
        cur = deep
        for i in range(15):
            cur["child"] = {}
            cur = cur["child"]
        cur["token"] = "should_not_crash"
        sanitized_deep = sanitize_metadata(deep)
        self.assertIsNotNone(sanitized_deep)

    def test_json_serialization_never_leaks_secrets(self):
        """Verify response model serialization into JSON has zero sensitive string occurrences."""
        secret_pwd = "VERY_CONFIDENTIAL_PASSWORD_12345"
        secret_jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
        secret_api = "sk-proj-98765432109876543210987654"

        resp = AdminAuditLogResponse(
            id=uuid.uuid4(),
            action_type="EMERGENCY_ACCESS",
            action_metadata={
                "audit_notes": f"Admin attempted login with {secret_jwt}",
                "adminPassword": secret_pwd,
                "nested": [{"apiKey": secret_api}],
            },
            before_data={"passwd": secret_pwd},
            after_data={"passwd": "[CHANGED]"},
            diff={"passwd": {"before": secret_pwd, "after": "[CHANGED]"}},
            created_at=datetime.now(timezone.utc),
        )

        json_output = resp.model_dump_json()
        self.assertNotIn(secret_pwd, json_output)
        self.assertNotIn(secret_jwt, json_output)
        self.assertNotIn(secret_api, json_output)
        self.assertIn("[REDACTED]", json_output)


if __name__ == "__main__":
    unittest.main()
