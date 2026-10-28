import unittest
import uuid
import os
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.db import models
from app.db.database import SessionLocal, Base, engine
from app.core.security import create_access_token, get_password_hash
from app.services.operational_alert_service import OperationalAlertService


class TestDashboardAndIncidentRegression(unittest.TestCase):
    """
    Regression verification for Master Prompt 73:
    - Issue A: Student Dashboard Analytics endpoints resilience for unselected target role & new candidates.
    - Issue B: Self-service account deletion audit classification & operational alert filtering.
    """

    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)
        db = SessionLocal()

        # Create or find admin user
        cls.admin_user = db.query(models.User).filter(models.User.email == "regression_admin@lakshya.ai").first()
        if not cls.admin_user:
            cls.admin_user = models.User(
                id=uuid.uuid4(),
                email="regression_admin@lakshya.ai",
                password_hash=get_password_hash("AdminPass123!"),
                role="admin",
                is_active=True,
                is_suspended=False,
                is_email_verified=True,
            )
            db.add(cls.admin_user)
            db.commit()

        cls.admin_id = cls.admin_user.id
        cls.admin_token = create_access_token({"sub": str(cls.admin_id)})
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

        # Create fresh candidate with NO target role, NO resumes, NO interviews
        cls.candidate_id = uuid.uuid4()
        cls.candidate_user = models.User(
            id=cls.candidate_id,
            email=f"candidate_{cls.candidate_id.hex[:8]}@example.com",
            password_hash=get_password_hash("CandidatePass123!"),
            role="user",
            is_active=True,
            is_suspended=False,
            is_email_verified=True,
        )
        db.add(cls.candidate_user)
        db.commit()

        cls.candidate_token = create_access_token({"sub": str(cls.candidate_id)})
        cls.candidate_headers = {"Authorization": f"Bearer {cls.candidate_token}"}
        db.close()

    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    # --------------------------------------------------------------------------
    # ISSUE A: STUDENT DASHBOARD ANALYTICS ENDPOINTS
    # --------------------------------------------------------------------------

    def test_student_dashboard_summary_with_no_target_role(self):
        """Verify GET /api/analytics/summary returns 200 with zero baseline metrics."""
        response = self.client.get("/api/analytics/summary", headers=self.candidate_headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("ats_score", data)
        self.assertIn("total_resumes", data)
        self.assertIn("skill_count", data)
        self.assertIn("interview_score", data)
        self.assertEqual(data["total_resumes"], 0)
        self.assertEqual(data["ats_score"], 0.0)
        self.assertEqual(data["skill_count"], 0)
        self.assertEqual(data["interview_score"], 0.0)

    def test_student_dashboard_overview_with_no_resumes(self):
        """Verify GET /api/analytics/dashboard returns 200 without schema errors."""
        response = self.client.get("/api/analytics/dashboard", headers=self.candidate_headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["total_resumes"], 0)
        self.assertEqual(data["average_ats_score"], 0.0)
        self.assertEqual(data["ats_trend"], [])
        self.assertEqual(data["skills"], [])

    def test_student_ats_trend_and_skill_growth_fallbacks(self):
        """Verify ats-trend and skill-growth endpoints return valid empty lists for new candidate."""
        res_trend = self.client.get("/api/analytics/ats-trend", headers=self.candidate_headers)
        self.assertEqual(res_trend.status_code, 200)
        self.assertIsInstance(res_trend.json(), list)

        res_skills = self.client.get("/api/analytics/skill-growth", headers=self.candidate_headers)
        self.assertEqual(res_skills.status_code, 200)
        self.assertIsInstance(res_skills.json(), list)

    def test_unauthenticated_request_rejected(self):
        """Verify protected analytics endpoints reject missing authentication."""
        res = self.client.get("/api/analytics/summary")
        self.assertEqual(res.status_code, 401)

    # --------------------------------------------------------------------------
    # ISSUE B: SELF-SERVICE DELETION & OPERATIONAL ALERT CLASSIFICATION
    # --------------------------------------------------------------------------

    def test_self_service_account_deletion_audit_severity_is_info(self):
        """Verify self-service deletion writes audit log with severity='info' and succeeds."""
        # Create dedicated disposable user for self-service deletion
        del_user_id = uuid.uuid4()
        del_user = models.User(
            id=del_user_id,
            email=f"delete_me_{del_user_id.hex[:8]}@example.com",
            password_hash=get_password_hash("SecretDelete123!"),
            role="user",
            is_active=True,
            is_suspended=False,
            is_email_verified=True,
        )
        self.db.add(del_user)
        self.db.commit()

        del_token = create_access_token({"sub": str(del_user_id)})
        del_headers = {"Authorization": f"Bearer {del_token}"}

        # Perform self-service deletion
        payload = {
            "password": "SecretDelete123!",
            "confirmation": "DELETE",
        }
        res = self.client.request("DELETE", "/api/users/me", json=payload, headers=del_headers)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["success"])

        # Check user is deleted
        db_user = self.db.query(models.User).filter(models.User.id == del_user_id).first()
        self.assertIsNone(db_user)

        # Check audit log entry
        audit_log = (
            self.db.query(models.AdminAuditLog)
            .filter(
                models.AdminAuditLog.target_user_id == del_user_id,
                models.AdminAuditLog.action_type == "SELF_SERVICE_ACCOUNT_DELETION",
            )
            .first()
        )
        self.assertIsNotNone(audit_log)
        self.assertEqual(audit_log.severity, "info")
        self.assertEqual(audit_log.reason, "User self-service account deletion requested and verified")

    def test_self_service_deletion_not_classified_as_operational_alert(self):
        """Verify OperationalAlertService does not promote SELF_SERVICE_ACCOUNT_DELETION to critical alert."""
        # Inject legacy audit record with severity='critical' to test backward-compatibility filter
        legacy_log_id = uuid.uuid4()
        legacy_log = models.AdminAuditLog(
            id=legacy_log_id,
            admin_user_id=None,
            action_type="SELF_SERVICE_ACCOUNT_DELETION",
            target_user_id=uuid.uuid4(),
            resource_type="User",
            resource_id=str(legacy_log_id),
            severity="critical",
            reason="User self-service account deletion requested and verified",
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(legacy_log)
        self.db.commit()

        alerts = OperationalAlertService.detect_operational_alerts(self.db)
        alert_ids = [a.id for a in alerts]
        self.assertNotIn(f"gov:audit:{legacy_log_id}", alert_ids)

        for alert in alerts:
            self.assertNotEqual(alert.alert_type, "SELF_SERVICE_ACCOUNT_DELETION")
            self.assertNotIn("SELF_SERVICE_ACCOUNT_DELETION", alert.title)

    def test_genuine_critical_admin_event_is_preserved_as_incident(self):
        """Verify genuine administrative critical events remain detectable as operational incidents."""
        crit_log_id = uuid.uuid4()
        crit_log = models.AdminAuditLog(
            id=crit_log_id,
            admin_user_id=self.admin_id,
            action_type="DATABASE_DELETE_USERS",
            resource_type="users",
            resource_id="batch_42",
            severity="critical",
            reason="Bulk purge of spam accounts",
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(crit_log)
        self.db.commit()

        alerts = OperationalAlertService.detect_operational_alerts(self.db)
        alert_ids = [a.id for a in alerts]
        self.assertIn(f"gov:audit:{crit_log_id}", alert_ids)

    def test_admin_system_health_endpoint(self):
        """Verify /api/admin/system/health returns 200 with overall status healthy."""
        res = self.client.get("/api/admin/system/health", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("status", data)
        self.assertIn("services", data)
        self.assertIn("service_details", data)
        self.assertIn(data["status"], ["healthy", "degraded", "unhealthy"])
        # Should require admin
        unauth = self.client.get("/api/admin/system/health")
        self.assertEqual(unauth.status_code, 401)
        cand_res = self.client.get("/api/admin/system/health", headers=self.candidate_headers)
        self.assertEqual(cand_res.status_code, 403)
