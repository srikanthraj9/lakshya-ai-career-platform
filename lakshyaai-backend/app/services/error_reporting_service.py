import os
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger("lakshyaai.error_reporting")

SENSITIVE_KEYS = {
    "password", "token", "auth_token", "access_token", "jwt", 
    "secret", "authorization", "api_key", "cookie", "email", "phone"
}


def sanitize_context(data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not data:
        return {}
    sanitized = {}
    for k, v in data.items():
        if any(sk in k.lower() for sk in SENSITIVE_KEYS):
            sanitized[k] = "[REDACTED]"
        elif isinstance(v, dict):
            sanitized[k] = sanitize_context(v)
        else:
            sanitized[k] = v
    return sanitized


class ErrorReporter:
    def capture_exception(self, exc: Exception, context: Optional[Dict[str, Any]] = None):
        raise NotImplementedError

    def capture_message(self, message: str, level: str = "error", context: Optional[Dict[str, Any]] = None):
        raise NotImplementedError


class ConsoleErrorReporter(ErrorReporter):
    def capture_exception(self, exc: Exception, context: Optional[Dict[str, Any]] = None):
        safe_ctx = sanitize_context(context)
        logger.error(f"[Reported Exception] {type(exc).__name__}: {exc} | Context: {safe_ctx}", exc_info=False)

    def capture_message(self, message: str, level: str = "error", context: Optional[Dict[str, Any]] = None):
        safe_ctx = sanitize_context(context)
        logger.warning(f"[Reported Message - {level.upper()}] {message} | Context: {safe_ctx}")


class ProductionErrorReporter(ErrorReporter):
    def capture_exception(self, exc: Exception, context: Optional[Dict[str, Any]] = None):
        safe_ctx = sanitize_context(context)
        # Sentry / Datadog integration hook
        sentry_dsn = os.getenv("SENTRY_DSN")
        if sentry_dsn:
            try:
                import sentry_sdk
                sentry_sdk.capture_exception(exc, extra=safe_ctx)
            except ImportError:
                pass
        logger.error(f"[Prod Error Captured] {type(exc).__name__}: {exc} | Extra: {safe_ctx}")

    def capture_message(self, message: str, level: str = "error", context: Optional[Dict[str, Any]] = None):
        safe_ctx = sanitize_context(context)
        logger.warning(f"[Prod Message Captured] {message} | Extra: {safe_ctx}")


class NoopErrorReporter(ErrorReporter):
    def capture_exception(self, exc: Exception, context: Optional[Dict[str, Any]] = None):
        pass

    def capture_message(self, message: str, level: str = "error", context: Optional[Dict[str, Any]] = None):
        pass


def get_error_reporter() -> ErrorReporter:
    env = os.getenv("ENVIRONMENT", "development").lower()
    if env == "production":
        return ProductionErrorReporter()
    elif env == "test":
        return NoopErrorReporter()
    return ConsoleErrorReporter()


error_reporter = get_error_reporter()
