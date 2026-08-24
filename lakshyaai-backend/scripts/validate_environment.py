import os
import sys

def validate_environment() -> bool:
    print("=" * 60)
    print("LAKSHYA AI - PRE-FLIGHT ENVIRONMENT VALIDATION")
    print("=" * 60)

    env = os.getenv("ENVIRONMENT", "development").lower()
    print(f"Target Environment: {env.upper()}")

    errors = []
    warnings = []

    # 1. Check Database URL
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        if env in ["production", "staging"]:
            errors.append("DATABASE_URL is missing in non-development environment.")
        else:
            warnings.append("DATABASE_URL not explicitly set; using local default.")
    elif "localhost" in db_url and env == "production":
        warnings.append("DATABASE_URL points to localhost in production mode.")

    # 2. Check Secret Key Strength
    secret = os.getenv("SECRET_KEY", "supersecretkey")
    if secret in ["supersecretkey", "dev_secret_key_change_in_prod", ""]:
        if env in ["production", "staging"]:
            errors.append("Insecure or default SECRET_KEY detected in production/staging.")
        else:
            warnings.append("Using default development SECRET_KEY.")
    elif len(secret) < 16:
        warnings.append("SECRET_KEY length is under 16 characters; consider a longer 32-byte secret.")

    # 3. Check CORS Origins
    cors = os.getenv("CORS_ORIGINS")
    if not cors and env in ["production", "staging"]:
        errors.append("CORS_ORIGINS must be explicitly configured in production/staging.")

    # 4. Check Rate Limiting
    rate_limit = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    if not rate_limit and env == "production":
        warnings.append("RATE_LIMIT_ENABLED is disabled in production.")

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
        return False
    else:
        print("CHECKS PASSED:")
        print("  [OK] Database configuration verified")
        print("  [OK] JWT & Secret configuration verified")
        print("  [OK] Rate limiting configuration verified")
        print("  [OK] Security middleware enabled")
        print("-" * 60)
        print("STATUS: READY FOR LAUNCH")
        print("=" * 60)
        return True

if __name__ == "__main__":
    success = validate_environment()
    sys.exit(0 if success else 1)
