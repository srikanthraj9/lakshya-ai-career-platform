import { describe, it, expect } from "vitest";
import { resolveApiBaseUrl, DEFAULT_API_BASE_URL } from "@/services/api";
import fs from "fs";
import path from "path";

describe("Production API Configuration & Docker Architecture (P0-03)", () => {
  it("defaults to relative /api in production when no environment variables are set", () => {
    const url = resolveApiBaseUrl({
      DEV: false,
      VITE_API_BASE_URL: undefined,
      VITE_API_URL: undefined,
    });
    expect(url).toBe("/api");
  });

  it("never resolves to remote client localhost in production builds", () => {
    const url = resolveApiBaseUrl({
      DEV: false,
      VITE_API_BASE_URL: "",
      VITE_API_URL: "",
    });
    expect(url).not.toContain("127.0.0.1");
    expect(url).not.toContain("localhost");
    expect(url).toBe("/api");
  });

  it("uses explicit VITE_API_BASE_URL when provided in production", () => {
    const url = resolveApiBaseUrl({
      DEV: false,
      VITE_API_BASE_URL: "https://api.lakshya.ai/api/",
    });
    expect(url).toBe("https://api.lakshya.ai/api");
  });

  it("uses VITE_API_URL and appends /api when provided in production", () => {
    const url = resolveApiBaseUrl({
      DEV: false,
      VITE_API_URL: "https://api.lakshya.ai",
    });
    expect(url).toBe("https://api.lakshya.ai/api");
  });

  it("falls back to local backend port 10000 during local development (DEV=true)", () => {
    const url = resolveApiBaseUrl({
      DEV: true,
      VITE_API_BASE_URL: undefined,
      VITE_API_URL: undefined,
    });
    expect(url).toBe(DEFAULT_API_BASE_URL);
    expect(url).toBe("http://127.0.0.1:10000/api");
  });

  it("verifies nginx.conf reverse proxy routes /api/ to backend:10000", () => {
    const nginxConfPath = path.resolve(__dirname, "../../nginx.conf");
    expect(fs.existsSync(nginxConfPath)).toBe(true);

    const content = fs.readFileSync(nginxConfPath, "utf-8");
    expect(content).toContain("location /api/ {");
    expect(content).toContain("proxy_pass http://backend:10000/api/;");
    expect(content).toContain("try_files $uri $uri/ /index.html;");
  });

  it("verifies Dockerfile includes build arguments and copies nginx.conf", () => {
    const dockerfilePath = path.resolve(__dirname, "../../Dockerfile");
    expect(fs.existsSync(dockerfilePath)).toBe(true);

    const content = fs.readFileSync(dockerfilePath, "utf-8");
    expect(content).toContain("ARG VITE_API_URL");
    expect(content).toContain("ARG VITE_API_BASE_URL");
    expect(content).toContain("COPY nginx.conf /etc/nginx/conf.d/default.conf");
  });
});
