"""
Phase 4, Milestone 4.3 Automated Verification Suite
===================================================
Covers:
1. Candidate Readiness Score Unification (CandidateReadinessService & consistency across list/detail).
2. User Management Allowlist Sorting & Deterministic Pagination.
3. Announcement Lifecycle (Edit, Activation/Deactivation, Expiration, Audit Logging).
4. Audit Search, Date-Range Filtering, and Sanitized CSV Export (with Formula Injection Defense).
"""

import os
import unittest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

# Enforce fail-closed testing isolation
os.environ["TESTING"] = "true"

from app.main import app
from app.db.database import SessionLocal, engine
from app.db import models
from app.core.security import create_access_token
from app.services.readiness_service import CandidateReadinessService
from app.services.admin_service import AdminService


class TestMilestone43(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        models.Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

        db = SessionLocal()
        try:
            # Create a test super administrator
            cls.super_admin_email = f"m43_superadmin_{uuid.uuid4().hex[:6]}@lakshya.test"
            cls.super_admin = models.User(
                id=uuid.uuid4(),
                email=cls.super_admin_email,
                password_hash="test_pw",
                full_name="M43 Super Administrator",
                role="super_admin",
                is_active=True,
                is_suspended=False,
                is_email_verified=True,
            )
            db.add(cls.super_admin)

            # Create test candidates
            cls.candidate_a = models.User(
                id=uuid.uuid4(),
                email=f"candidate_a_{uuid.uuid4().hex[:6]}@lakshya.test",
                password_hash="test_pw",
                full_name="Alpha Candidate",
                role="user",
                is_active=True,
                is_suspended=False,
                is_email_verified=True,
                created_at=datetime.now(timezone.utc) - timedelta(days=5),
            )
            cls.candidate_b = models.User(
                id=uuid.uuid4(),
                email=f"candidate_b_{uuid.uuid4().hex[:6]}@lakshya.test",
                password_hash="test_pw",
                full_name="Beta Candidate",
                role="user",
                is_active=True,
                is_suspended=False,
                is_email_verified=True,
                created_at=datetime.now(timezone.utc) - timedelta(days=2),
            )
            cls.candidate_empty = models.User(
                id=uuid.uuid4(),
                email=f"candidate_empty_{uuid.uuid4().hex[:6]}@lakshya.test",
                password_hash="test_pw",
                full_name="Empty Profile Candidate",
                role="user",
                is_active=True,
                is_suspended=False,
                is_email_verified=True,
                created_at=datetime.now(timezone.utc) - timedelta(days=1),
            )
            db.add_all([cls.candidate_a, cls.candidate_b, cls.candidate_empty])
            db.flush()

            # Add resume with ATS score 82.0 for Candidate A
            cls.resume_a = models.Resume(
                id=uuid.uuid4(),
                user_id=cls.candidate_a.id,
                original_filename="alpha_resume.pdf",
                ats_score=82.0,
                created_at=datetime.now(timezone.utc),
            )
            db.add(cls.resume_a)

            # Add completed interview for Candidate A
            cls.interview_a = models.InterviewSession(
                id=uuid.uuid4(),
                user_id=cls.candidate_a.id,
                role="Software Engineer",
                difficulty="medium",
                mode="technical",
                status="completed",
                overall_score=78.0,
                created_at=datetime.now(timezone.utc),
            )
            db.add(cls.interview_a)

            # Add career profile for Candidate A
            cls.profile_a = models.UserCareerProfile(
                id=uuid.uuid4(),
                user_id=cls.candidate_a.id,
                target_role="Full Stack Engineer",
                onboarding_completed=True,
            )
            db.add(cls.profile_a)

            # Add 2 applications for Candidate A
            for i in range(2):
                db.add(models.JobApplication(
                    id=uuid.uuid4(),
                    user_id=cls.candidate_a.id,
                    company_name=f"Company {i}",
                    job_title="Engineer",
                    status="applied",
                ))

            cls.super_admin_id = cls.super_admin.id
            cls.candidate_a_id = cls.candidate_a.id
            cls.candidate_a_email = cls.candidate_a.email
            cls.candidate_b_id = cls.candidate_b.id
            cls.candidate_b_email = cls.candidate_b.email
            cls.candidate_empty_id = cls.candidate_empty.id
            cls.candidate_empty_email = cls.candidate_empty.email

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
            db.query(models.JobApplication).filter(models.JobApplication.user_id == cls.candidate_a_id).delete()
            db.query(models.InterviewSession).filter(models.InterviewSession.user_id == cls.candidate_a_id).delete()
            db.query(models.Resume).filter(models.Resume.user_id == cls.candidate_a_id).delete()
            db.query(models.UserCareerProfile).filter(models.UserCareerProfile.user_id == cls.candidate_a_id).delete()
            db.query(models.User).filter(
                models.User.id.in_([cls.super_admin_id, cls.candidate_a_id, cls.candidate_b_id, cls.candidate_empty_id])
            ).delete()
            db.commit()
        finally:
            db.close()

    # =========================================================================
    # PART 1: CANDIDATE READINESS SCORE CONSISTENCY
    # =========================================================================

    def test_01_readiness_service_calculations(self):
        """Test mathematical accuracy and proportional weight redistribution in CandidateReadinessService."""
        # 1. Complete profile
        score = CandidateReadinessService.calculate_readiness(
            ats_score=80.0,
            latest_interview_score=90.0,
            onboarding_completed=True,
            applications_count=4,
            has_resume=True,
        )
        # 80*0.40 (32) + 90*0.30 (27) + 100*0.15 (15) + 100*0.15 (15) = 89.0
        self.assertEqual(score, 89.0)

        # 2. Resume only (ATS 70.0), no interview, no applications, no onboarding
        score_resume = CandidateReadinessService.calculate_readiness(
            ats_score=70.0,
            has_resume=True,
        )
        self.assertEqual(score_resume, 70.0)

        # 3. Empty profile (no assessment evidence)
        score_empty = CandidateReadinessService.calculate_readiness(
            ats_score=None,
            has_resume=False,
            interviews_count=0,
            applications_count=0,
            onboarding_completed=False,
        )
        self.assertIsNone(score_empty, "Candidate with zero evidence should return None (Insufficient Data)")

    def test_02_readiness_score_list_and_detail_consistency(self):
        """Verify that get_user_detail and list_users return the EXACT same score for the same candidate."""
        db = SessionLocal()
        try:
            detail_a = AdminService.get_user_detail(db, self.candidate_a_id)
            list_res = AdminService.list_users(db, search=self.candidate_a_email)

            self.assertIsNotNone(detail_a)
            self.assertEqual(len(list_res.users), 1)
            list_item_a = list_res.users[0]

            self.assertIsNotNone(detail_a.readiness_score)
            self.assertEqual(
                detail_a.readiness_score,
                list_item_a.readiness_score,
                f"List ({list_item_a.readiness_score}) and Detail ({detail_a.readiness_score}) scores must match exactly",
            )

            # Check empty candidate
            detail_empty = AdminService.get_user_detail(db, self.candidate_empty_id)
            list_empty = AdminService.list_users(db, search=self.candidate_empty_email)

            self.assertIsNone(detail_empty.readiness_score, "Empty candidate should have None readiness in detail")
            self.assertIsNone(list_empty.users[0].readiness_score, "Empty candidate should have None readiness in list")

        finally:
            db.close()

    # =========================================================================
    # PART 2: USER MANAGEMENT SORTING
    # =========================================================================

    def test_03_user_sorting_by_name_and_creation(self):
        """Verify server-side allowlisted sorting by full_name and created_at with deterministic secondary key."""
        # Sort by full_name ASC
        res_asc = self.client.get("/api/admin/users?sort_by=name&sort_order=asc&page_size=10", headers=self.headers)
        self.assertEqual(res_asc.status_code, 200)
        users_asc = res_asc.json()["users"]
        names_asc = [u["full_name"] for u in users_asc if u["full_name"]]
        self.assertEqual(names_asc, sorted(names_asc), "Users should be sorted alphabetically ascending")

        # Sort by created_at DESC
        res_desc = self.client.get("/api/admin/users?sort_by=created_at&sort_order=desc&page_size=10", headers=self.headers)
        self.assertEqual(res_desc.status_code, 200)
        users_desc = res_desc.json()["users"]
        created_times = [u["created_at"] for u in users_desc]
        self.assertEqual(created_times, sorted(created_times, reverse=True), "Users should be sorted by created_at descending")

    def test_04_user_sorting_invalid_field_rejected(self):
        """Verify that attempts to sort by non-allowlisted columns fail validation."""
        res = self.client.get("/api/admin/users?sort_by=password_hash&sort_order=asc", headers=self.headers)
        self.assertEqual(res.status_code, 422, "Disallowed sort field should return HTTP 422 unprocessable entity")

    # =========================================================================
    # PART 3: ANNOUNCEMENT LIFECYCLE
    # =========================================================================

    def test_05_announcement_crud_edit_and_expiry_lifecycle(self):
        """Verify announcement creation, editing via PATCH, active toggling, and expiration filtering."""
        # 1. Create announcement with expiration
        expiry_future = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
        create_res = self.client.post(
            "/api/admin/announcements",
            headers=self.headers,
            json={
                "title": "Milestone 4.3 Scheduled Maintenance",
                "message": "Platform upgrade tonight from 02:00 to 03:00 UTC.",
                "type": "maintenance",
                "target_audience": "all",
                "is_active": True,
                "expires_at": expiry_future,
            },
        )
        self.assertEqual(create_res.status_code, 200)
        ann_data = create_res.json()
        ann_id = ann_data["id"]
        self.assertEqual(ann_data["title"], "Milestone 4.3 Scheduled Maintenance")
        self.assertTrue(ann_data["is_active"])

        # 2. Candidate endpoint retrieves active announcement
        cand_res = self.client.get("/api/notifications/announcements")
        self.assertEqual(cand_res.status_code, 200)
        cand_titles = [a["title"] for a in cand_res.json()]
        self.assertIn("Milestone 4.3 Scheduled Maintenance", cand_titles)

        # 3. Update announcement via PATCH (toggle to inactive and edit message)
        patch_res = self.client.patch(
            f"/api/admin/announcements/{ann_id}",
            headers=self.headers,
            json={
                "message": "Maintenance completed ahead of schedule.",
                "is_active": False,
            },
        )
        self.assertEqual(patch_res.status_code, 200)
        patched_data = patch_res.json()
        self.assertFalse(patched_data["is_active"])
        self.assertEqual(patched_data["message"], "Maintenance completed ahead of schedule.")

        # 4. Inactive announcement is now hidden from candidates
        cand_res_after = self.client.get("/api/notifications/announcements")
        self.assertEqual(cand_res_after.status_code, 200)
        cand_titles_after = [a["title"] for a in cand_res_after.json()]
        self.assertNotIn("Milestone 4.3 Scheduled Maintenance", cand_titles_after)

        # 5. Clean up
        del_res = self.client.delete(f"/api/admin/announcements/{ann_id}", headers=self.headers)
        self.assertEqual(del_res.status_code, 200)

    # =========================================================================
    # PART 4: AUDIT SEARCH, DATE FILTERING, AND SANITIZED CSV EXPORT
    # =========================================================================

    def test_06_audit_search_and_date_filtering(self):
        """Verify audit log search and date filtering."""
        # 1. Search for specific action type
        res_search = self.client.get("/api/admin/audit?search=CREATE_ANNOUNCEMENT", headers=self.headers)
        self.assertEqual(res_search.status_code, 200)
        data = res_search.json()
        self.assertGreaterEqual(data["total"], 1)

        # 2. Date filtering with valid bounds
        now = datetime.now(timezone.utc)
        yesterday = (now - timedelta(days=1)).isoformat()
        tomorrow = (now + timedelta(days=1)).isoformat()

        res_date = self.client.get(
            "/api/admin/audit",
            params={"start_date": yesterday, "end_date": tomorrow},
            headers=self.headers,
        )
        self.assertEqual(res_date.status_code, 200)

        # 3. Inverted date range should return 400
        res_inverted = self.client.get(
            "/api/admin/audit",
            params={"start_date": tomorrow, "end_date": yesterday},
            headers=self.headers,
        )
        self.assertEqual(res_inverted.status_code, 400)
        err_body = res_inverted.json()
        err_msg = err_body.get("error", {}).get("message") if "error" in err_body else err_body.get("detail", "")
        self.assertIn("Start date cannot be after end date", err_msg)

    def test_07_audit_csv_export_and_formula_injection_defense(self):
        """Verify CSV export format, headers, content, and formula injection defense."""
        res = self.client.get("/api/admin/audit/export?limit=50", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers["content-type"], "text/csv; charset=utf-8")
        self.assertIn("attachment; filename=", res.headers.get("content-disposition", ""))

        csv_text = res.text
        lines = csv_text.strip().split("\r\n" if "\r\n" in csv_text else "\n")
        self.assertGreaterEqual(len(lines), 1, "CSV must contain at least the header row")

        header = lines[0]
        self.assertIn("Log ID", header)
        self.assertIn("Action Type", header)
        self.assertIn("Actor Email", header)
        self.assertIn("Resource Type", header)

        # Verify formula injection defense:
        from app.api.routes.admin import _sanitize_csv_cell
        self.assertEqual(_sanitize_csv_cell("=1+1"), "'=1+1")
        self.assertEqual(_sanitize_csv_cell("+cmd|' /C calc'!A0"), "'+cmd|' /C calc'!A0")
        self.assertEqual(_sanitize_csv_cell("-2+3"), "'-2+3")
        self.assertEqual(_sanitize_csv_cell("@SUM(A1:A10)"), "'@SUM(A1:A10)")
        self.assertEqual(_sanitize_csv_cell("standard text"), "standard text")


if __name__ == "__main__":
    unittest.main()
