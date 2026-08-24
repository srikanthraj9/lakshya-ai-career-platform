import logging
from datetime import datetime
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.db import models, schemas
from app.core.permissions import require_admin, require_super_admin
from app.services.admin_service import AdminService
from app.services.platform_analytics_service import PlatformAnalyticsService
from app.services.feature_flag_service import FeatureFlagService
from app.services.audit_service import AuditService
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
        target.role = payload.role

    if payload.is_active is not None:
        target.is_active = payload.is_active

    if payload.is_email_verified is not None:
        target.is_email_verified = payload.is_email_verified

    db.commit()
    AuditService.log_action(
        db=db,
        admin_user_id=super_admin.id,
        action_type="UPDATE_USER_ROLE",
        target_user_id=target.id,
        resource_type="user",
        resource_id=str(target.id),
        metadata=payload.model_dump(exclude_none=True),
    )
    return {"message": "User updated successfully", "user_id": str(target.id), "role": target.role}


@router.post("/users/{user_id}/suspend")
def suspend_user(
    user_id: UUID,
    payload: schemas.AdminUserSuspendRequest,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = AdminService.suspend_user(
        db=db,
        admin_user=admin,
        target_user_id=user_id,
        reason=payload.reason,
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

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
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return PlatformAnalyticsService.get_ai_metrics(db)


@router.get("/system/health", response_model=schemas.SystemHealthResponse)
def get_system_health(
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return PlatformAnalyticsService.get_system_health(db)


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
    ann = models.PlatformAnnouncement(
        title=payload.title,
        message=payload.message,
        type=payload.type,
        target_audience=payload.target_audience,
        is_active=payload.is_active,
        expires_at=payload.expires_at,
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)

    AuditService.log_action(
        db=db,
        admin_user_id=admin.id,
        action_type="CREATE_ANNOUNCEMENT",
        resource_type="announcement",
        resource_id=str(ann.id),
        metadata={"title": ann.title, "type": ann.type},
    )
    return ann


@router.delete("/announcements/{announcement_id}")
def delete_announcement(
    announcement_id: UUID,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ann = db.query(models.PlatformAnnouncement).filter(models.PlatformAnnouncement.id == announcement_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")

    db.delete(ann)
    db.commit()

    AuditService.log_action(
        db=db,
        admin_user_id=admin.id,
        action_type="DELETE_ANNOUNCEMENT",
        resource_type="announcement",
        resource_id=str(announcement_id),
    )
    return {"message": "Announcement deleted successfully"}


# ==============================================================================
# AUDIT LOGS (IMMUTABLE)
# ==============================================================================

@router.get("/audit", response_model=list[schemas.AdminAuditLogResponse])
def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    action_type: Optional[str] = None,
    target_user_id: Optional[UUID] = None,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(models.AdminAuditLog)
    if action_type:
        query = query.filter(models.AdminAuditLog.action_type == action_type)
    if target_user_id:
        query = query.filter(models.AdminAuditLog.target_user_id == target_user_id)

    offset = (page - 1) * page_size
    return query.order_by(models.AdminAuditLog.created_at.desc()).offset(offset).limit(page_size).all()


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
    Returns registered table definitions, categorized models, readable/masked/editable field policies.
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
    super_admin: models.User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """
    Safely queries a registered table with pagination, field masking, and search filtering.
    """
    reg = get_table_registry_entry(table_name)
    if not reg:
        raise HTTPException(status_code=404, detail=f"Table '{table_name}' is not in the authorized admin registry")

    model = reg["model"]
    query = db.query(model)

    readable_fields = reg.get("readable_fields", [])
    masked_fields = reg.get("masked_fields", [])

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


