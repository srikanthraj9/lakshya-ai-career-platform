import unittest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.database import get_db, Base
from app.db import models, schemas
from app.core.security import hash_password, verify_password, create_access_token


class TestProfileSettingsAndSkillsAudit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # In-memory SQLite with StaticPool so all connections share the same in-memory DB
        cls.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        Base.metadata.create_all(bind=cls.engine)

        db = cls.TestingSessionLocal()
        # Seed User A
        cls.user_a_id = uuid.uuid4()
        cls.user_a_password = "PasswordA123!"
        user_a = models.User(
            id=cls.user_a_id,
            email="usera@lakshya.ai",
            password_hash=hash_password(cls.user_a_password),
            full_name="Alice Candidate",
            role="user",
            is_active=True,
            is_suspended=False,
            is_email_verified=True,
        )
        db.add(user_a)
        profile_a = models.UserCareerProfile(
            user_id=cls.user_a_id,
            target_role="Frontend Engineer",
            experience_level="Mid-Level",
            primary_goals={"goals": ["Master TypeScript", "Learn WebGL"], "custom_preserved_field": "preserved_123"},
        )
        db.add(profile_a)

        # Seed User B
        cls.user_b_id = uuid.uuid4()
        cls.user_b_password = "PasswordB123!"
        user_b = models.User(
            id=cls.user_b_id,
            email="userb@lakshya.ai",
            password_hash=hash_password(cls.user_b_password),
            full_name="Bob Engineer",
            role="user",
            is_active=True,
            is_suspended=False,
            is_email_verified=True,
        )
        db.add(user_b)
        profile_b = models.UserCareerProfile(
            user_id=cls.user_b_id,
            target_role="Backend Specialist",
            experience_level="Senior",
            primary_goals={"goals": ["Scale Microservices"]},
        )
        db.add(profile_b)

        db.commit()
        db.close()

        def override_get_db():
            db_session = cls.TestingSessionLocal()
            try:
                yield db_session
            finally:
                db_session.close()

        app.dependency_overrides[get_db] = override_get_db

        cls.token_a = create_access_token({"sub": str(cls.user_a_id), "role": "user"})
        cls.token_b = create_access_token({"sub": str(cls.user_b_id), "role": "user"})
        cls.headers_a = {"Authorization": f"Bearer {cls.token_a}"}
        cls.headers_b = {"Authorization": f"Bearer {cls.token_b}"}

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.pop(get_db, None)

    def setUp(self):
        self.client = TestClient(app)

    def test_unauthenticated_endpoints_denied(self):
        endpoints = [
            ("GET", "/api/users/profile"),
            ("PATCH", "/api/users/profile"),
            ("GET", "/api/users/skills"),
            ("POST", "/api/users/skills"),
            ("GET", "/api/users/settings"),
            ("PATCH", "/api/users/settings"),
            ("POST", "/api/users/passport/share"),
            ("DELETE", "/api/users/passport/share"),
            ("GET", "/api/notifications"),
            ("GET", "/api/notifications/unread-count"),
            ("POST", "/api/auth/change-password"),
        ]
        for method, endpoint in endpoints:
            if method == "GET":
                res = self.client.get(endpoint)
            elif method == "POST":
                res = self.client.post(endpoint, json={})
            elif method == "PATCH":
                res = self.client.patch(endpoint, json={})
            elif method == "DELETE":
                res = self.client.delete(endpoint)
            self.assertIn(
                res.status_code,
                [401, 403],
                f"Endpoint {method} {endpoint} should require authentication",
            )

    def test_profile_read_and_update_multi_user(self):
        # 1. User A reads profile
        res_a = self.client.get("/api/users/profile", headers=self.headers_a)
        self.assertEqual(res_a.status_code, 200)
        data_a = res_a.json()
        self.assertEqual(data_a["full_name"], "Alice Candidate")
        self.assertEqual(data_a["target_role"], "Frontend Engineer")

        # 2. User B reads profile
        res_b = self.client.get("/api/users/profile", headers=self.headers_b)
        self.assertEqual(res_b.status_code, 200)
        data_b = res_b.json()
        self.assertEqual(data_b["full_name"], "Bob Engineer")
        self.assertEqual(data_b["target_role"], "Backend Specialist")

        # 3. User A updates profile
        update_payload = {
            "headline": "Lead Frontend Architect",
            "bio": "Building high-performance design systems and WebGL experiences.",
            "location": "Bengaluru, India",
            "portfolio_url": "https://alice.dev",
            "github_url": "https://github.com/alice",
            "linkedin_url": "https://linkedin.com/in/alice",
            "work_preference": "Remote",
            "employment_type": "Full-time",
        }
        patch_res = self.client.patch("/api/users/profile", json=update_payload, headers=self.headers_a)
        self.assertEqual(patch_res.status_code, 200)
        patched_a = patch_res.json()
        self.assertEqual(patched_a["headline"], "Lead Frontend Architect")
        self.assertEqual(patched_a["location"], "Bengaluru, India")
        self.assertEqual(patched_a["portfolio_url"], "https://alice.dev")
        self.assertGreaterEqual(patched_a["profile_completeness"], 50)

        # 4. Verify User B was NOT modified
        recheck_b = self.client.get("/api/users/profile", headers=self.headers_b).json()
        self.assertEqual(recheck_b["full_name"], "Bob Engineer")
        self.assertEqual(recheck_b["headline"], "")

        # 5. Verify unrelated values in primary_goals are preserved
        db = self.TestingSessionLocal()
        profile_db = db.query(models.UserCareerProfile).filter(models.UserCareerProfile.user_id == self.user_a_id).first()
        self.assertEqual(profile_db.primary_goals.get("custom_preserved_field"), "preserved_123")
        db.close()

    def test_user_settings_multi_user(self):
        # User A updates settings
        settings_payload = {
            "notification_preferences": {"email_enabled": True, "weekly_summary": True},
            "appearance_settings": {"reduced_motion": True, "theme": "system"},
        }
        res_a = self.client.patch("/api/users/settings", json=settings_payload, headers=self.headers_a)
        self.assertEqual(res_a.status_code, 200)
        data_a = res_a.json()
        self.assertTrue(data_a["notification_preferences"]["email_enabled"])
        self.assertTrue(data_a["notification_preferences"]["weekly_summary"])
        self.assertTrue(data_a["appearance_settings"]["reduced_motion"])

        # User B reads settings - should remain unaffected default
        res_b = self.client.get("/api/users/settings", headers=self.headers_b)
        self.assertEqual(res_b.status_code, 200)
        data_b = res_b.json()
        self.assertFalse(data_b["notification_preferences"]["email_enabled"])
        self.assertFalse(data_b["notification_preferences"]["weekly_summary"])
        self.assertFalse(data_b["appearance_settings"]["reduced_motion"])

    def test_password_change_flow(self):
        # 1. Wrong current password -> 400
        res = self.client.post(
            "/api/auth/change-password",
            json={"current_password": "WrongPassword123!", "new_password": "BrandNewPassword999!"},
            headers=self.headers_a,
        )
        self.assertEqual(res.status_code, 400)
        err_msg = res.json().get("error", {}).get("message") or res.json().get("detail", "")
        self.assertIn("Current password is incorrect", err_msg)

        # 2. New password too short (< 8 chars) -> 422 or 400
        res_short = self.client.post(
            "/api/auth/change-password",
            json={"current_password": self.user_a_password, "new_password": "short"},
            headers=self.headers_a,
        )
        self.assertIn(res_short.status_code, [400, 422])

        # 3. Successful password change
        new_pass = "BrandNewSecurePassword123!"
        res_success = self.client.post(
            "/api/auth/change-password",
            json={"current_password": self.user_a_password, "new_password": new_pass},
            headers=self.headers_a,
        )
        self.assertEqual(res_success.status_code, 200)
        self.assertIn("Password updated successfully", res_success.json()["message"])

        # 4. Verify DB hash updated
        db = self.TestingSessionLocal()
        user_db = db.query(models.User).filter(models.User.id == self.user_a_id).first()
        self.assertFalse(verify_password(self.user_a_password, user_db.password_hash))
        self.assertTrue(verify_password(new_pass, user_db.password_hash))
        db.close()

    def test_notifications_ownership_and_state(self):
        # 1. User A creates notification
        notif_a_res = self.client.post(
            "/api/notifications",
            json={
                "client_event_id": "test-notif-a-1",
                "type": "interview_completed",
                "title": "Interview Done",
                "message": "Mock interview evaluation completed",
                "action_url": "/interview",
                "action_text": "View",
            },
            headers=self.headers_a,
        )
        self.assertEqual(notif_a_res.status_code, 200)
        notif_a_id = notif_a_res.json()["id"]

        # 2. User B creates notification
        notif_b_res = self.client.post(
            "/api/notifications",
            json={
                "client_event_id": "test-notif-b-1",
                "type": "resume_analyzed",
                "title": "Resume Ready",
                "message": "Resume ATS score generated",
            },
            headers=self.headers_b,
        )
        self.assertEqual(notif_b_res.status_code, 200)
        notif_b_id = notif_b_res.json()["id"]

        # 3. Verify unread counts
        count_a = self.client.get("/api/notifications/unread-count", headers=self.headers_a).json()["unread_count"]
        count_b = self.client.get("/api/notifications/unread-count", headers=self.headers_b).json()["unread_count"]
        self.assertGreaterEqual(count_a, 1)
        self.assertGreaterEqual(count_b, 1)

        # 4. Cross-tenant mutation rejected: User A cannot read or mark User B's notification
        cross_res = self.client.patch(f"/api/notifications/{notif_b_id}/read", headers=self.headers_a)
        self.assertEqual(cross_res.status_code, 404)

        # 5. User A marks own notification read
        mark_res = self.client.patch(f"/api/notifications/{notif_a_id}/read", headers=self.headers_a)
        self.assertEqual(mark_res.status_code, 200)
        self.assertTrue(mark_res.json()["is_read"])

        # 6. User A marks own notification unread
        unread_res = self.client.patch(f"/api/notifications/{notif_a_id}/unread", headers=self.headers_a)
        self.assertEqual(unread_res.status_code, 200)
        self.assertFalse(unread_res.json()["is_read"])

        # 7. User A marks all as read
        read_all_res = self.client.patch("/api/notifications/read-all", headers=self.headers_a)
        self.assertEqual(read_all_res.status_code, 200)
        count_a_after = self.client.get("/api/notifications/unread-count", headers=self.headers_a).json()["unread_count"]
        self.assertEqual(count_a_after, 0)

        # User B's notification remains unread
        count_b_after = self.client.get("/api/notifications/unread-count", headers=self.headers_b).json()["unread_count"]
        self.assertGreaterEqual(count_b_after, 1)

    def test_skills_crud_and_duplicate_prevention(self):
        # 1. User A adds skill
        res1 = self.client.post(
            "/api/users/skills",
            json={"skill_name": "React", "skill_category": "frontend", "source": "project", "confidence": 0.95},
            headers=self.headers_a,
        )
        self.assertEqual(res1.status_code, 200)
        skill1_id = res1.json()["id"]

        # 2. Case-insensitive duplicate prevention
        res2 = self.client.post(
            "/api/users/skills",
            json={"skill_name": "react", "skill_category": "frontend", "source": "manual", "confidence": 1.0},
            headers=self.headers_a,
        )
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.json()["id"], skill1_id)  # Returned existing

        # 3. User B cannot delete User A's skill
        del_cross = self.client.delete(f"/api/users/skills/{skill1_id}", headers=self.headers_b)
        self.assertEqual(del_cross.status_code, 404)

        # 4. User A deletes own skill
        del_own = self.client.delete(f"/api/users/skills/{skill1_id}", headers=self.headers_a)
        self.assertEqual(del_own.status_code, 200)

    def test_passport_share_and_sanitized_projection(self):
        # 1. User A creates share token
        share_res = self.client.post("/api/users/passport/share", headers=self.headers_a)
        self.assertEqual(share_res.status_code, 200)
        data = share_res.json()
        self.assertTrue(data["is_public"])
        token = data["share_token"]
        self.assertTrue(bool(token))

        # 2. Public unauthenticated request to shared passport
        pub_res = self.client.get(f"/api/users/passport/shared/{token}")
        self.assertEqual(pub_res.status_code, 200)
        pub_data = pub_res.json()
        self.assertEqual(pub_data["full_name"], "Alice Candidate")
        self.assertEqual(pub_data["target_role"], "Frontend Engineer")
        self.assertIn("skills", pub_data)
        self.assertIn("alignment_score", pub_data)

        # 3. Confirm NO sensitive data is returned in public projection
        self.assertNotIn("email", pub_data)
        self.assertNotIn("id", pub_data)
        self.assertNotIn("user_id", pub_data)
        self.assertNotIn("password_hash", pub_data)
        self.assertNotIn("settings", pub_data)

        # 4. Revoke public share
        revoke_res = self.client.delete("/api/users/passport/share", headers=self.headers_a)
        self.assertEqual(revoke_res.status_code, 200)
        self.assertFalse(revoke_res.json()["is_public"])

        # 5. Confirm revoked token returns 404
        revoked_get = self.client.get(f"/api/users/passport/shared/{token}")
        self.assertEqual(revoked_get.status_code, 404)


if __name__ == "__main__":
    unittest.main()
