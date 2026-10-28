from __future__ import annotations

import logging
import math
import time
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.db import models

logger = logging.getLogger("lakshyaai.telemetry.ai")

# =========================================================================
# CENTRALIZED MODEL PRICING CATALOG (USD per 1,000,000 tokens)
# Source: Official provider pricing documentation as of Q3/Q4 2024
# =========================================================================
MODEL_PRICING_CATALOG: dict[str, dict[str, Any]] = {
    "llama-3.3-70b-versatile": {
        "provider": "groq",
        "input_per_million": 0.59,
        "output_per_million": 0.79,
    },
    "llama-3.1-70b-versatile": {
        "provider": "groq",
        "input_per_million": 0.59,
        "output_per_million": 0.79,
    },
    "llama-3.1-8b-instant": {
        "provider": "groq",
        "input_per_million": 0.05,
        "output_per_million": 0.08,
    },
    "gpt-4o-mini": {
        "provider": "openai",
        "input_per_million": 0.15,
        "output_per_million": 0.60,
    },
    "gpt-4o": {
        "provider": "openai",
        "input_per_million": 2.50,
        "output_per_million": 10.00,
    },
    "gemini-1.5-flash": {
        "provider": "gemini",
        "input_per_million": 0.075,
        "output_per_million": 0.30,
    },
    "gemini-1.5-pro": {
        "provider": "gemini",
        "input_per_million": 1.25,
        "output_per_million": 5.00,
    },
    "meta-llama/llama-3.3-70b-instruct": {
        "provider": "openrouter",
        "input_per_million": 0.40,
        "output_per_million": 0.40,
    },
    "openai/gpt-4o-mini": {
        "provider": "openrouter",
        "input_per_million": 0.15,
        "output_per_million": 0.60,
    },
}


