import unittest
import uuid
from pathlib import Path
from fastapi.testclient import TestClient
from fastapi import HTTPException, Request
from starlette.datastructures import Headers
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.database import get_db, Base
from app.db import models
from app.core.config import settings
from app.core.security import hash_password, create_access_token
from app.core.dependencies import get_current_user
from app.core.permissions import require_admin, require_super_admin
from app.services.simulation_service import SimulationService, hash_simulation_token


class MockRequestWithHeaders:
    """Mock Request for unit testing dependencies with headers and state."""
    def __init__(self, headers=None, method="GET", path="/api/users/me"):
        self.headers = Headers(headers or {})
        self.method = method
        self.url = type("URL", (), {"path": path})()
        self.state = type("State", (), {})()


class TestCriticalSecurityRemediation(unittest.TestCase):
    """
    Regression test suite for Critical Security Remediation Stage:
    1. Public registration cannot obtain super_admin privileges.
    2. Administrative privileges and login require verified email.
    3. View-As simulation scoping returns candidate subject while preserving admin actor.
    4. Non-super-admins cannot present simulation tokens.
    5. Startup DDL removal and migration infrastructure.
    6. LaTeX container dependencies.
    """

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        Base.metadata.create_all(bind=cls.engine)

        cls.db = cls.TestingSessionLocal()
        cls.test_password = "SecurePassword123!"
        cls.hashed_password = hash_password(cls.test_password)

        # Configured admin email
        cls.bootstrap_admin_email = settings.ADMIN_EMAILS[0].strip().lower() if settings.ADMIN_EMAILS else "admin@lakshya.ai"

        # 1. Super Admin User (Verified)
        cls.super_admin_id = uuid.uuid4()
        cls.super_admin = models.User(
            id=cls.super_admin_id,
            email="verified_superadmin@lakshya.ai",
            password_hash=cls.hashed_password,
            full_name="Super Admin Alice",
            role="super_admin",
            is_active=True,
            is_suspended=False,
            is_email_verified=True,
        )
        cls.db.add(cls.super_admin)

        # 2. Candidate User (Verified)
        cls.candidate_id = uuid.uuid4()
        cls.candidate_email = "candidate_bob@example.com"
        cls.candidate = models.User(
            id=cls.candidate_id,
            email=cls.candidate_email,
            password_hash=cls.hashed_password,
            full_name="Candidate Bob",
            role="user",
            is_active=True,
            is_suspended=False,
            is_email_verified=True,
        )
        cls.db.add(cls.candidate)

        # 3. Normal Regular User (Unverified)
        cls.unverified_user_id = uuid.uuid4()
        cls.unverified_user = models.User(
            id=cls.unverified_user_id,
            email="unverified_user@example.com",
            password_hash=cls.hashed_password,
            full_name="Unverified User",
            role="user",
            is_active=True,
            is_suspended=False,
            is_email_verified=False,
        )
        cls.db.add(cls.unverified_user)

        # 4. Unverified Admin User
        cls.unverified_admin_id = uuid.uuid4()
        cls.unverified_admin = models.User(
            id=cls.unverified_admin_id,
            email="unverified_admin@lakshya.ai",
            password_hash=cls.hashed_password,
            full_name="Unverified Admin",
            role="admin",
            is_active=True,
            is_suspended=False,
            is_email_verified=False,
        )
        cls.db.add(cls.unverified_admin)

        cls.db.commit()

        cls.super_admin_jwt = create_access_token({"sub": str(cls.super_admin_id)})
        cls.candidate_jwt = create_access_token({"sub": str(cls.candidate_id)})
        cls.unverified_admin_jwt = create_access_token({"sub": str(cls.unverified_admin_id)})

        def override_get_db():
            db_session = cls.TestingSessionLocal()
            try:
                yield db_session
            finally:
                db_session.close()

        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()
        cls.db.close()
        Base.metadata.drop_all(bind=cls.engine)

    # -------------------------------------------------------------------------
    # 1. REGISTRATION & ADMIN PRIVILEGE ASSIGNMENT
    # -------------------------------------------------------------------------

    def test_public_registration_with_admin_email_cannot_obtain_super_admin(self):
        """
        Public self-registration with an address matching ADMIN_EMAILS must create
        the account with role='user' and is_email_verified=False.
        """
        target_email = f"bootstrap_{uuid.uuid4().hex[:6]}@lakshya.ai"
        # Temporarily add to ADMIN_EMAILS for test verification
        original_admin_emails = list(settings.ADMIN_EMAILS)
        settings.ADMIN_EMAILS.append(target_email)

        try:
            res = self.client.post(
                "/api/auth/register",
                json={
                    "full_name": "Infiltrator Admin",
                    "email": target_email,
                    "password": "Password123!",
                },
            )
            self.assertEqual(res.status_code, 200)

            # Query database to confirm user was created with role='user', NOT 'super_admin'
            db_session = self.TestingSessionLocal()
            created_user = db_session.query(models.User).filter(models.User.email == target_email).first()
            self.assertIsNotNone(created_user)
            self.assertEqual(created_user.role, "user", "Public registration must never assign super_admin")
            self.assertFalse(created_user.is_email_verified, "Registration email must start unverified")
            db_session.close()
        finally:
            settings.ADMIN_EMAILS = original_admin_emails

    def test_unverified_admin_login_is_blocked(self):
        """
        An account holding or claiming an administrative role (admin or super_admin)
        must be forbidden from logging in until their email address is verified.
        """
        res = self.client.post(
            "/api/auth/login",
            data={
                "username": self.unverified_admin.email,
                "password": self.test_password,
            },
        )
        self.assertEqual(res.status_code, 403)
        body = res.json()
        error_msg = body.get("detail", "") or body.get("error", {}).get("message", "")
        self.assertIn("Email verification required", error_msg)

    def test_email_verification_token_elevates_bootstrap_admin(self):
        """
        Upon successful redemption of an email verification token, a bootstrap
        admin is elevated to super_admin and can now log in.
        """
        bootstrap_test_email = f"verified_bootstrap_{uuid.uuid4().hex[:6]}@lakshya.ai"
        original_admin_emails = list(settings.ADMIN_EMAILS)
        settings.ADMIN_EMAILS.append(bootstrap_test_email)

        db_session = self.TestingSessionLocal()
        try:
            # 1. Register user
            res_reg = self.client.post(
                "/api/auth/register",
                json={
                    "full_name": "Future SuperAdmin",
                    "email": bootstrap_test_email,
                    "password": self.test_password,
                },
            )
            self.assertEqual(res_reg.status_code, 200)

            # Fetch the generated verification token record
            user_record = db_session.query(models.User).filter(models.User.email == bootstrap_test_email).first()
            token_record = db_session.query(models.EmailVerificationToken).filter(
                models.EmailVerificationToken.user_id == user_record.id
            ).first()
            self.assertIsNotNone(token_record)

            # For testing token verification, we set a known token
            import secrets, hashlib
            raw_token = f"tok_{secrets.token_urlsafe(32)}"
            token_record.token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
            db_session.commit()

            # 2. Redeem verification token
            res_verify = self.client.post(
                "/api/auth/verify-email",
                json={"token": raw_token},
            )
            self.assertEqual(res_verify.status_code, 200)
            self.assertTrue(res_verify.json().get("is_email_verified"))

            # 3. Confirm user is now elevated to super_admin in database
            db_session.refresh(user_record)
            self.assertTrue(user_record.is_email_verified)
            self.assertEqual(user_record.role, "super_admin")

            # 4. Now user can log in successfully
            res_login = self.client.post(
                "/api/auth/login",
                data={
                    "username": bootstrap_test_email,
                    "password": self.test_password,
                },
            )
            self.assertEqual(res_login.status_code, 200)
            self.assertIn("access_token", res_login.json())
        finally:
            settings.ADMIN_EMAILS = original_admin_emails
            db_session.close()

    def test_unverified_admin_rejected_by_permissions_dependencies(self):
        """
        Directly verify require_admin and require_super_admin reject unverified users.
        """
        unverified_admin_user = models.User(
            id=uuid.uuid4(),
            email="unverified_perm@lakshya.ai",
            role="super_admin",
            is_active=True,
            is_suspended=False,
            is_email_verified=False,
        )
        with self.assertRaises(HTTPException) as ctx_admin:
            require_admin(current_user=unverified_admin_user)
        self.assertEqual(ctx_admin.exception.status_code, 403)
        self.assertIn("Email verification required", ctx_admin.exception.detail)

        with self.assertRaises(HTTPException) as ctx_super:
            require_super_admin(current_user=unverified_admin_user)
        self.assertEqual(ctx_super.exception.status_code, 403)
        self.assertIn("Email verification required", ctx_super.exception.detail)

    # -------------------------------------------------------------------------
    # 2. VIEW-AS SIMULATION SCOPING & CANDIDATE DATA ISOLATION
    # -------------------------------------------------------------------------

    def test_simulation_scopes_to_candidate_subject_in_current_user(self):
        """
        When a Super Admin initiates simulation and presents X-Simulation-Token,
        get_current_user must return the candidate user (subject) while preserving
        the admin user as actor on request.state.
        """
        db_session = self.TestingSessionLocal()
        try:
            # 1. Start simulation session
            session_rec, raw_token = SimulationService.start_simulation(
                db=db_session,
                admin_user=self.super_admin,
                target_user_id=self.candidate.id,
                reason="Audit Candidate Resume Scoping",
                duration_minutes=30,
            )

            # 2. Invoke get_current_user with simulated request
            req = MockRequestWithHeaders(
                headers={
                    "Authorization": f"Bearer {self.super_admin_jwt}",
                    "X-Simulation-Token": raw_token,
                },
                method="GET",
                path="/api/users/me",
            )

            resolved_user = get_current_user(
                request=req,
                token=self.super_admin_jwt,
                db=db_session,
            )

            # Candidate must be the returned subject
            self.assertEqual(resolved_user.id, self.candidate.id)
            self.assertEqual(resolved_user.email, self.candidate.email)

            # Actor must be preserved on request.state
            self.assertEqual(req.state.actor.id, self.super_admin.id)
            self.assertEqual(req.state.actor_id, self.super_admin.id)
            self.assertEqual(req.state.subject.id, self.candidate.id)
            self.assertTrue(req.state.is_simulation)

            # 3. Test through HTTP endpoint /api/users/me
            res = self.client.get(
                "/api/users/me",
                headers={
                    "Authorization": f"Bearer {self.super_admin_jwt}",
                    "X-Simulation-Token": raw_token,
                },
            )
            self.assertEqual(res.status_code, 200)
            data = res.json()
            # The returned profile must be the candidate's profile, NOT the admin's!
            self.assertEqual(data.get("email"), self.candidate_email)
            self.assertEqual(data.get("id"), str(self.candidate_id))

        finally:
            SimulationService.stop_simulation(db=db_session, admin_user=self.super_admin)
            db_session.close()

    def test_non_super_admin_cannot_use_simulation_token(self):
        """
        A regular candidate user attempting to present an X-Simulation-Token
        must be rejected with HTTP 403 Forbidden.
        """
        db_session = self.TestingSessionLocal()
        try:
            session_rec, raw_token = SimulationService.start_simulation(
                db=db_session,
                admin_user=self.super_admin,
                target_user_id=self.candidate.id,
            )

            # Candidate attempts to present simulation token
            res = self.client.get(
                "/api/users/me",
                headers={
                    "Authorization": f"Bearer {self.candidate_jwt}",
                    "X-Simulation-Token": raw_token,
                },
            )
            self.assertEqual(res.status_code, 403)
            self.assertIn("Super administrator privileges required", res.text)
        finally:
            SimulationService.stop_simulation(db=db_session, admin_user=self.super_admin)
            db_session.close()

    def test_admin_simulation_end_recognizes_admin_actor(self):
        """
        When calling /api/admin/simulation/end during simulation mode,
        require_super_admin resolves the actor (the super admin) and allows ending the session.
        """
        db_session = self.TestingSessionLocal()
        try:
            session_rec, raw_token = SimulationService.start_simulation(
                db=db_session,
                admin_user=self.super_admin,
                target_user_id=self.candidate.id,
            )

            # End simulation session via API
            res = self.client.post(
                "/api/admin/simulation/end",
                json={"token": raw_token, "reason": "Ended test successfully"},
                headers={
                    "Authorization": f"Bearer {self.super_admin_jwt}",
                    "X-Simulation-Token": raw_token,
                },
            )
            self.assertEqual(res.status_code, 200)
            self.assertTrue(res.json().get("stopped"))

            # 4. Confirm simulation is ended: subsequent requests with that token fail closed
            res_after = self.client.get(
                "/api/users/me",
                headers={
                    "Authorization": f"Bearer {self.super_admin_jwt}",
                    "X-Simulation-Token": raw_token,
                },
            )
            self.assertEqual(res_after.status_code, 403)

            # 5. Normal requests without simulation token restore super admin identity
            res_admin = self.client.get(
                "/api/users/me",
                headers={"Authorization": f"Bearer {self.super_admin_jwt}"},
            )
            self.assertEqual(res_admin.status_code, 200)
            self.assertEqual(res_admin.json().get("id"), str(self.super_admin_id))
        finally:
            db_session.close()

    def test_candidate_endpoints_never_use_actor_id_for_records(self):
        """
        Confirm that candidate data queries filter by the candidate subject ID,
        not the super admin actor ID.
        """
        db_session = self.TestingSessionLocal()
        try:
            # Create a test application belonging strictly to Candidate Bob
            app_id = uuid.uuid4()
            candidate_app = models.JobApplication(
                id=app_id,
                user_id=self.candidate_id,
                company_name="Stark Industries",
                job_title="Security Lead",
                status="interviewing",
            )
            db_session.add(candidate_app)
            db_session.commit()

            # Start simulation session
            session_rec, raw_token = SimulationService.start_simulation(
                db=db_session,
                admin_user=self.super_admin,
                target_user_id=self.candidate.id,
            )

            # Query applications via candidate endpoint with simulation token
            res = self.client.get(
                "/api/applications/",
                headers={
                    "Authorization": f"Bearer {self.super_admin_jwt}",
                    "X-Simulation-Token": raw_token,
                },
            )
            self.assertEqual(res.status_code, 200)
            apps = res.json()
            # Must return Candidate Bob's application
            app_ids = [a.get("id") for a in apps]
            self.assertIn(str(app_id), app_ids)
            self.assertEqual(apps[0].get("company_name"), "Stark Industries")

        finally:
            SimulationService.stop_simulation(db=db_session, admin_user=self.super_admin)
            db_session.close()

    def test_invalid_expired_and_mismatched_simulation_tokens_fail_closed(self):
        """
        Verify that expired tokens, forged tokens, and tokens used by a different
        super admin fail closed with HTTP 403 Forbidden.
        """
        db_session = self.TestingSessionLocal()
        try:
            # 1. Non-existent / forged token
            res_forged = self.client.get(
                "/api/users/me",
                headers={
                    "Authorization": f"Bearer {self.super_admin_jwt}",
                    "X-Simulation-Token": "sim_completely_fake_token_12345",
                },
            )
            self.assertEqual(res_forged.status_code, 403)

            # 2. Expired simulation token
            session_rec, raw_token = SimulationService.start_simulation(
                db=db_session,
                admin_user=self.super_admin,
                target_user_id=self.candidate.id,
                duration_minutes=-5,  # already expired
            )
            res_expired = self.client.get(
                "/api/users/me",
                headers={
                    "Authorization": f"Bearer {self.super_admin_jwt}",
                    "X-Simulation-Token": raw_token,
                },
            )
            self.assertEqual(res_expired.status_code, 403)

            # 3. Mismatched admin: create another super admin
            other_admin_id = uuid.uuid4()
            other_admin = models.User(
                id=other_admin_id,
                email="other_super_admin@lakshya.ai",
                password_hash=self.hashed_password,
                role="super_admin",
                is_active=True,
                is_suspended=False,
                is_email_verified=True,
            )
            db_session.add(other_admin)
            db_session.commit()
            other_admin_jwt = create_access_token({"sub": str(other_admin_id)})

            # Start valid session for Alice
            session_rec2, valid_token = SimulationService.start_simulation(
                db=db_session,
                admin_user=self.super_admin,
                target_user_id=self.candidate.id,
                duration_minutes=30,
            )

            # Other admin attempts to use Alice's simulation token
            res_mismatched = self.client.get(
                "/api/users/me",
                headers={
                    "Authorization": f"Bearer {other_admin_jwt}",
                    "X-Simulation-Token": valid_token,
                },
            )
            self.assertEqual(res_mismatched.status_code, 403)

        finally:
            SimulationService.stop_simulation(db=db_session, admin_user=self.super_admin)
            db_session.close()

    def test_verified_ordinary_user_cannot_access_administrative_endpoints(self):
        """
        Verified ordinary users (role='user') cannot access admin routes.
        """
        res = self.client.get(
            "/api/admin/dashboard",
            headers={"Authorization": f"Bearer {self.candidate_jwt}"},
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("Administrator access required", res.text)

    def test_suspended_or_inactive_admin_blocked(self):
        """
        Suspended or inactive admins cannot access administrative endpoints.
        """
        db_session = self.TestingSessionLocal()
        try:
            suspended_admin_id = uuid.uuid4()
            suspended_admin = models.User(
                id=suspended_admin_id,
                email="suspended_admin_test@lakshya.ai",
                password_hash=self.hashed_password,
                role="super_admin",
                is_active=True,
                is_suspended=True,
                suspended_reason="Policy violation",
                is_email_verified=True,
            )
            db_session.add(suspended_admin)
            db_session.commit()
            suspended_jwt = create_access_token({"sub": str(suspended_admin_id)})

            res = self.client.get(
                "/api/admin/dashboard",
                headers={"Authorization": f"Bearer {suspended_jwt}"},
            )
            self.assertEqual(res.status_code, 403)
            self.assertIn("suspended", res.text.lower())
        finally:
            db_session.close()

    # -------------------------------------------------------------------------
    # 3. SCHEMA MIGRATION STRATEGY & STARTUP DDL VERIFICATION
    # -------------------------------------------------------------------------

    def test_alembic_configuration_and_migration_files_exist(self):
        """
        Verify that alembic.ini and alembic/env.py are present, valid, and configured
        for reviewed migrations rather than running unsafe imperative DDL on startup.
        """
        backend_dir = Path(__file__).resolve().parent.parent.parent
        alembic_ini = backend_dir / "alembic.ini"
        alembic_env = backend_dir / "alembic" / "env.py"

        self.assertTrue(alembic_ini.exists(), "alembic.ini must exist")
        self.assertGreater(alembic_ini.stat().st_size, 0, "alembic.ini must not be empty")

        self.assertTrue(alembic_env.exists(), "alembic/env.py must exist")
        env_content = alembic_env.read_text(encoding="utf-8")
        self.assertIn("target_metadata", env_content)
        self.assertIn("DIRECT_URL", env_content)

    # -------------------------------------------------------------------------
    # 4. LATEX CONTAINER DEPENDENCIES
    # -------------------------------------------------------------------------

    def test_backend_dockerfile_contains_latex_packages(self):
        """
        Verify that the backend Dockerfile includes texlive-latex-base and
        texlive-fonts-recommended to support pdflatex resume compilation.
        """
        backend_dir = Path(__file__).resolve().parent.parent.parent
        dockerfile = backend_dir / "Dockerfile"
        self.assertTrue(dockerfile.exists(), "backend Dockerfile must exist")

        dockerfile_content = dockerfile.read_text(encoding="utf-8")
        self.assertIn("texlive-latex-base", dockerfile_content)
        self.assertIn("texlive-latex-recommended", dockerfile_content)
        self.assertIn("texlive-latex-extra", dockerfile_content)
        self.assertIn("texlive-fonts-recommended", dockerfile_content)


if __name__ == "__main__":
    unittest.main()
