import uuid
import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token


class TestProductionSecurityPenetration(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_anonymous_access_to_protected_routes_rejected(self):
        response = self.client.get("/api/users/me")
        self.assertEqual(response.status_code, 401)

    def test_anonymous_access_to_admin_endpoints_rejected(self):
        response = self.client.get("/api/admin/dashboard")
        self.assertEqual(response.status_code, 401)

    def test_tampered_token_signature_rejected(self):
        user_uuid = str(uuid.uuid4())
        token = create_access_token({"sub": user_uuid, "role": "user"})
        # Tamper last 5 characters
        tampered_token = token[:-5] + "XXXXX"
        response = self.client.get(
            "/api/users/me",
            headers={"Authorization": f"Bearer {tampered_token}"},
        )
        self.assertEqual(response.status_code, 401)

    def test_role_escalation_attempt_fails(self):
        # A token claiming role 'user' tries to hit admin endpoint
        user_uuid = str(uuid.uuid4())
        token = create_access_token({"sub": user_uuid, "role": "user"})
        response = self.client.get(
            "/api/admin/dashboard",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertIn(response.status_code, (401, 403))

    def test_security_headers_present_on_all_responses(self):
        response = self.client.get("/api/release")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(response.headers.get("X-Frame-Options"), "DENY")
        self.assertEqual(response.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin")
        self.assertIn("X-Request-ID", response.headers)


if __name__ == "__main__":
    unittest.main()
