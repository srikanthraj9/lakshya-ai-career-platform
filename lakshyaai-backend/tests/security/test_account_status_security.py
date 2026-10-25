import unittest
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.database import get_db, Base
from app.db import models
from app.core.security import hash_password, create_access_token
from app.core.dependencies import get_current_user, get_optional_current_user


class TestAccountStatusSecurity(unittest.TestCase):
    """
    Regression test suite for P0-02:
    Enforces inactive and suspended account restrictions at login and across protected endpoints.
    Tests both newly issued tokens (login flow) and existing tokens presented by inactive/suspended users.
    """

    @classmethod
    def setUpClass(cls):
        # Create an in-memory SQLite database for deterministic, network-independent execution
        cls.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        
        # Create tables
        Base.metadata.create_all(bind=cls.engine)

        cls.db = cls.TestingSessionLocal()
        cls.test_password = "Password123!"
        hashed = hash_password(cls.test_password)

        # 1. Normal active user
        cls.active_user_id = uuid.uuid4()
        cls.active_user = models.User(
            id=cls.active_user_id,
            email="active_user@example.com",
            password_hash=hashed,
            full_name="Active Alice",
            role="user",
            is_active=True,
            is_suspended=False,
            is_email_verified=True,
        )
        cls.db.add(cls.active_user)

        # 2. Suspended user
        cls.suspended_user_id = uuid.uuid4()
        cls.suspended_user = models.User(
            id=cls.suspended_user_id,
            email="suspended_user@example.com",
            password_hash=hashed,
            full_name="Suspended Sam",
            role="user",
            is_active=True,
            is_suspended=True,
            suspended_reason="Account suspended for policy breach",
            is_email_verified=True,
        )
        cls.db.add(cls.suspended_user)

        # 3. Deactivated / Inactive user
        cls.inactive_user_id = uuid.uuid4()
        cls.inactive_user = models.User(
            id=cls.inactive_user_id,
            email="inactive_user@example.com",
            password_hash=hashed,
            full_name="Inactive Ian",
            role="user",
            is_active=False,
            is_suspended=False,
            is_email_verified=True,
        )
        cls.db.add(cls.inactive_user)

        # 4. Inactive and suspended user
        cls.inactive_suspended_id = uuid.uuid4()
        cls.inactive_suspended_user = models.User(
            id=cls.inactive_suspended_id,
            email="inactive_suspended@example.com",
            password_hash=hashed,
            full_name="Inactive Suspended Iris",
            role="user",
            is_active=False,
            is_suspended=True,
            suspended_reason="Fraud investigation",
            is_email_verified=True,
        )
        cls.db.add(cls.inactive_suspended_user)

        cls.db.commit()

        # Generate tokens simulating pre-existing active sessions
        cls.active_token = create_access_token({"sub": str(cls.active_user_id)})
        cls.suspended_token = create_access_token({"sub": str(cls.suspended_user_id)})
        cls.inactive_token = create_access_token({"sub": str(cls.inactive_user_id)})
        cls.inactive_suspended_token = create_access_token({"sub": str(cls.inactive_suspended_id)})

        def override_get_db():
            db_session = cls.TestingSessionLocal()
            try:
                yield db_session
            finally:
                db_session.close()

        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()
        cls.db.close()
        Base.metadata.drop_all(bind=cls.engine)

    # -------------------------------------------------------------------------
    # LOGIN FLOW RESTRICTIONS (New token issuance)
    # -------------------------------------------------------------------------

    def _get_error_message(self, res):
        body = res.json()
        if isinstance(body, dict):
            if "error" in body and isinstance(body["error"], dict):
                return body["error"].get("message", "")
            return body.get("detail", "")
        return ""

    def test_active_user_can_login(self):
        """Active users with valid credentials should successfully log in."""
        res = self.client.post(
            "/api/auth/login",
            data={"username": "active_user@example.com", "password": self.test_password},
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn("access_token", body)
        self.assertEqual(body.get("token_type"), "bearer")

    def test_suspended_user_login_blocked(self):
        """Suspended users must receive HTTP 403 Forbidden with suspension details upon login attempt."""
        res = self.client.post(
            "/api/auth/login",
            data={"username": "suspended_user@example.com", "password": self.test_password},
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("Account is suspended", self._get_error_message(res))

    def test_inactive_user_login_blocked(self):
        """Inactive/deactivated users must receive HTTP 403 Forbidden upon login attempt."""
        res = self.client.post(
            "/api/auth/login",
            data={"username": "inactive_user@example.com", "password": self.test_password},
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("Account is deactivated", self._get_error_message(res))

    def test_inactive_suspended_user_login_blocked(self):
        """Inactive and suspended users must receive HTTP 403 Forbidden upon login attempt."""
        res = self.client.post(
            "/api/auth/login",
            data={"username": "inactive_suspended@example.com", "password": self.test_password},
        )
        self.assertEqual(res.status_code, 403)

    def test_wrong_credentials_does_not_leak_account_status(self):
        """Bad password on a suspended/inactive account must still return 401 Unauthorized."""
        res = self.client.post(
            "/api/auth/login",
            data={"username": "suspended_user@example.com", "password": "WrongPassword!"},
        )
        self.assertEqual(res.status_code, 401)
        self.assertEqual(self._get_error_message(res), "Invalid credentials")

    # -------------------------------------------------------------------------
    # PROTECTED ENDPOINT RESTRICTIONS (Existing token evaluation)
    # -------------------------------------------------------------------------

    def test_active_token_can_access_protected_endpoint(self):
        """Existing valid token from an active user must be permitted."""
        res = self.client.get(
            "/api/users/me",
            headers={"Authorization": f"Bearer {self.active_token}"},
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json().get("email"), "active_user@example.com")

    def test_existing_token_suspended_user_blocked(self):
        """Existing valid token from a user who is suspended must be blocked with HTTP 403."""
        res = self.client.get(
            "/api/users/me",
            headers={"Authorization": f"Bearer {self.suspended_token}"},
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("Account is suspended", self._get_error_message(res))

    def test_existing_token_inactive_user_blocked(self):
        """Existing valid token from an inactive user must be blocked with HTTP 403."""
        res = self.client.get(
            "/api/users/me",
            headers={"Authorization": f"Bearer {self.inactive_token}"},
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("Account is deactivated", self._get_error_message(res))

    def test_existing_token_inactive_suspended_blocked(self):
        """Existing valid token from an inactive and suspended user must be blocked with HTTP 403."""
        res = self.client.get(
            "/api/users/me",
            headers={"Authorization": f"Bearer {self.inactive_suspended_token}"},
        )
        self.assertEqual(res.status_code, 403)

    # -------------------------------------------------------------------------
    # DIRECT DEPENDENCY UNIT CHECKS
    # -------------------------------------------------------------------------

    def test_get_current_user_direct_calls(self):
        """Directly verify get_current_user raises HTTPException for inactive/suspended accounts."""
        session = self.TestingSessionLocal()
        try:
            # Active user returns model
            user = get_current_user(token=self.active_token, db=session)
            self.assertEqual(user.id, self.active_user_id)

            # Suspended user raises 403
            with self.assertRaises(HTTPException) as ctx:
                get_current_user(token=self.suspended_token, db=session)
            self.assertEqual(ctx.exception.status_code, 403)

            # Inactive user raises 403
            with self.assertRaises(HTTPException) as ctx:
                get_current_user(token=self.inactive_token, db=session)
            self.assertEqual(ctx.exception.status_code, 403)
        finally:
            session.close()

    def test_get_optional_current_user_direct_calls(self):
        """get_optional_current_user returns None for inactive/suspended users."""
        session = self.TestingSessionLocal()
        try:
            # Active user returns model
            user = get_optional_current_user(token=self.active_token, db=session)
            self.assertIsNotNone(user)
            self.assertEqual(user.id, self.active_user_id)

            # Suspended user returns None
            user_suspended = get_optional_current_user(token=self.suspended_token, db=session)
            self.assertIsNone(user_suspended)

            # Inactive user returns None
            user_inactive = get_optional_current_user(token=self.inactive_token, db=session)
            self.assertIsNone(user_inactive)
        finally:
            session.close()


if __name__ == "__main__":
    unittest.main()
