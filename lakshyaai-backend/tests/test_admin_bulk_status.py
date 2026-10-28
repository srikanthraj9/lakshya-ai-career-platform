import unittest
import uuid
from app.db import models
from app.db.database import SessionLocal, engine, Base
from app.services.admin_service import AdminService


class TestAdminBulkStatusService(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)

    def setUp(self):
        self.db = SessionLocal()
        self.super_admin = models.User(
            id=uuid.uuid4(),
            email="superadmin@lakshya.ai",
            password_hash="test_hashed_pwd",
            role="super_admin",
            is_suspended=False,
            is_email_verified=True,
        )
        self.candidate_1 = models.User(
            id=uuid.uuid4(),
            email="candidate1@lakshya.ai",
            password_hash="test_hashed_pwd",
            role="user",
            is_suspended=False,
            is_email_verified=True,
        )
        self.candidate_2 = models.User(
            id=uuid.uuid4(),
            email="candidate2@lakshya.ai",
            password_hash="test_hashed_pwd",
            role="user",
            is_suspended=False,
            is_email_verified=True,
        )
        self.db.add_all([self.super_admin, self.candidate_1, self.candidate_2])
        self.db.commit()

    def tearDown(self):
        self.db.rollback()
        self.db.query(models.AdminAuditLog).delete()
        self.db.query(models.User).delete()
        self.db.commit()
        self.db.close()

    def test_bulk_suspend_users(self):
        result = AdminService.bulk_update_user_status(
            db=self.db,
            admin_user=self.super_admin,
            user_ids=[self.candidate_1.id, self.candidate_2.id],
            action="suspend",
            reason="Violation of terms",
        )

        self.assertEqual(result.total_requested, 2)
        self.assertEqual(result.successful_count, 2)
        self.assertEqual(result.failed_count, 0)
        self.assertTrue(all(item.success for item in result.results))

        # Verify DB states
        u1 = self.db.query(models.User).filter(models.User.id == self.candidate_1.id).first()
        u2 = self.db.query(models.User).filter(models.User.id == self.candidate_2.id).first()
        self.assertTrue(u1.is_suspended)
        self.assertTrue(u2.is_suspended)

        # Verify audit logs created
        logs = self.db.query(models.AdminAuditLog).filter(
            models.AdminAuditLog.action_type == "BULK_SUSPEND_USER"
        ).all()
        self.assertEqual(len(logs), 2)

    def test_bulk_activate_users(self):
        # Pre-suspend
        self.candidate_1.is_suspended = True
        self.db.commit()

        result = AdminService.bulk_update_user_status(
            db=self.db,
            admin_user=self.super_admin,
            user_ids=[self.candidate_1.id],
            action="activate",
            reason="Account reinstated",
        )

        self.assertEqual(result.successful_count, 1)
        self.assertEqual(result.failed_count, 0)

        u1 = self.db.query(models.User).filter(models.User.id == self.candidate_1.id).first()
        self.assertFalse(u1.is_suspended)

        logs = self.db.query(models.AdminAuditLog).filter(
            models.AdminAuditLog.action_type == "BULK_ACTIVATE_USER"
        ).all()
        self.assertEqual(len(logs), 1)

    def test_protect_super_admin_and_self_from_suspension(self):
        result = AdminService.bulk_update_user_status(
            db=self.db,
            admin_user=self.super_admin,
            user_ids=[self.super_admin.id, self.candidate_1.id],
            action="suspend",
            reason="Bulk test",
        )

        self.assertEqual(result.total_requested, 2)
        self.assertEqual(result.successful_count, 1)
        self.assertEqual(result.failed_count, 1)

        super_admin_item = next(item for item in result.results if item.user_id == str(self.super_admin.id))
        self.assertFalse(super_admin_item.success)
        self.assertIn("Super administrator", super_admin_item.error)

        # Super admin still not suspended
        sa = self.db.query(models.User).filter(models.User.id == self.super_admin.id).first()
        self.assertFalse(sa.is_suspended)


if __name__ == "__main__":
    unittest.main()
