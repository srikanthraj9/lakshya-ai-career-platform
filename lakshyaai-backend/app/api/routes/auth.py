import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db import models
from app.db.schemas import UserCreate, UserResponse, Token
from app.core.security import hash_password, verify_password, create_access_token


router = APIRouter(prefix="/auth", tags=["Auth"])
logger = logging.getLogger("lakshyaai.auth")


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _get_user_by_email(db: Session, email: str) -> models.User | None:
    normalized_email = _normalize_email(email)
    return db.query(models.User).filter(
        func.lower(models.User.email) == normalized_email
    ).first()


# ---------------------------------------------------
# REGISTER
# ---------------------------------------------------

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    normalized_email = _normalize_email(user.email)
    logger.info("Register attempt for email=%s", normalized_email)

    existing_user = _get_user_by_email(db, normalized_email)

    if existing_user:
        logger.info("Register blocked: existing user found for email=%s", normalized_email)
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    new_user = models.User(
        full_name=user.full_name,
        email=normalized_email,
        password_hash=hash_password(user.password),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info("Register success for email=%s user_id=%s", normalized_email, new_user.id)

    return new_user


# ---------------------------------------------------
# LOGIN (OAuth2 Password Flow)
# ---------------------------------------------------

@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    normalized_email = _normalize_email(form_data.username)
    logger.info("Login attempt for email=%s", normalized_email)

    db_user = _get_user_by_email(db, normalized_email)
    logger.info("Login user lookup email=%s found=%s", normalized_email, bool(db_user))

    password_matches = False
    if db_user:
        password_matches = verify_password(
            form_data.password,
            db_user.password_hash
        )
        logger.info("Login password verification email=%s matched=%s", normalized_email, password_matches)

    if not db_user or not password_matches:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )

    access_token = create_access_token(
        {"sub": str(db_user.id)}
    )

    logger.info("Login success email=%s user_id=%s", normalized_email, db_user.id)

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }
