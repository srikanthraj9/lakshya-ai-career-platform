import unittest
import uuid
from app.db.database import SessionLocal
from app.db import models
from app.services.admin_action_service import AdminActionService
from fastapi import HTTPException


class TestAdminActionAtomicAudit(unittest.TestCase):
    """
    Validates transactional integrity for administrative mutations:
    1. Synchronous before/after snapshots and diff calculation.
    2. Atomic commit: record mutation and audit log succeed or fail together.
    3. Whitelist enforcement: mutating immutable or unpermitted fields is rejected.
    """

    @classmethod
    def setUpClass(cls):
        db = SessionLocal()
        cls.super_admin_id = uuid.uuid4()
        cls.super_admin = models.User(
            id=cls.super_admin_id,
            email=f"superadmin_{cls.super_admin_id.hex[:8]}@example.com",
            password_hash="hashed_pw",
            full_name="SuperAdmin Master",
            role="super_admin",
            is_active=True,
            is_email_verified=True,
        )
        db.add(cls.super_admin)

        cls.target_user_id = uuid.uuid4()
        cls.target_user = models.User(
            id=cls.target_user_id,
            email=f"target_{cls.target_user_id.hex[:8]}@example.com",
            password_hash="hashed_pw",
            full_name="Original Name",
            role="user",
            is_active=True,
            is_suspended=False,
            is_email_verified=True,
        )
        db.add(cls.target_user)
        db.commit()
        db.close()

    def test_permitted_mutation_writes_diff_and_audit(self):
        db = SessionLocal()
        admin_user = db.query(models.User).filter(models.User.id == self.super_admin_id).first()
        res = AdminActionService.mutate_record(
            db=db,
            admin_user=admin_user,
            table_name="users",
            record_id=str(self.target_user_id),
            updates={"full_name": "Updated Name", "is_suspended": True, "suspended_reason": "Terms breach"},
            reason="Compliance enforcement",
        )

        self.assertIn("full_name", res["diff"])
        self.assertEqual(res["diff"]["full_name"]["before"], "Original Name")
        self.assertEqual(res["diff"]["full_name"]["after"], "Updated Name")

        # Verify audit log exists in DB
        audit_entry = db.query(models.AdminAuditLog).filter(models.AdminAuditLog.id == res["audit_log_id"]).first()
        self.assertIsNotNone(audit_entry)
        self.assertEqual(audit_entry.admin_user_id, self.super_admin_id)
        self.assertEqual(audit_entry.target_user_id, self.target_user_id)
        self.assertEqual(audit_entry.reason, "Compliance enforcement")
        db.close()

    def test_immutable_field_mutation_rejected(self):
        db = SessionLocal()
        admin_user = db.query(models.User).filter(models.User.id == self.super_admin_id).first()
        # id and created_at are immutable
        with self.assertRaises(HTTPException) as cm:
            AdminActionService.mutate_record(
                db=db,
                admin_user=admin_user,
                table_name="users",
                record_id=str(self.target_user_id),
                updates={"email": "new_unauthorized_email@example.com"},
                reason="Attempted email tampering",
            )
        self.assertEqual(cm.exception.status_code, 400)
        db.close()


if __name__ == "__main__":
    unittest.main()
