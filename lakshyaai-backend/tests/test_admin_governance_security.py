import unittest
import uuid
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import func
from app.main import app
from app.core.security import create_access_token
from app.db.database import SessionLocal
from app.db import models
from app.services.audit_service import AuditService
from app.services.admin_service import BOOTSTRAP_ADMIN_EMAILS


def get_error_message(res):
    data = res.json()
    if "error" in data and isinstance(data["error"], dict):
        return data["error"].get("message", "")
    return data.get("detail", "")


class TestAdminGovernanceSecurityEnhancements(unittest.TestCase):
    """
    Phase 3 Test Suite:
    1. Super Admin self-suspension prevention.
    2. Super Admin self-deactivation and self-demotion prevention.
    3. Bulk user status self-suspension guard.
    4. Database Explorer users table self-deletion and last super admin deletion guards.
    5. Database Explorer users table self-mutation (suspension/deactivation) and last super admin mutation guards.
    6. Audit logs multi-field filtering (resource_type, resource_id, severity).
    """

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        db = SessionLocal()

        # Temporarily demote other existing super admins so our test controls the exact count
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

        cls.super_admin_email = f"p3_superadmin_{cls.super_admin_id.hex[:8]}@example.com"
        cls.super_admin_2_email = f"p3_superadmin2_{cls.super_admin_2_id.hex[:8]}@example.com"
        cls.admin_email = f"p3_support_admin_{cls.admin_id.hex[:8]}@example.com"
        cls.candidate_email = f"p3_candidate_{cls.candidate_id.hex[:8]}@example.com"

        # Create Sole Super Admin
        sa1 = models.User(
            id=cls.super_admin_id,
            email=cls.super_admin_email,
            password_hash="test_pw_hash",
            full_name="Phase3 Sole Super Admin",
            role="super_admin",
            is_active=True,
            is_suspended=False,
            is_email_verified=True,
        )
        db.add(sa1)

        # Create Second Super Admin
        sa2 = models.User(
            id=cls.super_admin_2_id,
            email=cls.super_admin_2_email,
            password_hash="test_pw_hash",
            full_name="Phase3 Second Super Admin",
            role="super_admin",
            is_active=True,
            is_suspended=False,
            is_email_verified=True,
        )
        db.add(sa2)

        # Create 1 Support Admin
        adm = models.User(
            id=cls.admin_id,
            email=cls.admin_email,
            password_hash="test_pw_hash",
            full_name="Phase3 Support Admin",
            role="admin",
            is_active=True,
            is_suspended=False,
            is_email_verified=True,
        )
        db.add(adm)

        # Create 1 Candidate User
        cand = models.User(
            id=cls.candidate_id,
            email=cls.candidate_email,
            password_hash="test_pw_hash",
            full_name="Phase3 Candidate User",
            role="user",
            is_active=True,
            is_suspended=False,
            is_email_verified=True,
        )
        db.add(cand)

        # Ensure Bootstrap Admin User exists for testing
        cls.bootstrap_email = BOOTSTRAP_ADMIN_EMAILS[0] if BOOTSTRAP_ADMIN_EMAILS else "admin@lakshya.ai"
        existing_bs = db.query(models.User).filter(func.lower(models.User.email) == cls.bootstrap_email.lower()).first()
        if existing_bs:
            cls.bootstrap_user_id = existing_bs.id
            existing_bs.role = "super_admin"
            existing_bs.is_active = True
            existing_bs.is_suspended = False
            cls.created_bootstrap = False
        else:
            cls.bootstrap_user_id = uuid.uuid4()
            bs = models.User(
                id=cls.bootstrap_user_id,
                email=cls.bootstrap_email,
                password_hash="test_pw_hash",
                full_name="Bootstrap Super Admin",
                role="super_admin",
                is_active=True,
                is_suspended=False,
                is_email_verified=True,
            )
            db.add(bs)
            cls.created_bootstrap = True

        db.commit()
        db.close()

        cls.super_admin_headers = {
            "Authorization": f"Bearer {create_access_token({'sub': str(cls.super_admin_id)})}"
        }
        cls.super_admin_2_headers = {
            "Authorization": f"Bearer {create_access_token({'sub': str(cls.super_admin_2_id)})}"
        }
        cls.admin_headers = {
            "Authorization": f"Bearer {create_access_token({'sub': str(cls.admin_id)})}"
        }

    @classmethod
    def tearDownClass(cls):
        db = SessionLocal()
        # Clean up created test users
        for uid in [cls.super_admin_id, cls.super_admin_2_id, cls.admin_id, cls.candidate_id]:
            db.query(models.User).filter(models.User.id == uid).delete()
        if getattr(cls, "created_bootstrap", False):
            db.query(models.User).filter(models.User.id == cls.bootstrap_user_id).delete()
        # Restore original super admin roles
        for uid in cls.original_super_admin_ids:
            u = db.query(models.User).filter(models.User.id == uid).first()
            if u:
                u.role = "super_admin"
        db.commit()
        db.close()

    def test_01_self_suspension_prohibited(self):
        """Admin or super admin cannot suspend their own account."""
        # Ordinary admin attempts self-suspension
        res = self.client.post(
            f"/api/admin/users/{self.admin_id}/suspend",
            headers=self.admin_headers,
            json={"reason": "Testing self-suspension"},
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("cannot suspend their own account", get_error_message(res).lower())

        # Super admin attempts self-suspension
        res_sa = self.client.post(
            f"/api/admin/users/{self.super_admin_id}/suspend",
            headers=self.super_admin_headers,
            json={"reason": "Testing super admin self-suspension"},
        )
        self.assertEqual(res_sa.status_code, 400)
        self.assertIn("cannot suspend their own account", get_error_message(res_sa).lower())

    def test_02_self_deactivation_and_self_demotion_prohibited(self):
        """Super admin cannot deactivate or demote their own account."""
        # Self-deactivation
        res_deact = self.client.patch(
            f"/api/admin/users/{self.super_admin_id}",
            headers=self.super_admin_headers,
            json={"is_active": False},
        )
        self.assertEqual(res_deact.status_code, 400)
        self.assertIn("cannot deactivate their own account", get_error_message(res_deact).lower())

        # Self-demotion
        res_demote = self.client.patch(
            f"/api/admin/users/{self.super_admin_id}",
            headers=self.super_admin_headers,
            json={"role": "admin"},
        )
        self.assertEqual(res_demote.status_code, 400)
        self.assertIn("cannot demote their own administrative role", get_error_message(res_demote).lower())

    def test_03_bulk_status_self_modification_protected(self):
        """Bulk status operation excludes caller's own account safely."""
        res = self.client.post(
            "/api/admin/users/bulk-status",
            headers=self.admin_headers,
            json={
                "user_ids": [str(self.admin_id), str(self.candidate_id)],
                "action": "suspend",
                "reason": "Bulk security test",
            },
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()

        # The caller's own account must have failed with an explicit error
        own_item = next((item for item in data["results"] if item["user_id"] == str(self.admin_id)), None)
        self.assertIsNotNone(own_item)
        self.assertFalse(own_item["success"])
        self.assertIn("cannot modify their own account", own_item["error"])

        # Candidate should have succeeded
        cand_item = next((item for item in data["results"] if item["user_id"] == str(self.candidate_id)), None)
        self.assertIsNotNone(cand_item)
        self.assertTrue(cand_item["success"])

        # Re-activate candidate
        self.client.post(
            f"/api/admin/users/{self.candidate_id}/activate",
            headers=self.admin_headers,
        )

    def test_04_database_explorer_self_deletion_and_sole_superadmin_guard(self):
        """Database Explorer delete_record prevents deleting self and deleting last active super admin."""
        # 1. Self-deletion rejection
        res_self = self.client.request(
            "DELETE",
            f"/api/admin/database/tables/users/{self.super_admin_id}",
            headers=self.super_admin_headers,
            json={
                "reason": "Test self-delete",
                "confirmation_value": f"DELETE {self.super_admin_email}",
            },
        )
        self.assertEqual(res_self.status_code, 400)
        self.assertIn("cannot delete their own account", get_error_message(res_self).lower())

        # 2. Deleting the last super admin check:
        # Temporarily deactivate super_admin_2 so super_admin is the sole active super admin
        db = SessionLocal()
        sa2 = db.query(models.User).filter(models.User.id == self.super_admin_2_id).first()
        sa2.is_active = False
        db.commit()
        db.close()

        # Super admin attempts to delete sole super admin
        res_sole = self.client.request(
            "DELETE",
            f"/api/admin/database/tables/users/{self.super_admin_id}",
            headers=self.super_admin_headers,
            json={
                "reason": "Test sole super admin delete",
                "confirmation_value": f"DELETE {self.super_admin_email}",
            },
        )
        self.assertEqual(res_sole.status_code, 400)

        # Restore super_admin_2
        db = SessionLocal()
        sa2 = db.query(models.User).filter(models.User.id == self.super_admin_2_id).first()
        sa2.is_active = True
        db.commit()
        db.close()

    def test_05_database_explorer_self_mutation_guards(self):
        """Database Explorer mutate_record prevents demoting, deactivating, or suspending oneself."""
        # 1. Attempt self-suspension via Database Explorer mutation
        res_susp = self.client.patch(
            f"/api/admin/database/tables/users/{self.super_admin_id}",
            headers=self.super_admin_headers,
            json={
                "updates": {"is_suspended": True},
                "reason": "Attempting self suspension in DB explorer",
            },
        )
        self.assertEqual(res_susp.status_code, 400)
        self.assertIn("cannot suspend their own account", get_error_message(res_susp).lower())

        # 2. Attempt self-deactivation via Database Explorer mutation
        res_deact = self.client.patch(
            f"/api/admin/database/tables/users/{self.super_admin_id}",
            headers=self.super_admin_headers,
            json={
                "updates": {"is_active": False},
                "reason": "Attempting self deactivation in DB explorer",
            },
        )
        self.assertEqual(res_deact.status_code, 400)
        self.assertIn("cannot deactivate their own account", get_error_message(res_deact).lower())

        # 3. Attempt self-demotion via Database Explorer mutation
        res_dem = self.client.patch(
            f"/api/admin/database/tables/users/{self.super_admin_id}",
            headers=self.super_admin_headers,
            json={
                "updates": {"role": "user"},
                "reason": "Attempting self demotion in DB explorer",
            },
        )
        self.assertEqual(res_dem.status_code, 400)
        self.assertIn("cannot demote their own administrative role", get_error_message(res_dem).lower())

    def test_06_audit_log_multi_field_filtering(self):
        """Audit log endpoint filters by resource_type, resource_id, and severity."""
        db = SessionLocal()
        test_res_id = f"test_alert_{uuid.uuid4().hex[:6]}"
        AuditService.log_action(
            db=db,
            admin_user_id=self.super_admin_id,
            action_type="ALERT_RESOLVED",
            resource_type="operational_alert",
            resource_id=test_res_id,
            severity="critical",
            metadata={"notes": "Resolved during Phase 3 verification"},
        )
        db.close()

        # Query with resource_type and resource_id
        res = self.client.get(
            f"/api/admin/audit?resource_type=operational_alert&resource_id={test_res_id}",
            headers=self.super_admin_headers,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(data["total"], 1)
        found = any(item["resource_id"] == test_res_id for item in data["items"])
        self.assertTrue(found)

        # Query with severity
        res_sev = self.client.get(
            f"/api/admin/audit?resource_id={test_res_id}&severity=critical",
            headers=self.super_admin_headers,
        )
        self.assertEqual(res_sev.status_code, 200)
        data_sev = res_sev.json()
        self.assertTrue(any(item["severity"] == "critical" for item in data_sev["items"]))

        # Query with mismatched severity yields 0 matching
        res_mismatch = self.client.get(
            f"/api/admin/audit?resource_id={test_res_id}&severity=info",
            headers=self.super_admin_headers,
        )
        self.assertEqual(res_mismatch.status_code, 200)
        data_mis = res_mismatch.json()
        self.assertEqual(data_mis["total"], 0)

    def test_07_bootstrap_admin_protection_all_endpoints(self):
        """
        FINDING-P3-M-1 Remediation Verification:
        Guarantees that bootstrap administrator accounts (BOOTSTRAP_ADMIN_EMAILS)
        cannot be demoted, deactivated, suspended, or deleted via any API route,
        even by another active super administrator.
        """
        # 1. Attempt demotion via PATCH /api/admin/users/{user_id}
        res_dem = self.client.patch(
            f"/api/admin/users/{self.bootstrap_user_id}",
            headers=self.super_admin_2_headers,
            json={"role": "admin"},
        )
        self.assertEqual(res_dem.status_code, 400)
        self.assertIn("protected bootstrap administrator", get_error_message(res_dem).lower())

        # 2. Attempt deactivation via PATCH /api/admin/users/{user_id}
        res_deact = self.client.patch(
            f"/api/admin/users/{self.bootstrap_user_id}",
            headers=self.super_admin_2_headers,
            json={"is_active": False},
        )
        self.assertEqual(res_deact.status_code, 400)
        self.assertIn("protected bootstrap administrator", get_error_message(res_deact).lower())

        # 3. Attempt email verification revocation via PATCH /api/admin/users/{user_id}
        res_email = self.client.patch(
            f"/api/admin/users/{self.bootstrap_user_id}",
            headers=self.super_admin_2_headers,
            json={"is_email_verified": False},
        )
        self.assertEqual(res_email.status_code, 400)
        self.assertIn("protected bootstrap administrator", get_error_message(res_email).lower())

        # 4. Attempt suspension via POST /api/admin/users/{user_id}/suspend
        res_susp = self.client.post(
            f"/api/admin/users/{self.bootstrap_user_id}/suspend",
            headers=self.super_admin_2_headers,
            json={"reason": "Testing bootstrap suspension"},
        )
        self.assertEqual(res_susp.status_code, 400)
        self.assertIn("protected bootstrap administrator", get_error_message(res_susp).lower())

        # 5. Attempt Database Explorer mutation to demote or suspend
        res_db_dem = self.client.patch(
            f"/api/admin/database/tables/users/{self.bootstrap_user_id}",
            headers=self.super_admin_2_headers,
            json={"updates": {"role": "user"}, "reason": "Attempting DB demotion"},
        )
        self.assertEqual(res_db_dem.status_code, 400)
        self.assertIn("protected bootstrap administrator", get_error_message(res_db_dem).lower())

        res_db_susp = self.client.patch(
            f"/api/admin/database/tables/users/{self.bootstrap_user_id}",
            headers=self.super_admin_2_headers,
            json={"updates": {"is_suspended": True}, "reason": "Attempting DB suspension"},
        )
        self.assertEqual(res_db_susp.status_code, 400)
        self.assertIn("protected bootstrap administrator", get_error_message(res_db_susp).lower())

        # 6. Attempt Database Explorer deletion
        res_db_del = self.client.request(
            "DELETE",
            f"/api/admin/database/tables/users/{self.bootstrap_user_id}",
            headers=self.super_admin_2_headers,
            json={
                "reason": "Attempting DB deletion of bootstrap",
                "confirmation_value": f"DELETE {self.bootstrap_email}",
            },
        )
        self.assertEqual(res_db_del.status_code, 400)
        self.assertIn("protected bootstrap administrator", get_error_message(res_db_del).lower())

        # 7. Attempt bulk suspension
        res_bulk = self.client.post(
            "/api/admin/users/bulk-status",
            headers=self.super_admin_2_headers,
            json={
                "user_ids": [str(self.bootstrap_user_id), str(self.candidate_id)],
                "action": "suspend",
                "reason": "Bulk testing bootstrap",
            },
        )
        self.assertEqual(res_bulk.status_code, 200)
        results = res_bulk.json()["results"]
        bs_item = next((r for r in results if r["user_id"] == str(self.bootstrap_user_id)), None)
        self.assertIsNotNone(bs_item)
        self.assertFalse(bs_item["success"])
        self.assertIn("protected bootstrap administrator", bs_item["error"].lower())

        # Re-activate candidate from bulk
        self.client.post(f"/api/admin/users/{self.candidate_id}/activate", headers=self.admin_headers)

    def test_08_concurrency_safe_last_super_admin_protection(self):
        """
        FINDING-P3-L-1 Remediation Verification:
        Guarantees that concurrent attempts to demote or suspend all active super admins
        are safely coordinated so that the platform is never left with zero super admins.
        """
        # Temporarily deactivate bootstrap admin so SA1 and SA2 are the ONLY TWO active super admins in the system
        db = SessionLocal()
        bs = db.query(models.User).filter(models.User.id == self.bootstrap_user_id).first()
        if bs:
            bs.is_active = False
        sa1 = db.query(models.User).filter(models.User.id == self.super_admin_id).first()
        sa2 = db.query(models.User).filter(models.User.id == self.super_admin_2_id).first()
        sa1.role = "super_admin"
        sa1.is_active = True
        sa1.is_suspended = False
        sa2.role = "super_admin"
        sa2.is_active = True
        sa2.is_suspended = False
        db.commit()
        db.close()

        results = []

        def demote_sa1():
            # Super admin 2 calls API to demote Super admin 1
            res = self.client.patch(
                f"/api/admin/users/{self.super_admin_id}",
                headers=self.super_admin_2_headers,
                json={"role": "admin"},
            )
            return ("demote_sa1", res.status_code, res.json())

        def demote_sa2():
            # Super admin 1 calls API to demote Super admin 2
            res = self.client.patch(
                f"/api/admin/users/{self.super_admin_2_id}",
                headers=self.super_admin_headers,
                json={"role": "admin"},
            )
            return ("demote_sa2", res.status_code, res.json())

        # Execute both demotions simultaneously across threads
        with ThreadPoolExecutor(max_workers=2) as executor:
            fut1 = executor.submit(demote_sa1)
            fut2 = executor.submit(demote_sa2)
            results.append(fut1.result())
            results.append(fut2.result())

        status_codes = [r[1] for r in results]

        # At most ONE demotion can succeed (200), and at least ONE must be rejected (400 or 403)
        self.assertTrue(any(code in [400, 403] for code in status_codes), f"Expected at least one demotion to fail with 400 or 403. Got: {results}")

        # Re-check database state: Active super admin count MUST be at least 1!
        db = SessionLocal()
        active_count = db.query(models.User).filter(
            models.User.role == "super_admin",
            models.User.is_active == True,
            models.User.is_suspended == False,
        ).count()
        db.close()
        self.assertGreaterEqual(active_count, 1, "Platform was left with zero active super administrators!")

        # Restore both to super_admin and reactivate bootstrap admin for following tests
        db = SessionLocal()
        sa1 = db.query(models.User).filter(models.User.id == self.super_admin_id).first()
        sa2 = db.query(models.User).filter(models.User.id == self.super_admin_2_id).first()
        bs = db.query(models.User).filter(models.User.id == self.bootstrap_user_id).first()
        if sa1:
            sa1.role = "super_admin"
        if sa2:
            sa2.role = "super_admin"
        if bs:
            bs.is_active = True
        db.commit()
        db.close()

    def test_09_announcement_atomic_deletion_and_rollback(self):
        """
        FINDING-P3-INFO-1 Remediation Verification:
        Guarantees that announcement deletion and its audit log are committed atomically,
        and that a failure during audit logging rolls back the deletion completely.
        """
        # 1. Create a test announcement
        res_create = self.client.post(
            "/api/admin/announcements",
            headers=self.super_admin_headers,
            json={
                "title": "Atomic Deletion Verification Notice",
                "message": "Testing atomicity of deletion and audit logging.",
                "type": "info",
                "target_audience": "all",
            },
        )
        self.assertEqual(res_create.status_code, 200)
        ann_id = res_create.json()["id"]

        # Confirm announcement exists in database
        db = SessionLocal()
        ann_record = db.query(models.PlatformAnnouncement).filter(
            models.PlatformAnnouncement.id == uuid.UUID(ann_id)
        ).first()
        self.assertIsNotNone(ann_record)
        db.close()

        # 2. Test Rollback on Failure: Mock AuditService.log_action to simulate audit engine failure
        with patch("app.services.audit_service.AuditService.log_action", side_effect=RuntimeError("Simulated audit write failure")):
            res_fail = self.client.delete(
                f"/api/admin/announcements/{ann_id}",
                headers=self.super_admin_headers,
            )
            # Must return 500
            self.assertEqual(res_fail.status_code, 500)
            self.assertIn("operation rolled back", get_error_message(res_fail).lower())

        # CRITICAL ASSERTION: The announcement MUST STILL EXIST in the database due to rollback!
        db = SessionLocal()
        ann_after_failed_del = db.query(models.PlatformAnnouncement).filter(
            models.PlatformAnnouncement.id == uuid.UUID(ann_id)
        ).first()
        self.assertIsNotNone(ann_after_failed_del, "Announcement was deleted despite audit logging failure! Atomicity broken.")
        db.close()

        # 3. Test Successful Atomic Deletion
        res_success = self.client.delete(
            f"/api/admin/announcements/{ann_id}",
            headers=self.super_admin_headers,
        )
        self.assertEqual(res_success.status_code, 200)

        # Confirm announcement is removed from database
        db = SessionLocal()
        ann_after_success = db.query(models.PlatformAnnouncement).filter(
            models.PlatformAnnouncement.id == uuid.UUID(ann_id)
        ).first()
        self.assertIsNone(ann_after_success, "Announcement was not deleted on success.")

        # Confirm corresponding audit log was committed
        audit_entry = db.query(models.AdminAuditLog).filter(
            models.AdminAuditLog.action_type == "DELETE_ANNOUNCEMENT",
            models.AdminAuditLog.resource_id == str(ann_id),
        ).first()
        self.assertIsNotNone(audit_entry, "Audit log entry was not committed with announcement deletion.")
        self.assertEqual(audit_entry.resource_type, "announcement")
        db.close()


if __name__ == "__main__":
    unittest.main()
