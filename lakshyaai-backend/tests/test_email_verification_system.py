import os
import unittest
from unittest.mock import patch, MagicMock
import socket
import smtplib
from datetime import datetime, timedelta, timezone
import uuid

from fastapi.testclient import TestClient
from app.main import app
from app.services.email.email_service import (
    send_verification_email,
    get_verification_url,
    EmailDeliveryResult,
)
from app.db.database import SessionLocal
from app.db import models
from app.api.routes.auth import _hash_token


def get_error_message(response) -> str:
    data = response.json()
    if isinstance(data, dict):
        if "error" in data and isinstance(data["error"], dict) and "message" in data["error"]:
            return data["error"]["message"]
        if "detail" in data:
            return str(data["detail"])
    return ""


class TestEmailVerificationSystem(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from app.db.database import engine, create_tables
        if engine.dialect.name == "sqlite":
            create_tables()
        cls.client = TestClient(app)

    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    # =========================================================================
    # 1. Verification URL Construction Tests
    # =========================================================================
    def test_verification_url_construction_local(self):
        with patch.dict(os.environ, {"FRONTEND_URL": "http://127.0.0.1:5173"}):
            url = get_verification_url("test_raw_token_123")
            self.assertEqual(url, "http://127.0.0.1:5173/verify-email?token=test_raw_token_123")

    def test_verification_url_construction_deployed(self):
        with patch.dict(os.environ, {"FRONTEND_URL": "https://lakshya-ai.onrender.com/"}):
            url = get_verification_url("test_raw_token_xyz")
            self.assertEqual(url, "https://lakshya-ai.onrender.com/verify-email?token=test_raw_token_xyz")

    # =========================================================================
    # 2. Email Service Unit Tests (Mocked SMTP - No Live Transmission)
    # =========================================================================
    def test_email_service_missing_configuration(self):
        with patch.dict(os.environ, {"SMTP_HOST": "", "SMTP_USER": "", "SMTP_PASSWORD": ""}):
            result = send_verification_email("user@example.com", "User", "token123")
            self.assertFalse(result.success)
            self.assertFalse(bool(result))
            self.assertEqual(result.status, "unconfigured")

    @patch("smtplib.SMTP")
    def test_email_service_successful_acceptance(self, mock_smtp):
        instance = MagicMock()
        mock_smtp.return_value = instance

        with patch.dict(os.environ, {
            "SMTP_HOST": "smtp.gmail.com",
            "SMTP_PORT": "587",
            "SMTP_USER": "test@gmail.com",
            "SMTP_PASSWORD": "test_password",
        }):
            result = send_verification_email("recipient@example.com", "Test User", "token123")
            self.assertTrue(result.success)
            self.assertTrue(bool(result))
            self.assertEqual(result.status, "sent")
            instance.starttls.assert_called_once()
            instance.login.assert_called_once_with("test@gmail.com", "test_password")
            instance.sendmail.assert_called_once()
            instance.quit.assert_called_once()

    @patch("smtplib.SMTP")
    def test_email_service_authentication_failure(self, mock_smtp):
        instance = MagicMock()
        instance.login.side_effect = smtplib.SMTPAuthenticationError(535, b"5.7.8 BadCredentials")
        mock_smtp.return_value = instance

        with patch.dict(os.environ, {
            "SMTP_HOST": "smtp.gmail.com",
            "SMTP_PORT": "587",
            "SMTP_USER": "test@gmail.com",
            "SMTP_PASSWORD": "wrong_password",
        }):
            result = send_verification_email("recipient@example.com", "Test User", "token123")
            self.assertFalse(result.success)
            self.assertFalse(bool(result))
            self.assertEqual(result.status, "auth_error")
            instance.quit.assert_called_once()

    @patch("smtplib.SMTP")
    def test_email_service_timeout_failure(self, mock_smtp):
        mock_smtp.side_effect = socket.timeout("Timed out connecting")

        with patch.dict(os.environ, {
            "SMTP_HOST": "smtp.gmail.com",
            "SMTP_PORT": "587",
            "SMTP_USER": "test@gmail.com",
            "SMTP_PASSWORD": "password",
        }):
            result = send_verification_email("recipient@example.com", "Test User", "token123")
            self.assertFalse(result.success)
            self.assertEqual(result.status, "connection_error")

    @patch("smtplib.SMTP")
    def test_email_service_protocol_error(self, mock_smtp):
        instance = MagicMock()
        instance.sendmail.side_effect = smtplib.SMTPException("Sender rejected")
        mock_smtp.return_value = instance

        with patch.dict(os.environ, {
            "SMTP_HOST": "smtp.gmail.com",
            "SMTP_PORT": "587",
            "SMTP_USER": "test@gmail.com",
            "SMTP_PASSWORD": "password",
        }):
            result = send_verification_email("recipient@example.com", "Test User", "token123")
            self.assertFalse(result.success)
            self.assertEqual(result.status, "smtp_error")
            instance.quit.assert_called_once()

    # =========================================================================
    # 3. Registration API Endpoint Tests
    # =========================================================================
    @patch("app.api.routes.auth.send_verification_email")
    def test_registration_with_smtp_success(self, mock_send):
        mock_send.return_value = EmailDeliveryResult(True, "sent", "Sent successfully")
        test_email = f"test_reg_ok_{uuid.uuid4().hex[:8]}@example.com"

        response = self.client.post("/api/auth/register", json={
            "full_name": "Test User",
            "email": test_email,
            "password": "StrongPassword@123",
        })

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["email"], test_email)
        self.assertTrue(data["email_sent"])
        self.assertEqual(data["delivery_status"], "sent")
        self.assertFalse(data["is_email_verified"])

        # Clean up created user
        created_user = self.db.query(models.User).filter(models.User.email == test_email).first()
        self.assertIsNotNone(created_user)
        self.db.delete(created_user)
        self.db.commit()

    @patch("app.api.routes.auth.send_verification_email")
    def test_registration_with_smtp_failure_truthful_response(self, mock_send):
        mock_send.return_value = EmailDeliveryResult(False, "auth_error", "BadCredentials")
        test_email = f"test_reg_fail_{uuid.uuid4().hex[:8]}@example.com"

        response = self.client.post("/api/auth/register", json={
            "full_name": "Test User",
            "email": test_email,
            "password": "StrongPassword@123",
        })

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["email"], test_email)
        self.assertFalse(data["email_sent"])
        self.assertEqual(data["delivery_status"], "auth_error")
        self.assertIn("could not be delivered", data["message"])

        # User is preserved in database
        created_user = self.db.query(models.User).filter(models.User.email == test_email).first()
        self.assertIsNotNone(created_user)
        self.db.delete(created_user)
        self.db.commit()

    def test_duplicate_account_registration_blocked(self):
        test_email = f"test_dup_{uuid.uuid4().hex[:8]}@example.com"
        with patch("app.api.routes.auth.send_verification_email") as mock_send:
            mock_send.return_value = EmailDeliveryResult(True, "sent", "Sent")
            # First registration
            r1 = self.client.post("/api/auth/register", json={
                "full_name": "User One",
                "email": test_email,
                "password": "StrongPassword@123",
            })
            self.assertEqual(r1.status_code, 200)

            # Second registration with same email
            r2 = self.client.post("/api/auth/register", json={
                "full_name": "User Two",
                "email": test_email,
                "password": "StrongPassword@123",
            })
            self.assertEqual(r2.status_code, 400)
            self.assertIn("already registered", get_error_message(r2).lower())

            created_user = self.db.query(models.User).filter(models.User.email == test_email).first()
            if created_user:
                self.db.delete(created_user)
                self.db.commit()

    # =========================================================================
    # 4. Resend Verification API Endpoint Tests
    # =========================================================================
    def test_resend_verification_unknown_email_anti_enumeration(self):
        unknown_email = f"unknown_{uuid.uuid4().hex[:8]}@example.com"
        response = self.client.post("/api/auth/resend-verification", json={"email": unknown_email})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("If an account with this email exists", data["message"])

    @patch("app.api.routes.auth.send_verification_email")
    def test_resend_verification_cooldown_enforced(self, mock_send):
        mock_send.return_value = EmailDeliveryResult(True, "sent", "Sent")
        test_email = f"test_cooldown_{uuid.uuid4().hex[:8]}@example.com"

        # Register user
        reg_res = self.client.post("/api/auth/register", json={
            "full_name": "Cooldown Test",
            "email": test_email,
            "password": "StrongPassword@123",
        })
        self.assertEqual(reg_res.status_code, 200)

        # Immediate resend attempt within 60s cooldown
        resend_res = self.client.post("/api/auth/resend-verification", json={"email": test_email})
        self.assertEqual(resend_res.status_code, 429)
        self.assertIn("please wait", get_error_message(resend_res).lower())

        created_user = self.db.query(models.User).filter(models.User.email == test_email).first()
        if created_user:
            self.db.delete(created_user)
            self.db.commit()

    @patch("app.api.routes.auth.send_verification_email")
    def test_resend_verification_failure_returns_502(self, mock_send):
        test_email = f"test_resend_fail_{uuid.uuid4().hex[:8]}@example.com"

        # Create user with older token outside cooldown
        mock_send.return_value = EmailDeliveryResult(True, "sent", "Sent")
        self.client.post("/api/auth/register", json={
            "full_name": "Resend Fail Test",
            "email": test_email,
            "password": "StrongPassword@123",
        })

        user = self.db.query(models.User).filter(models.User.email == test_email).first()
        self.assertIsNotNone(user)

        # Backdate the token timestamp to simulate expired cooldown
        token_rec = self.db.query(models.EmailVerificationToken).filter(
            models.EmailVerificationToken.user_id == user.id
        ).first()
        if token_rec:
            token_rec.created_at = datetime.now(timezone.utc) - timedelta(seconds=120)
            self.db.commit()

        # Now mock resend failure
        mock_send.return_value = EmailDeliveryResult(False, "auth_error", "Authentication failed")
        resend_res = self.client.post("/api/auth/resend-verification", json={"email": test_email})

        self.assertEqual(resend_res.status_code, 502)
        data = resend_res.json()
        self.assertFalse(data["success"])
        self.assertFalse(data["email_sent"])
        self.assertEqual(data["delivery_status"], "auth_error")

        self.db.delete(user)
        self.db.commit()

    # =========================================================================
    # 5. Token Redemption and Security Tests
    # =========================================================================
    def test_verify_email_invalid_token(self):
        response = self.client.post("/api/auth/verify-email", json={"token": "completely_invalid_token"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("invalid verification token", get_error_message(response).lower())

    def test_verify_email_expired_token(self):
        test_email = f"test_expired_{uuid.uuid4().hex[:8]}@example.com"
        user = models.User(
            email=test_email,
            password_hash="fakehash",
            full_name="Expired User",
            is_email_verified=False,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        raw_token = f"raw_expired_token_{uuid.uuid4().hex}"
        token_hash = _hash_token(raw_token)
        past_time = datetime.now(timezone.utc) - timedelta(hours=2)

        token_record = models.EmailVerificationToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=past_time,
            created_at=past_time - timedelta(hours=1),
        )
        self.db.add(token_record)
        self.db.commit()

        response = self.client.post("/api/auth/verify-email", json={"token": raw_token})
        self.assertEqual(response.status_code, 400)
        self.assertIn("expired", get_error_message(response).lower())

        self.db.delete(user)
        self.db.commit()

    def test_verify_email_successful_redemption_and_reuse_prevention(self):
        test_email = f"test_redeem_{uuid.uuid4().hex[:8]}@example.com"
        user = models.User(
            email=test_email,
            password_hash="fakehash",
            full_name="Redeem User",
            is_email_verified=False,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        raw_token = f"valid_token_{uuid.uuid4().hex}"
        token_hash = _hash_token(raw_token)
        future_time = datetime.now(timezone.utc) + timedelta(hours=24)

        token_record = models.EmailVerificationToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=future_time,
        )
        self.db.add(token_record)
        self.db.commit()

        # First redemption attempt: Success
        r1 = self.client.post("/api/auth/verify-email", json={"token": raw_token})
        self.assertEqual(r1.status_code, 200)
        d1 = r1.json()
        self.assertTrue(d1["success"])
        self.assertTrue(d1["is_email_verified"])
        self.assertIn("access_token", d1)

        # Confirm user is marked verified in database
        self.db.refresh(user)
        self.assertTrue(user.is_email_verified)

        # Confirm token is marked used in database
        self.db.refresh(token_record)
        self.assertIsNotNone(token_record.used_at)

        # Second redemption attempt (Token Reuse): Must fail
        r2 = self.client.post("/api/auth/verify-email", json={"token": raw_token})
        self.assertEqual(r2.status_code, 400)
        self.assertIn("already been used", get_error_message(r2).lower())

        self.db.delete(user)
        self.db.commit()


if __name__ == "__main__":
    unittest.main()
