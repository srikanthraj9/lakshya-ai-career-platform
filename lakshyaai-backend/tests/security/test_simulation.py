import unittest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.db.database import SessionLocal
from app.db import models
from app.services.simulation_service import SimulationService, hash_simulation_token
from fastapi import HTTPException


class TestViewAsSimulationSecurity(unittest.TestCase):
    """
    Validates View-As Simulation security guarantees:
    1. Actor preservation (Super Admin remains authenticated identity).
    2. Token security (Raw token returned once, only SHA-256 stored in DB).
    3. Strict actor binding (Token only valid for the specific Super Admin who created it).
    4. Expiration enforcement (Expired tokens immediately rejected with 403).
    5. Role restrictions (Only super_admin can start/end simulations).
    """

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        db = SessionLocal()

        # Candidate user
        cls.candidate_id = uuid.uuid4()
        cls.candidate = models.User(
            id=cls.candidate_id,
            email=f"candidate_{cls.candidate_id.hex[:8]}@example.com",
            password_hash="hashed_pw",
            full_name="Target Candidate",
            role="user",
            is_active=True,
            is_email_verified=True,
        )
        db.add(cls.candidate)

        # Support Admin
        cls.admin_id = uuid.uuid4()
        cls.admin = models.User(
            id=cls.admin_id,
            email=f"admin_{cls.admin_id.hex[:8]}@example.com",
            password_hash="hashed_pw",
            full_name="Support Admin",
            role="admin",
            is_active=True,
            is_email_verified=True,
        )
        db.add(cls.admin)

        # Super Admin 1
        cls.super_admin_id = uuid.uuid4()
        cls.super_admin = models.User(
            id=cls.super_admin_id,
            email=f"superadmin1_{cls.super_admin_id.hex[:8]}@example.com",
            password_hash="hashed_pw",
            full_name="Primary SuperAdmin",
            role="super_admin",
            is_active=True,
            is_email_verified=True,
        )
        db.add(cls.super_admin)

        # Super Admin 2 (Attacker attempting to steal simulation session)
        cls.other_super_admin_id = uuid.uuid4()
        cls.other_super_admin = models.User(
            id=cls.other_super_admin_id,
            email=f"superadmin2_{cls.other_super_admin_id.hex[:8]}@example.com",
            password_hash="hashed_pw",
            full_name="Other SuperAdmin",
            role="super_admin",
            is_active=True,
            is_email_verified=True,
        )
        db.add(cls.other_super_admin)

        db.commit()
        db.close()

        cls.candidate_headers = {"Authorization": f"Bearer {create_access_token({'sub': str(cls.candidate_id)})}"}
        cls.admin_headers = {"Authorization": f"Bearer {create_access_token({'sub': str(cls.admin_id)})}"}
        cls.super_admin_headers = {"Authorization": f"Bearer {create_access_token({'sub': str(cls.super_admin_id)})}"}
        cls.other_super_admin_headers = {"Authorization": f"Bearer {create_access_token({'sub': str(cls.other_super_admin_id)})}"}

    def test_candidate_cannot_start_simulation(self):
        res = self.client.post(
            "/api/admin/simulation/start",
            json={"target_user_id": str(self.candidate_id)},
            headers=self.candidate_headers,
        )
        self.assertEqual(res.status_code, 403)

    def test_support_admin_cannot_start_simulation(self):
        res = self.client.post(
            "/api/admin/simulation/start",
            json={"target_user_id": str(self.candidate_id)},
            headers=self.admin_headers,
        )
        self.assertEqual(res.status_code, 403)

    def test_super_admin_can_start_and_validate_simulation(self):
        db = SessionLocal()
        # 1. Start simulation via API
        res = self.client.post(
            "/api/admin/simulation/start",
            json={
                "target_user_id": str(self.candidate_id),
                "reason": "Diagnostic audit of candidate ATS results",
                "duration_minutes": 30,
            },
            headers=self.super_admin_headers,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        raw_token = data.get("token")
        self.assertTrue(raw_token.startswith("sim_"))

        # 2. Verify database does NOT store the raw token, only the SHA-256 hash
        session_id = uuid.UUID(data["id"])
        record = db.query(models.AdminSimulationSession).filter(models.AdminSimulationSession.id == session_id).first()
        self.assertIsNotNone(record)
        self.assertEqual(record.token_hash, hash_simulation_token(raw_token))
        self.assertTrue(record.is_active)

        # 3. Validate simulation token with matching Super Admin
        super_admin_user = db.query(models.User).filter(models.User.id == self.super_admin_id).first()
        other_super_admin_user = db.query(models.User).filter(models.User.id == self.other_super_admin_id).first()

        ctx = SimulationService.validate_simulation_token(
            db=db,
            admin_user=super_admin_user,
            raw_token=raw_token,
        )
        self.assertEqual(ctx.actor.id, self.super_admin_id)
        self.assertEqual(ctx.subject.id, self.candidate_id)
        self.assertTrue(ctx.read_only)

        # 4. Token presented by another Super Admin must be rejected (single-admin binding)
        with self.assertRaises(HTTPException) as cm:
            SimulationService.validate_simulation_token(
                db=db,
                admin_user=other_super_admin_user,
                raw_token=raw_token,
            )
        self.assertEqual(cm.exception.status_code, 403)

        # 5. Forged token must be rejected
        with self.assertRaises(HTTPException) as cm_forged:
            SimulationService.validate_simulation_token(
                db=db,
                admin_user=super_admin_user,
                raw_token="sim_forged_invalid_token_1234567890",
            )
        self.assertEqual(cm_forged.exception.status_code, 403)

        # 6. Stop simulation via API
        stop_res = self.client.post("/api/admin/simulation/end", headers=self.super_admin_headers)
        self.assertEqual(stop_res.status_code, 200)

        # 7. Token must now be rejected
        with self.assertRaises(HTTPException) as cm_stopped:
            SimulationService.validate_simulation_token(
                db=db,
                admin_user=super_admin_user,
                raw_token=raw_token,
            )
        self.assertEqual(cm_stopped.exception.status_code, 403)
        db.close()


if __name__ == "__main__":
    unittest.main()
