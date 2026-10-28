import csv
import io
import logging
from datetime import datetime
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.db.database import get_db
from app.db import models, schemas
from app.core.permissions import require_admin, require_super_admin
from app.services.admin_service import (
    AdminService,
    BOOTSTRAP_ADMIN_EMAILS,
    is_bootstrap_admin,
    _SUPER_ADMIN_MUTATION_LOCK,
    get_active_super_admins_locked,
)
from app.services.platform_analytics_service import PlatformAnalyticsService
from app.services.feature_flag_service import FeatureFlagService, DEFAULT_FLAGS
from app.services.health_service import HealthService
from app.services.audit_service import AuditService, sanitize_metadata
from app.services.simulation_service import SimulationService
from app.services.admin_action_service import AdminActionService
from app.services.admin_table_registry import TABLE_REGISTRY, get_table_registry_entry

logger = logging.getLogger("lakshyaai.api.admin")
router = APIRouter(prefix="/admin", tags=["admin"])


# ==============================================================================
# DASHBOARD OVERVIEW
# ==============================================================================

@router.get("/dashboard", response_model=schemas.AdminDashboardStats)
def get_admin_dashboard(
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    AuditService.log_action(
        db=db,
        admin_user_id=admin.id,
        action_type="VIEW_ADMIN_DASHBOARD",
    )
    return PlatformAnalyticsService.get_dashboard_summary(db)


# ==============================================================================
# USER MANAGEMENT
# ==============================================================================

@router.get("/users", response_model=schemas.AdminUserListResponse)
def list_admin_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_suspended: Optional[bool] = None,
    sort_by: Optional[str] = Query("created_at", pattern="^(created_at|full_name|name|email|role|status|is_suspended|last_activity_at)$"),
    sort_order: Optional[str] = Query("desc", pattern="^(asc|desc)$"),
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdminService.list_users(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        role=role,
        is_suspended=is_suspended,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/users/{user_id}", response_model=schemas.AdminUserDetailResponse)
@router.get("/users/{user_id}/360", response_model=schemas.AdminUserDetailResponse)
def get_admin_user_detail(
    user_id: UUID,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user_detail = AdminService.get_user_detail(db, user_id)
    if not user_detail:
        raise HTTPException(status_code=404, detail="User not found")

    AuditService.log_action(
        db=db,
        admin_user_id=admin.id,
        action_type="USER_360_OPENED",
        target_user_id=user_id,
        resource_type="user",
        resource_id=str(user_id),
    )
    return user_detail


@router.get("/users/{user_id}/resumes", response_model=list[schemas.AdminUserResumeItem])
def get_admin_user_resumes(
    user_id: UUID,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdminService.get_user_resumes(db, user_id)


@router.get("/users/{user_id}/interviews", response_model=list[schemas.AdminUserInterviewItem])
def get_admin_user_interviews(
    user_id: UUID,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdminService.get_user_interviews(db, user_id)


@router.get("/users/{user_id}/applications", response_model=list[schemas.AdminUserApplicationItem])
def get_admin_user_applications(
    user_id: UUID,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdminService.get_user_applications(db, user_id)


@router.get("/users/{user_id}/copilot", response_model=list[schemas.AdminUserCopilotItem])
def get_admin_user_copilot(
    user_id: UUID,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdminService.get_user_copilot_sessions(db, user_id)


@router.get("/users/{user_id}/activity", response_model=list[schemas.AdminUserActivityItem])
def get_admin_user_activity(
    user_id: UUID,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdminService.get_user_activities(db, user_id)


@router.get("/users/{user_id}/audit", response_model=list[schemas.AdminAuditLogResponse])
def get_admin_user_audit(
    user_id: UUID,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdminService.get_user_audit_history(db, user_id)



@router.patch("/users/{user_id}")
def update_user_role(
    user_id: UUID,
    payload: schemas.AdminUserUpdateRequest,
    super_admin: models.User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.role:
        if payload.role not in ["user", "admin", "super_admin"]:
            raise HTTPException(status_code=400, detail="Invalid role specified")

    # Guard: Bootstrap administrator protection
    if is_bootstrap_admin(target.email):
        if payload.role is not None and payload.role != "super_admin":
            raise HTTPException(
                status_code=400,
                detail="Protected bootstrap administrator accounts cannot be demoted."
            )
        if payload.is_active is False:
            raise HTTPException(
                status_code=400,
                detail="Protected bootstrap administrator accounts cannot be deactivated."
            )
        if payload.is_email_verified is False:
            raise HTTPException(
                status_code=400,
                detail="Protected bootstrap administrator email verification cannot be revoked."
            )

    # Concurrency-safe last active super administrator check
    will_demote = target.role == "super_admin" and payload.role is not None and payload.role != "super_admin"
    will_deactivate = target.role == "super_admin" and payload.is_active is False

    if will_demote or will_deactivate:
        action_desc = "demote" if will_demote else "deactivate"
        with _SUPER_ADMIN_MUTATION_LOCK:
            active_super_admins = get_active_super_admins_locked(db)
            if len(active_super_admins) <= 1:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot {action_desc} the last active super administrator."
                )

            # Guard: Prevent self-deactivation when multiple super admins exist
            if super_admin.id == user_id and payload.is_active is False:
                raise HTTPException(
                    status_code=400,
                    detail="Administrators cannot deactivate their own account."
                )

            # Guard: Prevent self-demotion when multiple super admins exist
            if super_admin.id == user_id and payload.role is not None and payload.role != super_admin.role:
                raise HTTPException(
                    status_code=400,
                    detail="Administrators cannot demote their own administrative role."
                )

            if payload.role:
                target.role = payload.role
            if payload.is_active is not None:
                target.is_active = payload.is_active
            if payload.is_email_verified is not None:
                target.is_email_verified = payload.is_email_verified

            AuditService.log_action(
                db=db,
                admin_user_id=super_admin.id,
                action_type="UPDATE_USER_ROLE",
                target_user_id=target.id,
                resource_type="user",
                resource_id=str(target.id),
                metadata=payload.model_dump(exclude_none=True),
                commit=False,
            )
            db.commit()
            return {"message": "User updated successfully", "user_id": str(target.id), "role": target.role}

    # Guard: Prevent self-deactivation for non-super_admin targets
    if super_admin.id == user_id and payload.is_active is False:
        raise HTTPException(
            status_code=400,
            detail="Administrators cannot deactivate their own account."
        )

    # Guard: Prevent self-demotion for non-super_admin targets
    if super_admin.id == user_id and payload.role is not None and payload.role != super_admin.role:
        raise HTTPException(
            status_code=400,
            detail="Administrators cannot demote their own administrative role."
        )

    if payload.role:
        target.role = payload.role

    if payload.is_active is not None:
        target.is_active = payload.is_active

    if payload.is_email_verified is not None:
        target.is_email_verified = payload.is_email_verified

    AuditService.log_action(
        db=db,
        admin_user_id=super_admin.id,
        action_type="UPDATE_USER_ROLE",
        target_user_id=target.id,
        resource_type="user",
        resource_id=str(target.id),
        metadata=payload.model_dump(exclude_none=True),
        commit=False,
    )
    db.commit()
    return {"message": "User updated successfully", "user_id": str(target.id), "role": target.role}


@router.post("/users/{user_id}/suspend")
def suspend_user(
    user_id: UUID,
    payload: schemas.AdminUserSuspendRequest,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Guard: Bootstrap administrator protection
    if is_bootstrap_admin(target.email):
        raise HTTPException(
            status_code=400,
            detail="Protected bootstrap administrator accounts cannot be suspended."
        )

    if target.role == "super_admin":
        if admin.role != "super_admin":
            raise HTTPException(
                status_code=403,
                detail="Only super administrators can manage super administrator accounts."
            )

        with _SUPER_ADMIN_MUTATION_LOCK:
            active_super_admins = get_active_super_admins_locked(db)
            if len(active_super_admins) <= 1:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot suspend the last active super administrator."
                )

            # Guard: Prevent self-suspension
            if admin.id == user_id:
                raise HTTPException(
                    status_code=400,
                    detail="Administrators cannot suspend their own account."
                )

            user = AdminService.suspend_user(
                db=db,
                admin_user=admin,
                target_user_id=user_id,
                reason=payload.reason,
            )
            return {"message": "User suspended successfully", "user_id": str(user_id), "status": "suspended"}

    # Guard: Prevent self-suspension for non-super-admin accounts
    if admin.id == user_id:
        raise HTTPException(
            status_code=400,
            detail="Administrators cannot suspend their own account."
        )

    user = AdminService.suspend_user(
        db=db,
        admin_user=admin,
        target_user_id=user_id,
        reason=payload.reason,
    )
    return {"message": "User suspended successfully", "user_id": str(user_id), "status": "suspended"}


@router.post("/users/{user_id}/activate")
def activate_user(
    user_id: UUID,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = AdminService.activate_user(
        db=db,
        admin_user=admin,
        target_user_id=user_id,
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User activated successfully", "user_id": str(user_id), "status": "active"}


@router.post("/users/bulk-status", response_model=schemas.AdminUserBulkStatusResponse)
def bulk_update_user_status(
    payload: schemas.AdminUserBulkStatusRequest,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if payload.action not in ["suspend", "activate"]:
        raise HTTPException(status_code=400, detail="Action must be 'suspend' or 'activate'")

    return AdminService.bulk_update_user_status(
        db=db,
        admin_user=admin,
        user_ids=payload.user_ids,
        action=payload.action,
        reason=payload.reason,
    )


# ==============================================================================
# PLATFORM ANALYTICS & AI METRICS
# ==============================================================================

@router.get("/analytics", response_model=schemas.PlatformAnalyticsStats)
def get_platform_analytics(
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return PlatformAnalyticsService.get_platform_analytics(db)


@router.get("/ai/metrics", response_model=schemas.AIUsageStats)
def get_ai_metrics(
    time_range: Optional[str] = Query(None, regex="^(today|7d|30d|90d|all)$"),
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return PlatformAnalyticsService.get_ai_metrics(db, time_range=time_range)


@router.get("/system/health", response_model=schemas.SystemHealthResponse)
def get_system_health(
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return PlatformAnalyticsService.get_system_health(db)


# ==============================================================================
# OPERATIONAL ALERTS & INTELLIGENT ALERT CENTER
# ==============================================================================

@router.get("/alerts", response_model=schemas.OperationalAlertListResponse)
def list_operational_alerts(
    status: Optional[str] = Query(None, description="Filter by alert lifecycle status (open, acknowledged, resolved)"),
    severity: Optional[str] = Query(None, description="Filter by severity (critical, warning, info)"),
    source_service: Optional[str] = Query(None, description="Filter by source service"),
    search: Optional[str] = Query(None, description="Search alert title or description"),
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    from app.services.operational_alert_service import OperationalAlertService
    return OperationalAlertService.list_alerts(
        db=db,
        status_filter=status,
        severity_filter=severity,
        source_filter=source_service,
        search=search,
    )


@router.get("/alerts/summary", response_model=schemas.OperationalAlertSummaryResponse)
def get_operational_alerts_summary(
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    from app.services.operational_alert_service import OperationalAlertService
    return OperationalAlertService.get_alerts_summary(db)


@router.post("/alerts/{alert_id}/transition", response_model=schemas.OperationalAlertItem)
def transition_operational_alert(
    alert_id: str,
    payload: schemas.OperationalAlertTransitionRequest,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    from app.services.operational_alert_service import OperationalAlertService
    return OperationalAlertService.transition_alert(
        db=db,
        admin_user=admin,
        alert_id=alert_id,
        target_status=payload.status,
        resolution_notes=payload.resolution_notes,
    )


# ==============================================================================
# FEATURE FLAGS (SUPER ADMIN)
# ==============================================================================

@router.get("/feature-flags", response_model=list[schemas.FeatureFlagResponse])
def get_feature_flags(
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    flags = db.query(models.FeatureFlag).order_by(models.FeatureFlag.key.asc()).all()
    if not flags:
        FeatureFlagService.seed_default_flags(db)
        flags = db.query(models.FeatureFlag).order_by(models.FeatureFlag.key.asc()).all()
    return flags


@router.post("/feature-flags", response_model=schemas.FeatureFlagResponse)
def create_feature_flag(
    payload: schemas.FeatureFlagCreate,
    super_admin: models.User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    existing = db.query(models.FeatureFlag).filter(models.FeatureFlag.key == payload.key).first()
    if existing:
        raise HTTPException(status_code=400, detail="Feature flag key already exists")

    flag = models.FeatureFlag(
        key=payload.key,
        name=payload.name,
        description=payload.description,
        is_enabled=payload.is_enabled,
        target_roles=payload.target_roles,
    )
    db.add(flag)
    db.commit()
    db.refresh(flag)

    AuditService.log_action(
        db=db,
        admin_user_id=super_admin.id,
        action_type="CREATE_FEATURE_FLAG",
        resource_type="feature_flag",
        resource_id=flag.key,
        metadata={"name": flag.name, "is_enabled": flag.is_enabled},
    )
    return flag


@router.patch("/feature-flags/{flag_id}", response_model=schemas.FeatureFlagResponse)
def update_feature_flag(
    flag_id: UUID,
    payload: schemas.FeatureFlagUpdate,
    super_admin: models.User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    flag = db.query(models.FeatureFlag).filter(models.FeatureFlag.id == flag_id).first()
    if not flag:
        raise HTTPException(status_code=404, detail="Feature flag not found")

    if payload.name is not None:
        flag.name = payload.name
    if payload.description is not None:
        flag.description = payload.description
    if payload.is_enabled is not None:
        flag.is_enabled = payload.is_enabled
    if payload.target_roles is not None:
        flag.target_roles = payload.target_roles

    db.commit()
    db.refresh(flag)

    AuditService.log_action(
        db=db,
        admin_user_id=super_admin.id,
        action_type="UPDATE_FEATURE_FLAG",
        resource_type="feature_flag",
        resource_id=flag.key,
        metadata={"is_enabled": flag.is_enabled},
    )
    return flag


@router.delete("/feature-flags/{flag_id}")
def delete_feature_flag(
    flag_id: UUID,
    super_admin: models.User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    flag = db.query(models.FeatureFlag).filter(models.FeatureFlag.id == flag_id).first()
    if not flag:
        raise HTTPException(status_code=404, detail="Feature flag not found")

    # Protection: Protected system flags cannot be deleted
    default_keys = {f["key"] for f in DEFAULT_FLAGS}
    if flag.key in default_keys:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete system-critical feature flag '{flag.key}'. You may toggle it off instead.",
        )

    flag_key = flag.key
    flag_name = flag.name
    db.delete(flag)
    db.commit()

    AuditService.log_action(
        db=db,
        admin_user_id=super_admin.id,
        action_type="DELETE_FEATURE_FLAG",
        resource_type="feature_flag",
        resource_id=flag_key,
        metadata={"name": flag_name},
    )
    return {"message": "Feature flag deleted successfully", "flag_id": str(flag_id)}


# ==============================================================================
# PLATFORM ANNOUNCEMENTS
# ==============================================================================

@router.get("/announcements", response_model=list[schemas.PlatformAnnouncementResponse])
def get_admin_announcements(
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.query(models.PlatformAnnouncement).order_by(models.PlatformAnnouncement.created_at.desc()).all()


@router.post("/announcements", response_model=schemas.PlatformAnnouncementResponse)
def create_announcement(
    payload: schemas.PlatformAnnouncementCreate,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        ann = models.PlatformAnnouncement(
            title=payload.title,
            message=payload.message,
            type=payload.type,
            target_audience=payload.target_audience,
            is_active=payload.is_active,
            expires_at=payload.expires_at,
        )
        db.add(ann)
        db.flush()

        AuditService.log_action(
            db=db,
            admin_user_id=admin.id,
            action_type="CREATE_ANNOUNCEMENT",
            resource_type="announcement",
            resource_id=str(ann.id),
            metadata={"title": ann.title, "type": ann.type},
            commit=False,
        )
        db.commit()
        db.refresh(ann)
        return ann
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create announcement: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to create announcement and record audit log. Operation rolled back."
        )


@router.delete("/announcements/{announcement_id}")
def delete_announcement(
    announcement_id: UUID,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ann = db.query(models.PlatformAnnouncement).filter(models.PlatformAnnouncement.id == announcement_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")

    try:
        db.delete(ann)
        AuditService.log_action(
            db=db,
            admin_user_id=admin.id,
            action_type="DELETE_ANNOUNCEMENT",
            resource_type="announcement",
            resource_id=str(announcement_id),
            metadata={"title": ann.title, "type": ann.type},
            commit=False,
        )
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete announcement {announcement_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete announcement and record audit log. Operation rolled back."
        )

    return {"message": "Announcement deleted successfully"}


@router.patch("/announcements/{announcement_id}", response_model=schemas.PlatformAnnouncementResponse)
def update_announcement(
    announcement_id: UUID,
    payload: schemas.PlatformAnnouncementUpdate,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ann = db.query(models.PlatformAnnouncement).filter(models.PlatformAnnouncement.id == announcement_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")

    try:
        if payload.title is not None:
            ann.title = payload.title
        if payload.message is not None:
            ann.message = payload.message
        if payload.type is not None:
            ann.type = payload.type
        if payload.target_audience is not None:
            ann.target_audience = payload.target_audience
        if payload.is_active is not None:
            ann.is_active = payload.is_active
        if payload.expires_at is not None:
            ann.expires_at = payload.expires_at

        AuditService.log_action(
            db=db,
            admin_user_id=admin.id,
            action_type="UPDATE_ANNOUNCEMENT",
            resource_type="announcement",
            resource_id=str(ann.id),
            metadata={"title": ann.title, "is_active": ann.is_active},
            commit=False,
        )
        db.commit()
        db.refresh(ann)
        return ann
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update announcement {announcement_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to update announcement and record audit log. Operation rolled back."
        )


# ==============================================================================
# AUDIT LOGS (IMMUTABLE)
# ==============================================================================

def _sanitize_csv_cell(val: object) -> str:
    if val is None:
        return ""
    s = str(val).strip()
    if s.startswith(("=", "+", "-", "@", "\t", "\r")):
        return f"'{s}"
    return s


def _build_audit_query(
    db: Session,
    action_type: Optional[str] = None,
    target_user_id: Optional[UUID] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="Start date cannot be after end date.")

    query = db.query(models.AdminAuditLog)
    if action_type:
        query = query.filter(models.AdminAuditLog.action_type == action_type)
    if target_user_id:
        query = query.filter(models.AdminAuditLog.target_user_id == target_user_id)
    if resource_type:
        query = query.filter(models.AdminAuditLog.resource_type == resource_type)
    if resource_id:
        query = query.filter(models.AdminAuditLog.resource_id == resource_id)
    if severity:
        query = query.filter(models.AdminAuditLog.severity == severity)
    if start_date:
        query = query.filter(models.AdminAuditLog.created_at >= start_date)
    if end_date:
        query = query.filter(models.AdminAuditLog.created_at <= end_date)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.AdminAuditLog.action_type.ilike(term),
                models.AdminAuditLog.resource_type.ilike(term),
                models.AdminAuditLog.resource_id.ilike(term),
                models.AdminAuditLog.reason.ilike(term),
            )
        )
    return query


@router.get("/audit", response_model=schemas.AdminAuditLogListResponse)
def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    action_type: Optional[str] = None,
    target_user_id: Optional[UUID] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = _build_audit_query(
        db=db,
        action_type=action_type,
        target_user_id=target_user_id,
        resource_type=resource_type,
        resource_id=resource_id,
        severity=severity,
        search=search,
        start_date=start_date,
        end_date=end_date,
    )

    total = query.count()
    total_pages = max(1, (total + page_size - 1) // page_size) if total > 0 else 1

    offset = (page - 1) * page_size
    records = (
        query.order_by(
            models.AdminAuditLog.created_at.desc(),
            models.AdminAuditLog.id.desc(),
        )
        .offset(offset)
        .limit(page_size)
        .all()
    )

    # Resolve actor emails and target emails efficiently in a single query
    admin_ids = {r.admin_user_id for r in records if r.admin_user_id}
    target_ids = {r.target_user_id for r in records if r.target_user_id}
    all_user_ids = admin_ids | target_ids

    user_map = {}
    if all_user_ids:
        users = db.query(models.User.id, models.User.email).filter(models.User.id.in_(all_user_ids)).all()
        user_map = {u.id: u.email for u in users}

    items = []
    for r in records:
        admin_email = user_map.get(r.admin_user_id)
        target_email = user_map.get(r.target_user_id)
        item = schemas.AdminAuditLogResponse(
            id=r.id,
            admin_user_id=r.admin_user_id,
            admin_email=admin_email,
            action_type=r.action_type,
            target_user_id=r.target_user_id,
            target_email=target_email,
            resource_type=r.resource_type,
            resource_id=r.resource_id,
            action_metadata=sanitize_metadata(r.action_metadata or {}),
            before_data=sanitize_metadata(r.before_data) if r.before_data else None,
            after_data=sanitize_metadata(r.after_data) if r.after_data else None,
            diff=sanitize_metadata(r.diff) if r.diff else None,
            reason=r.reason,
            severity=r.severity or "info",
            confirmation_value=r.confirmation_value,
            simulation_session_id=r.simulation_session_id,
            ip_address=r.ip_address,
            user_agent=r.user_agent,
            request_id=r.request_id,
            created_at=r.created_at,
        )
        items.append(item)

    return schemas.AdminAuditLogListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/audit/export")
def export_audit_logs(
    action_type: Optional[str] = None,
    target_user_id: Optional[UUID] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = Query(5000, ge=1, le=10000),
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Export filtered audit logs as sanitized CSV.
    Guarantees spreadsheet formula injection protection.
    """
    query = _build_audit_query(
        db=db,
        action_type=action_type,
        target_user_id=target_user_id,
        resource_type=resource_type,
        resource_id=resource_id,
        severity=severity,
        search=search,
        start_date=start_date,
        end_date=end_date,
    )

    records = (
        query.order_by(
            models.AdminAuditLog.created_at.desc(),
            models.AdminAuditLog.id.desc(),
        )
        .limit(limit)
        .all()
    )

    admin_ids = {r.admin_user_id for r in records if r.admin_user_id}
    target_ids = {r.target_user_id for r in records if r.target_user_id}
    all_user_ids = admin_ids | target_ids

    user_map = {}
    if all_user_ids:
        users = db.query(models.User.id, models.User.email).filter(models.User.id.in_(all_user_ids)).all()
        user_map = {u.id: u.email for u in users}

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

    # Header
    writer.writerow([
        "Log ID",
        "Timestamp (UTC)",
        "Action Type",
        "Severity",
        "Actor Email",
        "Actor User ID",
        "Target Email",
        "Target User ID",
        "Resource Type",
        "Resource ID",
        "Reason",
        "IP Address",
        "User Agent",
    ])

    for r in records:
        writer.writerow([
            _sanitize_csv_cell(r.id),
            _sanitize_csv_cell(r.created_at.isoformat() if r.created_at else ""),
            _sanitize_csv_cell(r.action_type),
            _sanitize_csv_cell(r.severity or "info"),
            _sanitize_csv_cell(user_map.get(r.admin_user_id, "")),
            _sanitize_csv_cell(r.admin_user_id or ""),
            _sanitize_csv_cell(user_map.get(r.target_user_id, "")),
            _sanitize_csv_cell(r.target_user_id or ""),
            _sanitize_csv_cell(r.resource_type or ""),
            _sanitize_csv_cell(r.resource_id or ""),
            _sanitize_csv_cell(r.reason or ""),
            _sanitize_csv_cell(r.ip_address or ""),
            _sanitize_csv_cell(r.user_agent or ""),
        ])

    csv_data = output.getvalue()
    timestamp_str = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"lakshya_audit_export_{timestamp_str}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Cache-Control": "no-store",
        },
    )


# ==============================================================================
# VIEW-AS SIMULATION SESSIONS (SUPER ADMIN ONLY)
# ==============================================================================

@router.post("/simulation/start", response_model=schemas.AdminSimulationSessionResponse)
def start_simulation_session(
    payload: schemas.AdminSimulationStartRequest,
    super_admin: models.User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    session_record, raw_token = SimulationService.start_simulation(
        db=db,
        admin_user=super_admin,
        target_user_id=payload.target_user_id,
        reason=payload.reason or "Admin diagnostic investigation",
        duration_minutes=payload.duration_minutes,
    )
    target = db.query(models.User).filter(models.User.id == payload.target_user_id).first()
    return schemas.AdminSimulationSessionResponse(
        id=session_record.id,
        admin_user_id=session_record.admin_user_id,
        target_user_id=session_record.target_user_id,
        token=raw_token,
        is_active=session_record.is_active,
        expires_at=session_record.expires_at,
        created_at=session_record.created_at,
        ended_at=session_record.ended_at,
        ended_reason=session_record.ended_reason,
        target_user_email=target.email if target else None,
        target_user_name=target.full_name if target else None,
    )


@router.post("/simulation/end")
def end_simulation_session(
    super_admin: models.User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    stopped = SimulationService.stop_simulation(
        db=db,
        admin_user=super_admin,
        reason="Super admin manually ended simulation",
    )
    return {"message": "Simulation ended", "stopped": stopped}


@router.get("/simulation/active", response_model=Optional[schemas.AdminSimulationSessionResponse])
def get_active_simulation_session(
    super_admin: models.User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    active_session = db.query(models.AdminSimulationSession).filter(
        models.AdminSimulationSession.admin_user_id == super_admin.id,
        models.AdminSimulationSession.is_active == True,
    ).first()
    if not active_session:
        return None

    target = db.query(models.User).filter(models.User.id == active_session.target_user_id).first()
    return schemas.AdminSimulationSessionResponse(
        id=active_session.id,
        admin_user_id=active_session.admin_user_id,
        target_user_id=active_session.target_user_id,
        token=None,  # Do not re-expose raw token
        is_active=active_session.is_active,
        expires_at=active_session.expires_at,
        created_at=active_session.created_at,
        ended_at=active_session.ended_at,
        ended_reason=active_session.ended_reason,
        target_user_email=target.email if target else None,
        target_user_name=target.full_name if target else None,
    )


# ==============================================================================
# CONTROLLED DATABASE EXPLORER (SUPER ADMIN ONLY)
# ==============================================================================

@router.get("/database/tables")
def list_database_tables(
    super_admin: models.User = Depends(require_super_admin),
):
    """
    Returns registered table definitions, categorized models, readable/masked/editable field policies,
    and foreign-key relationship mappings.
    """
    tables = []
    for name, reg in TABLE_REGISTRY.items():
        tables.append({
            "table_name": name,
            "category": reg.get("category", "core"),
            "description": f"Entity mapping for {name}",
            "is_destructive_allowed": reg.get("delete_policy") != "disallowed",
            "requires_confirmation_to_delete": reg.get("delete_policy") == "typed_confirmation_required",
            "readable_fields": reg.get("readable_fields", []),
            "masked_fields": reg.get("masked_fields", []),
            "editable_fields": reg.get("editable_fields", []),
            "immutable_fields": reg.get("immutable_fields", []),
            "relationships": reg.get("relationships", {}),
        })
    return tables


@router.get("/database/tables/{table_name}")
def query_database_table(
    table_name: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    order_by: Optional[str] = None,
    order_direction: str = Query("desc", pattern="^(asc|desc)$"),
    filter_field: Optional[str] = None,
    filter_value: Optional[str] = None,
    super_admin: models.User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """
    Safely queries a registered table with pagination, field masking, search filtering,
    and relationship/foreign-key navigation.
    """
    reg = get_table_registry_entry(table_name)
    if not reg:
        raise HTTPException(status_code=404, detail=f"Table '{table_name}' is not in the authorized admin registry")

    model = reg["model"]
    query = db.query(model)

    readable_fields = reg.get("readable_fields", [])
    masked_fields = reg.get("masked_fields", [])

    # Exact foreign key / field filtering
    if filter_field:
        if filter_field not in readable_fields:
            raise HTTPException(
                status_code=400,
                detail=f"Filter field '{filter_field}' is not an authorized readable column for table '{table_name}'",
            )
        if hasattr(model, filter_field) and filter_value is not None:
            col = getattr(model, filter_field)
            val: Any = filter_value
            try:
                from sqlalchemy.dialects.postgresql import UUID as PgUUID
                if hasattr(col.type, "as_uuid") or isinstance(col.type, PgUUID) or "UUID" in str(col.type):
                    val = UUID(str(filter_value))
            except Exception:
                pass
            query = query.filter(col == val)

    # Search across string columns if provided
    if search:
        search_filter = []
        for col_name in readable_fields:
            if hasattr(model, col_name):
                col = getattr(model, col_name)
                # Check if column is string type
                if hasattr(col.type, "python_type") and col.type.python_type is str:
                    search_filter.append(col.ilike(f"%{search}%"))
        if search_filter:
            from sqlalchemy import or_
            query = query.filter(or_(*search_filter))

    total = query.count()

    # Ordering
    if order_by and hasattr(model, order_by) and order_by in readable_fields:
        col = getattr(model, order_by)
        query = query.order_by(col.desc() if order_direction == "desc" else col.asc())
    elif hasattr(model, "created_at"):
        query = query.order_by(model.created_at.desc())

    offset = (page - 1) * page_size
    records_raw = query.offset(offset).limit(page_size).all()

    # Serialize and mask sensitive fields
    records_clean = []
    for r in records_raw:
        row_dict = {}
        for field in readable_fields:
            if hasattr(r, field):
                val = getattr(r, field)
                if field in masked_fields:
                    row_dict[field] = "[MASKED_SECURITY_FIELD]"
                elif isinstance(val, (datetime,)):
                    row_dict[field] = val.isoformat()
                elif isinstance(val, UUID):
                    row_dict[field] = str(val)
                else:
                    row_dict[field] = val
        records_clean.append(row_dict)

    total_pages = max(1, (total + page_size - 1) // page_size)
    return {
        "table_name": table_name,
        "category": reg.get("category", "core"),
        "total_records": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "records": records_clean,
        "schema_info": {
            "columns": readable_fields,
            "masked_columns": masked_fields,
            "editable_columns": reg.get("editable_fields", []),
            "immutable_columns": reg.get("immutable_fields", []),
            "relationships": reg.get("relationships", {}),
        },
    }


@router.patch("/database/tables/{table_name}/{record_id}")
def mutate_database_record(
    table_name: str,
    record_id: str,
    payload: schemas.AdminTableMutationRequest,
    super_admin: models.User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """
    Atomically mutates whitelisted fields of a record and writes snapshot diff to audit log.
    """
    return AdminActionService.mutate_record(
        db=db,
        admin_user=super_admin,
        table_name=table_name,
        record_id=record_id,
        updates=payload.updates,
        reason=payload.reason,
    )


@router.delete("/database/tables/{table_name}/{record_id}")
def delete_database_record(
    table_name: str,
    record_id: str,
    payload: schemas.AdminTableDeleteRequest,
    super_admin: models.User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """
    Safely deletes a record if destructive operations are allowed for this table.
    """
    return AdminActionService.delete_record(
        db=db,
        admin_user=super_admin,
        table_name=table_name,
        record_id=record_id,
        reason=payload.reason,
        confirmation_value=payload.confirmation_value,
    )


