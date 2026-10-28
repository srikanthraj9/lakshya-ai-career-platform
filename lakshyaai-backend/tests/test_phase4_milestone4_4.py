"""
Phase 4, Milestone 4.4 Automated Verification Suite
===================================================
Covers:
1. System Health Diagnostics (Liveness, Database Latency, Auth Engine, AI Provider Heuristics, Storage Probe).
2. Feature Flag Lifecycle (Create Custom, Toggle/Update, Delete Custom Flag, Reject System Flag Deletion).
3. Database Explorer Enhanced Relationships (Exposed Relationships Metadata, Foreign Key Filtering, Security Validation).
"""

import os
import unittest
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient

# Enforce fail-closed testing isolation
os.environ["TESTING"] = "true"

from app.main import app
from app.db.database import SessionLocal, engine
from app.db import models
from app.core.security import create_access_token
from app.services.health_service import HealthService
from app.services.feature_flag_service import FeatureFlagService, DEFAULT_FLAGS


class TestMilestone44(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        models.Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

        db = SessionLocal()
        try:
            # Seed default flags if not present
            FeatureFlagService.seed_default_flags(db)

            # Create Super Administrator
            cls.super_admin_email = f"m44_superadmin_{uuid.uuid4().hex[:6]}@lakshya.test"
            cls.super_admin = models.User(
                id=uuid.uuid4(),
                email=cls.super_admin_email,
                password_hash="test_hashed_pw",
                full_name="M44 Super Admin",
                role="super_admin",
                is_active=True,
                is_suspended=False,
                is_email_verified=True,
            )
            db.add(cls.super_admin)

            # Create Standard Candidate User
            cls.candidate_id = uuid.uuid4()
            cls.candidate_email = f"m44_candidate_{cls.candidate_id.hex[:6]}@lakshya.test"
            cls.candidate = models.User(
                id=cls.candidate_id,
                email=cls.candidate_email,
                password_hash="test_hashed_pw",
                full_name="M44 Candidate User",
                role="user",
                is_active=True,
                is_suspended=False,
                is_email_verified=True,
            )
            db.add(cls.candidate)

            # Create Career Profile linked to candidate
            cls.career_profile = models.UserCareerProfile(
                id=uuid.uuid4(),
                user_id=cls.candidate.id,
                target_role="Platform Architect",
                onboarding_completed=True,
            )
            db.add(cls.career_profile)

            # Create Resume linked to candidate
            cls.resume = models.Resume(
                id=uuid.uuid4(),
                user_id=cls.candidate.id,
                original_filename="architect_resume.pdf",
                ats_score=88.5,
            )
            db.add(cls.resume)

            cls.super_admin_id = cls.super_admin.id
            cls.career_profile_id = cls.career_profile.id
            cls.resume_id = cls.resume.id

            db.commit()

            cls.admin_token = create_access_token(
                data={"sub": str(cls.super_admin_id), "email": cls.super_admin_email, "role": "super_admin"}
            )
            cls.headers = {"Authorization": f"Bearer {cls.admin_token}"}

        finally:
            db.close()

    @classmethod
    def tearDownClass(cls):
        db = SessionLocal()
        try:
            db.query(models.Resume).filter(models.Resume.id == cls.resume_id).delete()
            db.query(models.UserCareerProfile).filter(models.UserCareerProfile.id == cls.career_profile_id).delete()
            db.query(models.User).filter(
                models.User.id.in_([cls.super_admin_id, cls.candidate_id])
            ).delete()
            db.commit()
        finally:
            db.close()

    # =========================================================================
    # PART 1: SYSTEM HEALTH DIAGNOSTICS
    # =========================================================================

    def test_01_health_service_liveness_and_diagnostics(self):
        """Verify HealthService.check_liveness and get_system_diagnostics."""
        liveness = HealthService.check_liveness()
        self.assertEqual(liveness["status"], "ok")
        self.assertEqual(liveness["service"], "lakshyaai-backend")

        db = SessionLocal()
        try:
            diag = HealthService.get_system_diagnostics(db)
            self.assertIn(diag["status"], ["healthy", "degraded", "unhealthy"])
            self.assertIn("services", diag)
            self.assertIn("service_details", diag)

            # Check individual service checks
            self.assertIn("api", diag["services"])
            self.assertIn("database", diag["services"])
            self.assertIn("authentication", diag["services"])
            self.assertIn("ai_service", diag["services"])
            self.assertIn("storage", diag["services"])

            # Verify no secret leak
            diag_str = str(diag)
            self.assertNotIn("SECRET_KEY", diag_str)
            self.assertNotIn("test_hashed_pw", diag_str)
            self.assertNotIn("sqlite://", diag_str)
        finally:
            db.close()

    def test_02_admin_system_health_endpoint(self):
        """Verify GET /api/admin/system/health route requires admin and returns diagnostics."""
        res = self.client.get("/api/admin/system/health", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertIn(data["status"], ["healthy", "degraded", "unhealthy"])
        self.assertEqual(data["services"]["api"], "healthy")
        self.assertEqual(data["services"]["database"], "healthy")

        # Database latency is a measured float
        db_detail = data["service_details"]["database"]
        self.assertIn("latency_ms", db_detail)
        self.assertGreater(db_detail["latency_ms"], 0.0)

    # =========================================================================
    # PART 2: FEATURE FLAG LIFECYCLE & SAFEGUARDS
    # =========================================================================

    def test_03_feature_flag_crud_lifecycle(self):
        """Verify creating, updating, and deleting custom feature flags."""
        custom_key = f"custom_flag_{uuid.uuid4().hex[:6]}"

        # 1. Create custom feature flag
        create_res = self.client.post(
            "/api/admin/feature-flags",
            json={
                "key": custom_key,
                "name": "Beta Pipeline Analyzer",
                "description": "Experimental career pipeline analyzer",
                "is_enabled": False,
                "target_roles": ["super_admin"],
            },
            headers=self.headers,
        )
        self.assertEqual(create_res.status_code, 200)
        flag_data = create_res.json()
        flag_id = flag_data["id"]
        self.assertEqual(flag_data["key"], custom_key)
        self.assertFalse(flag_data["is_enabled"])

        # 2. Toggle/Update custom feature flag
        patch_res = self.client.patch(
            f"/api/admin/feature-flags/{flag_id}",
            json={"is_enabled": True, "name": "Beta Pipeline Analyzer v2"},
            headers=self.headers,
        )
        self.assertEqual(patch_res.status_code, 200)
        self.assertTrue(patch_res.json()["is_enabled"])
        self.assertEqual(patch_res.json()["name"], "Beta Pipeline Analyzer v2")

        # 3. Delete custom feature flag
        del_res = self.client.delete(f"/api/admin/feature-flags/{flag_id}", headers=self.headers)
        self.assertEqual(del_res.status_code, 200)
        self.assertIn("deleted successfully", del_res.json()["message"])

        # 4. Verify flag is deleted
        get_res = self.client.get("/api/admin/feature-flags", headers=self.headers)
        self.assertEqual(get_res.status_code, 200)
        remaining_keys = [f["key"] for f in get_res.json()]
        self.assertNotIn(custom_key, remaining_keys)

    def test_04_system_feature_flag_protected_from_deletion(self):
        """Verify that system-critical feature flags (e.g. voice_interview) cannot be deleted."""
        get_res = self.client.get("/api/admin/feature-flags", headers=self.headers)
        self.assertEqual(get_res.status_code, 200)
        flags = get_res.json()

        system_flag = next((f for f in flags if f["key"] == "voice_interview"), None)
        self.assertIsNotNone(system_flag, "voice_interview system flag must exist")

        # Attempt to delete protected system flag
        del_res = self.client.delete(f"/api/admin/feature-flags/{system_flag['id']}", headers=self.headers)
        self.assertEqual(del_res.status_code, 400)
        err_msg = del_res.json().get("error", {}).get("message") or del_res.json().get("detail", "")
        self.assertIn("Cannot delete system-critical feature flag", err_msg)

    # =========================================================================
    # PART 3: DATABASE EXPLORER RELATIONSHIPS & FILTERING
    # =========================================================================

    def test_05_database_tables_metadata_exposes_relationships(self):
        """Verify GET /api/admin/database/tables includes relationship mappings."""
        res = self.client.get("/api/admin/database/tables", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        tables = res.json()

        users_table = next((t for t in tables if t["table_name"] == "users"), None)
        self.assertIsNotNone(users_table)
        self.assertIn("relationships", users_table)
        self.assertIn("career_profile", users_table["relationships"])
        self.assertIn("resumes", users_table["relationships"])

    def test_06_database_table_foreign_key_filtering(self):
        """Verify GET /api/admin/database/tables/{table} filters records by valid foreign key."""
        # Query user_career_profiles filtered by user_id
        res = self.client.get(
            "/api/admin/database/tables/user_career_profiles",
            params={"filter_field": "user_id", "filter_value": str(self.candidate_id)},
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(data["total_records"], 1)
        self.assertEqual(data["records"][0]["user_id"], str(self.candidate_id))

        # Check relationships present in schema_info
        self.assertIn("relationships", data["schema_info"])

    def test_07_database_table_invalid_filter_field_rejected(self):
        """Verify that attempts to filter by non-allowlisted column return HTTP 400."""
        res = self.client.get(
            "/api/admin/database/tables/users",
            params={"filter_field": "non_existent_column", "filter_value": "foo"},
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 400)
        err_msg = res.json().get("error", {}).get("message") or res.json().get("detail", "")
        self.assertIn("not an authorized readable column", err_msg)


if __name__ == "__main__":
    unittest.main()
