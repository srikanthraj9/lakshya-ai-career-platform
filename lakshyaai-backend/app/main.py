import logging

from fastapi import FastAPI, HTTPException, Request, Depends
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
def create_tables():
    try:
        with engine.begin() as connection:
            try:
                connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            except Exception as extension_error:
                print(f"pgvector extension setup skipped: {extension_error}")

        Base.metadata.create_all(bind=engine)
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE"))
            connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'"))
            connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE"))
            connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_reason TEXT"))
            connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ"))
            connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ"))
            connection.execute(text("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS file_name VARCHAR"))
            connection.execute(text("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS extracted_text TEXT"))
            connection.execute(text("ALTER TABLE roles ADD COLUMN IF NOT EXISTS title VARCHAR"))
            connection.execute(text("ALTER TABLE roles ADD COLUMN IF NOT EXISTS category VARCHAR"))
            connection.execute(text("ALTER TABLE roles ADD COLUMN IF NOT EXISTS demand_level VARCHAR"))
            connection.execute(text("ALTER TABLE roles ADD COLUMN IF NOT EXISTS core_skills JSONB"))
            connection.execute(text("ALTER TABLE roles ADD COLUMN IF NOT EXISTS advanced_skills JSONB"))
            connection.execute(text("ALTER TABLE roles ADD COLUMN IF NOT EXISTS average_salary DOUBLE PRECISION"))
            connection.execute(text("UPDATE resumes SET file_name = original_filename WHERE file_name IS NULL"))
            connection.execute(text("UPDATE resumes SET extracted_text = parsed_text WHERE extracted_text IS NULL"))
            connection.execute(text("UPDATE roles SET title = name WHERE title IS NULL"))
            connection.execute(text("UPDATE roles SET category = 'Software Engineering' WHERE category IS NULL"))
            connection.execute(text("UPDATE roles SET demand_level = 'Medium' WHERE demand_level IS NULL"))
            connection.execute(text("UPDATE roles SET core_skills = '[]'::jsonb WHERE core_skills IS NULL"))
            connection.execute(text("UPDATE roles SET advanced_skills = '[]'::jsonb WHERE advanced_skills IS NULL"))

        from app.db.database import SessionLocal
        from app.services.admin_service import AdminService
        from app.services.feature_flag_service import FeatureFlagService
        db = SessionLocal()
        try:
            AdminService.bootstrap_admin_users(db)
            FeatureFlagService.seed_default_flags(db)
        finally:
            db.close()
    except Exception as startup_error:
        if 'type "vector" does not exist' in str(startup_error).lower():
            print("Skipping automatic table creation because pgvector is unavailable.")
            return
        raise

import uuid
from app.core.security_middleware import security_and_rate_limit_middleware
from app.services.health_service import HealthService
from app.db.database import get_db
from sqlalchemy.orm import Session

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
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


@app.get("/api/health")
async def health_check(request: Request):
    logger.info("Health check hit on /api/health")
    return HealthService.check_liveness()


from app.core.release import get_release_metadata

@app.get("/api/release")
async def release_info():
    return get_release_metadata()


@app.get("/api/health/ready")
async def readiness_check(db: Session = Depends(get_db)):
    logger.info("Readiness check hit on /api/health/ready")
    return HealthService.check_readiness(db)


@app.exception_handler(AppException)
async def app_exception_handler(_: Request, exc: AppException):
    return JSONResponse(status_code=exc.status_code, content=exc.to_payload())


@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(_: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "request_validation_error",
                "message": "Request validation failed",
                "details": {"errors": exc.errors()},
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
    uvicorn.run("app.main:app", host="127.0.0.1", port=10000, reload=False)
