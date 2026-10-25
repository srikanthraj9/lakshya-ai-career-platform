import secrets
import hashlib
import logging
from typing import Optional, Dict, Any, Tuple
from uuid import UUID
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.db import models
from app.services.audit_service import AuditService

logger = logging.getLogger("lakshyaai.admin.simulation")


def hash_simulation_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class SimulationContext:
    def __init__(
        self,
        actor: models.User,
        subject: models.User,
        session_id: UUID,
        read_only: bool = True,
    ):
        self.actor = actor
        self.subject = subject
        self.session_id = session_id
        self.read_only = read_only


class SimulationService:
    @staticmethod
    def start_simulation(
        db: Session,
        admin_user: models.User,
        target_user_id: UUID,
        reason: str = "Admin diagnostic investigation",
        duration_minutes: int = 30,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tuple[models.AdminSimulationSession, str]:
        # 1. Verify target user exists
        target_user = db.query(models.User).filter(models.User.id == target_user_id).first()
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target candidate for simulation not found."
            )

        # 2. Deactivate any prior active sessions for this admin
        db.query(models.AdminSimulationSession).filter(
            models.AdminSimulationSession.admin_user_id == admin_user.id,
            models.AdminSimulationSession.is_active == True,
        ).update(
            {"is_active": False, "ended_at": datetime.now(timezone.utc), "ended_reason": "Superceded by new session"},
            synchronize_session=False,
        )

        # 3. Generate secure opaque token and hash
        raw_token = f"sim_{secrets.token_urlsafe(32)}"
        token_hash = hash_simulation_token(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=duration_minutes)

        session_record = models.AdminSimulationSession(
            admin_user_id=admin_user.id,
            target_user_id=target_user.id,
            token_hash=token_hash,
            is_active=True,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.add(session_record)

        # 4. Write audit log
        AuditService.log_action(
            db=db,
            admin_user_id=admin_user.id,
            action_type="SIMULATION_START",
            target_user_id=target_user.id,
            resource_type="user",
            resource_id=str(target_user.id),
            reason=reason,
            severity="warning",
            metadata={"expires_at": expires_at.isoformat(), "duration_minutes": duration_minutes},
            ip_address=ip_address,
            user_agent=user_agent,
            commit=False,
        )

        db.commit()
        db.refresh(session_record)

        logger.info(
            f"Simulation session started: Admin {admin_user.id} viewing as Target {target_user.id} until {expires_at}"
        )
        return session_record, raw_token

    @staticmethod
    def validate_simulation_token(
        db: Session,
        admin_user: models.User,
        raw_token: str,
    ) -> SimulationContext:
        token_hash = hash_simulation_token(raw_token)
        now = datetime.now(timezone.utc)

        session_record = db.query(models.AdminSimulationSession).filter(
            models.AdminSimulationSession.token_hash == token_hash,
            models.AdminSimulationSession.admin_user_id == admin_user.id,
            models.AdminSimulationSession.is_active == True,
        ).first()

        if not session_record:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid or expired simulation session token."
            )

        expires_at = session_record.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < now:
            session_record.is_active = False
            session_record.ended_at = now
            session_record.ended_reason = "Expired"
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Simulation session has expired."
            )

        # Update last used timestamp
        session_record.last_used_at = now
        db.commit()

        target_user = db.query(models.User).filter(models.User.id == session_record.target_user_id).first()
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Simulated target user no longer exists."
            )

        return SimulationContext(
            actor=admin_user,
            subject=target_user,
            session_id=session_record.id,
            read_only=True,
        )

    @staticmethod
    def stop_simulation(
        db: Session,
        admin_user: models.User,
        raw_token: Optional[str] = None,
        reason: str = "Admin manually exited simulation",
        ip_address: Optional[str] = None,
    ) -> bool:
        now = datetime.now(timezone.utc)
        query = db.query(models.AdminSimulationSession).filter(
            models.AdminSimulationSession.admin_user_id == admin_user.id,
            models.AdminSimulationSession.is_active == True,
        )
        if raw_token:
            token_hash = hash_simulation_token(raw_token)
            query = query.filter(models.AdminSimulationSession.token_hash == token_hash)

        sessions = query.all()
        if not sessions:
            return False

        for s in sessions:
            s.is_active = False
            s.ended_at = now
            s.ended_reason = reason

            AuditService.log_action(
                db=db,
                admin_user_id=admin_user.id,
                action_type="SIMULATION_STOP",
                target_user_id=s.target_user_id,
                resource_type="user",
                resource_id=str(s.target_user_id),
                reason=reason,
                severity="info",
                ip_address=ip_address,
                commit=False,
            )

        db.commit()
        return True
