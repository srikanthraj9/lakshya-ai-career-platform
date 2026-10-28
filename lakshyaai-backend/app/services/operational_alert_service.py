import logging
import os
import time
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any, Set
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, text
from app.db import models, schemas
from app.services.audit_service import AuditService, sanitize_metadata

logger = logging.getLogger("lakshyaai.alerts")


def _to_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensures consistent offset-aware UTC datetimes for cross-database comparison."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class OperationalAlertService:
    """
    Intelligent Platform Operational Alert Engine.
    Detects incidents across System Health, AI Telemetry, Authentication, and Governance,
    and reconciles lifecycle states (open -> acknowledged -> resolved) backed by immutable audit logs.
    """

    @classmethod
    def detect_operational_alerts(cls, db: Session) -> List[schemas.OperationalAlertItem]:
        alerts: List[schemas.OperationalAlertItem] = []
        now = datetime.now(timezone.utc)

        # ----------------------------------------------------------------------
        # 1. SYSTEM HEALTH & INFRASTRUCTURE INCIDENTS
        # ----------------------------------------------------------------------
        # A. Database Connectivity & Latency Check
        db_healthy = True
        db_latency_ms = 0.0
        try:
            t0 = time.perf_counter()
            db.execute(text("SELECT 1"))
            db_latency_ms = round((time.perf_counter() - t0) * 1000, 2)
            if db_latency_ms > 1500:
                alerts.append(schemas.OperationalAlertItem(
                    id="health:database:latency_spike",
                    alert_type="SERVICE_DEGRADATION",
                    severity="warning",
                    title="Database Latency Spike Detected",
                    description=f"PostgreSQL response latency elevated at {db_latency_ms}ms (threshold 1500ms).",
                    source_service="database",
                    created_at=now,
                    updated_at=now,
                    related_resource_type="service",
                    related_resource_id="database",
                    metadata={"latency_ms": db_latency_ms},
                ))
        except Exception as exc:
            db_healthy = False
            # M-3 Remediation: Classify error into safe operator diagnostics without leaking credentials or internal strings
            err_str = str(exc).lower()
            if "timeout" in err_str or "timed out" in err_str:
                diag_category = "connection_timeout"
                safe_desc = "Database ping timed out; connection pool may be exhausted or server unresponsive."
            elif "refused" in err_str or "closed" in err_str or "could not connect" in err_str:
                diag_category = "connection_refused"
                safe_desc = "Database connection refused; relational service endpoint unreachable."
            elif "password" in err_str or "authentication" in err_str:
                diag_category = "authentication_failed"
                safe_desc = "Database credentials rejected during connection handshake."
            else:
                diag_category = "database_unavailable"
                safe_desc = "Database ping failed; relational data and vector stores are currently unreachable."

            safe_metadata = sanitize_metadata({
                "diagnostic_category": diag_category,
                "exception_type": type(exc).__name__,
                "probe_target": "relational_primary",
            })

            alerts.append(schemas.OperationalAlertItem(
                id="health:database:failure",
                alert_type="SERVICE_HEALTH_FAILURE",
                severity="critical",
                title="PostgreSQL / PgVector Connection Failure",
                description=safe_desc,
                source_service="database",
                created_at=now,
                updated_at=now,
                related_resource_type="service",
                related_resource_id="database",
                metadata=safe_metadata,
            ))

        # B. AI Key Availability
        has_ai_key = any([
            os.getenv("GEMINI_API_KEY"),
            os.getenv("GOOGLE_API_KEY"),
            os.getenv("GROQ_API_KEY"),
            os.getenv("OPENAI_API_KEY"),
        ])
        if not has_ai_key:
            alerts.append(schemas.OperationalAlertItem(
                id="health:ai_service:missing_keys",
                alert_type="SERVICE_DEGRADATION",
                severity="warning",
                title="AI Inference Provider Keys Missing",
                description="No active LLM API keys detected in server environment; AI recommendations will fall back to local heuristics.",
                source_service="ai_service",
                created_at=now,
                updated_at=now,
                related_resource_type="service",
                related_resource_id="ai_service",
                metadata={"providers_checked": ["gemini", "groq", "openai"]},
            ))

        # C. Storage Availability
        storage_configured = os.path.exists("uploads") or bool(os.getenv("SUPABASE_URL"))
        if not storage_configured:
            alerts.append(schemas.OperationalAlertItem(
                id="health:storage:unconfigured",
                alert_type="SERVICE_DEGRADATION",
                severity="warning",
                title="Document Storage Engine Not Configured",
                description="Local uploads directory and cloud storage endpoints are missing or unmounted.",
                source_service="storage",
                created_at=now,
                updated_at=now,
                related_resource_type="service",
                related_resource_id="storage",
                metadata={},
            ))

        # ----------------------------------------------------------------------
        # 2. REPEATED AI REQUEST FAILURES (TELEMETRY)
        # ----------------------------------------------------------------------
        try:
            window_start = now - timedelta(hours=24)
            failed_telemetry = (
                db.query(
                    models.AIRequestTelemetry.provider,
                    models.AIRequestTelemetry.error_category,
                    func.count(models.AIRequestTelemetry.id).label("fail_count"),
                    func.max(models.AIRequestTelemetry.timestamp).label("last_failure_at"),
                )
                .filter(
                    models.AIRequestTelemetry.status == "failure",
                    models.AIRequestTelemetry.timestamp >= window_start,
                )
                .group_by(
                    models.AIRequestTelemetry.provider,
                    models.AIRequestTelemetry.error_category,
                )
                .all()
            )

            for provider, error_cat, fail_count, last_failure_at in failed_telemetry:
                if fail_count >= 3:
                    is_critical = error_cat in ("server_error_5xx", "rate_limit_429", "timeout")
                    last_failure_dt = _to_utc(last_failure_at) or now
                    alerts.append(schemas.OperationalAlertItem(
                        id=f"ai:burst:{provider}:{error_cat}",
                        alert_type="AI_PROVIDER_ERROR_BURST",
                        severity="critical" if is_critical else "warning",
                        title=f"Repeated AI Errors: {error_cat} ({provider})",
                        description=f"{fail_count} AI inference requests failed under category '{error_cat}' with provider '{provider}' in the last 24h.",
                        source_service="ai_service",
                        created_at=last_failure_dt,
                        updated_at=now,
                        related_resource_type="ai_telemetry",
                        related_resource_id=f"{provider}:{error_cat}",
                        metadata={
                            "provider": provider,
                            "error_category": error_cat,
                            "fail_count": fail_count,
                            "last_failure_at": last_failure_dt.isoformat(),
                        },
                    ))
        except Exception as exc:
            logger.warning("Failed to query AI telemetry for alerts: %s", exc)

        # ----------------------------------------------------------------------
        # 3. AUTHENTICATION & SECURITY ANOMALIES (H-2 Remediation)
        # ----------------------------------------------------------------------
        # Anomaly Detection Policy:
        # A historical suspended account does not automatically cause a permanent security anomaly.
        # An anomaly is detected when there is an active burst of account suspensions:
        # >= 3 suspension events within a 24-hour rolling window.
        # Source signals:
        #   1. AdminAuditLog entries with action_type == 'SUSPEND_USER' / 'BULK_SUSPEND_USER' in the last 24h.
        #   2. User records with is_suspended == True and updated_at in the last 24h.
        # Historical accounts (>24h) and accounts with missing/unreliable timestamps do not trigger false alarms.
        try:
            window_24h = now - timedelta(hours=24)

            audit_suspension_count = (
                db.query(func.count(models.AdminAuditLog.id))
                .filter(
                    models.AdminAuditLog.action_type.in_(["SUSPEND_USER", "BULK_SUSPEND_USER"]),
                    models.AdminAuditLog.created_at >= window_24h,
                )
                .scalar()
                or 0
            )

            recent_user_suspensions = (
                db.query(func.count(models.User.id))
                .filter(
                    models.User.is_suspended == True,
                    models.User.updated_at.isnot(None),
                    models.User.updated_at >= window_24h,
                )
                .scalar()
                or 0
            )

            suspension_burst_count = max(audit_suspension_count, recent_user_suspensions)
            SUSPENSION_BURST_THRESHOLD = 3

            if suspension_burst_count >= SUSPENSION_BURST_THRESHOLD:
                is_critical = suspension_burst_count >= 10
                alerts.append(schemas.OperationalAlertItem(
                    id="auth:anomaly:suspended_accounts",
                    alert_type="AUTH_SECURITY_ANOMALY",
                    severity="critical" if is_critical else "warning",
                    title=f"Suspicious Account Suspension Burst ({suspension_burst_count} in 24h)",
                    description=(
                        f"{suspension_burst_count} account suspensions detected within the last 24 hours "
                        f"(threshold: {SUSPENSION_BURST_THRESHOLD}), indicating potential credential stuffing, "
                        f"policy violations, or security countermeasures."
                    ),
                    source_service="authentication",
                    created_at=now,
                    updated_at=now,
                    related_resource_type="users",
                    related_resource_id="suspended_users",
                    metadata={
                        "recent_suspensions_24h": suspension_burst_count,
                        "threshold": SUSPENSION_BURST_THRESHOLD,
                        "window_hours": 24,
                    },
                ))
        except Exception as exc:
            logger.warning("Failed to query users/audit logs for auth alerts: %s", exc)

        # ----------------------------------------------------------------------
        # 4. SIGNIFICANT GOVERNANCE & AUDIT EVENTS
        # ----------------------------------------------------------------------
        try:
            audit_window = now - timedelta(hours=24)
            # Query genuine critical operational & governance alerts requiring operational attention.
            # Routine user self-service events (e.g., verified self-service privacy deletion) are compliance events,
            # not system failures or operational degradation incidents.
            critical_audits = (
                db.query(models.AdminAuditLog)
                .filter(
                    models.AdminAuditLog.severity == "critical",
                    models.AdminAuditLog.action_type != "SELF_SERVICE_ACCOUNT_DELETION",
                    models.AdminAuditLog.created_at >= audit_window,
                )
                .order_by(models.AdminAuditLog.created_at.desc())
                .limit(5)
                .all()
            )

            for ca in critical_audits:
                alerts.append(schemas.OperationalAlertItem(
                    id=f"gov:audit:{ca.id}",
                    alert_type="GOVERNANCE_CRITICAL_EVENT",
                    severity="critical",
                    title=f"Critical Governance Action: {ca.action_type}",
                    description=f"Action '{ca.action_type}' recorded on {ca.resource_type or 'system'}:{ca.resource_id or 'all'}. Reason: {ca.reason or 'None provided'}",
                    source_service="governance",
                    created_at=ca.created_at,
                    updated_at=ca.created_at,
                    related_resource_type="admin_audit_log",
                    related_resource_id=str(ca.id),
                    metadata={"action_type": ca.action_type, "reason": ca.reason},
                ))
        except Exception as exc:
            logger.warning("Failed to query audit logs for governance alerts: %s", exc)

        # ----------------------------------------------------------------------
        # 5. RECONCILE LIFECYCLE STATES FROM ADMIN AUDIT TRAIL (H-1 Remediation)
        # ----------------------------------------------------------------------
        cls._reconcile_alert_lifecycle(db, alerts)

        return alerts

    @classmethod
    def _reconcile_alert_lifecycle(cls, db: Session, alerts: List[schemas.OperationalAlertItem]) -> None:
        """
        Reconciles operational alerts against persistent lifecycle transition audit records.
        Distinguishes newly detected occurrences from previously resolved occurrences (H-1).
        Preserves resolved incidents whose underlying conditions are no longer active.
        """
        try:
            now = datetime.now(timezone.utc)
            window_start = now - timedelta(hours=24)

            # Query all operational alert transitions from the last 24h
            logs = (
                db.query(models.AdminAuditLog)
                .filter(
                    models.AdminAuditLog.resource_type == "operational_alert",
                    models.AdminAuditLog.action_type.in_(["ALERT_ACKNOWLEDGED", "ALERT_RESOLVED"]),
                    models.AdminAuditLog.created_at >= window_start,
                )
                .order_by(models.AdminAuditLog.created_at.desc())
                .all()
            )

            # Map alert_id -> latest transition log
            latest_by_alert: Dict[str, models.AdminAuditLog] = {}
            for log in logs:
                if log.resource_id not in latest_by_alert:
                    latest_by_alert[log.resource_id] = log

            # Fetch admin emails for attribution
            admin_ids = {l.admin_user_id for l in logs if l.admin_user_id}
            admin_emails: Dict[UUID, str] = {}
            if admin_ids:
                admins = db.query(models.User.id, models.User.email).filter(models.User.id.in_(admin_ids)).all()
                admin_emails = {a.id: a.email for a in admins}

            # Reconcile currently active alerts
            for alert in alerts:
                if alert.id in latest_by_alert:
                    transition_log = latest_by_alert[alert.id]
                    admin_email = admin_emails.get(transition_log.admin_user_id, "Admin")
                    log_time = _to_utc(transition_log.created_at)

                    if transition_log.action_type == "ALERT_RESOLVED":
                        # Check whether this active alert represents a NEW occurrence after resolution
                        last_event_ts = alert.metadata.get("last_failure_at")
                        if last_event_ts:
                            try:
                                event_time = _to_utc(datetime.fromisoformat(last_event_ts))
                            except Exception:
                                event_time = _to_utc(alert.created_at)
                        else:
                            event_time = _to_utc(alert.created_at)

                        # If the failure event occurred strictly after the resolution log, this is a new occurrence
                        if event_time and log_time and event_time > log_time:
                            alert.status = "open"
                        else:
                            # The failure event occurred before or at resolution: it remains resolved
                            alert.status = "resolved"
                            alert.resolved_at = transition_log.created_at
                            alert.resolved_by_admin_email = admin_email
                            alert.resolution_notes = transition_log.reason
                            alert.updated_at = transition_log.created_at

                    elif transition_log.action_type == "ALERT_ACKNOWLEDGED":
                        alert.status = "acknowledged"
                        alert.acknowledged_at = transition_log.created_at
                        alert.acknowledged_by_admin_email = admin_email
                        alert.resolution_notes = transition_log.reason
                        alert.updated_at = transition_log.created_at

            # Preserve resolved incidents whose underlying conditions are no longer active
            active_alert_ids: Set[str] = {a.id for a in alerts}
            seen_resolved_ids: Set[str] = set()

            for log in logs:
                if log.action_type == "ALERT_RESOLVED" and log.resource_id not in seen_resolved_ids:
                    seen_resolved_ids.add(log.resource_id)
                    log_time = _to_utc(log.created_at)

                    # If an active alert with this base ID exists, check if it's already marked resolved
                    existing_active = next((a for a in alerts if a.id == log.resource_id), None)
                    if existing_active and existing_active.status == "resolved":
                        continue

                    # If existing active alert is open/acknowledged (new recurrence), assign unique historical ID
                    if existing_active:
                        hist_ts = int(log_time.timestamp()) if log_time else int(time.time())
                        resolved_id = f"{log.resource_id}:resolved:{hist_ts}"
                    else:
                        resolved_id = log.resource_id

                    meta = log.action_metadata or {}
                    inc_created = None
                    if meta.get("incident_created_at"):
                        try:
                            inc_created = datetime.fromisoformat(meta["incident_created_at"])
                        except Exception:
                            inc_created = log.created_at
                    else:
                        inc_created = log.created_at

                    resolved_item = schemas.OperationalAlertItem(
                        id=resolved_id,
                        alert_type=meta.get("alert_type", "SERVICE_DEGRADATION"),
                        severity=meta.get("severity", "warning"),
                        title=meta.get("alert_title", f"Resolved Incident: {log.resource_id}"),
                        description=meta.get("alert_description", f"Incident was resolved: {log.reason or 'Normal operations restored'}"),
                        source_service=meta.get("source_service", "system"),
                        status="resolved",
                        created_at=inc_created,
                        updated_at=log.created_at,
                        resolved_at=log.created_at,
                        resolved_by_admin_email=admin_emails.get(log.admin_user_id, "Admin"),
                        resolution_notes=log.reason,
                        related_resource_type=meta.get("related_resource_type"),
                        related_resource_id=meta.get("related_resource_id"),
                        metadata=meta.get("original_metadata", {}),
                    )
                    alerts.append(resolved_item)

        except Exception as exc:
            logger.warning("Failed to reconcile alert lifecycle: %s", exc)

    @classmethod
    def list_alerts(
        cls,
        db: Session,
        *,
        status_filter: Optional[str] = None,
        severity_filter: Optional[str] = None,
        source_filter: Optional[str] = None,
        search: Optional[str] = None,
    ) -> schemas.OperationalAlertListResponse:
        all_alerts = cls.detect_operational_alerts(db)

        # Count metrics across all detected alerts
        open_count = sum(1 for a in all_alerts if a.status == "open")
        ack_count = sum(1 for a in all_alerts if a.status == "acknowledged")
        res_count = sum(1 for a in all_alerts if a.status == "resolved")
        crit_count = sum(1 for a in all_alerts if a.severity == "critical")
        warn_count = sum(1 for a in all_alerts if a.severity == "warning")
        info_count = sum(1 for a in all_alerts if a.severity == "info")

        filtered = all_alerts

        if status_filter:
            filtered = [a for a in filtered if a.status.lower() == status_filter.lower()]

        if severity_filter:
            filtered = [a for a in filtered if a.severity.lower() == severity_filter.lower()]

        if source_filter:
            filtered = [a for a in filtered if a.source_service.lower() == source_filter.lower()]

        if search:
            q = search.lower().strip()
            filtered = [
                a for a in filtered
                if q in a.title.lower() or q in a.description.lower() or q in a.id.lower() or q in (a.resolution_notes or "").lower()
            ]

        # Sort: Open first, then by severity (critical > warning > info), then by updated_at desc
        severity_order = {"critical": 0, "warning": 1, "info": 2}
        status_order = {"open": 0, "acknowledged": 1, "resolved": 2}

        filtered.sort(
            key=lambda x: (
                status_order.get(x.status, 9),
                severity_order.get(x.severity, 9),
                -x.updated_at.timestamp() if x.updated_at else 0,
            )
        )

        return schemas.OperationalAlertListResponse(
            items=filtered,
            total=len(filtered),
            open_count=open_count,
            acknowledged_count=ack_count,
            resolved_count=res_count,
            critical_count=crit_count,
            warning_count=warn_count,
            info_count=info_count,
            last_refreshed_at=datetime.now(timezone.utc),
        )

    @classmethod
    def get_alerts_summary(cls, db: Session) -> schemas.OperationalAlertSummaryResponse:
        all_alerts = cls.detect_operational_alerts(db)

        open_count = sum(1 for a in all_alerts if a.status == "open")
        ack_count = sum(1 for a in all_alerts if a.status == "acknowledged")
        res_count = sum(1 for a in all_alerts if a.status == "resolved")
        crit_count = sum(1 for a in all_alerts if a.severity == "critical")
        warn_count = sum(1 for a in all_alerts if a.severity == "warning")
        info_count = sum(1 for a in all_alerts if a.severity == "info")

        # Top unresolved alerts
        unresolved = [a for a in all_alerts if a.status in ("open", "acknowledged")]
        severity_order = {"critical": 0, "warning": 1, "info": 2}
        unresolved.sort(key=lambda x: (severity_order.get(x.severity, 9), -x.updated_at.timestamp()))

        return schemas.OperationalAlertSummaryResponse(
            open_count=open_count,
            acknowledged_count=ack_count,
            resolved_count=res_count,
            critical_count=crit_count,
            warning_count=warn_count,
            info_count=info_count,
            unresolved_alerts=unresolved[:5],
            last_refreshed_at=datetime.now(timezone.utc),
        )

    @classmethod
    def transition_alert(
        cls,
        db: Session,
        admin_user: models.User,
        alert_id: str,
        target_status: str,
        resolution_notes: Optional[str] = None,
    ) -> schemas.OperationalAlertItem:
        """
        Transitions an alert's lifecycle status to 'acknowledged' or 'resolved'
        and permanently records the event in the governance audit trail.
        Enforces strict state machine transition validation (M-2) and resolution note requirements (M-1).
        """
        from fastapi import HTTPException

        if target_status not in ("acknowledged", "resolved"):
            raise HTTPException(status_code=400, detail="Invalid target status. Must be 'acknowledged' or 'resolved'.")

        all_alerts = cls.detect_operational_alerts(db)
        target_alert = next((a for a in all_alerts if a.id == alert_id), None)

        if not target_alert:
            raise HTTPException(status_code=404, detail=f"Alert with ID '{alert_id}' not found.")

        current_status = target_alert.status

        # M-2 Remediation: State machine transition guards
        if current_status == target_status:
            raise HTTPException(
                status_code=400,
                detail=f"Alert is already in '{current_status}' status. Duplicate transition rejected.",
            )

        if current_status == "resolved" and target_status in ("acknowledged", "open"):
            raise HTTPException(
                status_code=400,
                detail="Cannot transition a resolved alert back to 'acknowledged'. Resolved alerts cannot be reopened through acknowledgement.",
            )

        if current_status not in ("open", "acknowledged"):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid transition from '{current_status}' to '{target_status}'.",
            )

        # M-1 Remediation: Enforce non-empty resolution notes when resolving
        if target_status == "resolved":
            if not resolution_notes or not resolution_notes.strip():
                raise HTTPException(
                    status_code=400,
                    detail="Resolution notes are required when resolving an alert.",
                )

        trimmed_notes = resolution_notes.strip() if resolution_notes else None
        action_type = "ALERT_RESOLVED" if target_status == "resolved" else "ALERT_ACKNOWLEDGED"

        # Record audit log before updating local state
        AuditService.log_action(
            db=db,
            admin_user_id=admin_user.id,
            action_type=action_type,
            resource_type="operational_alert",
            resource_id=alert_id,
            reason=trimmed_notes,
            severity="info",
            metadata={
                "alert_title": target_alert.title,
                "alert_type": target_alert.alert_type,
                "alert_description": target_alert.description,
                "source_service": target_alert.source_service,
                "severity": target_alert.severity,
                "previous_status": current_status,
                "new_status": target_status,
                "admin_email": admin_user.email,
                "incident_created_at": target_alert.created_at.isoformat() if target_alert.created_at else None,
                "original_metadata": target_alert.metadata,
                "related_resource_type": target_alert.related_resource_type,
                "related_resource_id": target_alert.related_resource_id,
            },
        )

        now = datetime.now(timezone.utc)
        target_alert.status = target_status
        target_alert.updated_at = now
        target_alert.resolution_notes = trimmed_notes

        if target_status == "resolved":
            target_alert.resolved_at = now
            target_alert.resolved_by_admin_email = admin_user.email
        elif target_status == "acknowledged":
            target_alert.acknowledged_at = now
            target_alert.acknowledged_by_admin_email = admin_user.email

        return target_alert
