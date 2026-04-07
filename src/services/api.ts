import axios from "axios";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8001/api";
const HEALTH_CHECK_TTL_MS = 10000;

function resolveApiBaseUrl(): string {
  const explicitBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/+$/, "");
  }

  const apiOrigin = import.meta.env.VITE_API_URL?.trim();
  if (apiOrigin) {
    return `${apiOrigin.replace(/\/+$/, "")}/api`;
  }

  return DEFAULT_API_BASE_URL;
}

function normalizeApiBaseUrl(rawUrl?: string): string {
  const trimmed = rawUrl?.trim() || resolveApiBaseUrl();
  return trimmed.replace(/\/+$/, "");
}

function normalizeRequestUrl(url?: string): string | undefined {
  if (!url) {
    return url;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  let normalized = url.startsWith("/") ? url : `/${url}`;
  if (normalized.startsWith("/api/")) {
    normalized = normalized.replace(/^\/api/, "");
  } else if (normalized === "/api") {
    normalized = "/";
  }

  return normalized;
}

const API_BASE_URL = normalizeApiBaseUrl();
const BACKEND_ORIGIN = new URL(API_BASE_URL).origin;
const HEALTH_CHECK_URL = `${API_BASE_URL}/health`;

let lastHealthCheckAt = 0;
let lastHealthCheckOk = false;
let activeHealthCheck: Promise<void> | null = null;

export interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
  },
  timeout: 15000,
});

console.log("API BASE URL:", API_BASE_URL);
console.log("API HEALTH CHECK URL:", HEALTH_CHECK_URL);

async function ensureBackendReachable(): Promise<void> {
  const now = Date.now();

  if (lastHealthCheckOk && now - lastHealthCheckAt < HEALTH_CHECK_TTL_MS) {
    return;
  }

  if (!activeHealthCheck) {
    activeHealthCheck = fetch(HEALTH_CHECK_URL, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Health check failed with status ${response.status}`);
        }
        lastHealthCheckOk = true;
        lastHealthCheckAt = Date.now();
      })
      .catch((error) => {
        lastHealthCheckOk = false;
        lastHealthCheckAt = Date.now();
        throw error;
      })
      .finally(() => {
        activeHealthCheck = null;
      });
  }

  return activeHealthCheck;
}

async function ensureBackendReachableSoft(): Promise<void> {
  try {
    await ensureBackendReachable();
  } catch (error) {
    console.warn("[API Health Check Warning]", {
      url: HEALTH_CHECK_URL,
      message: error instanceof Error ? error.message : "Health check failed",
    });
  }
}

function resolveErrorUrl(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const baseURL = error.config?.baseURL || API_BASE_URL;
    const url = normalizeRequestUrl(error.config?.url) || "";
    return `${baseURL}${url}`;
  }
  return API_BASE_URL;
}

api.interceptors.request.use(async (config) => {
  config.baseURL = normalizeApiBaseUrl(config.baseURL);
  config.url = normalizeRequestUrl(config.url);

  void ensureBackendReachableSoft();

  const token = localStorage.getItem("token") || localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (!config.headers["Content-Type"] && !(config.data instanceof FormData)) {
    config.headers["Content-Type"] = "application/json";
  }

  const resolvedUrl = `${config.baseURL}${config.url || ""}`;
  console.info("[API Request]", {
    method: config.method?.toUpperCase(),
    url: resolvedUrl,
  });

  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log("[API Response]", {
      status: response.status,
      url: `${response.config.baseURL || API_BASE_URL}${normalizeRequestUrl(response.config.url) || ""}`,
      data: response.data,
    });
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const resolvedUrl = `${error.config?.baseURL || API_BASE_URL}${normalizeRequestUrl(error.config?.url) || ""}`;

    if (!error.response) {
      console.error("[API Network Error]", {
        url: resolvedUrl,
        message: error.message,
        source: "network_or_cors",
      });
    } else {
      console.error("[API Error]", {
        status,
        url: resolvedUrl,
        data: error.response.data,
        source: "http_response",
      });
    }

    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("auth_token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    if (!error.response) {
      return `Network request failed for ${resolveErrorUrl(error)}. The backend health check is not used to block requests anymore, so inspect browser Network/CORS details and the failing API route.`;
    }

    const status = error.response?.status;
    const payloadMessage = error.response?.data?.error?.message;

    if (status === 401) {
      return payloadMessage || "Your session expired. Please log in again.";
    }

    if (status === 422) {
      return payloadMessage || "Validation failed. Please check your input and try again.";
    }

    if (status === 500) {
      return payloadMessage || "Server error. Please try again in a moment.";
    }

    if (status === 404) {
      return payloadMessage || "API endpoint not found. Check frontend API configuration.";
    }

    if (payloadMessage) {
      return payloadMessage;
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export default api;
