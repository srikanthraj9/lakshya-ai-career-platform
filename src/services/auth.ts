import api from "./api";
import type { AuthResponse, RegisterPayload, RegisterResponse, User } from "@/types";

export const authService = {
  async register(data: RegisterPayload): Promise<RegisterResponse> {
    const res = await api.post("/auth/register", data, {
      validateStatus: (status) => status >= 200 && status < 400,
    });
    console.log("Register response:", res.data);
    return res.data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);
    const res = await api.post("/auth/login", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    console.log("Login response:", res.data);
    return res.data;
  },

  async getMe(): Promise<User> {
    const res = await api.get("/users/me");
    return res.data;
  },

  async verifyEmail(payload: VerifyEmailPayload): Promise<VerifyEmailResponse> {
    const res = await api.post("/auth/verify-email", payload);
    return res.data;
  },

  async resendVerification(payload: ResendVerificationPayload): Promise<ResendVerificationResponse> {
    const res = await api.post("/auth/resend-verification", payload);
    return res.data;
  },
};

