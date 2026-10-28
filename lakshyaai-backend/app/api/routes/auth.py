
import hashlib
import logging
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.db.database import get_db, engine
from app.db import models, schemas
from app.db.schemas import (
    RegisterResponse,
    ResendVerificationRequest,
    ResendVerificationResponse,
    Token,
    UserCreate,
    VerifyEmailRequest,
    VerificationStatusResponse,
)
from app.core.security import hash_password, verify_password, create_access_token
from app.core.config import settings
from app.core.dependencies import get_current_user, get_optional_current_user
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


def _generate_verification_token(db: Session, user: models.User):
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

    # Dispatch email (live SMTP if configured)
    delivery_result = send_verification_email(
        email=user.email,
        full_name=user.full_name or "User",
        raw_token=raw_token,
    )

    return raw_token, delivery_result



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

    # Public self-registration ALWAYS creates accounts with role="user".
    # Privileged administrative roles cannot be obtained via public registration.
    new_user = models.User(
        full_name=user.full_name.strip(),
        email=normalized_email,
        password_hash=hash_password(user.password),
        role="user",
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

    # Generate verification token and dispatch email
    _, delivery_result = _generate_verification_token(db, new_user)

    logger.info(
        "Register success for email=%s user_id=%s role=%s email_sent=%s delivery_status=%s",
        normalized_email,
        new_user.id,
        new_user.role,
        bool(delivery_result.success),
        delivery_result.status,
    )

    if delivery_result.success:
        message = "Account created successfully. Please verify your email to begin your career journey."
    else:
        message = "Account created successfully, but the verification email could not be delivered. Please click Resend on the verification page."

    # Issue access token so client can immediately establish unverified session for cross-device polling
    access_token = create_access_token({"sub": str(new_user.id)})

    return {
        "id": new_user.id,
        "full_name": new_user.full_name,
        "email": new_user.email,
        "is_email_verified": False,
        "message": message,
        "email_sent": bool(delivery_result.success),
        "delivery_status": delivery_result.status,
        "access_token": access_token,
        "token_type": "bearer",
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

    if not getattr(db_user, "is_active", True):
        logger.warning("Login blocked for deactivated account: email=%s", normalized_email)
        raise HTTPException(
            status_code=403,
            detail="Account is deactivated. Please contact support.",
        )

    if getattr(db_user, "is_suspended", False):
        logger.warning("Login blocked for suspended account: email=%s", normalized_email)
        detail = "Account is suspended. Please contact support."
        if getattr(db_user, "suspended_reason", None):
            detail = f"Account is suspended: {db_user.suspended_reason}"
        raise HTTPException(
            status_code=403,
            detail=detail,
        )

    # Enforce email verification for accounts claiming or holding administrative roles
    if db_user.role in ["admin", "super_admin"] and not getattr(db_user, "is_email_verified", False):
        logger.warning("Admin login blocked for unverified email: %s", normalized_email)
        raise HTTPException(
            status_code=403,
            detail="Email verification required for administrator access. Please verify your email.",
        )

    # Automatically ensure bootstrap admins have super_admin role ONLY after email verification
    if normalized_email in [e.strip().lower() for e in settings.ADMIN_EMAILS]:
        if getattr(db_user, "is_email_verified", False):
            if db_user.role != "super_admin":
                db_user.role = "super_admin"
                db.commit()
        else:
            logger.info("Bootstrap admin email %s has not verified email; retaining user role", normalized_email)

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
    query = db.query(models.EmailVerificationToken).filter(
        models.EmailVerificationToken.token_hash == token_hash,
    )
    if hasattr(engine, "dialect") and engine.dialect.name == "postgresql":
        query = query.with_for_update()
    token_record = query.first()

    if not token_record:
        raise HTTPException(status_code=400, detail="Invalid verification token")

    if token_record.used_at is not None:
        raise HTTPException(status_code=400, detail="This verification token has already been used")

    now = datetime.now(timezone.utc)
    expires_at = token_record.expires_at
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at and expires_at < now:
        raise HTTPException(status_code=400, detail="Verification token has expired. Please request a new one.")

    user = db.query(models.User).filter(models.User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    # Mark token used and user verified
    token_record.used_at = now
    user.is_email_verified = True

    # Elevate configured bootstrap admin accounts to super_admin upon verified email ownership
    normalized_verified_email = user.email.strip().lower()
    if normalized_verified_email in [e.strip().lower() for e in settings.ADMIN_EMAILS]:
        user.role = "super_admin"
        logger.info("Bootstrap admin role elevated for verified email=%s user_id=%s", user.email, user.id)

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

@router.post("/resend-verification", response_model=ResendVerificationResponse)
def resend_verification(payload: ResendVerificationRequest, db: Session = Depends(get_db)):
    normalized_email = _normalize_email(payload.email)
    user = _get_user_by_email(db, normalized_email)

    # To prevent email enumeration, return uniform response if user doesn't exist
    if not user:
        return {
            "success": True,
            "message": "If an account with this email exists, a verification link has been sent.",
            "email_sent": True,
            "delivery_status": "sent",
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
        created_at = latest_token.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        elapsed = (now - created_at).total_seconds()
        if elapsed < RESEND_COOLDOWN_SECONDS:
            remaining = int(RESEND_COOLDOWN_SECONDS - elapsed)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {remaining} seconds before requesting another verification email.",
            )

    _, delivery_result = _generate_verification_token(db, user)

    if not delivery_result.success:
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY if delivery_result.status != "unconfigured" else status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "success": False,
                "message": "Unable to deliver verification email at this time. Please try again in a few moments.",
                "email_sent": False,
                "delivery_status": delivery_result.status,
            },
        )

    return {
        "success": True,
        "message": "A new verification email has been sent. Please check your inbox.",
        "email_sent": True,
        "delivery_status": "sent",
    }


# ---------------------------------------------------
# EMAIL VERIFICATION STATUS (Cross-Device Polling)
# ---------------------------------------------------

_status_check_rate_limit: dict[str, list[float]] = {}
STATUS_CHECK_WINDOW_SECONDS = 60
STATUS_CHECK_MAX_REQUESTS = 120  # Max 120 requests/minute per IP (comfortably supports 3s polling)


def _check_status_rate_limit(client_ip: str) -> None:
    now = time.time()
    timestamps = _status_check_rate_limit.get(client_ip, [])
    timestamps = [t for t in timestamps if now - t < STATUS_CHECK_WINDOW_SECONDS]
    if len(timestamps) >= STATUS_CHECK_MAX_REQUESTS:
        _status_check_rate_limit[client_ip] = timestamps
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many status check requests. Please slow down.",
        )
    timestamps.append(now)
    _status_check_rate_limit[client_ip] = timestamps


