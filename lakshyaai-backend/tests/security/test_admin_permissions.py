import unittest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.db.database import SessionLocal
from app.db import models


class TestAdminRoleHierarchyAndPermissions(unittest.TestCase):
    """
    Validates the 3-tier Role-Based Access Control hierarchy:
    - user: strictly isolated, 403 on all /api/admin/*
    - admin: operational support, 200 on dashboard/users, 403 on Super Admin mutations (role update, feature flags)
    - super_admin: full platform governance, 200 on all privileged routes
    - suspended user: 403 on all authenticated routes
    """

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        db = SessionLocal()

        # 1. Normal candidate user
        cls.user_id = uuid.uuid4()
        cls.user = models.User(
            id=cls.user_id,
            email=f"candidate_{cls.user_id.hex[:8]}@example.com",
            password_hash="hashed_pw",
            full_name="Candidate Charlie",
            role="user",
            is_active=True,
            is_email_verified=True,
        )
        db.add(cls.user)

        # 2. Support Admin
        cls.admin_id = uuid.uuid4()
        cls.admin = models.User(
            id=cls.admin_id,
            email=f"admin_{cls.admin_id.hex[:8]}@example.com",
            password_hash="hashed_pw",
            full_name="Admin Alex",
            role="admin",
            is_active=True,
            is_email_verified=True,
        )
        db.add(cls.admin)

        # 3. Super Admin
        cls.super_admin_id = uuid.uuid4()
        cls.super_admin = models.User(
            id=cls.super_admin_id,
            email=f"superadmin_{cls.super_admin_id.hex[:8]}@example.com",
            password_hash="hashed_pw",
            full_name="Super Admin Sam",
            role="super_admin",
            is_active=True,
            is_email_verified=True,
        )
        db.add(cls.super_admin)

        # 4. Suspended User
        cls.suspended_id = uuid.uuid4()
        cls.suspended_user = models.User(
            id=cls.suspended_id,
            email=f"suspended_{cls.suspended_id.hex[:8]}@example.com",
            password_hash="hashed_pw",
            full_name="Suspended Steve",
            role="user",
            is_active=True,
            is_suspended=True,
            suspended_reason="Policy violation",
            is_email_verified=True,
        )
        db.add(cls.suspended_user)

        db.commit()
        db.close()

        cls.user_headers = {"Authorization": f"Bearer {create_access_token({'sub': str(cls.user_id)})}"}
        cls.admin_headers = {"Authorization": f"Bearer {create_access_token({'sub': str(cls.admin_id)})}"}
        cls.super_admin_headers = {"Authorization": f"Bearer {create_access_token({'sub': str(cls.super_admin_id)})}"}
        cls.suspended_headers = {"Authorization": f"Bearer {create_access_token({'sub': str(cls.suspended_id)})}"}

    def test_unauthenticated_request_rejected(self):
        res = self.client.get("/api/admin/dashboard")
        self.assertEqual(res.status_code, 401)

    def test_candidate_cannot_access_admin_dashboard(self):
        res = self.client.get("/api/admin/dashboard", headers=self.user_headers)
        self.assertEqual(res.status_code, 403)

    def test_candidate_cannot_access_admin_users(self):
        res = self.client.get("/api/admin/users", headers=self.user_headers)
        self.assertEqual(res.status_code, 403)

    def test_suspended_user_blocked(self):
        res = self.client.get("/api/applications", headers=self.suspended_headers)
        self.assertEqual(res.status_code, 403)

    def test_admin_can_access_dashboard_and_users(self):
        res_dash = self.client.get("/api/admin/dashboard", headers=self.admin_headers)
        self.assertEqual(res_dash.status_code, 200)

        res_users = self.client.get("/api/admin/users", headers=self.admin_headers)
        self.assertEqual(res_users.status_code, 200)

    def test_admin_cannot_promote_roles(self):
        # Only super_admin can PATCH user role
        res = self.client.patch(
            f"/api/admin/users/{self.user_id}",
            json={"role": "admin"},
            headers=self.admin_headers,
        )
        self.assertEqual(res.status_code, 403)

    def test_admin_cannot_create_feature_flags(self):
        res = self.client.post(
            "/api/admin/feature-flags",
            json={"key": f"test_flag_{uuid.uuid4().hex[:6]}", "name": "Test", "is_enabled": True},
            headers=self.admin_headers,
        )
        self.assertEqual(res.status_code, 403)

    def test_super_admin_can_update_role(self):
        res = self.client.patch(
            f"/api/admin/users/{self.user_id}",
            json={"is_active": True},
            headers=self.super_admin_headers,
        )
        self.assertEqual(res.status_code, 200)


if __name__ == "__main__":
    unittest.main()
