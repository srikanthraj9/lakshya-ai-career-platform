import unittest
import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.db import models
from app.db.database import SessionLocal, Base, engine
from app.core.security import create_access_token
from app.services.operational_alert_service import OperationalAlertService


class TestAdminOperationalAlertCenter(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)
        db = SessionLocal()

        # Find or create super admin
        cls.super_admin = db.query(models.User).filter(
            (models.User.email == "superadmin_test@lakshya.ai") | (models.User.role == "super_admin")
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
        cls.super_admin_email = cls.super_admin.email
        cls.super_admin_token = create_access_token({"sub": str(cls.super_admin_id)})
        cls.super_admin_headers = {"Authorization": f"Bearer {cls.super_admin_token}"}

        # Find or create candidate user
        cls.candidate_user = db.query(models.User).filter(
            (models.User.email == "candidate_test@lakshya.ai") | (models.User.role == "user")
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

        cls.candidate_id = cls.candidate_user.id
        cls.candidate_email = cls.candidate_user.email
        cls.candidate_token = create_access_token({"sub": str(cls.candidate_id)})
        cls.candidate_headers = {"Authorization": f"Bearer {cls.candidate_token}"}
        db.close()

    def setUp(self):
        self.db = SessionLocal()
        self.super_admin = self.db.query(models.User).filter(models.User.id == self.super_admin_id).first()
        self.candidate_user = self.db.query(models.User).filter(models.User.id == self.candidate_id).first()
        # Seed 3 AI telemetry failures to trigger AI burst alert by default
        now = datetime.now(timezone.utc)
        for i in range(3):
            self.db.add(models.AIRequestTelemetry(
                id=uuid.uuid4(),
                request_id=f"test-req-{i}-{uuid.uuid4()}",
                feature_type="mock_interview",
                provider="groq",
                model_name="llama-3.3-70b-versatile",
                duration_ms=450.0,
                status="failure",
                error_category="rate_limit_429",
                timestamp=now - timedelta(minutes=10 - i),
            ))
        self.db.commit()

    def tearDown(self):
        self.db.rollback()
        user = self.db.query(models.User).filter(models.User.id == self.candidate_user.id).first()
        if user:
            user.is_suspended = False
        self.db.query(models.AIRequestTelemetry).filter(models.AIRequestTelemetry.provider == "groq").delete()
        self.db.query(models.AdminAuditLog).filter(
            models.AdminAuditLog.resource_type.in_(["operational_alert", "user"])
        ).delete()
        self.db.commit()
        self.db.close()

    def test_01_unauthorized_access_rejected(self):
        """Unauthorized requests (missing token or non-admin) must be rejected with 401 or 403."""
        # Missing auth header
        res = self.client.get("/api/admin/alerts")
        self.assertEqual(res.status_code, 401)

        # Candidate user (non-admin)
        res = self.client.get("/api/admin/alerts", headers=self.candidate_headers)
        self.assertEqual(res.status_code, 403)

    def test_02_detect_and_list_alerts(self):
        """Admin can list detected operational alerts with metrics envelope."""
        res = self.client.get("/api/admin/alerts", headers=self.super_admin_headers)
        self.assertEqual(res.status_code, 200)

        data = res.json()
        self.assertIn("items", data)
        self.assertIn("total", data)
        self.assertIn("open_count", data)
        self.assertIn("acknowledged_count", data)
        self.assertIn("resolved_count", data)
        self.assertIn("critical_count", data)
        self.assertIn("warning_count", data)
        self.assertIn("info_count", data)
        self.assertIn("last_refreshed_at", data)

        # Items should have required alert schema fields
        for item in data["items"]:
            self.assertIn("id", item)
            self.assertIn("alert_type", item)
            self.assertIn("severity", item)
            self.assertIn("title", item)
            self.assertIn("description", item)
            self.assertIn("source_service", item)
            self.assertIn("status", item)

    def test_03_alerts_summary_endpoint(self):
        """Summary endpoint returns counts and top unresolved alerts for dashboard overview."""
        res = self.client.get("/api/admin/alerts/summary", headers=self.super_admin_headers)
        self.assertEqual(res.status_code, 200)

        data = res.json()
        self.assertIn("open_count", data)
        self.assertIn("unresolved_alerts", data)
        self.assertIsInstance(data["unresolved_alerts"], list)

    def test_04_alert_lifecycle_transitions_and_audit_logging(self):
        """Transition alert to acknowledged and resolved, checking audit trail and persistence."""
        # 1. Fetch available alert
        list_res = self.client.get("/api/admin/alerts", headers=self.super_admin_headers)
        self.assertEqual(list_res.status_code, 200)
        items = list_res.json()["items"]
        self.assertGreater(len(items), 0, "Expected at least 1 detected alert in test environment")

        target_alert = items[0]
        alert_id = target_alert["id"]

        # 2. Acknowledge the alert
        ack_res = self.client.post(
            f"/api/admin/alerts/{alert_id}/transition",
            headers=self.super_admin_headers,
            json={"status": "acknowledged", "resolution_notes": "Investigating the incident."},
        )
        self.assertEqual(ack_res.status_code, 200)
        ack_data = ack_res.json()
        self.assertEqual(ack_data["status"], "acknowledged")
        self.assertEqual(ack_data["resolution_notes"], "Investigating the incident.")
        self.assertEqual(ack_data["acknowledged_by_admin_email"], self.super_admin_email)

        # Verify audit log created
        ack_audit = self.db.query(models.AdminAuditLog).filter(
            models.AdminAuditLog.resource_id == alert_id,
            models.AdminAuditLog.action_type == "ALERT_ACKNOWLEDGED",
        ).first()
        self.assertIsNotNone(ack_audit)
        self.assertEqual(ack_audit.reason, "Investigating the incident.")

        # 3. Resolve the alert
        resolve_res = self.client.post(
            f"/api/admin/alerts/{alert_id}/transition",
            headers=self.super_admin_headers,
            json={"status": "resolved", "resolution_notes": "Root cause identified and mitigated."},
        )
        self.assertEqual(resolve_res.status_code, 200)
        resolve_data = resolve_res.json()
        self.assertEqual(resolve_data["status"], "resolved")
        self.assertEqual(resolve_data["resolution_notes"], "Root cause identified and mitigated.")
        self.assertEqual(resolve_data["resolved_by_admin_email"], self.super_admin_email)

        # Verify resolution audit log created
        res_audit = self.db.query(models.AdminAuditLog).filter(
            models.AdminAuditLog.resource_id == alert_id,
            models.AdminAuditLog.action_type == "ALERT_RESOLVED",
        ).first()
        self.assertIsNotNone(res_audit)
        self.assertEqual(res_audit.reason, "Root cause identified and mitigated.")

    # --------------------------------------------------------------------------
    # FINDING H-1 & M-2: LIFECYCLE RECONCILIATION, RECURRENCE & TRANSITION GUARDS
    # --------------------------------------------------------------------------
    def test_h1_lifecycle_recurrence_and_persistence(self):
        """
        Tests H-1 requirements:
        1. Detect -> acknowledge -> resolve -> detect a new occurrence.
        2. Repeated detection of an ongoing incident maintains state without duplicates.
        3. Resolution of an incident that is no longer active persists in resolved view.
        4. Two occurrences of the same alert type separated in time are distinguished.
        """
        # Step 1: Detect ongoing alert
        alerts = OperationalAlertService.detect_operational_alerts(self.db)
        ai_alert = next((a for a in alerts if a.id == "ai:burst:groq:rate_limit_429"), None)
        self.assertIsNotNone(ai_alert)
        self.assertEqual(ai_alert.status, "open")

        # Step 2: Repeated detection does not change state or create duplicates
        repeated_alerts = OperationalAlertService.detect_operational_alerts(self.db)
        ai_alert_repeated = [a for a in repeated_alerts if a.id == "ai:burst:groq:rate_limit_429"]
        self.assertEqual(len(ai_alert_repeated), 1)
        self.assertEqual(ai_alert_repeated[0].status, "open")

        # Step 3: Acknowledge alert
        acked = OperationalAlertService.transition_alert(
            db=self.db,
            admin_user=self.super_admin,
            alert_id="ai:burst:groq:rate_limit_429",
            target_status="acknowledged",
            resolution_notes="Working with Groq support",
        )
        self.assertEqual(acked.status, "acknowledged")

        # Step 4: Repeated detection of ongoing acknowledged alert maintains acknowledged status
        rechecked = OperationalAlertService.detect_operational_alerts(self.db)
        rechecked_ai = next(a for a in rechecked if a.id == "ai:burst:groq:rate_limit_429")
        self.assertEqual(rechecked_ai.status, "acknowledged")

        # Step 5: Resolve the alert
        resolved = OperationalAlertService.transition_alert(
            db=self.db,
            admin_user=self.super_admin,
            alert_id="ai:burst:groq:rate_limit_429",
            target_status="resolved",
            resolution_notes="Rate limit tier upgraded to Tier 3.",
        )
        self.assertEqual(resolved.status, "resolved")

        # Step 6: When telemetry clears (underlying incident is no longer active):
        # The resolved incident must remain resolved and visible in history!
        self.db.query(models.AIRequestTelemetry).filter(models.AIRequestTelemetry.provider == "groq").delete()
        self.db.commit()

        cleared_alerts = OperationalAlertService.detect_operational_alerts(self.db)
        cleared_ai = next((a for a in cleared_alerts if "ai:burst:groq:rate_limit_429" in a.id), None)
        self.assertIsNotNone(cleared_ai, "Resolved incident must remain visible when underlying condition clears")
        self.assertEqual(cleared_ai.status, "resolved")
        self.assertEqual(cleared_ai.resolution_notes, "Rate limit tier upgraded to Tier 3.")

        # Step 7: A new occurrence separated in time occurs!
        # Add 3 new failures occurring AFTER the resolution
        now = datetime.now(timezone.utc)
        for i in range(3):
            self.db.add(models.AIRequestTelemetry(
                id=uuid.uuid4(),
                request_id=f"new-burst-{i}-{uuid.uuid4()}",
                feature_type="mock_interview",
                provider="groq",
                model_name="llama-3.3-70b-versatile",
                duration_ms=500.0,
                status="failure",
                error_category="rate_limit_429",
                timestamp=now + timedelta(seconds=i + 5),
            ))
        self.db.commit()

        # Detection must identify the new occurrence as OPEN (not permanently masked by old resolution)
        new_alerts = OperationalAlertService.detect_operational_alerts(self.db)
        active_new_ai = next((a for a in new_alerts if a.id == "ai:burst:groq:rate_limit_429"), None)
        self.assertIsNotNone(active_new_ai)
        self.assertEqual(active_new_ai.status, "open", "New occurrence must not be suppressed by historical resolution")

    def test_m2_state_machine_transition_guards_and_duplicate_prevention(self):
        """
        Tests M-2 requirements:
        1. Open -> Acknowledged (valid)
        2. Acknowledged -> Resolved (valid)
        3. Resolved -> Acknowledged (rejected with 400)
        4. Resolved -> Resolved (rejected with 400)
        5. Acknowledged -> Acknowledged (rejected with 400)
        6. Verifies no redundant audit logs are produced on rejected transitions.
        """
        # Baseline audit log count
        initial_audit_count = self.db.query(models.AdminAuditLog).filter(
            models.AdminAuditLog.resource_id == "ai:burst:groq:rate_limit_429"
        ).count()

        # 1. Open -> Acknowledged (Valid)
        ack_res = self.client.post(
            "/api/admin/alerts/ai:burst:groq:rate_limit_429/transition",
            headers=self.super_admin_headers,
            json={"status": "acknowledged", "resolution_notes": "Acknowledged"},
        )
        self.assertEqual(ack_res.status_code, 200)

        # 2. Acknowledged -> Acknowledged (Rejected duplicate)
        dup_ack_res = self.client.post(
            "/api/admin/alerts/ai:burst:groq:rate_limit_429/transition",
            headers=self.super_admin_headers,
            json={"status": "acknowledged", "resolution_notes": "Duplicate ack"},
        )
        self.assertEqual(dup_ack_res.status_code, 400)
        err_msg = dup_ack_res.json().get("error", {}).get("message") or dup_ack_res.json().get("detail", "")
        self.assertIn("already in 'acknowledged' status", err_msg)

        # 3. Acknowledged -> Resolved (Valid)
        res_res = self.client.post(
            "/api/admin/alerts/ai:burst:groq:rate_limit_429/transition",
            headers=self.super_admin_headers,
            json={"status": "resolved", "resolution_notes": "Resolved successfully"},
        )
        self.assertEqual(res_res.status_code, 200)

        # 4. Resolved -> Acknowledged (Invalid reverse transition, rejected)
        invalid_rev_res = self.client.post(
            "/api/admin/alerts/ai:burst:groq:rate_limit_429/transition",
            headers=self.super_admin_headers,
            json={"status": "acknowledged", "resolution_notes": "Trying to reopen via ack"},
        )
        self.assertEqual(invalid_rev_res.status_code, 400)
        err_msg = invalid_rev_res.json().get("error", {}).get("message") or invalid_rev_res.json().get("detail", "")
        self.assertIn("Cannot transition a resolved alert back to 'acknowledged'", err_msg)

        # 5. Resolved -> Resolved (Rejected duplicate)
        dup_res = self.client.post(
            "/api/admin/alerts/ai:burst:groq:rate_limit_429/transition",
            headers=self.super_admin_headers,
            json={"status": "resolved", "resolution_notes": "Duplicate resolve"},
        )
        self.assertEqual(dup_res.status_code, 400)
        err_msg = dup_res.json().get("error", {}).get("message") or dup_res.json().get("detail", "")
        self.assertIn("already in 'resolved' status", err_msg)

        # Verify only the 2 valid transitions created audit records (no duplicates)
        final_audit_count = self.db.query(models.AdminAuditLog).filter(
            models.AdminAuditLog.resource_id == "ai:burst:groq:rate_limit_429"
        ).count()
        self.assertEqual(final_audit_count - initial_audit_count, 2)

    # --------------------------------------------------------------------------
    # FINDING M-1: RESOLUTION NOTES SERVER-SIDE VALIDATION
    # --------------------------------------------------------------------------
    def test_m1_resolution_notes_validation(self):
        """
        Tests M-1 requirements:
        1. Resolving requires non-empty resolution notes.
        2. Empty string, whitespace-only, and null notes are rejected server-side.
        3. Acknowledging with empty or null notes is permitted.
        """
        # Acknowledge without notes is allowed
        ack_res = self.client.post(
            "/api/admin/alerts/ai:burst:groq:rate_limit_429/transition",
            headers=self.super_admin_headers,
            json={"status": "acknowledged"},
        )
        self.assertEqual(ack_res.status_code, 200)

        # Resolve with null notes -> rejected (422 by Pydantic schema)
        res_null = self.client.post(
            "/api/admin/alerts/ai:burst:groq:rate_limit_429/transition",
            headers=self.super_admin_headers,
            json={"status": "resolved", "resolution_notes": None},
        )
        self.assertEqual(res_null.status_code, 422)

        # Resolve with empty string notes -> rejected (422 by Pydantic schema)
        res_empty = self.client.post(
            "/api/admin/alerts/ai:burst:groq:rate_limit_429/transition",
            headers=self.super_admin_headers,
            json={"status": "resolved", "resolution_notes": ""},
        )
        self.assertEqual(res_empty.status_code, 422)

        # Resolve with whitespace-only notes -> rejected (422 by Pydantic schema)
        res_ws = self.client.post(
            "/api/admin/alerts/ai:burst:groq:rate_limit_429/transition",
            headers=self.super_admin_headers,
            json={"status": "resolved", "resolution_notes": "    \t\n   "},
        )
        self.assertEqual(res_ws.status_code, 422)

        # Resolve with valid notes -> accepted (200)
        res_valid = self.client.post(
            "/api/admin/alerts/ai:burst:groq:rate_limit_429/transition",
            headers=self.super_admin_headers,
            json={"status": "resolved", "resolution_notes": "Upgraded provider plan and increased token limits."},
        )
        self.assertEqual(res_valid.status_code, 200)

    # --------------------------------------------------------------------------
    # FINDING H-2: SUSPENDED ACCOUNT ANOMALY MATRIX
    # --------------------------------------------------------------------------
    def test_h2_suspended_account_anomaly_matrix(self):
        """
        Tests H-2 requirements:
        1. No suspensions -> no alert.
        2. Historical suspensions (>24h ago) -> no alert.
        3. Missing / unreliable timestamps (updated_at is None) -> no alert.
        4. Sub-threshold suspensions (< 3) -> no alert.
        5. Recent burst (>= 3 suspensions in 24h) -> alert generated!
        """
        now = datetime.now(timezone.utc)

        # Case 1: No suspensions
        alerts = OperationalAlertService.detect_operational_alerts(self.db)
        self.assertIsNone(next((a for a in alerts if a.id == "auth:anomaly:suspended_accounts"), None))

        # Case 2: Historical suspensions (>24h ago, e.g. updated_at 3 days ago)
        self.candidate_user.is_suspended = True
        self.candidate_user.updated_at = now - timedelta(days=3)
        self.db.commit()

        alerts = OperationalAlertService.detect_operational_alerts(self.db)
        self.assertIsNone(next((a for a in alerts if a.id == "auth:anomaly:suspended_accounts"), None))

        # Case 3: Missing / unreliable timestamp (updated_at is None)
        self.candidate_user.updated_at = None
        self.db.commit()

        alerts = OperationalAlertService.detect_operational_alerts(self.db)
        self.assertIsNone(next((a for a in alerts if a.id == "auth:anomaly:suspended_accounts"), None))

        # Case 4: Recent suspension events below burst threshold (2 events in last 24h)
        for i in range(2):
            self.db.add(models.AdminAuditLog(
                id=uuid.uuid4(),
                admin_user_id=self.super_admin.id,
                action_type="SUSPEND_USER",
                resource_type="user",
                resource_id=str(uuid.uuid4()),
                created_at=now - timedelta(hours=i + 1),
                reason="Test sub-threshold suspension",
            ))
        self.db.commit()

        alerts = OperationalAlertService.detect_operational_alerts(self.db)
        self.assertIsNone(next((a for a in alerts if a.id == "auth:anomaly:suspended_accounts"), None))

        # Case 5: Recent burst reaching threshold (3 events in last 24h)
        self.db.add(models.AdminAuditLog(
            id=uuid.uuid4(),
            admin_user_id=self.super_admin.id,
            action_type="SUSPEND_USER",
            resource_type="user",
            resource_id=str(uuid.uuid4()),
            created_at=now - timedelta(minutes=5),
            reason="Test threshold burst suspension",
        ))
        self.db.commit()

        alerts = OperationalAlertService.detect_operational_alerts(self.db)
        auth_alert = next((a for a in alerts if a.id == "auth:anomaly:suspended_accounts"), None)
        self.assertIsNotNone(auth_alert, "Suspension burst of >= 3 in 24h must trigger an anomaly alert")
        self.assertIn("Burst", auth_alert.title)
        self.assertEqual(auth_alert.metadata["recent_suspensions_24h"], 3)

    # --------------------------------------------------------------------------
    # FINDING M-3: EXCEPTION SANITIZATION AND NO LEAKAGE
    # --------------------------------------------------------------------------
    def test_m3_database_exception_sanitization_no_leakage(self):
        """
        Tests M-3 requirements:
        1. Synthetic database exception containing fake credentials, host, and connection string
           is safely sanitized.
        2. Secrets, passwords, hostnames, and URLs NEVER appear in alert title, description, or metadata.
        3. Safe diagnostic category is provided to the operator.
        """
        fake_secret_pw = "SuperSecret_P@ssw0rd!_12345"
        fake_internal_host = "pgvector-db.internal.cluster.local"
        fake_conn_str = f"postgresql://postgres_admin:{fake_secret_pw}@{fake_internal_host}:5432/lakshya_prod"
        fake_exc = Exception(f"OperationalError: connection refused at {fake_conn_str} with password {fake_secret_pw}")

        with patch.object(self.db, "execute", side_effect=fake_exc):
            alerts = OperationalAlertService.detect_operational_alerts(self.db)

        db_failure_alert = next((a for a in alerts if a.id == "health:database:failure"), None)
        self.assertIsNotNone(db_failure_alert)

        # Assert secrets and internals NEVER appear anywhere in alert payload
        alert_json_str = db_failure_alert.model_dump_json()
        self.assertNotIn(fake_secret_pw, alert_json_str)
        self.assertNotIn(fake_internal_host, alert_json_str)
        self.assertNotIn("postgres_admin", alert_json_str)
        self.assertNotIn("lakshya_prod", alert_json_str)

        # Assert operator receives safe, clean diagnostics
        self.assertEqual(db_failure_alert.metadata.get("diagnostic_category"), "connection_refused")
        self.assertEqual(db_failure_alert.metadata.get("probe_target"), "relational_primary")
        self.assertIn("Database connection refused", db_failure_alert.description)


if __name__ == "__main__":
    unittest.main()
