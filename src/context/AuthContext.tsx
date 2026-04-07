import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authService } from "@/services/auth";
import type { User } from "@/types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(
    localStorage.getItem("token") || localStorage.getItem("auth_token"),
  );
  const [isLoading, setIsLoading] = useState(true);

  const storeToken = useCallback((token: string | null) => {
    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("auth_token", token);
      setAuthToken(token);
      return;
    }

    localStorage.removeItem("token");
    localStorage.removeItem("auth_token");
    setAuthToken(null);
  }, []);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem("token") || localStorage.getItem("auth_token");
    if (!token) {
      setUser(null);
      setAuthToken(null);
      setIsLoading(false);
      return;
    }

    setAuthToken(token);
    try {
      console.info("[Auth] Fetching current user");
      const userData = await authService.getMe();
      setUser(userData);
      console.info("[Auth] Current user loaded", { userId: userData.id, email: userData.email });
    } catch (error) {
      console.error("[Auth] Failed to fetch current user", error);
      setUser(null);
      storeToken(null);
    } finally {
      setIsLoading(false);
    }
  }, [storeToken]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setUser(null);

    try {
      const data = await authService.login(email, password);
      storeToken(data.access_token);
      console.info("[Auth] Login token received");
      const userData = await authService.getMe();
      setUser(userData);
      console.info("[Auth] Login completed", { userId: userData.id, email: userData.email });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      setUser(null);
      storeToken(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (fullName: string, email: string, password: string) => {
    await authService.register({ full_name: fullName, email, password });
  };

  const logout = () => {
    storeToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!authToken, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
