import time
from collections import defaultdict
from typing import Dict, List, Tuple
from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from app.core.config import settings


class InMemoryRateLimiter:
    """Sliding-window in-memory rate limiter with per-IP / per-user tracking."""

    def __init__(self):
        # Maps key -> list of timestamps
        self.requests: Dict[str, List[float]] = defaultdict(list)

    def is_rate_limited(self, key: str, max_requests: int, window_seconds: int = 60) -> Tuple[bool, int]:
        now = time.time()
        window_start = now - window_seconds

        # Clean timestamps older than the sliding window
        self.requests[key] = [t for t in self.requests[key] if t > window_start]

        if len(self.requests[key]) >= max_requests:
            retry_after = int(window_seconds - (now - self.requests[key][0]))
            return True, max(1, retry_after)

        self.requests[key].append(now)
        return False, 0


rate_limiter = InMemoryRateLimiter()


async def security_and_rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "127.0.0.1"
    path = request.url.path

    # Rate limit auth endpoints
    if settings.RATE_LIMIT_ENABLED:
        if path.startswith("/api/auth/login") or path.startswith("/api/auth/register"):
            limited, retry_after = rate_limiter.is_rate_limited(
                key=f"auth:{client_ip}",
                max_requests=settings.RATE_LIMIT_PER_MINUTE_AUTH,
                window_seconds=60,
            )
            if limited:
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "error": {
                            "code": "rate_limit_exceeded",
                            "message": f"Too many authentication attempts. Please retry in {retry_after} seconds.",
                            "retry_after": retry_after,
                        }
                    },
                    headers={"Retry-After": str(retry_after)},
                )

        # Rate limit heavy AI endpoints
        elif path.startswith("/api/resume/rewrite") or path.startswith("/api/interview/session"):
            limited, retry_after = rate_limiter.is_rate_limited(
                key=f"ai:{client_ip}",
                max_requests=settings.RATE_LIMIT_PER_MINUTE_AI,
                window_seconds=60,
            )
            if limited:
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "error": {
                            "code": "ai_rate_limit_exceeded",
                            "message": f"AI rate limit exceeded. Please wait {retry_after} seconds.",
                            "retry_after": retry_after,
                        }
                    },
                    headers={"Retry-After": str(retry_after)},
                )

    # -------------------------------------------------------------------------
    # View-As Simulation Mode Protection
    # -------------------------------------------------------------------------
    # If X-Simulation-Token is present and HTTP method is a mutation (POST/PUT/PATCH/DELETE)
    # on ANY route (except ending simulation: /api/admin/simulation/end), block immediately with 403 Forbidden!
    sim_token = request.headers.get("X-Simulation-Token")
    if sim_token and request.method in ["POST", "PUT", "PATCH", "DELETE"]:
        if not path.endswith("/admin/simulation/end"):
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "error": {
                        "code": "simulation_mutation_blocked",
                        "message": "Mutations blocked: View-As simulation mode is strictly read-only across all candidate and administrative endpoints.",
                    }
                },
            )

    response: Response = await call_next(request)

    # Attach hardened security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"

    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

    return response
