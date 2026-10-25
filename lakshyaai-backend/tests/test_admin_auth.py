import unittest
import uuid
from app.db import models
from app.core.permissions import require_admin, require_super_admin
from fastapi import HTTPException


class TestAdminPermissionsAndRoles(unittest.TestCase):
    def test_normal_user_rejected_by_require_admin(self):
        user = models.User(
            id=uuid.uuid4(),
            email="user@lakshya.ai",
            role="user",
            is_suspended=False,
            is_email_verified=True,
        )
        with self.assertRaises(HTTPException) as ctx:
            require_admin(user)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_admin_accepted_by_require_admin(self):
        admin_user = models.User(
            id=uuid.uuid4(),
            email="admin@lakshya.ai",
            role="admin",
            is_suspended=False,
            is_email_verified=True,
        )
        res = require_admin(admin_user)
        self.assertEqual(res.role, "admin")

    def test_super_admin_accepted_by_require_super_admin(self):
        super_admin = models.User(
            id=uuid.uuid4(),
            email="srikanthuppalapati09@gmail.com",
            role="super_admin",
            is_suspended=False,
            is_email_verified=True,
        )
        res = require_super_admin(super_admin)
        self.assertEqual(res.role, "super_admin")

    def test_admin_rejected_by_require_super_admin(self):
        admin_user = models.User(
            id=uuid.uuid4(),
            email="admin@lakshya.ai",
            role="admin",
            is_suspended=False,
            is_email_verified=True,
        )
        with self.assertRaises(HTTPException) as ctx:
            require_super_admin(admin_user)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_suspended_admin_rejected(self):
        suspended_admin = models.User(
            id=uuid.uuid4(),
            email="suspended_admin@lakshya.ai",
            role="admin",
            is_suspended=True,
            is_email_verified=True,
        )
        with self.assertRaises(HTTPException) as ctx:
            require_admin(suspended_admin)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_unverified_admin_rejected(self):
        unverified_admin = models.User(
            id=uuid.uuid4(),
            email="unverified_admin@lakshya.ai",
            role="admin",
            is_suspended=False,
            is_email_verified=False,
        )
        with self.assertRaises(HTTPException) as ctx:
            require_admin(unverified_admin)
        self.assertEqual(ctx.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
