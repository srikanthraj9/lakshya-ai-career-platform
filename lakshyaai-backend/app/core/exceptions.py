from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class AppException(Exception):
    message: str
    status_code: int = 400
    code: str = "application_error"
    details: dict[str, Any] = field(default_factory=dict)

    def to_payload(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "error": {
                "code": self.code,
                "message": self.message,
            }
        }
        if self.details:
            payload["error"]["details"] = self.details
        return payload


class ValidationException(AppException):
    def __init__(self, message: str, *, details: dict[str, Any] | None = None) -> None:
        super().__init__(
            message=message,
            status_code=400,
            code="validation_error",
            details=details or {},
        )


class NotFoundException(AppException):
    def __init__(self, message: str, *, details: dict[str, Any] | None = None) -> None:
        super().__init__(
            message=message,
            status_code=404,
            code="not_found",
            details=details or {},
        )


class ExternalServiceException(AppException):
    def __init__(self, message: str, *, details: dict[str, Any] | None = None) -> None:
        super().__init__(
            message=message,
            status_code=502,
            code="external_service_error",
            details=details or {},
        )


class ProcessingException(AppException):
    def __init__(self, message: str, *, details: dict[str, Any] | None = None) -> None:
        super().__init__(
            message=message,
            status_code=500,
            code="processing_error",
            details=details or {},
        )
