import unittest
import uuid
from unittest.mock import patch
from sqlalchemy import event
from app.db.database import SessionLocal, engine
from app.db import models
from app.services.admin_service import AdminService, _SUPER_ADMIN_MUTATION_LOCK
from app.services.admin_action_service import AdminActionService
from fastapi import HTTPException


class TestMilestone41Backend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db = SessionLocal()
        # Clean up existing test users if any
        # Demote existing super admins so our tests control super admin count
        cls.existing_sa_ids = [
            u.id for u in db.query(models.User).filter(
                models.User.role == "super_admin",
                models.User.is_active == True,
            ).all()
        ]
        for uid in cls.existing_sa_ids:
            u = db.query(models.User).filter(models.User.id == uid).first()
            if u:
                u.role = "admin"
        db.commit()

        # Create 1 Super Admin and 1 Test Admin
        cls.sa_id = uuid.uuid4()
        sa_user = models.User(
            id=cls.sa_id,
            email=f"m41_sa_{cls.sa_id.hex[:6]}@example.com",
            password_hash="test_pw",
            full_name="M41 Super Admin",
            role="super_admin",
            is_active=True,
            is_suspended=False,
            is_email_verified=True,
        )
        db.add(sa_user)

        cls.admin_id = uuid.uuid4()
        admin_user = models.User(
            id=cls.admin_id,
            email=f"m41_admin_{cls.admin_id.hex[:6]}@example.com",
            password_hash="test_pw",
            full_name="M41 Admin",
            role="admin",
            is_active=True,
            is_suspended=False,
            is_email_verified=True,
        )
        db.add(admin_user)
        db.commit()
        db.close()

    @classmethod
    def tearDownClass(cls):
        db = SessionLocal()
        # Restore original super admins
        for uid in cls.existing_sa_ids:
            u = db.query(models.User).filter(models.User.id == uid).first()
            if u:
                u.role = "super_admin"
        # Delete test admins
        db.query(models.User).filter(models.User.id.in_([cls.sa_id, cls.admin_id])).delete(synchronize_session=False)
        db.commit()
        db.close()

    # ==========================================
    # GAP-P4-P0-1: Lock Scope & Rollback Tests
    # ==========================================

    def test_01_last_super_admin_mutation_prevented_in_db_explorer(self):
        """Verify mutate_record rejects demoting the last active super admin and releases lock."""
        db = SessionLocal()
        try:
            # sa_id is the sole active super admin. Have admin_id attempt to demote sa_id.
            calling_admin = db.query(models.User).filter(models.User.id == self.admin_id).first()
            with self.assertRaises(HTTPException) as ctx:
                AdminActionService.mutate_record(
                    db=db,
                    admin_user=calling_admin,
                    table_name="users",
                    record_id=str(self.sa_id),
                    updates={"role": "user"},
                    reason="Attempt to demote last super admin",
                )
            self.assertEqual(ctx.exception.status_code, 400)
            self.assertIn("last active super administrator", ctx.exception.detail)

            # Verify lock is not held
            acquired = _SUPER_ADMIN_MUTATION_LOCK.acquire(blocking=False)
            self.assertTrue(acquired, "Lock should be free after exception")
            _SUPER_ADMIN_MUTATION_LOCK.release()
        finally:
            db.close()

    def test_02_last_super_admin_delete_prevented_in_db_explorer(self):
        """Verify delete_record rejects deleting the last active super admin and releases lock."""
        db = SessionLocal()
        try:
            # First create a second super admin so self-deletion guard is bypassed
            sa2_id = uuid.uuid4()
            sa2_user = models.User(
                id=sa2_id,
                email=f"m41_sa2_{sa2_id.hex[:6]}@example.com",
                password_hash="test_pw",
                full_name="M41 Super Admin 2",
                role="super_admin",
                is_active=True,
                is_suspended=False,
                is_email_verified=True,
            )
            db.add(sa2_user)
            db.commit()

            # Now demote sa1 so sa2 is the sole super admin
            sa1 = db.query(models.User).filter(models.User.id == self.sa_id).first()
            sa1.role = "admin"
            db.commit()

            # Attempt to delete sa2 (the last remaining super admin) using sa1
            with self.assertRaises(HTTPException) as ctx:
                AdminActionService.delete_record(
                    db=db,
                    admin_user=sa1,
                    table_name="users",
                    record_id=str(sa2_id),
                    confirmation_value=f"DELETE {sa2_user.email}",
                    reason="Attempt to delete last super admin",
                )
            self.assertEqual(ctx.exception.status_code, 400)
            self.assertIn("last active super administrator", ctx.exception.detail)

            # Clean up: restore sa1 to super_admin, delete sa2
            sa1.role = "super_admin"
            sa2_in_db = db.query(models.User).filter(models.User.id == sa2_id).first()
            if sa2_in_db:
                db.delete(sa2_in_db)
            db.commit()

            # Verify lock is released
            acquired = _SUPER_ADMIN_MUTATION_LOCK.acquire(blocking=False)
            self.assertTrue(acquired, "Lock should be free after deletion rejection")
            _SUPER_ADMIN_MUTATION_LOCK.release()
        finally:
            db.close()

    def test_03_mutate_record_rollback_and_lock_release_on_error(self):
        """Verify mutate_record rolls back cleanly and releases lock if commit/audit fails."""
        db = SessionLocal()
        try:
            current_admin = db.query(models.User).filter(models.User.id == self.sa_id).first()
            # Create a target candidate
            target_id = uuid.uuid4()
            target_user = models.User(
                id=target_id,
                email=f"target_{target_id.hex[:6]}@example.com",
                password_hash="test_pw",
                full_name="Target Candidate",
                role="user",
                is_active=True,
                is_suspended=False,
            )
            db.add(target_user)
            db.commit()

            # Simulate an exception during commit
            with patch.object(db, "commit", side_effect=RuntimeError("Simulated DB connection failure")):
                with self.assertRaises(HTTPException) as ctx:
                    AdminActionService.mutate_record(
                        db=db,
                        admin_user=current_admin,
                        table_name="users",
                        record_id=str(target_id),
                        updates={"full_name": "Should Be Rolled Back"},
                        reason="Test rollback",
                    )
                self.assertEqual(ctx.exception.status_code, 500)
                self.assertIn("safely rolled back", ctx.exception.detail)

            # Verify database transaction was rolled back (full_name unchanged)
            db.expire_all()
            reloaded = db.query(models.User).filter(models.User.id == target_id).first()
            self.assertEqual(reloaded.full_name, "Target Candidate")

            # Verify lock is free
            acquired = _SUPER_ADMIN_MUTATION_LOCK.acquire(blocking=False)
            self.assertTrue(acquired, "Lock must be released following exception rollback")
            _SUPER_ADMIN_MUTATION_LOCK.release()

            # Clean up target
            db.delete(reloaded)
            db.commit()
        finally:
            db.close()

    def test_04_delete_record_rollback_and_lock_release_on_error(self):
        """Verify delete_record rolls back cleanly and releases lock if commit fails."""
        db = SessionLocal()
        try:
            current_admin = db.query(models.User).filter(models.User.id == self.sa_id).first()
            target_id = uuid.uuid4()
            target_user = models.User(
                id=target_id,
                email=f"del_target_{target_id.hex[:6]}@example.com",
                password_hash="test_pw",
                full_name="Delete Target",
                role="user",
                is_active=True,
                is_suspended=False,
            )
            db.add(target_user)
            db.commit()

            # Simulate failure during commit
            with patch.object(db, "commit", side_effect=RuntimeError("Simulated disk error")):
                with self.assertRaises(HTTPException) as ctx:
                    AdminActionService.delete_record(
                        db=db,
                        admin_user=current_admin,
                        table_name="users",
                        record_id=str(target_id),
                        confirmation_value=f"DELETE {target_user.email}",
                        reason="Test delete rollback",
                    )
                self.assertEqual(ctx.exception.status_code, 500)
                self.assertIn("safely rolled back", ctx.exception.detail)

            # Verify target was NOT deleted due to rollback
            db.expire_all()
            reloaded = db.query(models.User).filter(models.User.id == target_id).first()
            self.assertIsNotNone(reloaded)

            # Verify lock is free
            acquired = _SUPER_ADMIN_MUTATION_LOCK.acquire(blocking=False)
            self.assertTrue(acquired, "Lock must be free following delete rollback")
            _SUPER_ADMIN_MUTATION_LOCK.release()

            # Clean up target
            db.delete(reloaded)
            db.commit()
        finally:
            db.close()

    # ==========================================
    # GAP-P4-P1-1: N+1 Elimination & Benchmarking
    # ==========================================

    def test_05_list_users_batched_query_count_and_correctness(self):
        """
        Verify that AdminService.list_users uses exactly 6 queries for page_size=20
        instead of the N+1 pattern (which required 2 + 4*20 = 82 queries).
        Also verify candidate metrics and readiness score semantics.
        """
        db = SessionLocal()
        created_user_ids = []
        prefix = f"perf_{uuid.uuid4().hex[:6]}"
        try:
            # Seed 20 test users with varied related data
            for i in range(20):
                u_id = uuid.uuid4()
                created_user_ids.append(u_id)
                user = models.User(
                    id=u_id,
                    email=f"{prefix}_{i}_{u_id.hex[:6]}@example.com",
                    password_hash="test_pw",
                    full_name=f"Perf Candidate {i}",
                    role="user",
                    is_active=True,
                    is_suspended=(i % 4 == 0),  # every 4th user is suspended
                    is_email_verified=True,
                )
                db.add(user)

                # Add CareerProfile for even-numbered users
                if i % 2 == 0:
                    cp = models.UserCareerProfile(
                        id=uuid.uuid4(),
                        user_id=u_id,
                        target_role=f"Role {i}",
                        onboarding_completed=True,
                    )
                    db.add(cp)

                # Add JobApplications for every 3rd user
                if i % 3 == 0:
                    for app_idx in range(i % 3 + 1):
                        job_app = models.JobApplication(
                            id=uuid.uuid4(),
                            user_id=u_id,
                            company_name=f"Company {app_idx}",
                            job_title=f"Dev {app_idx}",
                            status="applied",
                        )
                        db.add(job_app)

                # Add InterviewSessions for every 5th user
                if i % 5 == 0:
                    interview = models.InterviewSession(
                        id=uuid.uuid4(),
                        user_id=u_id,
                        role="Software Engineer",
                        status="completed",
                    )
                    db.add(interview)

                # Add Resume with ATS score for users with i >= 10
                if i >= 10:
                    resume = models.Resume(
                        id=uuid.uuid4(),
                        user_id=u_id,
                        file_name=f"resume_{i}.pdf",
                        ats_score=78.5 + (i % 10),
                    )
                    db.add(resume)

            db.commit()

            # Instrument query execution count
            queries = []

            def query_listener(conn, cursor, statement, parameters, context, executemany):
                queries.append(statement)

            event.listen(engine, "before_cursor_execute", query_listener)
            try:
                # Query page_size=20
                res = AdminService.list_users(
                    db=db,
                    page=1,
                    page_size=20,
                    search=prefix,
                )
            finally:
                event.remove(engine, "before_cursor_execute", query_listener)

            # Exact query count verification:
            # 1. count()
            # 2. select users offset 0 limit 20
            # 3. select career_profiles in (user_ids)
            # 4. select job_applications count in (user_ids) group by user_id
            # 5. select interview_sessions count in (user_ids) group by user_id
            # 6. select resumes in (user_ids) order by created_at desc
            total_queries_executed = len(queries)
            self.assertEqual(
                total_queries_executed,
                6,
                f"Expected exactly 6 SQL queries for page_size=20, but executed {total_queries_executed}!",
            )

            # Response correctness verification
            self.assertEqual(len(res.users), 20)
            self.assertEqual(res.total, 20)

            for user_item in res.users:
                # Parse index from email: perf_user_{i}_...
                idx = int(user_item.email.split("_")[2])

                # Verify suspension
                self.assertEqual(user_item.is_suspended, (idx % 4 == 0))

                # Verify career profile
                if idx % 2 == 0:
                    self.assertTrue(user_item.onboarding_completed)
                    self.assertEqual(user_item.target_role, f"Role {idx}")
                else:
                    self.assertFalse(user_item.onboarding_completed)
                    self.assertIsNone(user_item.target_role)

                # Verify applications count
                if idx % 3 == 0:
                    self.assertGreaterEqual(user_item.applications_count, 1)
                else:
                    self.assertEqual(user_item.applications_count, 0)

                # Verify interviews count
                if idx % 5 == 0:
                    self.assertEqual(user_item.interviews_count, 1)
                else:
                    self.assertEqual(user_item.interviews_count, 0)

                # Verify resume and readiness score (updated for Milestone 4.3 CandidateReadinessService)
                if idx >= 10:
                    self.assertIsNotNone(user_item.ats_score)
                    self.assertIsNotNone(user_item.readiness_score)
                else:
                    self.assertIsNone(user_item.ats_score)
                if user_item.readiness_score is not None:
                    self.assertGreaterEqual(user_item.readiness_score, 0.0)
                    self.assertLessEqual(user_item.readiness_score, 100.0)

        finally:
            # Clean up seeded users
            if created_user_ids:
                db.query(models.Resume).filter(models.Resume.user_id.in_(created_user_ids)).delete(synchronize_session=False)
                db.query(models.InterviewSession).filter(models.InterviewSession.user_id.in_(created_user_ids)).delete(synchronize_session=False)
                db.query(models.JobApplication).filter(models.JobApplication.user_id.in_(created_user_ids)).delete(synchronize_session=False)
                db.query(models.UserCareerProfile).filter(models.UserCareerProfile.user_id.in_(created_user_ids)).delete(synchronize_session=False)
                db.query(models.User).filter(models.User.id.in_(created_user_ids)).delete(synchronize_session=False)
                db.commit()
            db.close()

    def test_06_list_users_zero_results_and_scaling(self):
        """Verify that 0 results executes only 2 queries and does not execute batch queries."""
        db = SessionLocal()
        queries = []

        def query_listener(conn, cursor, statement, parameters, context, executemany):
            queries.append(statement)

        event.listen(engine, "before_cursor_execute", query_listener)
        try:
            res = AdminService.list_users(
                db=db,
                page=1,
                page_size=20,
                search="non_existent_search_query_xyz_12345",
            )
        finally:
            event.remove(engine, "before_cursor_execute", query_listener)
            db.close()

        self.assertEqual(len(queries), 2, "0 matching users should execute only count and select (2 queries)")
        self.assertEqual(len(res.users), 0)
        self.assertEqual(res.total, 0)

    def test_07_list_users_scale_100_queries_benchmark(self):
        """Verify that page_size=100 still executes exactly 6 queries instead of 402 queries."""
        db = SessionLocal()
        created_user_ids = []
        try:
            # Seed 100 test users
            for i in range(100):
                u_id = uuid.uuid4()
                created_user_ids.append(u_id)
                user = models.User(
                    id=u_id,
                    email=f"scale100_{i}_{u_id.hex[:6]}@example.com",
                    password_hash="test_pw",
                    full_name=f"Scale Candidate {i}",
                    role="user",
                    is_active=True,
                    is_suspended=False,
                )
                db.add(user)
            db.commit()

            queries = []

            def query_listener(conn, cursor, statement, parameters, context, executemany):
                queries.append(statement)

            event.listen(engine, "before_cursor_execute", query_listener)
            try:
                res = AdminService.list_users(
                    db=db,
                    page=1,
                    page_size=100,
                    search="scale100_",
                )
            finally:
                event.remove(engine, "before_cursor_execute", query_listener)

            self.assertEqual(len(res.users), 100)
            self.assertEqual(
                len(queries),
                6,
                f"Expected exactly 6 queries for 100 users, but got {len(queries)}!"
            )
        finally:
            if created_user_ids:
                db.query(models.User).filter(models.User.id.in_(created_user_ids)).delete(synchronize_session=False)
                db.commit()
            db.close()


if __name__ == "__main__":
    unittest.main()
