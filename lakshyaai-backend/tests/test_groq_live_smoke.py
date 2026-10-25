import logging
import os
import time
import unittest

from app.core.config import settings
from app.services.llm.groq_provider import GroqProvider

logger = logging.getLogger("lakshyaai.groq.smoke")


class TestGroqLiveSmoke(unittest.TestCase):
    """
    Opt-in live smoke test against the actual Groq API endpoint.
    Strictly isolated from automated CI/CD discovery and default unit test runs.
    Requirements:
    - Opt-in trigger: RUN_LIVE_GROQ_TEST="true"
    - Explicit API Key: GROQ_API_KEY
    - Non-sensitive payload only
    - Zero printing of secret keys or credentials
    """

    @unittest.skipUnless(
        os.getenv("RUN_LIVE_GROQ_TEST") == "true",
        "Live Groq smoke test skipped by default. Enable with RUN_LIVE_GROQ_TEST=true.",
    )
    def test_live_groq_chat_completion_smoke(self):
        api_key = os.getenv("GROQ_API_KEY", "").strip() or settings.groq_api_key.strip()
        if not api_key:
            self.skipTest("STATUS: BLOCKED — GROQ_API_KEY is not configured in environment.")

        model = os.getenv("GROQ_MODEL", "").strip() or settings.groq_model or "llama-3.3-70b-versatile"
        provider = GroqProvider(api_key=api_key, default_model=model)

        non_sensitive_prompt = "Respond with exactly the single word: LAKSHYA_VERIFIED"
        messages = [
            {"role": "system", "content": "You are an automated API health check probe."},
            {"role": "user", "content": non_sensitive_prompt},
        ]

        start_time = time.perf_counter()
        try:
            response = provider.complete_sync(messages, temperature=0.0, max_tokens=100)
            latency_ms = (time.perf_counter() - start_time) * 1000

            # Validations
            self.assertIsInstance(response, str)
            self.assertTrue(len(response.strip()) > 0)
            logger.info("Live Groq smoke test PASSED latency=%.1fms model=%s", latency_ms, model)
        except Exception as exc:
            sanitized_err = str(exc).replace(api_key, "[REDACTED_KEY]")
            logger.error("Live Groq smoke test FAILED: %s", sanitized_err)
            self.fail(f"Live Groq provider request failed: {sanitized_err}")


if __name__ == "__main__":
    unittest.main()
