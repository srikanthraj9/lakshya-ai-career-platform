import unittest
import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.db import models
from app.core.security import get_password_hash
from app.services.admin_action_service import AdminActionService
from app.services.audit_service import AuditService


class TestAuditImmutability(unittest.TestCase):
    """
    Verifies that admin_audit_logs are strictly append-only:
    - Any attempt to mutate an audit log raises 400 (no editable fields).
    - Any attempt to delete an audit log raises 403 (disallowed delete policy).
    """

    @classmethod
    def setUpClass(cls):
        cls.db: Session = SessionLocal()

        cls.super_admin = models.User(
            email=f"audit_tester_{uuid.uuid4().hex[:8]}@lakshya.ai",
            password_hash=get_password_hash("SuperSecurePass123!"),
            full_name="Audit Immutability Tester",
            role="super_admin",
            is_email_verified=True,
            is_suspended=False,
        )
        cls.db.add(cls.super_admin)
        cls.db.commit()
        cls.db.refresh(cls.super_admin)

        # Create an audit log record
        cls.audit_entry = AuditService.log_action(
            db=cls.db,
            admin_user_id=cls.super_admin.id,
            action_type="TEST_IMMUTABILITY_ACTION",
            reason="Setup record for immutability testing",
            severity="info",
            commit=True,
        )

    @classmethod
    def tearDownClass(cls):
        cls.db.query(models.AdminAuditLog).filter(models.AdminAuditLog.admin_user_id == cls.super_admin.id).delete()
        cls.db.query(models.User).filter(models.User.id == cls.super_admin.id).delete()
        cls.db.commit()
        cls.db.close()

    def test_audit_log_mutation_rejected(self):
        with self.assertRaises(HTTPException) as ctx:
            AdminActionService.mutate_record(
                db=self.db,
                admin_user=self.super_admin,
                table_name="admin_audit_logs",
                record_id=str(self.audit_entry.id),
                updates={"reason": "Attempting to overwrite audit reason"},
                reason="Hacking attempt",
            )
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("immutable or not permitted", ctx.exception.detail)

    def test_audit_log_deletion_rejected(self):
        with self.assertRaises(HTTPException) as ctx:
            AdminActionService.delete_record(
                db=self.db,
                admin_user=self.super_admin,
                table_name="admin_audit_logs",
                record_id=str(self.audit_entry.id),
                confirmation_value=f"DELETE {self.audit_entry.id}",
                reason="Attempting to purge audit trail",
            )
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("disallowed", ctx.exception.detail)


if __name__ == "__main__":
    unittest.main()