class AITelemetryService:
    """
    Production-grade AI request telemetry recorder and analytics service.
    
    Guarantees:
    - Never stores API keys, auth headers, private prompts, or response payloads.
    - Measures duration using monotonic clock (time.perf_counter).
    - Sanitizes error categories.
    - Safe execution: Telemetry failures never interrupt candidate workflows.
    - Honest analytics: Distinguishes measured metrics from uninstrumented metrics.
    """

    @staticmethod
    def sanitize_error(exc: Exception) -> str:
        """Classify exceptions into bounded, privacy-safe error categories without leaking secrets or prompt content."""
        if exc is None:
            return "unknown_error"

        err_type = type(exc).__name__.lower()
        err_str = str(exc).lower()

        if "timeout" in err_type or "timeout" in err_str or "timed out" in err_str:
            return "timeout"
        if "429" in err_str or "rate limit" in err_str or "quota" in err_str:
            return "rate_limit_429"
        if "401" in err_str or "403" in err_str or "auth" in err_str or "forbidden" in err_str:
            return "auth_error"
        if "400" in err_str or "bad request" in err_str or "invalid" in err_str:
            return "bad_request_400"
        if "500" in err_str or "502" in err_str or "503" in err_str or "504" in err_str or "server error" in err_str:
            return "server_error_5xx"
        if "connect" in err_str or "network" in err_str or "dns" in err_str:
            return "connection_error"
        if "validation" in err_type or "validation" in err_str:
            return "validation_error"

        return f"external_service_error_{type(exc).__name__}"

    @classmethod
    def record_request(
        cls,
        db: Session,
        *,
        feature_type: str,
        provider: str,
        model_name: str,
        duration_ms: float,
        status: str,
        error: Optional[Exception] = None,
        prompt_tokens: Optional[int] = None,
        completion_tokens: Optional[int] = None,
        total_tokens: Optional[int] = None,
        user_id: Optional[UUID] = None,
        request_id: Optional[str] = None,
    ) -> Optional[models.AIRequestTelemetry]:
        """
        Record AI execution metadata safely.
        """
        try:
            req_id = request_id or str(uuid.uuid4())
            sanitized_category = cls.sanitize_error(error) if error or status == "failure" else None

            # Calculate total tokens if components are provided
            computed_total = total_tokens
            if computed_total is None and prompt_tokens is not None and completion_tokens is not None:
                computed_total = prompt_tokens + completion_tokens

            entry = models.AIRequestTelemetry(
                request_id=req_id,
                feature_type=feature_type,
                provider=provider.lower().strip() if provider else "unknown",
                model_name=model_name.strip() if model_name else "default",
                duration_ms=round(max(duration_ms, 0.0), 2),
                status="success" if status == "success" else "failure",
                error_category=sanitized_category,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=computed_total,
                user_id=user_id,
            )

            db.add(entry)
            db.commit()
            db.refresh(entry)
            return entry
        except Exception as exc:
            # Telemetry logging must never crash the primary candidate business operation
            logger.warning("Failed to record AI telemetry event (non-fatal): %s", exc)
            try:
                db.rollback()
            except Exception:
                pass
            return None

    @classmethod
    def get_ai_metrics(cls, db: Session, time_range: Optional[str] = None) -> dict[str, Any]:
        """
        Aggregate actual telemetry metrics including token volume, model breakdown, and defensible cost estimation.
        Implements statistical sample-size rules for latency percentiles and honest empty states.
        """
        pricing_assumptions = {
            "currency": "USD",
            "calculation_basis": "Published provider list rates per 1,000,000 input/output tokens",
            "rates": {
                k: {
                    "input_per_million": v["input_per_million"],
                    "output_per_million": v["output_per_million"],
                    "provider": v["provider"],
                }
                for k, v in MODEL_PRICING_CATALOG.items()
            },
            "disclaimer": "Cost estimations are mathematical approximations based on measured token usage and standard public rates. Actual provider invoices may vary based on caching, volume discounts, or batch processing.",
        }

        query = db.query(models.AIRequestTelemetry)
        now_utc = datetime.now(timezone.utc)

        if time_range == "today":
            start_of_day = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
            query = query.filter(models.AIRequestTelemetry.timestamp >= start_of_day)
        elif time_range == "7d":
            query = query.filter(models.AIRequestTelemetry.timestamp >= now_utc - timedelta(days=7))
        elif time_range == "30d":
            query = query.filter(models.AIRequestTelemetry.timestamp >= now_utc - timedelta(days=30))
        elif time_range == "90d":
            query = query.filter(models.AIRequestTelemetry.timestamp >= now_utc - timedelta(days=90))

        has_telemetry = False
        try:
            total_requests = query.with_entities(func.count(models.AIRequestTelemetry.id)).scalar() or 0
            has_telemetry = total_requests > 0
        except Exception:
            has_telemetry = False
            total_requests = 0

        if has_telemetry:
            successful_requests = (
                query.filter(models.AIRequestTelemetry.status == "success")
                .with_entities(func.count(models.AIRequestTelemetry.id))
                .scalar()
                or 0
            )
            failed_requests = (
                query.filter(models.AIRequestTelemetry.status == "failure")
                .with_entities(func.count(models.AIRequestTelemetry.id))
                .scalar()
                or 0
            )

            success_rate = (
                round((successful_requests / max(total_requests, 1)) * 100, 1)
                if total_requests > 0
                else 0.0
            )

            # Average response time of successful requests
            avg_duration = (
                query.filter(models.AIRequestTelemetry.status == "success")
                .with_entities(func.avg(models.AIRequestTelemetry.duration_ms))
                .scalar()
            )
            average_response_time_ms = round(float(avg_duration), 1) if avg_duration is not None else None

            # Calculate percentiles only if sample size >= 5 (statistical rule)
            p50 = None
            p95 = None
            p99 = None
            durations = (
                query.filter(models.AIRequestTelemetry.status == "success")
                .with_entities(models.AIRequestTelemetry.duration_ms)
                .order_by(models.AIRequestTelemetry.duration_ms.asc())
                .all()
            )
            values = [d[0] for d in durations if d[0] is not None]

            if len(values) >= 5:
                def get_percentile(data: list[float], p: float) -> float:
                    k = (len(data) - 1) * (p / 100.0)
                    f = math.floor(k)
                    c = math.ceil(k)
                    if f == c:
                        return data[int(k)]
                    d0 = data[int(f)] * (c - k)
                    d1 = data[int(c)] * (k - f)
                    return round(d0 + d1, 1)

                p50 = get_percentile(values, 50)
                p95 = get_percentile(values, 95)
                p99 = get_percentile(values, 99)

            # Breakdown by feature
            feature_rows = (
                query.with_entities(models.AIRequestTelemetry.feature_type, func.count(models.AIRequestTelemetry.id))
                .group_by(models.AIRequestTelemetry.feature_type)
                .all()
            )
            breakdown_by_feature = {row[0]: row[1] for row in feature_rows}

            # Breakdown by provider
            provider_rows = (
                query.with_entities(models.AIRequestTelemetry.provider, func.count(models.AIRequestTelemetry.id))
                .group_by(models.AIRequestTelemetry.provider)
                .all()
            )
            breakdown_by_provider = {row[0]: row[1] for row in provider_rows}

            # Token usage aggregation
            token_sums = query.with_entities(
                func.sum(models.AIRequestTelemetry.prompt_tokens),
                func.sum(models.AIRequestTelemetry.completion_tokens),
                func.sum(models.AIRequestTelemetry.total_tokens),
            ).first()

            total_prompt_tokens = int(token_sums[0] or 0) if token_sums else 0
            total_completion_tokens = int(token_sums[1] or 0) if token_sums else 0
            total_tokens = int(token_sums[2] or 0) if token_sums else 0

            # Count requests with measured tokens vs unmetered requests
            token_metered_requests = (
                query.filter(models.AIRequestTelemetry.total_tokens.isnot(None))
                .with_entities(func.count(models.AIRequestTelemetry.id))
                .scalar()
                or 0
            )
            unmetered_requests = max(0, total_requests - token_metered_requests)

            # Per-model breakdown and defensible cost estimation
            model_rows = (
                query.with_entities(
                    models.AIRequestTelemetry.model_name,
                    models.AIRequestTelemetry.provider,
                    func.count(models.AIRequestTelemetry.id),
                    func.sum(models.AIRequestTelemetry.prompt_tokens),
                    func.sum(models.AIRequestTelemetry.completion_tokens),
                    func.sum(models.AIRequestTelemetry.total_tokens),
                )
                .group_by(models.AIRequestTelemetry.model_name, models.AIRequestTelemetry.provider)
                .all()
            )

            breakdown_by_model: dict[str, dict[str, Any]] = {}
            total_estimated_cost_usd = 0.0

            for m_name, prov, req_count, p_tok, c_tok, t_tok in model_rows:
                p_tokens = int(p_tok or 0)
                c_tokens = int(c_tok or 0)
                tot_tokens = int(t_tok or 0)

                # Match pricing
                pricing = MODEL_PRICING_CATALOG.get(m_name)
                if not pricing:
                    for catalog_key, catalog_val in MODEL_PRICING_CATALOG.items():
                        if catalog_key.lower() == (m_name or "").lower() or catalog_key.endswith(f"/{m_name}"):
                            pricing = catalog_val
                            break

                model_cost = 0.0
                is_priced = False
                if pricing:
                    is_priced = True
                    in_cost = (p_tokens / 1_000_000.0) * pricing["input_per_million"]
                    out_cost = (c_tokens / 1_000_000.0) * pricing["output_per_million"]
                    model_cost = round(in_cost + out_cost, 6)
                    total_estimated_cost_usd += model_cost

                breakdown_by_model[m_name] = {
                    "model_name": m_name,
                    "provider": prov,
                    "requests": int(req_count or 0),
                    "prompt_tokens": p_tokens,
                    "completion_tokens": c_tokens,
                    "total_tokens": tot_tokens,
                    "estimated_cost_usd": round(model_cost, 4),
                    "is_priced": is_priced,
                }

            # Recent errors
            error_records = (
                query.filter(models.AIRequestTelemetry.status == "failure")
                .order_by(models.AIRequestTelemetry.timestamp.desc())
                .limit(5)
                .all()
            )
            recent_errors = [
                {
                    "request_id": e.request_id,
                    "feature_type": e.feature_type,
                    "provider": e.provider,
                    "model_name": e.model_name,
                    "error_category": e.error_category or "unknown_error",
                    "timestamp": e.timestamp.isoformat() if e.timestamp else None,
                }
                for e in error_records
            ]

            return {
                "total_requests": total_requests,
                "successful_requests": successful_requests,
                "failed_requests": failed_requests,
                "success_rate": success_rate,
                "average_response_time_ms": average_response_time_ms,
                "p50_latency_ms": p50,
                "p95_latency_ms": p95,
                "p99_latency_ms": p99,
                "telemetry_source": "ai_request_telemetry",
                "sample_size": len(values),
                "breakdown_by_feature": breakdown_by_feature,
                "breakdown_by_provider": breakdown_by_provider,
                "recent_errors": recent_errors,
                "total_prompt_tokens": total_prompt_tokens,
                "total_completion_tokens": total_completion_tokens,
                "total_tokens": total_tokens,
                "token_metered_requests": token_metered_requests,
                "unmetered_requests": unmetered_requests,
                "estimated_cost_usd": round(total_estimated_cost_usd, 4),
                "breakdown_by_model": breakdown_by_model,
                "pricing_assumptions": pricing_assumptions,
                "time_range": time_range or "all",
            }

        # Honest empty state when telemetry table is unpopulated
        return {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "success_rate": 0.0,
            "average_response_time_ms": None,
            "p50_latency_ms": None,
            "p95_latency_ms": None,
            "p99_latency_ms": None,
            "telemetry_source": "ai_request_telemetry",
            "sample_size": 0,
            "breakdown_by_feature": {},
            "breakdown_by_provider": {},
            "recent_errors": [],
            "total_prompt_tokens": 0,
            "total_completion_tokens": 0,
            "total_tokens": 0,
            "token_metered_requests": 0,
            "unmetered_requests": 0,
            "estimated_cost_usd": 0.0,
            "breakdown_by_model": {},
            "pricing_assumptions": pricing_assumptions,
            "time_range": time_range or "all",
        }
