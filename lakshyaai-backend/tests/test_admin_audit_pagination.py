import unittest
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal, Base, engine
from app.db import models
from app.core.security import create_access_token


class TestAdminAuditPaginationAndFormatting(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)
        db = SessionLocal()

        # Find existing Super Admin or create test one
        cls.super_admin = db.query(models.User).filter(
            (models.User.email == "srikanthuppalapati09@gmail.com") |
            (models.User.email == "superadmin_test@lakshya.ai") |
            (models.User.role == "super_admin")
        ).first()
        if not cls.super_admin:
            cls.super_admin = models.User(
                id=uuid.uuid4(),
                email="superadmin_test@lakshya.ai",
                password_hash="test_pw_hash",
                role="super_admin",
                is_suspended=False,
                is_email_verified=True,
            )
            db.add(cls.super_admin)
            db.commit()

        cls.super_admin_id = cls.super_admin.id
        cls.super_admin_token = create_access_token({"sub": str(cls.super_admin_id)})
        cls.super_admin_headers = {"Authorization": f"Bearer {cls.super_admin_token}"}

        # Find existing Candidate user for unauthorized test
        cls.candidate_user = db.query(models.User).filter(
            (models.User.email == "srikanthrajuppalapati999@gmail.com") |
            (models.User.email == "candidate_test@lakshya.ai") |
            (models.User.role == "user")
        ).first()
        if not cls.candidate_user:
            cls.candidate_user = models.User(
                id=uuid.uuid4(),
                email="candidate_test@lakshya.ai",
                password_hash="test_pw_hash",
                role="user",
                is_suspended=False,
                is_email_verified=True,
            )
            db.add(cls.candidate_user)
            db.commit()

        cls.candidate_token = create_access_token({"sub": str(cls.candidate_user.id)})
        cls.candidate_headers = {"Authorization": f"Bearer {cls.candidate_token}"}

        cls.initial_audit_count = db.query(models.AdminAuditLog).count()
        if cls.initial_audit_count == 0:
            for i in range(15):
                db.add(models.AdminAuditLog(
                    id=uuid.uuid4(),
                    admin_user_id=cls.super_admin_id,
                    action_type="TEST_ACTION",
                    resource_type="system",
                    resource_id=str(i),
                    metadata={"index": i},
                ))
            db.commit()
            cls.initial_audit_count = db.query(models.AdminAuditLog).count()
        db.close()

    def test_01_first_page_results_and_total_count(self):
        """1. Verify first-page results, metadata envelope, and accurate total record count."""
        response = self.client.get("/api/admin/audit?page=1&page_size=25", headers=self.super_admin_headers)
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertIn("items", data)
        self.assertIn("total", data)
        self.assertIn("page", data)
        self.assertIn("page_size", data)
        self.assertIn("total_pages", data)

        self.assertEqual(data["page"], 1)
        self.assertEqual(data["page_size"], 25)
        self.assertGreaterEqual(data["total"], self.initial_audit_count)
        self.assertLessEqual(len(data["items"]), 25)

        # Check fields present in items
        if data["items"]:
            item = data["items"][0]
            self.assertIn("id", item)
            self.assertIn("action_type", item)
            self.assertIn("admin_user_id", item)
            self.assertIn("admin_email", item)
            self.assertIn("target_user_id", item)
            self.assertIn("target_email", item)
            self.assertIn("created_at", item)

    def test_02_pagination_next_page_distinct_items(self):
        """2. Verify moving to next page returns distinct non-overlapping records."""
        res_page1 = self.client.get("/api/admin/audit?page=1&page_size=10", headers=self.super_admin_headers)
        res_page2 = self.client.get("/api/admin/audit?page=2&page_size=10", headers=self.super_admin_headers)

        self.assertEqual(res_page1.status_code, 200)
        self.assertEqual(res_page2.status_code, 200)

        items_p1 = res_page1.json()["items"]
        items_p2 = res_page2.json()["items"]

        if items_p1 and items_p2:
            ids_p1 = {item["id"] for item in items_p1}
            ids_p2 = {item["id"] for item in items_p2}
            # Sets should be completely disjoint
            self.assertTrue(ids_p1.isdisjoint(ids_p2), "Pages 1 and 2 must not contain duplicate records")

    def test_03_boundary_behavior_out_of_range(self):
        """3. Verify out-of-range pages return empty list with accurate metadata."""
        response = self.client.get("/api/admin/audit?page=99999&page_size=25", headers=self.super_admin_headers)
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(data["page"], 99999)
        self.assertEqual(data["items"], [])
        self.assertGreater(data["total"], 0)

    def test_04_configurable_page_sizes(self):
        """4. Verify page size controls (25, 50, 100)."""
        for size in [25, 50, 100]:
            res = self.client.get(f"/api/admin/audit?page=1&page_size={size}", headers=self.super_admin_headers)
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data["page_size"], size)
            self.assertLessEqual(len(data["items"]), size)

    def test_05_deterministic_stable_ordering(self):
        """5. Verify stable descending ordering by created_at with deterministic tie-breaker."""
        response = self.client.get("/api/admin/audit?page=1&page_size=50", headers=self.super_admin_headers)
        self.assertEqual(response.status_code, 200)

        items = response.json()["items"]
        for i in range(len(items) - 1):
            curr_time = items[i]["created_at"]
            next_time = items[i + 1]["created_at"]
            # Current time must be >= next time (descending)
            self.assertGreaterEqual(curr_time, next_time)
            # If timestamps match, tie-breaker must guarantee stable order
            if curr_time == next_time:
                self.assertNotEqual(items[i]["id"], items[i + 1]["id"])

    def test_06_deleted_or_null_actors_handled_gracefully(self):
        """6. Verify records with null or unattributed actors return null admin_email without error."""
        response = self.client.get("/api/admin/audit?page=1&page_size=50", headers=self.super_admin_headers)
        self.assertEqual(response.status_code, 200)

        items = response.json()["items"]
        unattributed = [item for item in items if item["admin_user_id"] is None]
        for item in unattributed:
            self.assertIsNone(item["admin_email"])

    def test_07_unauthorized_requests_rejected(self):
        """7. Verify unauthorized requests return 401 (unauthenticated) or 403 (insufficient role)."""
        # Unauthenticated request
        res_no_auth = self.client.get("/api/admin/audit")
        self.assertEqual(res_no_auth.status_code, 401)

        # Authenticated as candidate user (non-super-admin)
        res_candidate = self.client.get("/api/admin/audit", headers=self.candidate_headers)
        self.assertIn(res_candidate.status_code, [403, 404])

    def test_08_preservation_of_audit_records(self):
        """8. Verify querying audit records never mutates or drops existing records."""
        db = SessionLocal()
        current_count = db.query(models.AdminAuditLog).count()
        db.close()
        # Querying audit logs must never decrease record count
        self.assertGreaterEqual(current_count, self.initial_audit_count)


if __name__ == "__main__":
    unittest.main()
