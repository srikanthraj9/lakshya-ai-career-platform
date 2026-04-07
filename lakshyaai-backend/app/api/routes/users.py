from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_user
from app.db.schemas import UserResponse
from app.db import models

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user