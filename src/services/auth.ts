import api from "./api";
import type { AuthResponse, RegisterPayload, User } from "@/types";

export const authService = {
  async register(data: RegisterPayload): Promise<AuthResponse> {
    const res = await api.post("/auth/register", data);
    return res.data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const formData = new FormData();
    formData.append("username", email);
    formData.append("password", password);
    const res = await api.post("/auth/login", formData);
    return res.data;
  },

  async getMe(): Promise<User> {
    const res = await api.get("/users/me");
    return res.data;
  },
};
