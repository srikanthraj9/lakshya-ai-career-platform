import { describe, it, expect } from "vitest";
import { sanitizeDetails, telemetryService } from "@/services/telemetryService";

describe("Telemetry & Observability Security Sanitization", () => {
  it("redacts sensitive authentication tokens and passwords from telemetry", () => {
    const rawTelemetryPayload = {
      user_id: "usr-12345",
      action: "login_attempt",
      password: "secret_password_123",
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload",
      auth_token: "bearer_token_abc",
      jwt: "jwt_string",
      safe_metadata: {
        device: "desktop",
        api_key: "hidden_api_key",
        page: "/dashboard",
      },
    };

    const sanitized = sanitizeDetails(rawTelemetryPayload);

    expect(sanitized?.user_id).toBe("usr-12345");
    expect(sanitized?.action).toBe("login_attempt");
    expect(sanitized?.password).toBe("[REDACTED]");
    expect(sanitized?.token).toBe("[REDACTED]");
    expect(sanitized?.auth_token).toBe("[REDACTED]");
    expect(sanitized?.jwt).toBe("[REDACTED]");
    expect((sanitized?.safe_metadata as any).device).toBe("desktop");
    expect((sanitized?.safe_metadata as any).api_key).toBe("[REDACTED]");
  });

  it("stores and retrieves bounded telemetry events", () => {
    telemetryService.clearLogs();
    telemetryService.log("SYSTEM_INFO", "System initialized successfully", { version: "14.0.0" });

    const logs = telemetryService.getRecentLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].category).toBe("SYSTEM_INFO");
    expect(logs[0].message).toBe("System initialized successfully");
  });
});
