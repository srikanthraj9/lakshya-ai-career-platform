export type TelemetryCategory =
  | "API_ERROR"
  | "AUTH_ERROR"
  | "RESUME_ERROR"
  | "INTERVIEW_ERROR"
  | "JOB_SYNC_ERROR"
  | "COPILOT_ERROR"
  | "MIGRATION_EVENT"
  | "SYSTEM_INFO"
  | "SECURITY_EVENT";

export interface TelemetryEvent {
  category: TelemetryCategory;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

const SENSITIVE_KEYS = [
  "password",
  "token",
  "auth_token",
  "access_token",
  "jwt",
  "secret",
  "authorization",
  "api_key",
  "cookie",
];

export function sanitizeDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!details) return undefined;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    if (SENSITIVE_KEYS.some((sk) => key.toLowerCase().includes(sk))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeDetails(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export interface TelemetryAdapter {
  record(event: TelemetryEvent): void;
}

class ConsoleTelemetryAdapter implements TelemetryAdapter {
  record(event: TelemetryEvent): void {
    if (event.category === "SYSTEM_INFO" || event.category === "MIGRATION_EVENT") {
      console.info(`[Telemetry ${event.category}]`, event.message, event.details ?? "");
    } else {
      console.warn(`[Telemetry ${event.category}]`, event.message, event.details ?? "");
    }
  }
}

class ProductionMonitoringAdapter implements TelemetryAdapter {
  record(event: TelemetryEvent): void {
    // In production, buffer or stream to external monitoring endpoint (e.g. Sentry / Datadog)
    if (typeof window !== "undefined" && (window as any).__SENTRY__) {
      (window as any).__SENTRY__.captureMessage(`[${event.category}] ${event.message}`, {
        extra: event.details,
      });
    }
  }
}

class NoopTelemetryAdapter implements TelemetryAdapter {
  record(_event: TelemetryEvent): void {}
}

class TelemetryService {
  private logs: TelemetryEvent[] = [];
  private maxLogs = 100;
  private adapter: TelemetryAdapter;

  constructor() {
    const mode = (typeof import.meta !== "undefined" && import.meta.env?.VITE_TELEMETRY_MODE) || "console";
    if (mode === "production") {
      this.adapter = new ProductionMonitoringAdapter();
    } else if (mode === "noop") {
      this.adapter = new NoopTelemetryAdapter();
    } else {
      this.adapter = new ConsoleTelemetryAdapter();
    }
  }

  public setAdapter(adapter: TelemetryAdapter) {
    this.adapter = adapter;
  }

  public log(category: TelemetryCategory, message: string, details?: Record<string, unknown>) {
    const event: TelemetryEvent = {
      category,
      message,
      details: sanitizeDetails(details),
      timestamp: new Date().toISOString(),
    };

    this.logs.unshift(event);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    this.adapter.record(event);
  }

  public error(category: TelemetryCategory, message: string, details?: Record<string, unknown>) {
    this.log(category, message, details);
  }

  public getRecentLogs(): TelemetryEvent[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
  }
}

export const telemetryService = new TelemetryService();
