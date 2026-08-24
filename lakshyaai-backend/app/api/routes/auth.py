
import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db import models
from app.db.schemas import (
    RegisterResponse,
    ResendVerificationRequest,
    Token,
    UserCreate,
    VerifyEmailRequest,
)
from app.core.security import hash_password, verify_password, create_access_token
from app.core.config import settings
from app.services.email import send_verification_email


router = APIRouter(prefix="/auth", tags=["Auth"])
logger = logging.getLogger("lakshyaai.auth")

VERIFICATION_TOKEN_EXPIRE_HOURS = 24
RESEND_COOLDOWN_SECONDS = 60


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _get_user_by_email(db: Session, email: str) -> models.User | None:
    normalized_email = _normalize_email(email)
    return db.query(models.User).filter(
        func.lower(models.User.email) == normalized_email
    ).first()


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _generate_verification_token(db: Session, user: models.User) -> str:
    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=VERIFICATION_TOKEN_EXPIRE_HOURS)

    # Invalidate previous unused tokens for this user
    db.query(models.EmailVerificationToken).filter(
        models.EmailVerificationToken.user_id == user.id,
        models.EmailVerificationToken.used_at.is_(None),
    ).delete(synchronize_session=False)

    token_record = models.EmailVerificationToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(token_record)
    db.commit()

    logger.info(
        "Generated verification token for user_id=%s email=%s",
        user.id,
        user.email,
    )

    # Dispatch email (live SMTP if configured, console logged if in dev)
    send_verification_email(
        email=user.email,
        full_name=user.full_name or "User",
        raw_token=raw_token,
    )

    return raw_token



# ---------------------------------------------------
# REGISTER
# ---------------------------------------------------

