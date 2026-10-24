import unittest
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.database import get_db, Base
from app.db import models, schemas
from app.core.security import hash_password, create_access_token
from app.services.storage.file_storage import FileStorageService


class TestAccountDeletionSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # In-memory SQLite with StaticPool for test isolation
        cls.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        Base.metadata.create_all(bind=cls.engine)

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
        app.dependency_overrides.pop(get_db, None)

    def setUp(self):
        self.db = self.TestingSessionLocal()

    def tearDown(self):
        self.db.close()

    def _get_error_detail(self, res):
        body = res.json()
        if isinstance(body, dict):
            if "error" in body and isinstance(body["error"], dict):
                return body["error"].get("message", "")
            return body.get("detail", "")
        return ""

    def _create_user(self, email: str, password: str = "SecretPassword123!", auth_provider: str = "password"):
        user_id = uuid.uuid4()
        user = models.User(
            id=user_id,
            email=email,
            password_hash=hash_password(password),
            full_name=f"User {email}",
            role="user",
            is_active=True,
            is_suspended=False,
            is_email_verified=True,
        )
        self.db.add(user)
        self.db.flush()

        profile = models.UserCareerProfile(
            user_id=user_id,
            target_role="Full Stack Engineer",
            experience_level="Intermediate",
            primary_goals={"goals": ["Launch App"], "auth_provider": auth_provider},
        )
        self.db.add(profile)

        # Add a skill
        skill = models.UserSkill(
            user_id=user_id,
            skill_name="Python",
            skill_category="technical",
            source="verified",
            confidence=0.95,
        )
        self.db.add(skill)

        self.db.commit()

        token = create_access_token({"sub": str(user_id), "role": "user"})
        headers = {"Authorization": f"Bearer {token}"}
        return user, headers, token, password

    def test_unauthenticated_deletion_rejected(self):
        """Unauthenticated requests without token must return 401."""
        response = self.client.request("DELETE", "/api/users/me", json={"confirmation": "DELETE", "password": "any"})
        self.assertEqual(response.status_code, 401)

    def test_invalid_confirmation_keyword_rejected(self):
        """Supplying invalid confirmation phrases must return 400 Bad Request."""
        user, headers, _, password = self._create_user("invalid_confirm@lakshya.ai")

        for bad_confirm in ["delete", "YES", "confirm", "", "   "]:
            res = self.client.request(
                "DELETE",
                "/api/users/me",
                headers=headers,
                json={"confirmation": bad_confirm, "password": password},
            )
            self.assertEqual(res.status_code, 400)
            self.assertIn("DELETE", res.json()["error"]["message"] if "error" in res.json() else res.json().get("detail", ""))

        # Confirm user still exists
        found = self.db.query(models.User).filter_by(id=user.id).first()
        self.assertIsNotNone(found)

    def test_incorrect_password_rejected(self):
        """Password account with wrong password must return 401 Unauthorized."""
        user, headers, _, _ = self._create_user("wrong_pw@lakshya.ai", password="CorrectPassword123!")

        res = self.client.request(
            "DELETE",
            "/api/users/me",
            headers=headers,
            json={"confirmation": "DELETE", "password": "WrongPassword999!"},
        )
        self.assertEqual(res.status_code, 401)
        detail = res.json()["error"]["message"] if "error" in res.json() else res.json().get("detail", "")
        self.assertIn("Incorrect password", detail)

        # Confirm user is not deleted
        found = self.db.query(models.User).filter_by(id=user.id).first()
        self.assertIsNotNone(found)

    def test_missing_password_for_password_account_rejected(self):
        """Password accounts must provide current password."""
        user, headers, _, _ = self._create_user("missing_pw@lakshya.ai")

        res = self.client.request(
            "DELETE",
            "/api/users/me",
            headers=headers,
            json={"confirmation": "DELETE"},
        )
        self.assertEqual(res.status_code, 400)
        detail = res.json()["error"]["message"] if "error" in res.json() else res.json().get("detail", "")
        self.assertIn("password is required", detail)

    def test_successful_account_deletion_and_data_purge(self):
        """Valid password + DELETE confirmation permanently wipes user, profile, skills, and files."""
        user, headers, token, password = self._create_user("successful_delete@lakshya.ai")
        user_id = user.id

        # Create dummy physical upload to verify file cleanup
        file_dest, _ = FileStorageService.save_resume_file(
            user_id=user_id,
            resume_id=uuid.uuid4(),
            filename="my_resume.pdf",
            file_bytes=b"%PDF-1.4 mock content",
        )
        self.assertTrue(Path(file_dest).exists())

        # Execute deletion via DELETE endpoint
        res = self.client.request(
            "DELETE",
            "/api/users/me",
            headers=headers,
            json={"confirmation": "DELETE", "password": password},
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertTrue(body["success"])
        self.assertIn("permanently deleted", body["message"])

        # Verify User and child records are completely gone
        self.assertIsNone(self.db.query(models.User).filter_by(id=user_id).first())
        self.assertIsNone(self.db.query(models.UserCareerProfile).filter_by(user_id=user_id).first())
        self.assertEqual(self.db.query(models.UserSkill).filter_by(user_id=user_id).count(), 0)

        # Verify physical disk directory for user was deleted
        self.assertFalse(Path(file_dest).exists())

        # Verify subsequent requests with deleted user token are rejected
        post_del_res = self.client.get("/api/users/me", headers=headers)
        self.assertEqual(post_del_res.status_code, 401)

    def test_post_alias_endpoint_success(self):
        """POST /api/users/me/delete functions equivalently to DELETE /api/users/me."""
        user, headers, _, password = self._create_user("post_alias@lakshya.ai")
        user_id = user.id

        res = self.client.post(
            "/api/users/me/delete",
            headers=headers,
            json={"confirmation": "DELETE", "password": password},
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["success"])
        self.assertIsNone(self.db.query(models.User).filter_by(id=user_id).first())

    def test_user_cannot_delete_other_user(self):
        """User A can never delete User B even if supplying payload with User B's attributes."""
        user_a, headers_a, _, password_a = self._create_user("user_a_isolate@lakshya.ai")
        user_b, headers_b, _, _ = self._create_user("user_b_isolate@lakshya.ai")
        user_a_id = user_a.id
        user_b_id = user_b.id

        # User A sends request attempting to target User B
        res = self.client.request(
            "DELETE",
            "/api/users/me",
            headers=headers_a,
            json={"confirmation": "DELETE", "password": password_a, "target_user_id": str(user_b_id)},
        )
        self.assertEqual(res.status_code, 200)

        # User A is deleted
        self.assertIsNone(self.db.query(models.User).filter_by(id=user_a_id).first())
        # User B remains completely intact
        self.assertIsNotNone(self.db.query(models.User).filter_by(id=user_b_id).first())

    def test_public_skill_passport_revoked_immediately_on_deletion(self):
        """Shared public Skill Passport URLs immediately return 404 once account is deleted."""
        user, headers, _, password = self._create_user("passport_owner@lakshya.ai")

        # Enable public passport sharing
        share_res = self.client.post("/api/users/passport/share", headers=headers)
        self.assertEqual(share_res.status_code, 200)
        token = share_res.json()["share_token"]
        self.assertTrue(token)

        # Verify passport is publicly accessible
        public_res = self.client.get(f"/api/users/passport/shared/{token}")
        self.assertEqual(public_res.status_code, 200)
        self.assertIn("User passport_owner", public_res.json()["full_name"])

        # Delete account
        del_res = self.client.request(
            "DELETE",
            "/api/users/me",
            headers=headers,
            json={"confirmation": "DELETE", "password": password},
        )
        self.assertEqual(del_res.status_code, 200)

        # Verify shared passport URL is now 404 Not Found
        public_res_after = self.client.get(f"/api/users/passport/shared/{token}")
        self.assertEqual(public_res_after.status_code, 404)

    def test_password_account_cannot_bypass_password_with_token(self):
        """Password account requesting deletion-token is rejected (400), and cannot bypass password."""
        user, headers, _, password = self._create_user("pwd_bypass@lakshya.ai", auth_provider="password")

        # 1. Attempting to get deletion token on password account must return 400
        token_res = self.client.post("/api/users/me/deletion-token", headers=headers)
        self.assertEqual(token_res.status_code, 400)
        self.assertIn("Password-authenticated accounts must provide their current password", self._get_error_detail(token_res))

        # 2. Attempting to delete password account with deletion_token but without password must return 400
        del_res = self.client.request(
            "DELETE",
            "/api/users/me",
            headers=headers,
            json={"confirmation": "DELETE", "deletion_token": "some-arbitrary-token"},
        )
        self.assertEqual(del_res.status_code, 400)
        self.assertIn("password is required", self._get_error_detail(del_res))

        # 3. Attempting to delete password account with wrong password (even with token) must return 401
        del_res_wrong = self.client.request(
            "DELETE",
            "/api/users/me",
            headers=headers,
            json={"confirmation": "DELETE", "password": "WrongPassword!", "deletion_token": "some-token"},
        )
        self.assertEqual(del_res_wrong.status_code, 401)
        self.assertIn("Incorrect password", self._get_error_detail(del_res_wrong))

    def test_google_oauth_missing_verification_token_rejected(self):
        """Google OAuth user without deletion token cannot delete account (400 Bad Request)."""
        oauth_user, headers, _, _ = self._create_user(
            "google_missing_token@lakshya.ai",
            password="auto-generated-random-pw",
            auth_provider="google",
        )

        res = self.client.request(
            "DELETE",
            "/api/users/me",
            headers=headers,
            json={"confirmation": "DELETE"},
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("A valid deletion authorization token is required", self._get_error_detail(res))

        # Confirm user is not deleted
        self.assertIsNotNone(self.db.query(models.User).filter_by(id=oauth_user.id).first())

    def test_google_oauth_incorrect_token_rejected(self):
        """Google OAuth user supplying invalid deletion token must return 401 Unauthorized."""
        oauth_user, headers, _, _ = self._create_user(
            "google_wrong_token@lakshya.ai",
            password="auto-generated-random-pw",
            auth_provider="google",
        )

        # Generate a valid token first so challenge exists
        token_res = self.client.post("/api/users/me/deletion-token", headers=headers)
        self.assertEqual(token_res.status_code, 200)

        # Send deletion with an incorrect token
        res = self.client.request(
            "DELETE",
            "/api/users/me",
            headers=headers,
            json={"confirmation": "DELETE", "deletion_token": "invalid-wrong-token-12345"},
        )
        self.assertEqual(res.status_code, 401)
        self.assertIn("Invalid deletion authorization token", self._get_error_detail(res))

        # Confirm user is not deleted
        self.assertIsNotNone(self.db.query(models.User).filter_by(id=oauth_user.id).first())

    def test_google_oauth_expired_authorization_rejected(self):
        """Google OAuth user with expired deletion token must be rejected (400 Bad Request)."""
        oauth_user, headers, _, _ = self._create_user(
            "google_expired@lakshya.ai",
            password="auto-generated-random-pw",
            auth_provider="google",
        )

        # Issue token
        token_res = self.client.post("/api/users/me/deletion-token", headers=headers)
        self.assertEqual(token_res.status_code, 200)
        token = token_res.json()["deletion_token"]

        # Manually backdate the challenge expiration in DB to simulate expired token
        self.db.expire_all()
        profile = self.db.query(models.UserCareerProfile).filter_by(user_id=oauth_user.id).first()
        meta = dict(profile.primary_goals or {})
        challenge = dict(meta.get("deletion_challenge", {}))
        challenge["expires_at"] = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
        meta["deletion_challenge"] = challenge
        profile.primary_goals = meta
        flag_modified(profile, "primary_goals")
        self.db.commit()

        # Attempt deletion with expired token
        res = self.client.request(
            "DELETE",
            "/api/users/me",
            headers=headers,
            json={"confirmation": "DELETE", "deletion_token": token},
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("expired", self._get_error_detail(res))

        # Confirm user is not deleted
        self.assertIsNotNone(self.db.query(models.User).filter_by(id=oauth_user.id).first())

    def test_google_oauth_repeated_deletion_requests_replay_rejected(self):
        """Google OAuth deletion token is strictly single-use and cannot be replayed."""
        oauth_user, headers, _, _ = self._create_user(
            "google_replay@lakshya.ai",
            password="auto-generated-random-pw",
            auth_provider="google",
        )

        # Issue token
        token_res = self.client.post("/api/users/me/deletion-token", headers=headers)
        self.assertEqual(token_res.status_code, 200)
        token = token_res.json()["deletion_token"]

        # Manually mark token as used
        self.db.expire_all()
        profile = self.db.query(models.UserCareerProfile).filter_by(user_id=oauth_user.id).first()
        meta = dict(profile.primary_goals or {})
        challenge = dict(meta.get("deletion_challenge", {}))
        challenge["used"] = True
        meta["deletion_challenge"] = challenge
        profile.primary_goals = meta
        flag_modified(profile, "primary_goals")
        self.db.commit()

        # Attempt to use already-used token
        res = self.client.request(
            "DELETE",
            "/api/users/me",
            headers=headers,
            json={"confirmation": "DELETE", "deletion_token": token},
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("already been used", self._get_error_detail(res))

        # Confirm user is not deleted
        self.assertIsNotNone(self.db.query(models.User).filter_by(id=oauth_user.id).first())

    def test_google_oauth_successful_deletion_flow(self):
        """Google OAuth user obtains single-use deletion token and permanently deletes account."""
        oauth_user, headers, _, _ = self._create_user(
            "google_success@lakshya.ai",
            password="auto-generated-random-pw",
            auth_provider="google",
        )
        oauth_user_id = oauth_user.id

        # 1. Issue deletion authorization token
        token_res = self.client.post("/api/users/me/deletion-token", headers=headers)
        self.assertEqual(token_res.status_code, 200)
        token_body = token_res.json()
        token = token_body["deletion_token"]
        self.assertEqual(token_body["auth_provider"], "google")
        self.assertEqual(token_body["expires_in_seconds"], 300)

        # 2. Execute deletion
        res = self.client.request(
            "DELETE",
            "/api/users/me",
            headers=headers,
            json={"confirmation": "DELETE", "deletion_token": token},
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["success"])
        self.assertIn("permanently deleted", res.json()["message"])

        # 3. Verify OAuth user and related data are completely removed
        self.assertIsNone(self.db.query(models.User).filter_by(id=oauth_user_id).first())
        self.assertIsNone(self.db.query(models.UserCareerProfile).filter_by(user_id=oauth_user_id).first())
        self.assertEqual(self.db.query(models.UserSkill).filter_by(user_id=oauth_user_id).count(), 0)

        # 4. Verify repeated deletion attempt fails (user gone)
        repeat_res = self.client.request(
            "DELETE",
            "/api/users/me",
            headers=headers,
            json={"confirmation": "DELETE", "deletion_token": token},
        )
        self.assertEqual(repeat_res.status_code, 401)

    def test_account_deletion_cleanup_failure_rolls_back_and_preserves_user(self):
        """Cleanup or server failures roll back transaction and preserve the user account."""
        user, headers, _, password = self._create_user("rollback_test@lakshya.ai")
        user_id = user.id

        # Simulate an unexpected storage failure during deletion
        with patch.object(FileStorageService, "delete_user_files", side_effect=RuntimeError("Disk I/O error")):
            res = self.client.request(
                "DELETE",
                "/api/users/me",
                headers=headers,
                json={"confirmation": "DELETE", "password": password},
            )
            self.assertEqual(res.status_code, 500)
            self.assertIn("Failed to delete account due to a server error", self._get_error_detail(res))

        # Verify user still exists because transaction rolled back cleanly
        persisted_user = self.db.query(models.User).filter_by(id=user_id).first()
        self.assertIsNotNone(persisted_user)
        self.assertEqual(persisted_user.email, "rollback_test@lakshya.ai")

    # =========================================================================
    # REGRESSION TESTS: AUTH PROVIDER DETECTION & ACCOUNT DELETION
    # =========================================================================

    def test_regression_existing_google_oauth_account_with_provider_metadata(self):
        """Existing Google OAuth account with auth_provider in metadata returns 'google' and deletes without password."""
        user, headers, _, _ = self._create_user(
            "google_existing_meta@lakshya.ai",
            password="random-oauth-hash",
            auth_provider="google",
        )
        # Verify /api/users/me and /api/users/profile return auth_provider="google"
        me_res = self.client.get("/api/users/me", headers=headers)
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.json()["auth_provider"], "google")

        prof_res = self.client.get("/api/users/profile", headers=headers)
        self.assertEqual(prof_res.status_code, 200)
        self.assertEqual(prof_res.json()["auth_provider"], "google")

        # Request deletion token
        token_res = self.client.post("/api/users/me/deletion-token", headers=headers)
        self.assertEqual(token_res.status_code, 200)
        token = token_res.json()["deletion_token"]

        # Delete account with token and no password
        del_res = self.client.request(
            "DELETE",
            "/api/users/me",
            headers=headers,
            json={"confirmation": "DELETE", "deletion_token": token},
        )
        self.assertEqual(del_res.status_code, 200)
        self.assertTrue(del_res.json()["success"])

    def test_regression_existing_google_oauth_account_with_legacy_metadata(self):
        """Existing Google OAuth account with legacy metadata keys ('provider': 'google') is recognized as 'google'."""
        user_id = uuid.uuid4()
        user = models.User(
            id=user_id,
            email="google_legacy_meta@lakshya.ai",
            password_hash=hash_password("random-oauth-hash"),
            full_name="Legacy OAuth User",
            role="user",
            is_active=True,
            is_suspended=False,
            is_email_verified=True,
        )
        self.db.add(user)
        self.db.flush()

        # Legacy metadata key 'provider' instead of 'auth_provider'
        profile = models.UserCareerProfile(
            user_id=user_id,
            target_role="Full Stack Engineer",
            primary_goals={"goals": ["Learn Cloud"], "provider": "google"},
        )
        self.db.add(profile)
        self.db.commit()

        token = create_access_token({"sub": str(user_id), "role": "user"})
        headers = {"Authorization": f"Bearer {token}"}

        # Verify /api/users/profile detects legacy 'provider' key as 'google'
        prof_res = self.client.get("/api/users/profile", headers=headers)
        self.assertEqual(prof_res.status_code, 200)
        self.assertEqual(prof_res.json()["auth_provider"], "google")

        # Verify deletion token can be issued
        token_res = self.client.post("/api/users/me/deletion-token", headers=headers)
        self.assertEqual(token_res.status_code, 200)
        self.assertEqual(token_res.json()["auth_provider"], "google")

    def test_regression_existing_google_oauth_account_with_missing_metadata(self):
        """Existing Google OAuth account with missing metadata (raw goals list) is correctly recognized and self-heals."""
        user_id = uuid.uuid4()
        user = models.User(
            id=user_id,
            email="srikanthrajuppalapati999@gmail.com",
            password_hash=hash_password("random-oauth-hash"),
            full_name="Existing Google User",
            role="user",
            is_active=True,
            is_suspended=False,
            is_email_verified=True,
        )
        self.db.add(user)
        self.db.flush()

        # Primary goals is a raw list from onboarding without auth_provider key
        profile = models.UserCareerProfile(
            user_id=user_id,
            target_role="Full Stack Developer",
            primary_goals=["Improve resume", "Practice interviews"],
        )
        self.db.add(profile)
        self.db.commit()

        token = create_access_token({"sub": str(user_id), "role": "user"})
        headers = {"Authorization": f"Bearer {token}"}

        # Profile API detects as google and preserves goals list
        prof_res = self.client.get("/api/users/profile", headers=headers)
        self.assertEqual(prof_res.status_code, 200)
        self.assertEqual(prof_res.json()["auth_provider"], "google")
        self.assertEqual(prof_res.json()["primary_goals"], ["Improve resume", "Practice interviews"])

        # Deletion token can be issued
        token_res = self.client.post("/api/users/me/deletion-token", headers=headers)
        self.assertEqual(token_res.status_code, 200)
        self.assertEqual(token_res.json()["auth_provider"], "google")

    def test_regression_email_password_account_requires_password_and_rejects_tokens(self):
        """Email/password account cannot request deletion tokens and strictly requires current password."""
        user, headers, _, password = self._create_user(
            "strict_password_user@lakshya.ai",
            password="MySecretPassword123!",
            auth_provider="password",
        )

        # 1. Profile reports auth_provider="password"
        prof_res = self.client.get("/api/users/profile", headers=headers)
        self.assertEqual(prof_res.status_code, 200)
        self.assertEqual(prof_res.json()["auth_provider"], "password")

        # 2. Requesting deletion token is rejected (400 Bad Request)
        tok_res = self.client.post("/api/users/me/deletion-token", headers=headers)
        self.assertEqual(tok_res.status_code, 400)
        self.assertIn("Password-authenticated accounts must provide their current password", self._get_error_detail(tok_res))

        # 3. Deleting without password is rejected (400 Bad Request)
        del_no_pw = self.client.request(
            "DELETE",
            "/api/users/me",
            headers=headers,
            json={"confirmation": "DELETE"},
        )
        self.assertEqual(del_no_pw.status_code, 400)
        self.assertIn("current account password is required", self._get_error_detail(del_no_pw))

        # 4. Deleting with wrong password is rejected (401 Unauthorized)
        del_bad_pw = self.client.request(
            "DELETE",
            "/api/users/me",
            headers=headers,
            json={"confirmation": "DELETE", "password": "WrongPassword!"},
        )
        self.assertEqual(del_bad_pw.status_code, 401)
        self.assertIn("Incorrect password", self._get_error_detail(del_bad_pw))

        # 5. Deleting with correct password succeeds (200 OK)
        del_ok = self.client.request(
            "DELETE",
            "/api/users/me",
            headers=headers,
            json={"confirmation": "DELETE", "password": password},
        )
        self.assertEqual(del_ok.status_code, 200)
        self.assertTrue(del_ok.json()["success"])

    def test_regression_failed_deletion_token_request_returns_actionable_error(self):
        """Failed deletion token requests return clear, actionable HTTP error messages."""
        user, headers, _, _ = self._create_user("failed_token_user@lakshya.ai", auth_provider="password")

        res = self.client.post("/api/users/me/deletion-token", headers=headers)
        self.assertEqual(res.status_code, 400)
        detail = self._get_error_detail(res)
        self.assertIn("OAuth-authenticated", detail)
        self.assertIn("Password-authenticated accounts must provide their current password", detail)


if __name__ == "__main__":
    unittest.main()
