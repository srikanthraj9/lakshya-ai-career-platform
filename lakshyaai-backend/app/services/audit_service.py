import logging
import re
from typing import Optional, Any, Dict
from uuid import UUID
from datetime import datetime, date, timezone
from sqlalchemy.orm import Session
from app.db import models

logger = logging.getLogger("lakshyaai.admin.audit")

SENSITIVE_KEYS = {
    "password",
    "passwd",
    "pwd",
    "token",
    "access_token",
    "refresh_token",
    "jwt",
    "secret",
    "hash",
    "authorization",
    "auth",
    "api_key",
    "apikey",
    "credential",
    "credentials",
    "private_key",
    "privatekey",
    "cookie",
    "session_id",
    "conn_str",
    "connection_string",
    "database_url",
    "db_url",
    "smtp",
    "embedding",
    "bearer",
    "salt",
    "access_key",
    "client_secret",
    "clientsecret",
    "app_secret",
    "signing_key",
    "passphrase",
    "webhook_secret",
}

_BEARER_OR_JWT_RE = re.compile(r"\b(?:Bearer\s+)?[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]*\b", re.IGNORECASE)
_API_KEY_RE = re.compile(r"\b(gsk_|sk-|sk-proj-|key-|ak-)[A-Za-z0-9_-]{16,}\b", re.IGNORECASE)
_CONN_STR_RE = re.compile(r"(postgres|postgresql|mysql|mongodb|redis|amqp)://([^:]+):([^@\s/]+)@", re.IGNORECASE)
_URI_PASSWORD_RE = re.compile(r"(?i)\b(password|passwd|pwd|secret)=([^\s&;]+)")


def sanitize_metadata(data: Any, depth: int = 0) -> Any:
    if depth > 10:
        return "[MAX_DEPTH_REACHED]"

    if data is None:
        return None

    if isinstance(data, dict):
        clean = {}
        for k, v in data.items():
            k_str = str(k).lower()
            if any(s in k_str for s in SENSITIVE_KEYS):
                clean[k] = "[REDACTED]"
            else:
                clean[k] = sanitize_metadata(v, depth + 1)
        return clean
    elif isinstance(data, list):
        return [sanitize_metadata(item, depth + 1) for item in data]
    elif isinstance(data, str):
        val = data
        if len(val) > 4096:
            val = val[:4096] + "... [TRUNCATED]"

        val_lower = val.lower()
        if "begin" in val_lower and "private key" in val_lower:
            return "[REDACTED_PRIVATE_KEY]"

        if _CONN_STR_RE.search(val):
            val = _CONN_STR_RE.sub(r"\1://[REDACTED_CREDENTIALS]@", val)

        if _URI_PASSWORD_RE.search(val):
            val = _URI_PASSWORD_RE.sub(r"\1=[REDACTED]", val)

        if _API_KEY_RE.search(val):
            val = _API_KEY_RE.sub("[REDACTED_API_KEY]", val)

        if _BEARER_OR_JWT_RE.search(val):
            val = _BEARER_OR_JWT_RE.sub("[REDACTED_TOKEN]", val)

        return val
    elif isinstance(data, (datetime, date)):
        return data.isoformat()
    elif isinstance(data, UUID):
        return str(data)
    elif isinstance(data, (int, float, bool)):
        return data
    return data


def compute_field_diff(before: Optional[Dict[str, Any]], after: Optional[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    if not isinstance(before, dict) or not isinstance(after, dict):
        return {}
    diff = {}
    all_keys = set(before.keys()).union(set(after.keys()))
    for k in all_keys:
        val_before = before.get(k)
        val_after = after.get(k)
        if val_before != val_after:
            k_str = str(k).lower()
            if any(s in k_str for s in SENSITIVE_KEYS):
                diff[k] = {
                    "before": "[REDACTED]",
                    "after": "[REDACTED]",
                }
            else:
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
        clean_diff = sanitize_metadata(diff) if diff else (
            compute_field_diff(before_data, after_data) if isinstance(before_data, dict) and isinstance(after_data, dict) else None
        )

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
            created_at=datetime.now(timezone.utc),
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
