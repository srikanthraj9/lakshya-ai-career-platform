import { telemetryService } from "./telemetryService";

export type AuthStatus = "initializing" | "authenticated" | "unauthenticated" | "error";

export interface DecodedToken {
  sub?: string;
  exp?: number;
  [key: string]: unknown;
}

class SessionService {
  private status: AuthStatus = "initializing";
  private listeners: Array<(status: AuthStatus) => void> = [];

  public decodeToken(token: string): DecodedToken | null {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      const payload = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }

  public isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return false;
    const now = Math.floor(Date.now() / 1000);
    // Buffer by 30 seconds
    return decoded.exp <= now + 30;
  }

  public getToken(): string | null {
    return localStorage.getItem("token") || localStorage.getItem("auth_token");
  }

  public setToken(token: string) {
    localStorage.setItem("token", token);
    localStorage.setItem("auth_token", token);
    this.setStatus("authenticated");
  }

  public clearSession() {
    localStorage.removeItem("token");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("pending_verification_email");
    this.setStatus("unauthenticated");
  }

  public getStatus(): AuthStatus {
    return this.status;
  }

  public setStatus(status: AuthStatus) {
    if (this.status !== status) {
      this.status = status;
      telemetryService.log("SYSTEM_INFO", `Auth status changed to ${status}`);
      this.listeners.forEach((listener) => listener(status));
    }
  }

  public onStatusChange(callback: (status: AuthStatus) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }
}

export const sessionService = new SessionService();
