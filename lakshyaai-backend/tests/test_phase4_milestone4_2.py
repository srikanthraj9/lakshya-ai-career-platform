import unittest
import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import patch
from app.db.database import SessionLocal
from app.db import models
from app.services.admin_service import AdminService
from app.services.ai_telemetry_service import AITelemetryService, MODEL_PRICING_CATALOG
from fastapi import HTTPException


class TestMilestone42Backend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db = SessionLocal()
        # Seed test admin & super admin
        cls.sa_id = uuid.uuid4()
        cls.sa_user = models.User(
            id=cls.sa_id,
            email=f"m42_sa_{cls.sa_id.hex[:6]}@example.com",
            password_hash="test_pw",
            full_name="M42 Super Admin",
            role="super_admin",
            is_active=True,
            is_suspended=False,
            is_email_verified=True,
        )
        db.add(cls.sa_user)

        cls.admin_id = uuid.uuid4()
        cls.admin_user = models.User(
            id=cls.admin_id,
            email=f"m42_admin_{cls.admin_id.hex[:6]}@example.com",
            password_hash="test_pw",
            full_name="M42 Admin",
            role="admin",
            is_active=True,
            is_suspended=False,
            is_email_verified=True,
        )
        db.add(cls.admin_user)

        cls.candidate_id = uuid.uuid4()
        cls.candidate_email = f"m42_cand_{cls.candidate_id.hex[:6]}@example.com"
        cls.candidate_user = models.User(
            id=cls.candidate_id,
            email=cls.candidate_email,
            password_hash="test_pw",
            full_name="M42 Candidate",
            role="user",
            is_active=True,
            is_suspended=False,
            is_email_verified=False,
        )
        db.add(cls.candidate_user)
        db.commit()
        db.close()

    @classmethod
    def tearDownClass(cls):
        db = SessionLocal()
        db.query(models.AIRequestTelemetry).filter(
            models.AIRequestTelemetry.feature_type.in_(["test_m42_feature", "copilot_m42", "resume_m42"])
        ).delete(synchronize_session=False)
        db.query(models.User).filter(
            models.User.id.in_([cls.sa_id, cls.admin_id, cls.candidate_id])
        ).delete(synchronize_session=False)
        db.commit()
        db.close()

    # =========================================================================
    # PART 1: AI TELEMETRY TOKEN AGGREGATION & COST TRANSPARENCY
    # =========================================================================

    def test_01_token_aggregation_and_metered_coverage(self):
        """Verify token counts are summed correctly and metered vs unmetered requests are distinguished."""
        db = SessionLocal()
        created_ids = []
        try:
            # 1. Add request with complete token counts (llama-3.3-70b-versatile)
            e1 = AITelemetryService.record_request(
                db,
                feature_type="test_m42_feature",
                provider="groq",
                model_name="llama-3.3-70b-versatile",
                duration_ms=250.0,
                status="success",
                prompt_tokens=1000,
                completion_tokens=500,
                user_id=self.candidate_id,
            )
            created_ids.append(e1.id)

            # 2. Add request with another model (gpt-4o-mini)
            e2 = AITelemetryService.record_request(
                db,
                feature_type="test_m42_feature",
                provider="openai",
                model_name="gpt-4o-mini",
                duration_ms=400.0,
                status="success",
                prompt_tokens=2000,
                completion_tokens=1000,
                user_id=self.candidate_id,
            )
            created_ids.append(e2.id)

            # 3. Add unmetered historical request (tokens=None)
            e3 = AITelemetryService.record_request(
                db,
                feature_type="test_m42_feature",
                provider="groq",
                model_name="llama-3.3-70b-versatile",
                duration_ms=300.0,
                status="success",
                prompt_tokens=None,
                completion_tokens=None,
                total_tokens=None,
                user_id=self.candidate_id,
            )
            created_ids.append(e3.id)

            # Fetch metrics
            metrics = AITelemetryService.get_ai_metrics(db)

            # Assert token sums
            self.assertGreaterEqual(metrics["total_prompt_tokens"], 3000)
            self.assertGreaterEqual(metrics["total_completion_tokens"], 1500)
            self.assertGreaterEqual(metrics["total_tokens"], 4500)

            # Assert coverage counts
            self.assertGreaterEqual(metrics["token_metered_requests"], 2)
            self.assertGreaterEqual(metrics["unmetered_requests"], 1)

            # Assert model breakdown
            breakdown = metrics["breakdown_by_model"]
            self.assertIn("llama-3.3-70b-versatile", breakdown)
            self.assertIn("gpt-4o-mini", breakdown)

            llama_entry = breakdown["llama-3.3-70b-versatile"]
            self.assertGreaterEqual(llama_entry["prompt_tokens"], 1000)
            self.assertGreaterEqual(llama_entry["completion_tokens"], 500)
            self.assertTrue(llama_entry["is_priced"])
            self.assertGreater(llama_entry["estimated_cost_usd"], 0.0)

            # Assert pricing assumptions presence
            self.assertEqual(metrics["pricing_assumptions"]["currency"], "USD")
            self.assertIn("disclaimer", metrics["pricing_assumptions"])
            self.assertIn("llama-3.3-70b-versatile", metrics["pricing_assumptions"]["rates"])

        finally:
            db.query(models.AIRequestTelemetry).filter(models.AIRequestTelemetry.id.in_(created_ids)).delete(synchronize_session=False)
            db.commit()
            db.close()

    def test_02_cost_estimation_accuracy_against_catalog(self):
        """Verify cost calculation matches mathematical formula based on input/output pricing per 1M tokens."""
        db = SessionLocal()
        created_ids = []
        try:
            # 1,000,000 prompt tokens and 1,000,000 completion tokens on llama-3.3-70b-versatile
            # Expected cost: 1M * 0.59 + 1M * 0.79 = $1.38
            e = AITelemetryService.record_request(
                db,
                feature_type="test_m42_feature",
                provider="groq",
                model_name="llama-3.3-70b-versatile",
                duration_ms=1200.0,
                status="success",
                prompt_tokens=1_000_000,
                completion_tokens=1_000_000,
            )
            created_ids.append(e.id)

            metrics = AITelemetryService.get_ai_metrics(db)
            model_stat = metrics["breakdown_by_model"]["llama-3.3-70b-versatile"]

            # Exact rate check
            expected_input_cost = (1_000_000 / 1_000_000) * MODEL_PRICING_CATALOG["llama-3.3-70b-versatile"]["input_per_million"]
            expected_output_cost = (1_000_000 / 1_000_000) * MODEL_PRICING_CATALOG["llama-3.3-70b-versatile"]["output_per_million"]
            expected_total = expected_input_cost + expected_output_cost

            self.assertAlmostEqual(model_stat["estimated_cost_usd"], expected_total, places=2)
            self.assertEqual(model_stat["is_priced"], True)

        finally:
            db.query(models.AIRequestTelemetry).filter(models.AIRequestTelemetry.id.in_(created_ids)).delete(synchronize_session=False)
            db.commit()
            db.close()

    def test_03_unrecognized_model_pricing_safety(self):
        """Verify unrecognized model is not assigned synthetic pricing and is_priced is False."""
        db = SessionLocal()
        created_ids = []
        try:
            e = AITelemetryService.record_request(
                db,
                feature_type="test_m42_feature",
                provider="custom_provider",
                model_name="my-custom-unpriced-model-v99",
                duration_ms=500.0,
                status="success",
                prompt_tokens=5000,
                completion_tokens=2500,
            )
            created_ids.append(e.id)

            metrics = AITelemetryService.get_ai_metrics(db)
            model_stat = metrics["breakdown_by_model"]["my-custom-unpriced-model-v99"]

            self.assertEqual(model_stat["is_priced"], False)
            self.assertEqual(model_stat["estimated_cost_usd"], 0.0)

        finally:
            db.query(models.AIRequestTelemetry).filter(models.AIRequestTelemetry.id.in_(created_ids)).delete(synchronize_session=False)
            db.commit()
            db.close()

    def test_04_time_range_filtering(self):
        """Verify time_range filter properly excludes telemetry older than the specified cutoff."""
        db = SessionLocal()
        created_ids = []
        try:
            # Entry 1: Created now (fits in "today", "7d", "30d", "all")
            e1 = AITelemetryService.record_request(
                db,
                feature_type="test_m42_feature",
                provider="groq",
                model_name="llama-3.3-70b-versatile",
                duration_ms=100.0,
                status="success",
                prompt_tokens=100,
                completion_tokens=50,
            )
            created_ids.append(e1.id)

            # Entry 2: Manually backdate to 15 days ago
            e2 = AITelemetryService.record_request(
                db,
                feature_type="test_m42_feature",
                provider="groq",
                model_name="llama-3.3-70b-versatile",
                duration_ms=100.0,
                status="success",
                prompt_tokens=500,
                completion_tokens=250,
            )
            e2_db = db.query(models.AIRequestTelemetry).filter(models.AIRequestTelemetry.id == e2.id).first()
            e2_db.timestamp = datetime.now(timezone.utc) - timedelta(days=15)
            db.commit()
            created_ids.append(e2.id)

            # Query with time_range="7d" -> should only count e1
            metrics_7d = AITelemetryService.get_ai_metrics(db, time_range="7d")
            # Query with time_range="30d" -> should count e1 and e2
            metrics_30d = AITelemetryService.get_ai_metrics(db, time_range="30d")

            self.assertGreater(metrics_30d["total_prompt_tokens"], metrics_7d["total_prompt_tokens"])

        finally:
            db.query(models.AIRequestTelemetry).filter(models.AIRequestTelemetry.id.in_(created_ids)).delete(synchronize_session=False)
            db.commit()
            db.close()

    # =========================================================================
    # PART 2: CANDIDATE 360 ADMINISTRATIVE ACTIONS
    # =========================================================================

    def test_05_admin_suspend_and_activate_candidate_lifecycle(self):
        """Verify suspending and activating a candidate modifies status and writes audit log."""
        db = SessionLocal()
        try:
            current_admin = db.query(models.User).filter(models.User.id == self.sa_id).first()

            # 1. Suspend candidate
            suspended_user = AdminService.suspend_user(
                db=db,
                admin_user=current_admin,
                target_user_id=self.candidate_id,
                reason="Terms violation observed in Candidate 360",
            )
            self.assertIsNotNone(suspended_user)
            self.assertTrue(suspended_user.is_suspended)
            self.assertEqual(suspended_user.suspended_reason, "Terms violation observed in Candidate 360")

            # Verify audit log was created
            audit_entry = db.query(models.AdminAuditLog).filter(
                models.AdminAuditLog.target_user_id == self.candidate_id,
                models.AdminAuditLog.action_type == "SUSPEND_USER",
            ).order_by(models.AdminAuditLog.created_at.desc()).first()
            self.assertIsNotNone(audit_entry)
            self.assertEqual(audit_entry.admin_user_id, self.sa_id)

            # 2. Activate candidate
            activated_user = AdminService.activate_user(
                db=db,
                admin_user=current_admin,
                target_user_id=self.candidate_id,
            )
            self.assertIsNotNone(activated_user)
            self.assertFalse(activated_user.is_suspended)
            self.assertIsNone(activated_user.suspended_reason)

            # Verify activation audit log
            activate_audit = db.query(models.AdminAuditLog).filter(
                models.AdminAuditLog.target_user_id == self.candidate_id,
                models.AdminAuditLog.action_type == "ACTIVATE_USER",
            ).order_by(models.AdminAuditLog.created_at.desc()).first()
            self.assertIsNotNone(activate_audit)
        finally:
            db.close()

    def test_06_admin_service_protects_bootstrap_account(self):
        """Verify AdminService rejects suspending a protected bootstrap admin account."""
        db = SessionLocal()
        bootstrap_id = uuid.uuid4()
        try:
            # Create a bootstrap account
            bootstrap_user = models.User(
                id=bootstrap_id,
                email="admin@lakshya.ai",
                password_hash="test_pw",
                full_name="Protected Bootstrap Lead",
                role="super_admin",
                is_active=True,
                is_suspended=False,
            )
            db.add(bootstrap_user)
            db.commit()

            current_admin = db.query(models.User).filter(models.User.id == self.sa_id).first()

            with self.assertRaises(HTTPException) as ctx:
                AdminService.suspend_user(
                    db=db,
                    admin_user=current_admin,
                    target_user_id=bootstrap_id,
                    reason="Attempt to suspend bootstrap",
                )
            self.assertEqual(ctx.exception.status_code, 400)
            self.assertIn("Protected bootstrap administrator", ctx.exception.detail)

        finally:
            db.query(models.User).filter(models.User.id == bootstrap_id).delete(synchronize_session=False)
            db.commit()
            db.close()

    # =========================================================================
    # PART 3: READINESS-SCORE INTEGRITY
    # =========================================================================

    def test_07_readiness_score_semantics_preserved(self):
        """Verify that get_user_detail and list_users preserve candidate readiness heuristic without synthetic inflation."""
        db = SessionLocal()
        try:
            # Milestone 4.3 unified readiness calculation: without assessment evidence, both return None (insufficient data)
            detail = AdminService.get_user_detail(db, self.candidate_id)
            self.assertIsNotNone(detail)
            self.assertIsNone(detail.readiness_score)

            user_list = AdminService.list_users(db, search=self.candidate_email)
            self.assertEqual(len(user_list.users), 1)
            self.assertIsNone(user_list.users[0].readiness_score)
            self.assertEqual(detail.readiness_score, user_list.users[0].readiness_score)

        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
