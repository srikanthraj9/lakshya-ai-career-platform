import os
import unittest
import uuid
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ["TESTING"] = "1"

from app.db.database import Base
from app.db import models
from app.services.ai_telemetry_service import AITelemetryService


class TestAITelemetryService(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        self.Session = sessionmaker(bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = self.Session()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_record_success_with_tokens_and_duration(self):
        start = time.perf_counter()
        time.sleep(0.01)  # 10ms
        duration = (time.perf_counter() - start) * 1000.0

        user_id = uuid.uuid4()
        entry = AITelemetryService.record_request(
            self.db,
            feature_type="copilot",
            provider="groq",
            model_name="llama-3.3-70b-versatile",
            duration_ms=duration,
            status="success",
            prompt_tokens=150,
            completion_tokens=85,
            user_id=user_id,
        )

        self.assertIsNotNone(entry)
        self.assertEqual(entry.feature_type, "copilot")
        self.assertEqual(entry.provider, "groq")
        self.assertEqual(entry.status, "success")
        self.assertIsNone(entry.error_category)
        self.assertEqual(entry.prompt_tokens, 150)
        self.assertEqual(entry.completion_tokens, 85)
        self.assertEqual(entry.total_tokens, 235)  # computed total
        self.assertGreaterEqual(entry.duration_ms, 8.0)
        self.assertEqual(entry.user_id, user_id)

    def test_record_failure_with_sanitized_error(self):
        timeout_exc = TimeoutError("Request timed out connecting to LLM server at api.groq.com")
        entry = AITelemetryService.record_request(
            self.db,
            feature_type="resume_rewrite",
            provider="openrouter",
            model_name="openai/gpt-4o-mini",
            duration_ms=5000.0,
            status="failure",
            error=timeout_exc,
        )

        self.assertIsNotNone(entry)
        self.assertEqual(entry.status, "failure")
        self.assertEqual(entry.error_category, "timeout")
        # Ensure raw exception message containing host/path is not stored in error_category
        self.assertNotIn("api.groq.com", entry.error_category)

    def test_sensitive_data_redaction_and_privacy(self):
        # Verify that models.AIRequestTelemetry table has NO prompt or response columns
        table_columns = [c.name for c in models.AIRequestTelemetry.__table__.columns]
        self.assertNotIn("prompt", table_columns)
        self.assertNotIn("messages", table_columns)
        self.assertNotIn("completion", table_columns)
        self.assertNotIn("response", table_columns)
        self.assertNotIn("api_key", table_columns)
        self.assertNotIn("authorization", table_columns)

    def test_error_sanitization_categories(self):
        self.assertEqual(AITelemetryService.sanitize_error(Exception("429 Too Many Requests")), "rate_limit_429")
        self.assertEqual(AITelemetryService.sanitize_error(Exception("401 Unauthorized API key sk-live-secret")), "auth_error")
        self.assertEqual(AITelemetryService.sanitize_error(Exception("502 Bad Gateway")), "server_error_5xx")
        self.assertEqual(AITelemetryService.sanitize_error(Exception("Connection refused")), "connection_error")
        self.assertEqual(AITelemetryService.sanitize_error(Exception("Invalid schema format")), "bad_request_400")

    def test_metrics_aggregation_insufficient_samples(self):
        # 3 samples (< 5): percentiles should be None per valid sample size rule
        for i in range(3):
            AITelemetryService.record_request(
                self.db,
                feature_type="mock_interview",
                provider="groq",
                model_name="llama-3.3-70b-versatile",
                duration_ms=100.0 * (i + 1),
                status="success",
            )

        metrics = AITelemetryService.get_ai_metrics(self.db)
        self.assertEqual(metrics["total_requests"], 3)
        self.assertEqual(metrics["successful_requests"], 3)
        self.assertEqual(metrics["failed_requests"], 0)
        self.assertEqual(metrics["success_rate"], 100.0)
        self.assertEqual(metrics["average_response_time_ms"], 200.0)
        self.assertIsNone(metrics["p50_latency_ms"])  # < 5 samples -> None
        self.assertIsNone(metrics["p95_latency_ms"])
        self.assertIsNone(metrics["p99_latency_ms"])
        self.assertEqual(metrics["sample_size"], 3)

    def test_metrics_aggregation_sufficient_samples_with_percentiles(self):
        # 6 samples (>= 5): percentiles should be calculated
        durations = [100.0, 200.0, 300.0, 400.0, 500.0, 600.0]
        for d in durations:
            AITelemetryService.record_request(
                self.db,
                feature_type="copilot",
                provider="groq",
                model_name="llama-3.3-70b-versatile",
                duration_ms=d,
                status="success",
            )

        # Add 1 failure
        AITelemetryService.record_request(
            self.db,
            feature_type="copilot",
            provider="groq",
            model_name="llama-3.3-70b-versatile",
            duration_ms=800.0,
            status="failure",
            error=TimeoutError("Request timed out"),
        )

        metrics = AITelemetryService.get_ai_metrics(self.db)
        self.assertEqual(metrics["total_requests"], 7)
        self.assertEqual(metrics["successful_requests"], 6)
        self.assertEqual(metrics["failed_requests"], 1)
        self.assertEqual(metrics["success_rate"], 85.7)
        self.assertEqual(metrics["average_response_time_ms"], 350.0)
        self.assertIsNotNone(metrics["p50_latency_ms"])
        self.assertIsNotNone(metrics["p95_latency_ms"])
        self.assertIsNotNone(metrics["p99_latency_ms"])
        self.assertEqual(metrics["sample_size"], 6)
        self.assertEqual(len(metrics["recent_errors"]), 1)
        self.assertEqual(metrics["recent_errors"][0]["error_category"], "timeout")


if __name__ == "__main__":
    unittest.main()
