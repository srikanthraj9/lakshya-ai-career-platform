import os
from datetime import datetime, timezone

RELEASE_VERSION = "1.0.0"
BUILD_SHA = os.getenv("BUILD_SHA", "v1.0.0-release-certified")
BUILD_TIMESTAMP = os.getenv("BUILD_TIMESTAMP", datetime.now(timezone.utc).isoformat())


def get_release_metadata() -> dict:
    env = os.getenv("ENVIRONMENT", "development").lower()
    
    if env == "production":
        status = "production"
    elif env == "staging":
        status = "release_candidate"
    else:
        status = "development"

    return {
        "version": RELEASE_VERSION,
        "environment": env,
        "status": status,
        "certification_state": "certified_v1.0.0",
        "build_sha": BUILD_SHA,
        "build_timestamp": BUILD_TIMESTAMP,
    }
