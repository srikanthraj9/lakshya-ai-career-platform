import logging
import os

from fastapi import FastAPI, HTTPException, Request, Depends, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
import uvicorn

from app.api.router import api_router
from app.core.exceptions import AppException
from app.db.database import engine, Base

app = FastAPI(title="LakshyaAI Backend")
logger = logging.getLogger("lakshyaai.api")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)

@app.on_event("startup")
def startup_event():
    # Pre-flight environment validation enforced for production & staging environments
    env = (os.getenv("ENVIRONMENT") or os.getenv("APP_ENV", "development")).lower()
    if os.environ.get("TESTING") != "true" and env in ["production", "staging"]:
        try:
            from scripts.validate_environment import validate_environment
            validate_environment(raise_on_error=True)
        except Exception as env_err:
            logger.error("FATAL: Environment validation failed during startup: %s", env_err)
            raise

    # In test mode or local SQLite, initialize tables for in-memory / local test suites
    if os.environ.get("TESTING") == "true" or engine.dialect.name == "sqlite":
        try:
            from app.db import models  # noqa: F401
            Base.metadata.create_all(bind=engine)
        except Exception as init_err:
            logger.warning("Test schema initialization warning: %s", init_err)

    # Bootstrap default seed data (admin & feature flags)
    try:
        from app.db.database import SessionLocal
        from app.services.admin_service import AdminService
        from app.services.feature_flag_service import FeatureFlagService
        db = SessionLocal()
        try:
            AdminService.bootstrap_admin_users(db)
            FeatureFlagService.seed_default_flags(db)
            AdminService.backfill_oauth_providers(db)
        finally:
            db.close()
    except Exception as data_err:
        logger.warning("Startup data seeding deferred: %s", data_err)

import uuid
from app.core.security_middleware import security_and_rate_limit_middleware
from app.services.health_service import HealthService
from app.db.database import get_db
from sqlalchemy.orm import Session

from app.core.config import settings

# Parse and configure CORS origins
raw_cors_origins = getattr(settings, "CORS_ORIGINS", []) or []
cleaned_origins = [o.rstrip("/") for o in raw_cors_origins if o and o.strip()]
app_env_mode = (os.getenv("ENVIRONMENT") or os.getenv("APP_ENV", "development")).lower()

if app_env_mode in ["production", "staging"]:
    # Never allow wildcard or empty in production or staging
    cors_allowed_origins = [o for o in cleaned_origins if o != "*"]
else:
    cors_allowed_origins = cleaned_origins if cleaned_origins else [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

is_wildcard = "*" in cors_allowed_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_allowed_origins,
    allow_credentials=not is_wildcard,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_and_telemetry_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    logger.info("[%s] Incoming %s %s", request_id, request.method, request.url.path)
    
    # Run through security & rate limit checks
    response = await security_and_rate_limit_middleware(request, call_next)
    response.headers["X-Request-ID"] = request_id
    logger.info("[%s] Completed %s %s -> %s", request_id, request.method, request.url.path, response.status_code)
    return response


@app.get("/")
async def root():
    return {
        "service": "LakshyaAI Backend",
        "status": "online",
        "version": "v3.1.0-rc",
        "docs_url": "/docs",
        "health_url": "/api/health",
    }


@app.get("/health")
@app.get("/api/health")
async def health_check(request: Request):
    logger.info("Health check hit on %s", request.url.path)
    return HealthService.check_liveness()


from app.core.release import get_release_metadata

@app.get("/api/release")
async def release_info():
    return get_release_metadata()


@app.get("/api/health/ready")
async def readiness_check(response: Response, db: Session = Depends(get_db)):
    logger.info("Readiness check hit on /api/health/ready")
    result = HealthService.check_readiness(db)
    if not result.get("is_ready", False):
        response.status_code = 503
    return result


@app.exception_handler(AppException)
async def app_exception_handler(_: Request, exc: AppException):
    return JSONResponse(status_code=exc.status_code, content=exc.to_payload())


@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(_: Request, exc: RequestValidationError):
    from fastapi.encoders import jsonable_encoder
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "request_validation_error",
                "message": "Request validation failed",
                "details": {"errors": jsonable_encoder(exc.errors())},
            }
        },
    )



@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": "http_error",
                "message": exc.detail if isinstance(exc.detail, str) else "HTTP error",
                "details": exc.detail if isinstance(exc.detail, dict) else {},
            }
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "internal_server_error",
                "message": "An unexpected error occurred",
                "details": {"exception_type": exc.__class__.__name__},
            }
        },
    )


app.include_router(api_router)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run("app.main:app", host=host, port=port, reload=False)
