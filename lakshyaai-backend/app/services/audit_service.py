import logging
from typing import Optional, Any, Dict
from uuid import UUID
from datetime import datetime, date
from sqlalchemy.orm import Session
from app.db import models

logger = logging.getLogger("lakshyaai.admin.audit")

SENSITIVE_KEYS = {"password", "token", "access_token", "jwt", "secret", "hash", "authorization", "embedding"}


def sanitize_metadata(data: Any) -> Any:
    if isinstance(data, dict):
        clean = {}
        for k, v in data.items():
            if any(s in k.lower() for s in SENSITIVE_KEYS):
                clean[k] = "[REDACTED]"
            else:
                clean[k] = sanitize_metadata(v)
        return clean
    elif isinstance(data, list):
        return [sanitize_metadata(item) for item in data]
    elif isinstance(data, (datetime, date)):
        return data.isoformat()
    elif isinstance(data, UUID):
        return str(data)
    return data


def compute_field_diff(before: Dict[str, Any], after: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    diff = {}
    all_keys = set(before.keys()).union(set(after.keys()))
    for k in all_keys:
        val_before = before.get(k)
        val_after = after.get(k)
        if val_before != val_after:
            diff[k] = {
                "before": sanitize_metadata(val_before),
                "after": sanitize_metadata(val_after),
            }
    return diff


class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        admin_user_id: Optional[UUID],
        action_type: str,
        target_user_id: Optional[UUID] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        metadata: Optional[dict] = None,
        before_data: Optional[dict] = None,
        after_data: Optional[dict] = None,
        diff: Optional[dict] = None,
        reason: Optional[str] = None,
        severity: str = "info",
        confirmation_value: Optional[str] = None,
        simulation_session_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None,
        commit: bool = True,
    ) -> models.AdminAuditLog:
        clean_meta = sanitize_metadata(metadata or {})
        clean_before = sanitize_metadata(before_data) if before_data else None
        clean_after = sanitize_metadata(after_data) if after_data else None
        clean_diff = diff or (compute_field_diff(before_data, after_data) if before_data and after_data else None)

        audit_entry = models.AdminAuditLog(
            admin_user_id=admin_user_id,
            action_type=action_type,
            target_user_id=target_user_id,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            action_metadata=clean_meta,
            before_data=clean_before,
            after_data=clean_after,
            diff=clean_diff,
            reason=reason,
            severity=severity,
            confirmation_value=confirmation_value,
            simulation_session_id=simulation_session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id,
        )
        db.add(audit_entry)
        if commit:
            db.commit()
            db.refresh(audit_entry)

        logger.info(
            f"Admin audit: [{severity.upper()}] {action_type} by admin {admin_user_id} "
            f"on {resource_type}:{resource_id} (reason: {reason or 'none'})"
        )
        return audit_entry
