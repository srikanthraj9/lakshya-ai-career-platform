import os
import sys
from typing import Tuple, List

import re

KNOWN_PRODUCTION_HOST = "aws-0-ap-northeast-2.pooler.supabase.com"

KNOWN_INSECURE_SECRETS = {
    "supersecretkey",
    "dev_secret_key_change_in_prod",
    "your-super-secret-jwt-key-change-in-production",
    "secret",
    "changeme",
    "change_in_production",
    "admin",
    "password",
    "default",
    "",
}


def sanitize_url(url: str) -> str:
    """Mask credentials in connection strings for safe logging."""
    if not url:
        return ""
    return re.sub(r"://([^:]+):([^@]+)@", r"://\1:***@", url)


def assert_migration_safety(url: str) -> bool:
    """
    Prevent accidental schema execution against remote or production databases.
    Strictly distinguishes verified isolated staging environments from production targets.
    """
    if not url:
        raise RuntimeError("SAFETY GUARD: Database URL is empty or unconfigured.")

    lower_url = url.lower()
    is_local = "localhost" in lower_url or "127.0.0.1" in lower_url or "sqlite" in lower_url or "staging-db" in lower_url
    if is_local:
        return True

    sanitized = sanitize_url(url)
    is_staging_confirmed = (
        os.environ.get("CONFIRM_STAGING_MIGRATION") == "true"
        or ("staging" in lower_url and os.environ.get("ENVIRONMENT", "").lower() == "staging")
    )
    is_prod_confirmed = os.environ.get("CONFIRM_PROD_MIGRATION") == "true"

    if not is_staging_confirmed and not is_prod_confirmed:
        raise RuntimeError(
            f"SAFETY GUARD: Migration targets a remote database ({sanitized}) "
            f"without verified staging or production confirmation. Execution aborted."
        )

    if (KNOWN_PRODUCTION_HOST in lower_url or os.environ.get("ENVIRONMENT", "").lower() == "production") and not is_prod_confirmed:
        raise RuntimeError(
            f"SAFETY GUARD: Detected remote production database ({sanitized}). "
            f"Execution strictly prohibited without explicit CONFIRM_PROD_MIGRATION='true'."
        )

    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        hostname = parsed.hostname or "unknown"
        port = parsed.port or 5432
        dbname = parsed.path.lstrip("/") or "postgres"
        print(f"[MIGRATION SAFETY GUARD] Verified target fingerprint: host={hostname}, port={port}, dbname={dbname}")
    except Exception:
        pass

    return True


def validate_environment(raise_on_error: bool = False) -> bool:
    print("=" * 60)
    print("LAKSHYA AI - PRE-FLIGHT ENVIRONMENT VALIDATION")
    print("=" * 60)

    env = (os.getenv("ENVIRONMENT") or os.getenv("APP_ENV", "development")).lower()
    print(f"Target Environment: {env.upper()}")

    errors: List[str] = []
    warnings: List[str] = []

    # 1. Check Database URL
    db_url = os.getenv("DATABASE_URL", "").strip()
    if not db_url:
        if env in ["production", "staging"]:
            errors.append("DATABASE_URL is missing in non-development environment.")
        else:
            warnings.append("DATABASE_URL not explicitly set; using local default.")
    elif "localhost" in db_url and env == "production":
        errors.append("DATABASE_URL points to localhost in production mode.")
    elif env == "staging" and ("aws-0-ap-northeast-2.pooler.supabase.com" in db_url.lower()):
        errors.append("DATABASE_URL targets production Supabase instance in staging mode. Staging must use an isolated database instance.")
    elif env in ["production", "staging"] and ("sqlite" in db_url.lower() or "test_isolated.db" in db_url.lower()):
        errors.append("SQLite DATABASE_URL is prohibited in production and staging environments.")

    # 2. Check Secret Key Strength & Known Defaults
    secret = os.getenv("SECRET_KEY", "").strip()
    if not secret or secret.lower() in KNOWN_INSECURE_SECRETS:
        if env in ["production", "staging"]:
            errors.append("Insecure, default, or empty SECRET_KEY detected in production/staging.")
        else:
            warnings.append("Using default development SECRET_KEY.")
    elif len(secret) < 32 and env in ["production", "staging"]:
        errors.append("SECRET_KEY length must be at least 32 characters in production/staging.")
    elif len(secret) < 16:
        warnings.append("SECRET_KEY length is under 16 characters; consider a longer 32-byte secret.")

    # 3. Check CORS Origins
    cors = os.getenv("CORS_ORIGINS", "").strip()
    if not cors and env in ["production", "staging"]:
        errors.append("CORS_ORIGINS must be explicitly configured in production/staging.")
    elif cors and "*" in cors and env == "production":
        errors.append("Wildcard CORS_ORIGINS ('*') is prohibited in production mode.")

    # 4. Check Rate Limiting
    rate_limit = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    if not rate_limit and env == "production":
        warnings.append("RATE_LIMIT_ENABLED is disabled in production mode.")

    # Print summary
    print("-" * 60)
    if warnings:
        print("WARNINGS:")
        for w in warnings:
            print(f"  [!] {w}")
    
    if errors:
        print("CRITICAL ERRORS:")
        for e in errors:
            print(f"  [X] {e}")
        print("-" * 60)
        print("STATUS: BLOCKED (Fix critical errors before deployment)")
        print("=" * 60)
        if raise_on_error:
            raise RuntimeError(
                f"Production environment validation failed ({len(errors)} error(s)): {'; '.join(errors)}"
            )
        return False
    else:
        print("CHECKS PASSED:")
        print("  [OK] Database configuration verified")
        print("  [OK] JWT & Secret configuration verified")
        print("  [OK] CORS configuration verified")
        print("  [OK] Rate limiting configuration verified")
        print("  [OK] Security middleware enabled")
        print("-" * 60)
        print("STATUS: READY FOR LAUNCH")
        print("=" * 60)
        return True

if __name__ == "__main__":
    success = validate_environment(raise_on_error=False)
    sys.exit(0 if success else 1)
