import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.config import settings

logger = logging.getLogger("lakshyaai.health")


class HealthService:
    @staticmethod
    def check_liveness() -> dict:
        return {
            "status": "ok",
            "service": "lakshyaai-backend",
            "environment": settings.ENVIRONMENT,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    @staticmethod
    def check_readiness(db: Session) -> dict:
        components = {
            "api": "healthy",
            "database": "unknown",
            "environment": "healthy",
            "rate_limiter": "healthy",
        }

        # 1. Test database connectivity
        try:
            db.execute(func.now())
            components["database"] = "healthy"
        except Exception as db_err:
            logger.error(f"Readiness check failed for database: {db_err}")
            components["database"] = "unhealthy"

        # Determine overall readiness
        is_ready = all(v == "healthy" for v in components.values())

        return {
            "status": "ready" if is_ready else "degraded",
            "is_ready": is_ready,
            "components": components,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
