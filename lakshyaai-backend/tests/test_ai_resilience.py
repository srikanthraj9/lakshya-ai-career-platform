import unittest
from unittest.mock import patch, MagicMock
from app.services.llm.client import LLMClient
from app.core.exceptions import ExternalServiceException


class TestAIProviderResilience(unittest.TestCase):
    def setUp(self):
        self.client = LLMClient()

    def test_disabled_llm_graceful_handling(self):
        # When unconfigured or disabled, is_configured is False
        self.client.provider = "disabled"
        self.client.api_key = None
        self.assertFalse(self.client.is_configured)

    @patch("requests.post")
    def test_timeout_exception_handling(self, mock_post):
        import requests
        mock_post.side_effect = requests.exceptions.Timeout("Connection timed out to LLM provider")

        self.client.provider = "openai"
        self.client.api_key = "test-mock-key"
        self.client.base_url = "https://mock.api.com"

        # Verify timeout is caught and handled safely
        with self.assertRaises(ExternalServiceException):
            self.client.chat(prompt="hello")

    @patch("requests.post")
    def test_rate_limit_429_handling(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_response.raise_for_status.side_effect = Exception("429 Too Many Requests")
        mock_post.return_value = mock_response

        self.client.provider = "openai"
        self.client.api_key = "test-mock-key"
        self.client.base_url = "https://mock.api.com"

        with self.assertRaises(ExternalServiceException):
            self.client.chat(prompt="hello")

    @patch("requests.post")
    def test_malformed_json_fallback(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        # Returns markdown-wrapped json text
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "```json\n{\"skills\": [\"Python\", \"FastAPI\"]}\n```"}}]
        }
        mock_post.return_value = mock_response

        self.client.provider = "openai"
        self.client.api_key = "test-mock-key"
        self.client.base_url = "https://mock.api.com"

        result = self.client.chat_json(prompt="extract skills")
        self.assertIn("skills", result)
        self.assertIn("Python", result["skills"])


if __name__ == "__main__":
    unittest.main()
