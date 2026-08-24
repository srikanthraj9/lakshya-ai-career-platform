import unittest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.db.database import SessionLocal
from app.db import models


class TestPrivilegeEscalationAndCatalogSecurity(unittest.TestCase):
    """
    Ensures normal authenticated users cannot escalate privileges to admin
    or tamper with shared catalog databases.
    """

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.normal_user_id = uuid.uuid4()
        cls.token = create_access_token({"sub": str(cls.normal_user_id)})
        cls.headers = {"Authorization": f"Bearer {cls.token}"}

        db = SessionLocal()
        cls.user = models.User(
            id=cls.normal_user_id,
            email=f"candidate_{cls.normal_user_id.hex[:8]}@example.com",
            password_hash="hashed_pw",
            full_name="Candidate Charlie",
            role="user",
            is_active=True,
            is_email_verified=True,
        )
        db.add(cls.user)
        db.commit()
        db.close()

    def test_normal_user_cannot_access_admin_dashboard(self):
        res = self.client.get("/api/admin/dashboard", headers=self.headers)
        self.assertEqual(res.status_code, 403)

    def test_normal_user_cannot_access_admin_users(self):
        res = self.client.get("/api/admin/users", headers=self.headers)
        self.assertEqual(res.status_code, 403)

    def test_normal_user_cannot_create_catalog_role(self):
        res = self.client.post(
            "/api/roles/",
            json={"title": "Unauthorized Role", "category": "Security"},
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 403)

    def test_normal_user_cannot_add_catalog_role_skills(self):
        dummy_role_id = uuid.uuid4()
        res = self.client.post(
            f"/api/roles/{dummy_role_id}/skills",
            json=[{"skill_name": "TamperedSkill", "skill_category": "technical", "weight": 1.0}],
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 403)

    def test_normal_user_cannot_delete_catalog_skill(self):
        dummy_skill_id = uuid.uuid4()
        res = self.client.delete(
            f"/api/roles/skills/{dummy_skill_id}",
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 403)


if __name__ == "__main__":
    unittest.main()
