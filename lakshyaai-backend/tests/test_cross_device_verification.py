import os
import time
import unittest
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.db.database import SessionLocal
from app.db import models
from app.api.routes.auth import _hash_token, _status_check_rate_limit
from app.services.email.email_service import EmailDeliveryResult


def get_error_message(response) -> str:
    data = response.json()
    if isinstance(data, dict):
        if "error" in data and isinstance(data["error"], dict) and "message" in data["error"]:
            return data["error"]["message"]
        if "detail" in data:
            return str(data["detail"])
    return ""


class TestCrossDeviceVerification(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from app.db.database import engine, create_tables
        if engine.dialect.name == "sqlite":
            create_tables()
        cls.client = TestClient(app)

    def setUp(self):
        self.db = SessionLocal()
        _status_check_rate_limit.clear()

    def tearDown(self):
        _status_check_rate_limit.clear()
        self.db.close()

    @patch("app.api.routes.auth.send_verification_email")
    def test_registration_issues_session_token_for_cross_device_polling(self, mock_send):
        """Verifies registration returns access_token so Device 1 can poll securely."""
        mock_send.return_value = EmailDeliveryResult(True, "sent", "Sent successfully")
        test_email = f"cross_dev_reg_{uuid.uuid4().hex[:8]}@example.com"

        response = self.client.post("/api/auth/register", json={
            "full_name": "Device One User",
            "email": test_email,
            "password": "StrongPassword@123",
        })

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["token_type"], "bearer")
        self.assertFalse(data["is_email_verified"])

        # Clean up
        user = self.db.query(models.User).filter(models.User.email == test_email).first()
        if user:
            self.db.delete(user)
            self.db.commit()

    def test_status_check_requires_auth_or_email(self):
        """Rejects status checks without authentication or email parameter."""
        response = self.client.get("/api/auth/verification-status")
        self.assertEqual(response.status_code, 400)
        self.assertIn("required", get_error_message(response).lower())

    def test_status_check_anti_enumeration(self):
        """
        Anti-enumeration check: Non-existent email and unverified email
        return the exact same response shape and values.
        """
        random_nonexistent = f"nonexistent_{uuid.uuid4().hex[:8]}@example.com"
        r_nonexistent = self.client.get(f"/api/auth/verification-status?email={random_nonexistent}")
        self.assertEqual(r_nonexistent.status_code, 200)
        d_nonexistent = r_nonexistent.json()
        self.assertFalse(d_nonexistent["is_email_verified"])
        self.assertIsNone(d_nonexistent["email"])
        self.assertIsNone(d_nonexistent["onboarding_completed"])

        # Create an unverified user
        unverified_email = f"unverified_{uuid.uuid4().hex[:8]}@example.com"
        user = models.User(
            email=unverified_email,
            password_hash="fakehash",
            full_name="Unverified User",
            is_email_verified=False,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        r_unverified = self.client.get(f"/api/auth/verification-status?email={unverified_email}")
        self.assertEqual(r_unverified.status_code, 200)
        d_unverified = r_unverified.json()
        self.assertFalse(d_unverified["is_email_verified"])
        self.assertIsNone(d_unverified["email"])
        self.assertIsNone(d_unverified["onboarding_completed"])

        # Confirm equality of responses (zero leak)
        self.assertEqual(d_nonexistent, d_unverified)

        self.db.delete(user)
        self.db.commit()

    def test_cross_device_verification_flow(self):
        """
        Simulates end-to-end cross-device verification:
        1. Device 1 registers and holds JWT session on /verify-email.
        2. Device 1 polls /api/auth/verification-status -> is_email_verified=False.
        3. Device 2 (unauthenticated separate client) redeems verification token.
        4. Device 1 polls /api/auth/verification-status -> is_email_verified=True.
        """
        test_email = f"cross_dev_flow_{uuid.uuid4().hex[:8]}@example.com"
        user = models.User(
            email=test_email,
            password_hash="fakehash",
            full_name="Cross Device User",
            is_email_verified=False,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        career_profile = models.UserCareerProfile(
            user_id=user.id,
            onboarding_completed=False,
            onboarding_current_step=1,
        )
        self.db.add(career_profile)
        self.db.commit()

        raw_token = f"token_{uuid.uuid4().hex}"
        token_hash = _hash_token(raw_token)
        token_record = models.EmailVerificationToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        )
        self.db.add(token_record)
        self.db.commit()

        # Device 1 JWT
        device1_token = create_access_token({"sub": str(user.id)})
        device1_headers = {"Authorization": f"Bearer {device1_token}"}

        # Step 2: Device 1 checks status -> False
        status_1 = self.client.get("/api/auth/verification-status", headers=device1_headers)
        self.assertEqual(status_1.status_code, 200)
        self.assertFalse(status_1.json()["is_email_verified"])

        # Step 3: Device 2 redeems token
        device2_client = TestClient(app)
        verify_res = device2_client.post("/api/auth/verify-email", json={"token": raw_token})
        self.assertEqual(verify_res.status_code, 200)
        self.assertTrue(verify_res.json()["is_email_verified"])

        # Step 4: Device 1 checks status -> True without re-authenticating
        status_2 = self.client.get("/api/auth/verification-status", headers=device1_headers)
        self.assertEqual(status_2.status_code, 200)
        d2 = status_2.json()
        self.assertTrue(d2["is_email_verified"])
        self.assertEqual(d2["email"], test_email)
        self.assertFalse(d2["onboarding_completed"])

        # Also verify unauthenticated query by email reflects true
        status_unauth = self.client.get(f"/api/auth/verification-status?email={test_email}")
        self.assertEqual(status_unauth.status_code, 200)
        self.assertTrue(status_unauth.json()["is_email_verified"])

        self.db.delete(user)
        self.db.commit()

    def test_status_check_rate_limiting(self):
        """Enforces rate limiting on excessive status check polling."""
        from app.api.routes.auth import STATUS_CHECK_MAX_REQUESTS

        # TestClient typically sets request.client.host to "testclient"
        _status_check_rate_limit["testclient"] = [time.time()] * STATUS_CHECK_MAX_REQUESTS
        _status_check_rate_limit["127.0.0.1"] = [time.time()] * STATUS_CHECK_MAX_REQUESTS

        response = self.client.get("/api/auth/verification-status?email=test@example.com")
        self.assertEqual(response.status_code, 429)
        self.assertIn("too many status check requests", get_error_message(response).lower())


if __name__ == "__main__":
    unittest.main()