@router.post("/register", response_model=RegisterResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    normalized_email = _normalize_email(user.email)
    logger.info("Register attempt for email=%s", normalized_email)

    if len(user.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long",
        )

    existing_user = _get_user_by_email(db, normalized_email)

    if existing_user:
        logger.info("Register blocked: existing user found for email=%s", normalized_email)
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    is_admin = normalized_email in [e.strip().lower() for e in settings.ADMIN_EMAILS]

    new_user = models.User(
        full_name=user.full_name.strip(),
        email=normalized_email,
        password_hash=hash_password(user.password),
        role="super_admin" if is_admin else "user",
        is_email_verified=False,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Initialize user career profile
    career_profile = models.UserCareerProfile(
        user_id=new_user.id,
        onboarding_current_step=1,
        onboarding_completed=False,
    )
    db.add(career_profile)
    db.commit()

    # Generate verification token
    _generate_verification_token(db, new_user)

    logger.info("Register success for email=%s user_id=%s role=%s", normalized_email, new_user.id, new_user.role)

    return {
        "id": new_user.id,
        "full_name": new_user.full_name,
        "email": new_user.email,
        "is_email_verified": False,
        "message": "Account created successfully. Please verify your email to begin your career journey.",
    }


# ---------------------------------------------------
# LOGIN (OAuth2 Password Flow)
# ---------------------------------------------------

@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    normalized_email = _normalize_email(form_data.username)
    logger.info("Login attempt for email=%s", normalized_email)

    db_user = _get_user_by_email(db, normalized_email)
    logger.info("Login user lookup email=%s found=%s", normalized_email, bool(db_user))

    password_matches = False
    if db_user:
        password_matches = verify_password(
            form_data.password,
            db_user.password_hash,
        )
        logger.info("Login password verification email=%s matched=%s", normalized_email, password_matches)

    if not db_user or not password_matches:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials",
        )

    # Automatically ensure bootstrap admins have super_admin role
    if normalized_email in [e.strip().lower() for e in settings.ADMIN_EMAILS] and db_user.role != "super_admin":
        db_user.role = "super_admin"
        db.commit()

    access_token = create_access_token(
        {"sub": str(db_user.id)}
    )

    logger.info("Login success email=%s user_id=%s role=%s", normalized_email, db_user.id, db_user.role)

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


# ---------------------------------------------------
# VERIFY EMAIL
# ---------------------------------------------------

@router.post("/verify-email")
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    raw_token = payload.token.strip()
    if not raw_token:
        raise HTTPException(status_code=400, detail="Verification token is required")

    token_hash = _hash_token(raw_token)
    token_record = db.query(models.EmailVerificationToken).filter(
        models.EmailVerificationToken.token_hash == token_hash,
    ).first()

    if not token_record:
        raise HTTPException(status_code=400, detail="Invalid verification token")

    if token_record.used_at is not None:
        raise HTTPException(status_code=400, detail="This verification token has already been used")

    now = datetime.now(timezone.utc)
    if token_record.expires_at < now:
        raise HTTPException(status_code=400, detail="Verification token has expired. Please request a new one.")

    user = db.query(models.User).filter(models.User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    # Mark token used and user verified
    token_record.used_at = now
    user.is_email_verified = True
    db.commit()

    # Issue access token so user is automatically authenticated for onboarding
    access_token = create_access_token({"sub": str(user.id)})

    logger.info("Email verified successfully for user_id=%s email=%s", user.id, user.email)

    return {
        "success": True,
        "message": "Email verified successfully. Welcome to LakshyaAI!",
        "is_email_verified": True,
        "access_token": access_token,
        "token_type": "bearer",
    }


# ---------------------------------------------------
# RESEND VERIFICATION
# ---------------------------------------------------

@router.post("/resend-verification")
def resend_verification(payload: ResendVerificationRequest, db: Session = Depends(get_db)):
    normalized_email = _normalize_email(payload.email)
    user = _get_user_by_email(db, normalized_email)

    # To prevent email enumeration, return uniform response if user doesn't exist
    if not user:
        return {
            "success": True,
            "message": "If an account with this email exists, a verification link has been sent.",
        }

    if user.is_email_verified:
        raise HTTPException(
            status_code=400,
            detail="Your email is already verified. You can log in directly.",
        )

    # Check cooldown/rate-limit
    latest_token = (
        db.query(models.EmailVerificationToken)
        .filter(models.EmailVerificationToken.user_id == user.id)
        .order_by(models.EmailVerificationToken.created_at.desc())
        .first()
    )

    if latest_token and latest_token.created_at:
        now = datetime.now(timezone.utc)
        elapsed = (now - latest_token.created_at.replace(tzinfo=timezone.utc)).total_seconds()
        if elapsed < RESEND_COOLDOWN_SECONDS:
            remaining = int(RESEND_COOLDOWN_SECONDS - elapsed)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {remaining} seconds before requesting another verification email.",
            )

    _generate_verification_token(db, user)

    return {
        "success": True,
        "message": "A new verification email has been sent. Please check your inbox.",
    }


# ---------------------------------------------------
# GOOGLE OAUTH 2.0 / OIDC
# ---------------------------------------------------

GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


def _get_google_config():
    import os
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://127.0.0.1:10000/api/auth/google/callback").strip()
    frontend_url = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173").strip().rstrip("/")
    return client_id, client_secret, redirect_uri, frontend_url


@router.get("/google/url")
def get_google_auth_url():
    """
    Returns the Google authorization URL for frontend clients.
    """
    import urllib.parse
    client_id, client_secret, redirect_uri, frontend_url = _get_google_config()

    if not client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured. Please set GOOGLE_CLIENT_ID in .env",
        )

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
        "state": secrets.token_urlsafe(16),
    }

    auth_url = f"{GOOGLE_AUTH_BASE}?{urllib.parse.urlencode(params)}"
    return {"url": auth_url}


