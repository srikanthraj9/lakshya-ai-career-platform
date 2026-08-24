from fastapi import Depends, HTTPException, Header, Request, status
from sqlalchemy.orm import Session
from typing import Optional
from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.services.simulation_service import SimulationService, SimulationContext


def require_authenticated_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if getattr(current_user, "is_suspended", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Please contact support."
        )
    return current_user


def require_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if getattr(current_user, "is_suspended", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended."
        )

    user_role = getattr(current_user, "role", "user")
    if user_role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required."
        )
    return current_user


def require_super_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if getattr(current_user, "is_suspended", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended."
        )

    user_role = getattr(current_user, "role", "user")
    if user_role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super administrator access required."
        )
    return current_user


def get_simulation_context(
    request: Request,
    x_simulation_token: Optional[str] = Header(None, alias="X-Simulation-Token"),
    super_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
) -> SimulationContext:
    """
    Validates server-managed simulation session.
    Enforces strict read-only mode by rejecting any mutating HTTP verb.
    """
    if not x_simulation_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing X-Simulation-Token header for simulation mode."
        )

    if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mutations blocked: simulation mode is strictly read-only."
        )

    return SimulationService.validate_simulation_token(
        db=db,
        admin_user=super_admin,
        raw_token=x_simulation_token,
    )