@router.get("/verification-status", response_model=schemas.VerificationStatusResponse)
def get_verification_status(
    request: Request,
    email: Optional[str] = None,
    current_user: Optional[models.User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """
    Check the verification status of an account for cross-device synchronization.
    Supports authenticated JWT checks (Device 1 session) or unauthenticated email checks.
    To prevent email enumeration, queries for non-existent and unverified accounts return
    an identical payload with `is_email_verified=False` and no user details.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    _check_status_rate_limit(client_ip)

    # 1. Authenticated session check
    if current_user:
        profile = (
            db.query(models.UserCareerProfile)
            .filter(models.UserCareerProfile.user_id == current_user.id)
            .first()
        )
        onboarding_completed = bool(
            getattr(current_user, "onboarding_completed", False)
            or (profile and profile.onboarding_completed)
        )
        return {
            "is_email_verified": bool(current_user.is_email_verified),
            "email": current_user.email,
            "onboarding_completed": onboarding_completed,
        }

    # 2. Email query parameter check (unauthenticated fallback)
    if not email or not email.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authentication token or email query parameter is required.",
        )

    normalized_email = _normalize_email(email)
    user = _get_user_by_email(db, normalized_email)

    # Anti-enumeration safeguard:
    # If the user does not exist OR is not verified, return identical unverified response
    if not user or not getattr(user, "is_email_verified", False):
        return {
            "is_email_verified": False,
            "email": None,
            "onboarding_completed": None,
        }

    profile = (
        db.query(models.UserCareerProfile)
        .filter(models.UserCareerProfile.user_id == user.id)
        .first()
    )
    onboarding_completed = bool(
        getattr(user, "onboarding_completed", False)
        or (profile and profile.onboarding_completed)
    )

    return {
        "is_email_verified": True,
        "email": user.email,
        "onboarding_completed": onboarding_completed,
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
                primary_goals={"auth_provider": "google"},
            )
            db.add(career_profile)
            db.commit()
            logger.info("Created new user via Google OAuth: email=%s id=%s role=%s", normalized_email, user.id, user.role)
        else:
            if not getattr(user, "is_active", True):
                logger.warning("Deactivated user tried to log in via Google OAuth: email=%s", normalized_email)
                return RedirectResponse(f"{frontend_url}/login?error=account_deactivated")
            if getattr(user, "is_suspended", False):
                logger.warning("Suspended user tried to log in via Google OAuth: email=%s", normalized_email)
                return RedirectResponse(f"{frontend_url}/login?error=account_suspended")

            # Ensure email is marked verified and super_admin is assigned if bootstrap email
            if is_admin and user.role != "super_admin":
                user.role = "super_admin"
            if not user.is_email_verified:
                user.is_email_verified = True

            # Ensure profile records auth_provider as google
            career_profile = (
                db.query(models.UserCareerProfile)
                .filter(models.UserCareerProfile.user_id == user.id)
                .first()
            )
            if not career_profile:
                career_profile = models.UserCareerProfile(
                    user_id=user.id,
                    onboarding_current_step=1,
                    onboarding_completed=False,
                    primary_goals={"auth_provider": "google"},
                )
                db.add(career_profile)
            else:
                meta = dict(career_profile.primary_goals) if isinstance(career_profile.primary_goals, dict) else {}
                if isinstance(career_profile.primary_goals, list):
                    meta = {"goals": career_profile.primary_goals}
                meta["auth_provider"] = "google"
                career_profile.primary_goals = dict(meta)
                flag_modified(career_profile, "primary_goals")

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


# ---------------------------------------------------
# CHANGE PASSWORD
# ---------------------------------------------------

@router.post("/change-password")
def change_password(
    payload: schemas.ChangePasswordRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect",
        )

    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="New password must be at least 8 characters long",
        )

    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    logger.info("Password successfully changed for user_id=%s", current_user.id)
    return {"message": "Password updated successfully"}

