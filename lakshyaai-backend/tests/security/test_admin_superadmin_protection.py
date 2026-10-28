import unittest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.db.database import SessionLocal
from app.db import models


def get_error_message(res):
    data = res.json()
    if "error" in data and isinstance(data["error"], dict):
        return data["error"].get("message", "")
    return data.get("detail", "")


class TestAdminSuperAdminProtectionAndAnnouncements(unittest.TestCase):
    """
    Validates:
    1. Super Admin demotion/deactivation/suspension guard: cannot remove the last active super admin.
    2. Ordinary admin cannot suspend a super admin.
    3. Announcement creation, updating via PATCH, and candidate retrieval via /api/notifications/announcements.
    4. System health probe verifies actual database connection without leaking secrets.
    """

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        db = SessionLocal()

        # Temporarily de-escalate other existing super admins so our test controls the exact count
        cls.original_super_admin_ids = [
            u.id for u in db.query(models.User).filter(
                models.User.role == "super_admin",
                models.User.is_active == True,
            ).all()
        ]
        for u_id in cls.original_super_admin_ids:
            u = db.query(models.User).filter(models.User.id == u_id).first()
            if u:
                u.role = "admin"
        db.commit()

        # Unique IDs
        cls.super_admin_id = uuid.uuid4()
        cls.super_admin_2_id = uuid.uuid4()
        cls.admin_id = uuid.uuid4()
        cls.candidate_id = uuid.uuid4()

        # Create Sole Super Admin
        cls.super_admin = models.User(
            id=cls.super_admin_id,
            email=f"sole_superadmin_{cls.super_admin_id.hex[:8]}@example.com",
            password_hash="test_pw_hash",
            full_name="Sole Super Admin",
            role="super_admin",
            is_active=True,
            is_suspended=False,
            is_email_verified=True,
        )
        db.add(cls.super_admin)

        # Create 1 Ordinary Admin
        cls.admin = models.User(
            id=cls.admin_id,
            email=f"support_admin_{cls.admin_id.hex[:8]}@example.com",
            password_hash="test_pw_hash",
            full_name="Support Admin",
            role="admin",
            is_active=True,
            is_suspended=False,
            is_email_verified=True,
        )
        db.add(cls.admin)

        # Create 1 Candidate User
        cls.candidate = models.User(
            id=cls.candidate_id,
            email=f"candidate_user_{cls.candidate_id.hex[:8]}@example.com",
            password_hash="test_pw_hash",
            full_name="Candidate User",
            role="user",
            is_active=True,
            is_suspended=False,
            is_email_verified=True,
        )
        db.add(cls.candidate)

        db.commit()
        db.close()

        cls.super_admin_headers = {
            "Authorization": f"Bearer {create_access_token({'sub': str(cls.super_admin_id)})}"
        }
        cls.admin_headers = {
            "Authorization": f"Bearer {create_access_token({'sub': str(cls.admin_id)})}"
        }
        cls.candidate_headers = {
            "Authorization": f"Bearer {create_access_token({'sub': str(cls.candidate_id)})}"
        }

    @classmethod
    def tearDownClass(cls):
        db = SessionLocal()
        # Restore original super admins
        for u_id in cls.original_super_admin_ids:
            u = db.query(models.User).filter(models.User.id == u_id).first()
            if u:
                u.role = "super_admin"

        db.query(models.PlatformAnnouncement).filter(
            models.PlatformAnnouncement.title.like("Test Announcement%")
        ).delete(synchronize_session=False)
        db.query(models.User).filter(
            models.User.id.in_([cls.super_admin_id, cls.super_admin_2_id, cls.admin_id, cls.candidate_id])
        ).delete(synchronize_session=False)
        db.commit()
        db.close()

    def test_ordinary_admin_cannot_suspend_super_admin(self):
        res = self.client.post(
            f"/api/admin/users/{self.super_admin_id}/suspend",
            json={"reason": "Attempted unauthorized suspension"},
            headers=self.admin_headers,
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("Only super administrators", get_error_message(res))

    def test_cannot_demote_last_active_super_admin(self):
        # When only 1 super_admin exists in db, demoting them must fail
        res = self.client.patch(
            f"/api/admin/users/{self.super_admin_id}",
            json={"role": "admin"},
            headers=self.super_admin_headers,
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Cannot demote the last active super administrator", get_error_message(res))

    def test_cannot_deactivate_last_active_super_admin(self):
        res = self.client.patch(
            f"/api/admin/users/{self.super_admin_id}",
            json={"is_active": False},
            headers=self.super_admin_headers,
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Cannot deactivate the last active super administrator", get_error_message(res))

    def test_cannot_suspend_last_active_super_admin(self):
        res = self.client.post(
            f"/api/admin/users/{self.super_admin_id}/suspend",
            json={"reason": "Accidental self-lockout"},
            headers=self.super_admin_headers,
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Cannot suspend the last active super administrator", get_error_message(res))

    def test_announcement_crud_and_candidate_visibility(self):
        # 1. Super Admin creates an announcement
        post_res = self.client.post(
            "/api/admin/announcements",
            json={
                "title": "Test Announcement Broadcast",
                "message": "Scheduled platform maintenance window at midnight.",
                "type": "maintenance",
                "target_audience": "all",
                "is_active": True,
            },
            headers=self.admin_headers,
        )
        self.assertEqual(post_res.status_code, 200)
        ann_id = post_res.json()["id"]

        # 2. Update announcement via PATCH
        patch_res = self.client.patch(
            f"/api/admin/announcements/{ann_id}",
            json={
                "title": "Test Announcement Broadcast - Rescheduled",
                "message": "Updated maintenance window.",
            },
            headers=self.admin_headers,
        )
        self.assertEqual(patch_res.status_code, 200)
        self.assertEqual(patch_res.json()["title"], "Test Announcement Broadcast - Rescheduled")

        # 3. Candidate fetches active announcements
        cand_res = self.client.get(
            "/api/notifications/announcements",
            headers=self.candidate_headers,
        )
        self.assertEqual(cand_res.status_code, 200)
        ann_titles = [a["title"] for a in cand_res.json()]
        self.assertIn("Test Announcement Broadcast - Rescheduled", ann_titles)

        # 4. Clean up via DELETE
        del_res = self.client.delete(
            f"/api/admin/announcements/{ann_id}",
            headers=self.admin_headers,
        )
        self.assertEqual(del_res.status_code, 200)

    def test_system_health_checks_connectivity_safely(self):
        res = self.client.get(
            "/api/admin/system/health",
            headers=self.admin_headers,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("status", data)
        self.assertIn("services", data)
        self.assertIn("database", data["services"])
        self.assertEqual(data["services"]["database"], "healthy")
        # Ensure no secrets leaked
        raw_text = res.text
        self.assertNotIn("password", raw_text.lower())
        self.assertNotIn("secret", raw_text.lower())

    def test_system_health_diagnostic_never_leaks_forbidden_words_on_degraded_auth(self):
        """
        Regression test: When authentication entropy is low (< 16 chars),
        diagnostic error message must accurately report degradation without
        leaking credential keywords ('secret' or 'password').
        """
        from unittest.mock import patch
        import json
        from app.services.health_service import HealthService
        from app.db.database import SessionLocal

        with patch("app.services.health_service.settings.SECRET_KEY", "short"):
            db = SessionLocal()
            try:
                diag = HealthService.get_system_diagnostics(db)
                self.assertEqual(diag["services"]["authentication"], "degraded")
                raw_json = json.dumps(diag).lower()
                self.assertNotIn("secret", raw_json)
                self.assertNotIn("password", raw_json)
            finally:
                db.close()


if __name__ == "__main__":
    unittest.main()
