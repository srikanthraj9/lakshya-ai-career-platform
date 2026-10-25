from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import models
from app.core.security import SECRET_KEY, ALGORITHM
from app.services.simulation_service import SimulationService

import uuid as uuid_pkg

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    request: Request = None,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")

        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Verify valid UUID format
        try:
            valid_uuid = uuid_pkg.UUID(str(user_id))
        except (ValueError, TypeError):
            raise HTTPException(status_code=401, detail="Invalid token")

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(models.User).filter(models.User.id == valid_uuid).first()

    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    if getattr(user, "is_suspended", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Please contact support.",
        )

    if not getattr(user, "is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact support.",
        )

    # Check for X-Simulation-Token header in request
    sim_token = None
    if request is not None and hasattr(request, "headers"):
        sim_token = request.headers.get("X-Simulation-Token")

    if sim_token:
        if getattr(user, "role", "user") != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Super administrator privileges required for simulation mode.",
            )

        sim_context = SimulationService.validate_simulation_token(
            db=db,
            admin_user=user,
            raw_token=sim_token,
        )

        if hasattr(request, "state"):
            request.state.actor = user
            request.state.actor_id = user.id
            request.state.subject = sim_context.subject
            request.state.is_simulation = True

        return sim_context.subject

    return user


oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_optional_current_user(
    token: str = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db),
) -> Optional[models.User]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            return None
        valid_uuid = uuid_pkg.UUID(str(user_id))
        user = db.query(models.User).filter(models.User.id == valid_uuid).first()
        if not user or getattr(user, "is_suspended", False) or not getattr(user, "is_active", True):
            return None
        return user
    except (JWTError, ValueError, TypeError):
        return None