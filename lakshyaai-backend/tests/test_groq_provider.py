import asyncio
import json
import os
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

import httpx

from app.core.exceptions import ExternalServiceException
from app.services.llm.groq_provider import GroqProvider


class TestGroqProvider(unittest.TestCase):
    def setUp(self):
        self.provider = GroqProvider(
            api_key="gsk_test_mock_api_key_12345",
            base_url="https://api.groq.com/openai/v1",
            default_model="llama-3.3-70b-versatile",
        )

    def test_configuration_state(self):
        self.assertTrue(self.provider.is_configured)
        self.assertEqual(self.provider.default_model, "llama-3.3-70b-versatile")
        self.assertEqual(self.provider.base_url, "https://api.groq.com/openai/v1")

        unconfigured = GroqProvider(api_key="")
        with patch.dict(os.environ, {"GROQ_API_KEY": ""}, clear=False):
            self.assertFalse(unconfigured.is_configured)

    def test_complete_sync_successful(self):
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [
                {"message": {"role": "assistant", "content": "Groq response: System architecture is optimal."}}
            ]
        }

        with patch.object(httpx.Client, "post", return_value=mock_response) as mock_post:
            result = self.provider.complete_sync([{"role": "user", "content": "Analyze architecture."}])
            self.assertEqual(result, "Groq response: System architecture is optimal.")
            mock_post.assert_called_once()
            _, kwargs = mock_post.call_args
            self.assertEqual(kwargs["json"]["model"], "llama-3.3-70b-versatile")
            self.assertIn("Authorization", kwargs["headers"])
            self.assertEqual(kwargs["headers"]["Authorization"], "Bearer gsk_test_mock_api_key_12345")

    def test_complete_async_successful(self):
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [
                {"message": {"role": "assistant", "content": "Async response verified."}}
            ]
        }

        async def run_test():
            with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
                mock_post.return_value = mock_response
                result = await self.provider.complete([{"role": "user", "content": "Hello async"}])
                self.assertEqual(result, "Async response verified.")
                mock_post.assert_called_once()

        asyncio.run(run_test())

    def test_complete_json_sync_and_async(self):
        expected_json = {"score": 88, "status": "approved", "recommendations": ["Improve indexing"]}
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [
                {"message": {"role": "assistant", "content": json.dumps(expected_json)}}
            ]
        }

        # Sync test
        with patch.object(httpx.Client, "post", return_value=mock_response):
            result = self.provider.complete_json_sync([{"role": "user", "content": "Return json"}])
            self.assertEqual(result, expected_json)

        # Async test with markdown code fence
        mock_response_fence = MagicMock(spec=httpx.Response)
        mock_response_fence.status_code = 200
        mock_response_fence.json.return_value = {
            "choices": [
                {"message": {"role": "assistant", "content": f"```json\n{json.dumps(expected_json)}\n```"}}
            ]
        }

        async def run_async():
            with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
                mock_post.return_value = mock_response_fence
                result_async = await self.provider.complete_json([{"role": "user", "content": "Return fenced json"}])
                self.assertEqual(result_async, expected_json)

        asyncio.run(run_async())

    def test_timeout_handling(self):
        with patch.object(httpx.Client, "post", side_effect=httpx.TimeoutException("Timeout after 30s")):
            with self.assertRaises(ExternalServiceException) as cm:
                self.provider.complete_sync([{"role": "user", "content": "Slow request"}])
            self.assertIn("timed out", str(cm.exception).lower())

    def test_401_authentication_failure(self):
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 401
        mock_response.json.return_value = {"error": {"message": "Invalid API Key"}}

        with patch.object(httpx.Client, "post", return_value=mock_response):
            with self.assertRaises(ExternalServiceException) as cm:
                self.provider.complete_sync([{"role": "user", "content": "Auth test"}])
            self.assertIn("authentication failed", str(cm.exception).lower())

    def test_429_rate_limit_bounded_retries(self):
        mock_429 = MagicMock(spec=httpx.Response)
        mock_429.status_code = 429
        mock_429.headers = {"Retry-After": "0.01"}
        mock_429.json.return_value = {"error": {"message": "Rate limit reached"}}

        mock_200 = MagicMock(spec=httpx.Response)
        mock_200.status_code = 200
        mock_200.json.return_value = {
            "choices": [{"message": {"content": "Recovered after rate limit."}}]
        }

        # Sequence: 429, then 200
        with patch.object(httpx.Client, "post", side_effect=[mock_429, mock_200]) as mock_post:
            result = self.provider.complete_sync([{"role": "user", "content": "Retry test"}])
            self.assertEqual(result, "Recovered after rate limit.")
            self.assertEqual(mock_post.call_count, 2)

    def test_400_non_retryable_client_error(self):
        mock_400 = MagicMock(spec=httpx.Response)
        mock_400.status_code = 400
        mock_400.json.return_value = {"error": {"message": "Context window exceeded"}}

        with patch.object(httpx.Client, "post", return_value=mock_400) as mock_post:
            with self.assertRaises(ExternalServiceException):
                self.provider.complete_sync([{"role": "user", "content": "Large prompt"}])
            self.assertEqual(mock_post.call_count, 1)  # Zero retries on 400

    def test_unconfigured_error(self):
        empty_provider = GroqProvider(api_key="")
        with self.assertRaises(ExternalServiceException) as cm:
            empty_provider.complete_sync([{"role": "user", "content": "Test"}])
        self.assertIn("not configured", str(cm.exception).lower())


if __name__ == "__main__":
    unittest.main()
