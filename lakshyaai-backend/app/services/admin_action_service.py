import logging
from typing import Dict, Any, Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.db import models
from app.services.admin_table_registry import TABLE_REGISTRY, serialize_record
from app.services.audit_service import AuditService, compute_field_diff, sanitize_metadata
from app.services.admin_service import (
    BOOTSTRAP_ADMIN_EMAILS,
    is_bootstrap_admin,
    _SUPER_ADMIN_MUTATION_LOCK,
    get_active_super_admins_locked,
)

logger = logging.getLogger("lakshyaai.admin.action")


class AdminActionService:
    """
    Mandatory atomic gateway for all administrative mutations.
    Guarantees validation, before/after snapshots, diff computation,
    and synchronous audit logging in a single database transaction.
    """

    @staticmethod
    def mutate_record(
        db: Session,
        admin_user: models.User,
        table_name: str,
        record_id: str,
        updates: Dict[str, Any],
        reason: str,
        confirmation_value: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        table_config = TABLE_REGISTRY.get(table_name)
        if not table_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Table '{table_name}' is not a registered administrative resource."
            )

        model_cls = table_config["model"]
        editable_fields = set(table_config.get("editable_fields", []))
        immutable_fields = set(table_config.get("immutable_fields", []))

        # Validate that updates only target allowed editable fields
        for field in updates.keys():
            if field in immutable_fields or field not in editable_fields:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Field '{field}' is immutable or not permitted for administrative modification."
                )

        # Parse primary key
        try:
            parsed_id = UUID(record_id) if "id" in table_config.get("primary_key", "id") else record_id
        except ValueError:
            parsed_id = record_id

        record = db.query(model_cls).filter(getattr(model_cls, table_config.get("primary_key", "id")) == parsed_id).first()
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Record '{record_id}' not found in table '{table_name}'."
            )

        # Safeguards for users table
        if table_name == "users":
            is_self = str(record.id) == str(admin_user.id)
            is_target_super_admin = getattr(record, "role", "") == "super_admin"
            is_target_bootstrap = is_bootstrap_admin(getattr(record, "email", ""))

            # 1. Bootstrap administrator protection
            if is_target_bootstrap:
                if updates.get("is_active") is False:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Protected bootstrap administrator accounts cannot be deactivated."
                    )
                if updates.get("is_suspended") is True:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Protected bootstrap administrator accounts cannot be suspended."
                    )
                if "role" in updates and updates["role"] != "super_admin":
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Protected bootstrap administrator accounts cannot be demoted."
                    )
                if updates.get("is_email_verified") is False:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Protected bootstrap administrator email verification cannot be revoked."
                    )

            # 2. Check self-deactivation or self-suspension
            if is_self:
                if updates.get("is_active") is False:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Administrators cannot deactivate their own account."
                    )
                if updates.get("is_suspended") is True:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Administrators cannot suspend their own account."
                    )
                if "role" in updates and updates["role"] != getattr(admin_user, "role", ""):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Administrators cannot demote their own administrative role."
                    )

        def _apply_mutation():
            # 1. Capture BEFORE snapshot
            before_snapshot = serialize_record(record, table_name)

            try:
                # 2. Apply field mutations
                for field, val in updates.items():
                    setattr(record, field, val)

                db.flush()

                # 3. Capture AFTER snapshot & compute diff
                after_snapshot = serialize_record(record, table_name)
                diff = compute_field_diff(before_snapshot, after_snapshot)

                # Determine target user if applicable
                target_user_id = getattr(record, "user_id", None)
                if not target_user_id and table_name == "users":
                    target_user_id = record.id

                # 4. Write synchronous Audit Log in the SAME transaction
                audit_entry = AuditService.log_action(
                    db=db,
                    admin_user_id=admin_user.id,
                    action_type=f"DATABASE_MUTATION_{table_name.upper()}",
                    target_user_id=target_user_id,
                    resource_type=table_name,
                    resource_id=str(record_id),
                    before_data=before_snapshot,
                    after_data=after_snapshot,
                    diff=diff,
                    reason=reason,
                    severity="warning",
                    confirmation_value=confirmation_value,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    commit=False,  # Keep part of current transaction
                )

                # 5. Commit atomic transaction
                db.commit()
                db.refresh(record)
                db.refresh(audit_entry)

                return {
                    "table_name": table_name,
                    "record_id": str(record_id),
                    "diff": diff,
                    "reason": reason,
                    "audit_log_id": audit_entry.id,
                    "updated_record": after_snapshot,
                }

            except HTTPException:
                db.rollback()
                raise
            except Exception as e:
                db.rollback()
                clean_err = sanitize_metadata(str(e))
                logger.error(f"Failed administrative mutation on {table_name}:{record_id}. Rolled back. Error: {clean_err}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Administrative mutation failed and was safely rolled back: {clean_err}"
                )

        # 3. Check last active super admin demotion/deactivation/suspension with full lock hold
        if table_name == "users" and is_target_super_admin:
            will_deactivate = updates.get("is_active") is False
            will_suspend = updates.get("is_suspended") is True
            will_demote = "role" in updates and updates["role"] != "super_admin"

            if will_deactivate or will_suspend or will_demote:
                action_desc = "demote" if will_demote else ("deactivate" if will_deactivate else "suspend")
                with _SUPER_ADMIN_MUTATION_LOCK:
                    active_super_admins = get_active_super_admins_locked(db)
                    if len(active_super_admins) <= 1:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Cannot {action_desc} the last active super administrator."
                        )
                    return _apply_mutation()

        return _apply_mutation()

    @staticmethod
    def delete_record(
        db: Session,
        admin_user: models.User,
        table_name: str,
        record_id: str,
        confirmation_value: str,
        reason: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        table_config = TABLE_REGISTRY.get(table_name)
        if not table_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Table '{table_name}' is not registered."
            )

        delete_policy = table_config.get("delete_policy", "disallowed")
        if delete_policy == "disallowed":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Deletion is disallowed on table '{table_name}' by security policy."
            )

        model_cls = table_config["model"]
        try:
            parsed_id = UUID(record_id) if "id" in table_config.get("primary_key", "id") else record_id
        except ValueError:
            parsed_id = record_id

        record = db.query(model_cls).filter(getattr(model_cls, table_config.get("primary_key", "id")) == parsed_id).first()
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Record '{record_id}' not found in table '{table_name}'."
            )

        # Safeguards for users table
        if table_name == "users":
            # 1. Prevent self-deletion
            if str(record.id) == str(admin_user.id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Administrators cannot delete their own account via Database Explorer."
                )

            # 2. Prevent deleting bootstrap admin
            if is_bootstrap_admin(getattr(record, "email", "")):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Protected bootstrap administrator accounts cannot be deleted."
                )

        # Enforce typed confirmation
        expected_confirmation = f"DELETE {record_id}"
        if table_name == "users" and hasattr(record, "email"):
            expected_confirmation = f"DELETE {record.email}"

        if delete_policy == "typed_confirmation_required":
            if confirmation_value != expected_confirmation:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid confirmation. Please type exactly '{expected_confirmation}' to confirm."
                )

        def _apply_delete() -> Dict[str, Any]:
            before_snapshot = serialize_record(record, table_name)
            target_user_id = getattr(record, "user_id", None)
            if not target_user_id and table_name == "users":
                target_user_id = record.id

            try:
                db.delete(record)

                audit_entry = AuditService.log_action(
                    db=db,
                    admin_user_id=admin_user.id,
                    action_type=f"DATABASE_DELETE_{table_name.upper()}",
                    target_user_id=target_user_id,
                    resource_type=table_name,
                    resource_id=str(record_id),
                    before_data=before_snapshot,
                    after_data=None,
                    diff={"status": {"before": "active", "after": "DELETED"}},
                    reason=reason,
                    severity="critical",
                    confirmation_value=confirmation_value,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    commit=False,
                )

                db.commit()
                return {
                    "message": f"Record '{record_id}' permanently deleted from '{table_name}'.",
                    "audit_log_id": audit_entry.id,
                }
            except HTTPException:
                db.rollback()
                raise
            except Exception as e:
                db.rollback()
                clean_err = sanitize_metadata(str(e))
                logger.error(f"Failed administrative delete on {table_name}:{record_id}. Rolled back: {clean_err}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Deletion failed and was safely rolled back: {clean_err}"
                )

        # 3. Prevent deleting the last active super admin with full lock hold through commit
        if table_name == "users" and getattr(record, "role", "") == "super_admin":
            with _SUPER_ADMIN_MUTATION_LOCK:
                active_super_admins = get_active_super_admins_locked(db)
                if len(active_super_admins) <= 1:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot delete the last active super administrator."
                    )
                return _apply_delete()

        return _apply_delete()
