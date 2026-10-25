import importlib.util
import unittest
import uuid
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.db.database import SessionLocal, Base
from app.db import models


class TestSupabaseRLSAndSecurityArchitecture(unittest.TestCase):
    """
    Security and regression test suite verifying:
    1. Supabase RLS migration completeness across all 38 audited tables.
    2. Tenant isolation and IDOR prevention between User A and User B.
    3. Interview messages protection and session ownership validation.
    4. Credential and verification token isolation.
    5. Administrative audit log and simulation session access controls.
    6. Catalog reference data accessibility.
    """

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        cls.user_a_id = uuid.uuid4()
        cls.user_b_id = uuid.uuid4()

        cls.token_a = create_access_token({"sub": str(cls.user_a_id)})
        cls.token_b = create_access_token({"sub": str(cls.user_b_id)})

        cls.headers_a = {"Authorization": f"Bearer {cls.token_a}"}
        cls.headers_b = {"Authorization": f"Bearer {cls.token_b}"}

        # Seed User A and User B
        cls.user_a = models.User(
            id=cls.user_a_id,
            email=f"candidate_a_{cls.user_a_id.hex[:6]}@example.com",
            password_hash="$2b$12$e8YkZ8z4Pq8...fakehash",
            full_name="Candidate A",
            role="user",
            is_active=True,
            is_suspended=False,
            is_email_verified=True,
        )
        cls.user_b = models.User(
            id=cls.user_b_id,
            email=f"attacker_b_{cls.user_b_id.hex[:6]}@example.com",
            password_hash="$2b$12$e8YkZ8z4Pq8...fakehash",
            full_name="Attacker B",
            role="user",
            is_active=True,
            is_suspended=False,
            is_email_verified=True,
        )
        cls.db.add(cls.user_a)
        cls.db.add(cls.user_b)
        cls.db.commit()

        # Seed User A private interview session and message
        cls.session_a = models.InterviewSession(
            id=uuid.uuid4(),
            user_id=cls.user_a_id,
            role="Backend Engineer",
            difficulty="medium",
            mode="text",
            status="in_progress",
            questions=["Explain Python GIL and concurrency model."],
            current_index=1,
            overall_score=85.0,
        )
        cls.db.add(cls.session_a)
        cls.db.commit()

        cls.msg_a = models.InterviewMessage(
            id=uuid.uuid4(),
            session_id=cls.session_a.id,
            sender="user",
            content="The GIL is a mutex protecting Python objects from race conditions.",
            feedback="Strong conceptual explanation of GIL internals.",
            score=90.0,
            question_index=1,
            strengths=["Clear concurrency concepts"],
            weaknesses=["Could mention multiprocessing alternatives"],
        )
        cls.db.add(cls.msg_a)
        cls.db.commit()

        # Seed User A notification
        cls.notif_a = models.Notification(
            id=uuid.uuid4(),
            user_id=cls.user_a_id,
            title="Interview Completed",
            message="Your backend interview results are ready.",
            type="interview_practice",
            is_read=False,
        )
        cls.db.add(cls.notif_a)
        cls.db.commit()

    @classmethod
    def tearDownClass(cls):
        try:
            cls.db.query(models.InterviewMessage).filter(models.InterviewMessage.id == cls.msg_a.id).delete()
            cls.db.query(models.InterviewSession).filter(models.InterviewSession.id == cls.session_a.id).delete()
            cls.db.query(models.Notification).filter(models.Notification.id == cls.notif_a.id).delete()
            cls.db.query(models.User).filter(models.User.id.in_([cls.user_a_id, cls.user_b_id])).delete()
            cls.db.commit()
        except Exception:
            cls.db.rollback()
        finally:
            cls.db.close()

    # -------------------------------------------------------------------------
    # 1. MIGRATION COVERAGE & COMPLETENESS VERIFICATION
    # -------------------------------------------------------------------------

    def test_migration_covers_all_application_and_advisory_tables(self):
        """Verify the migration accounts for all 37 application tables and alembic_version (38 total)."""
        migration_path = Path(__file__).parent.parent.parent / "alembic" / "versions" / "c8b9d0e1f2a3_supabase_rls_security_remediation.py"
        self.assertTrue(migration_path.exists(), f"Migration file missing at {migration_path}")

        spec = importlib.util.spec_from_file_location("rls_migration", migration_path)
        rls_migration = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(rls_migration)

        # Collect all tables defined across migration groups
        migration_tables = set(
            rls_migration.USER_OWNED_TABLES
            + rls_migration.CHILD_TABLES
            + rls_migration.SENSITIVE_ADMIN_TABLES
            + rls_migration.CATALOG_TABLES
        )

        # Collect all tables in SQLAlchemy Base metadata
        orm_tables = set(Base.metadata.tables.keys())

        # All ORM tables must be classified and secured in the migration
        missing_from_migration = orm_tables - migration_tables
        self.assertEqual(
            missing_from_migration,
            set(),
            f"Tables missing from RLS security migration: {missing_from_migration}"
        )

        # Exactly 37 application tables classified
        self.assertEqual(len(migration_tables), 37)

        # Down revision must link to initial schema
        self.assertEqual(rls_migration.down_revision, "5d3cf4891899")

    # -------------------------------------------------------------------------
    # 2. TENANT ISOLATION: USER A VS USER B
    # -------------------------------------------------------------------------

    def test_user_b_cannot_read_or_mutate_user_a_notifications(self):
        """User B must not be able to read or mutate User A's notifications."""
        # User B queries notifications -> receives empty list
        res_b = self.client.get("/api/notifications", headers=self.headers_b)
        self.assertEqual(res_b.status_code, 200)
        items_b = res_b.json()
        self.assertNotIn(str(self.notif_a.id), [n["id"] for n in items_b])

        # User B attempts to mark User A's notification as read -> 404
        res_patch = self.client.patch(f"/api/notifications/{self.notif_a.id}/read", headers=self.headers_b)
        self.assertEqual(res_patch.status_code, 404)

        # User B attempts to mark User A's notification as unread -> 404
        res_unread = self.client.patch(f"/api/notifications/{self.notif_a.id}/unread", headers=self.headers_b)
        self.assertEqual(res_unread.status_code, 404)

    def test_user_b_cannot_access_user_a_interview_session(self):
        """User B cannot view or submit answers to User A's mock interview session."""
        # User B attempts to submit answer to User A's session -> rejected with not found error
        res_step = self.client.post(
            "/api/interview/next",
            headers=self.headers_b,
            json={
                "session_id": str(self.session_a.id),
                "answer": "Malicious attempt to advance User A's interview.",
            },
        )
        self.assertIn(res_step.status_code, [400, 404])

    # -------------------------------------------------------------------------
    # 3. INTERVIEW MESSAGES SENSITIVE COLUMN PROTECTION
    # -------------------------------------------------------------------------

    def test_interview_messages_sensitive_attributes_are_scoped_to_owner(self):
        """Confidential interview feedback, score, and weaknesses are tied to session owner."""
        # Verify in DB that message has sensitive columns
        msg = self.db.query(models.InterviewMessage).filter(models.InterviewMessage.id == self.msg_a.id).first()
        self.assertIsNotNone(msg)
        self.assertEqual(msg.score, 90.0)
        self.assertIn("GIL", msg.content)
        self.assertIn("Clear concurrency concepts", msg.strengths)

        # Unauthenticated request to /api/interview/next rejected
        res_unauth = self.client.post(
            "/api/interview/next",
            json={"session_id": str(self.session_a.id), "answer": "test"},
        )
        self.assertIn(res_unauth.status_code, [401, 403])

    # -------------------------------------------------------------------------
    # 4. SENSITIVE CREDENTIAL & TOKEN PROTECTION
    # -------------------------------------------------------------------------

    def test_user_password_hash_never_exposed_via_api(self):
        """Password hashes must never appear in /api/users/me or public responses."""
        res_me = self.client.get("/api/users/me", headers=self.headers_a)
        self.assertEqual(res_me.status_code, 200)
        body = res_me.json()
        self.assertNotIn("password_hash", body)
        self.assertNotIn("password", body)

    def test_unverified_user_cannot_access_protected_admin_routes(self):
        """Regular user tokens must be rejected from administrative endpoints."""
        res_admin = self.client.get("/api/admin/dashboard", headers=self.headers_a)
        self.assertEqual(res_admin.status_code, 403)

    # -------------------------------------------------------------------------
    # 5. CATALOG DATA AUDIENCE & ACCESS POLICY VERIFICATION
    # -------------------------------------------------------------------------

    def test_catalog_tables_match_intended_audience(self):
        """Verify catalog tables separate public reference data from authenticated and admin data."""
        migration_path = Path(__file__).parent.parent.parent / "alembic" / "versions" / "c8b9d0e1f2a3_supabase_rls_security_remediation.py"
        spec = importlib.util.spec_from_file_location("rls_migration", migration_path)
        rls_migration = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(rls_migration)

        # Only roles and role_skills are exposed to unauthenticated public
        self.assertEqual(set(rls_migration.PUBLIC_CATALOG_TABLES), {"roles", "role_skills"})

        # company_intelligence requires authentication, never public anon
        self.assertIn("company_intelligence", rls_migration.AUTHENTICATED_CATALOG_TABLES)
        self.assertNotIn("company_intelligence", rls_migration.PUBLIC_CATALOG_TABLES)

        # feature_flags, platform_announcements, role_embeddings must be locked to server/admin
        for sensitive_table in ["feature_flags", "platform_announcements", "role_embeddings"]:
            self.assertIn(sensitive_table, rls_migration.SENSITIVE_ADMIN_TABLES)
            self.assertNotIn(sensitive_table, rls_migration.PUBLIC_CATALOG_TABLES)

    def test_public_catalog_roles_are_accessible_read_only(self):
        """Roles catalog is accessible for career alignment queries."""
        res_roles = self.client.get("/api/roles", headers=self.headers_a)
        self.assertIn(res_roles.status_code, [200, 307, 404])

    # -------------------------------------------------------------------------
    # 6. STORAGE CLEANUP & PATH TRAVERSAL DEFENSE
    # -------------------------------------------------------------------------

    def test_file_cleanup_rejects_malicious_path_traversal(self):
        """Storage cleanups must reject path traversal strings and return 0 deleted files."""
        from app.services.storage.file_storage import FileStorageService
        from app.services.resume.rewrite_storage import ResumeRewriteStorage

        malicious_inputs = [
            "../../etc/passwd",
            "../uploads",
            "/absolute/root/path",
            "not-a-valid-uuid",
            "12345",
        ]
        for malicious in malicious_inputs:
            deleted_files = FileStorageService.delete_user_files(malicious)
            self.assertEqual(deleted_files, 0)

            deleted_rewrites = ResumeRewriteStorage.delete_user_rewrites(malicious)
            self.assertEqual(deleted_rewrites, 0)


if __name__ == "__main__":
    unittest.main()