@router.get("/google/login")
def google_login():
    """
    Directly redirects the browser to Google's OAuth consent screen.
    """
    import urllib.parse
    from fastapi.responses import RedirectResponse

    client_id, client_secret, redirect_uri, frontend_url = _get_google_config()

    if not client_id:
        return RedirectResponse(f"{frontend_url}/login?error=google_not_configured")

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
        "state": secrets.token_urlsafe(16),
    }

    auth_url = f"{GOOGLE_AUTH_BASE}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=auth_url)


@router.get("/google/callback")
def google_callback(
    code: str = None,
    state: str = None,
    error: str = None,
    db: Session = Depends(get_db),
):
    """
    Handles Google OAuth redirect, exchanges code for tokens, retrieves user profile,
    creates or logs in user, and redirects to frontend with application JWT session.
    """
    import json
    import urllib.parse
    import urllib.request
    from fastapi.responses import RedirectResponse

    client_id, client_secret, redirect_uri, frontend_url = _get_google_config()

    if error or not code:
        logger.warning("Google OAuth callback returned error=%s", error)
        return RedirectResponse(f"{frontend_url}/login?error={error or 'missing_code'}")

    try:
        # Exchange code for Google tokens
        token_payload = urllib.parse.urlencode({
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }).encode("utf-8")

        req = urllib.request.Request(
            GOOGLE_TOKEN_URL,
            data=token_payload,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
            },
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=10) as resp:
            token_data = json.loads(resp.read().decode("utf-8"))

        google_access_token = token_data.get("access_token")
        if not google_access_token:
            logger.error("Failed to retrieve access token from Google: %s", token_data)
            return RedirectResponse(f"{frontend_url}/login?error=token_exchange_failed")

        # Fetch Google User profile
        userinfo_req = urllib.request.Request(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {google_access_token}"},
            method="GET",
        )
        with urllib.request.urlopen(userinfo_req, timeout=10) as resp:
            userinfo = json.loads(resp.read().decode("utf-8"))

        email = userinfo.get("email")
        name = userinfo.get("name") or "Google User"

        if not email:
            logger.error("Google profile did not provide an email: %s", userinfo)
            return RedirectResponse(f"{frontend_url}/login?error=missing_email")

        normalized_email = _normalize_email(email)
        user = _get_user_by_email(db, normalized_email)

        is_admin = normalized_email in [e.strip().lower() for e in settings.ADMIN_EMAILS]

        if not user:
            # Create new user
            user = models.User(
                full_name=name.strip(),
                email=normalized_email,
                password_hash=hash_password(secrets.token_urlsafe(32)),
                role="super_admin" if is_admin else "user",
                is_email_verified=True,  # Google verified email
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            career_profile = models.UserCareerProfile(
                user_id=user.id,
                onboarding_current_step=1,
                onboarding_completed=False,
            )
            db.add(career_profile)
            db.commit()
            logger.info("Created new user via Google OAuth: email=%s id=%s role=%s", normalized_email, user.id, user.role)
        else:
            # Ensure email is marked verified and super_admin is assigned if bootstrap email
            if is_admin and user.role != "super_admin":
                user.role = "super_admin"
            if not user.is_email_verified:
                user.is_email_verified = True
            db.commit()
            logger.info("Existing user logged in via Google OAuth: email=%s id=%s role=%s", normalized_email, user.id, user.role)

        # Check onboarding completion
        profile = (
            db.query(models.UserCareerProfile)
            .filter(models.UserCareerProfile.user_id == user.id)
            .first()
        )
        is_completed = bool(profile and profile.onboarding_completed)

        # Issue JWT
        access_token = create_access_token({"sub": str(user.id)})

        redirect_url = f"{frontend_url}/auth/callback?token={access_token}&onboarding_completed={'true' if is_completed else 'false'}"
        return RedirectResponse(url=redirect_url)

    except Exception as exc:
        logger.error("Exception during Google OAuth callback: %s", exc, exc_info=True)
        return RedirectResponse(f"{frontend_url}/login?error=oauth_processing_error")

