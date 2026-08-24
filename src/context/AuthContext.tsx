import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services/auth";
import { sessionService } from "@/services/sessionService";
import { persistenceMigrationService } from "@/services/persistenceMigrationService";
import { purgeLegacyUnscopedStorage } from "@/lib/userStorage";
import type { User } from "@/types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  isOnboardingCompleted: boolean;
  pendingEmail: string | null;
  setPendingEmail: (email: string | null) => void;
  login: (email: string, password: string) => Promise<User>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  setAuthSession: (token: string) => Promise<User>;
  refreshUser: () => Promise<User | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(sessionService.getToken());
  const [pendingEmail, setPendingEmailState] = useState<string | null>(
    localStorage.getItem("pending_verification_email"),
  );
  const [isLoading, setIsLoading] = useState(true);

  const setPendingEmail = useCallback((email: string | null) => {
    if (email) {
      localStorage.setItem("pending_verification_email", email);
      setPendingEmailState(email);
    } else {
      localStorage.removeItem("pending_verification_email");
      setPendingEmailState(null);
    }
  }, []);

  const storeToken = useCallback((token: string | null) => {
    if (token) {
      sessionService.setToken(token);
      setAuthToken(token);
      return;
    }

    sessionService.clearSession();
    setAuthToken(null);
  }, []);

  const fetchUser = useCallback(async (): Promise<User | null> => {
    const token = sessionService.getToken();
    if (!token) {
      setUser(null);
      setAuthToken(null);
      sessionService.setStatus("unauthenticated");
      setIsLoading(false);
      return null;
    }

    setAuthToken(token);
    try {
      console.info("[Auth] Fetching current user");
      const userData = await authService.getMe();
      setUser(userData);
      sessionService.setStatus("authenticated");
      console.info("[Auth] Current user loaded", {
        userId: userData.id,
        email: userData.email,
        is_email_verified: userData.is_email_verified,
        onboarding_completed: userData.onboarding_completed,
      });

      // Run idempotent migration safely once authentication is confirmed
      void persistenceMigrationService.runMigrationIfAuthenticated();

      return userData;
    } catch (error) {
      console.error("[Auth] Failed to fetch current user", error);
      setUser(null);
      storeToken(null);
      sessionService.setStatus("unauthenticated");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [storeToken]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Multi-tab session synchronization listener
  useEffect(() => {
    const handleStorageChange = async (event: StorageEvent) => {
      if (event.key === "token" || event.key === "auth_token") {
        const currentToken = sessionService.getToken();
        if (!currentToken) {
          // Logged out in another tab
          try {
            await queryClient.cancelQueries();
            queryClient.clear();
          } catch {}
          purgeLegacyUnscopedStorage();
          setUser(null);
          setAuthToken(null);
          sessionService.setStatus("unauthenticated");
        } else if (currentToken !== authToken) {
          // Logged in as different user in another tab
          try {
            await queryClient.cancelQueries();
            queryClient.clear();
          } catch {}
          purgeLegacyUnscopedStorage();
          fetchUser();
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [authToken, fetchUser, queryClient]);

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    setUser(null);

    // Evict any stale cache prior to new user login
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
    } catch {}
    purgeLegacyUnscopedStorage();

    try {
      const data = await authService.login(email, password);
      storeToken(data.access_token);
      console.info("[Auth] Login token received");
      const userData = await authService.getMe();
      setUser(userData);
      sessionService.setStatus("authenticated");
      if (!userData.is_email_verified) {
        setPendingEmail(userData.email);
      }

      // Trigger safe migration
      void persistenceMigrationService.runMigrationIfAuthenticated();

      return userData;
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
    const res = await authService.register({ full_name: fullName, email, password });
    setPendingEmail(email);
    console.info("[Auth] Registered user pending verification", res);
  };

  const setAuthSession = async (token: string): Promise<User> => {
    // Evict any stale cache prior to setting new session
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
    } catch {}
    purgeLegacyUnscopedStorage();

    storeToken(token);
    const userData = await authService.getMe();
    setUser(userData);
    sessionService.setStatus("authenticated");
    void persistenceMigrationService.runMigrationIfAuthenticated();
    return userData;
  };

  const refreshUser = async (): Promise<User | null> => {
    return fetchUser();
  };

  const logout = useCallback(async () => {
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
    } catch (e) {
      console.warn("[Auth] Error clearing query cache on logout:", e);
    }
    purgeLegacyUnscopedStorage();
    storeToken(null);
    setUser(null);
    setPendingEmail(null);
    sessionService.clearSession();
  }, [queryClient, storeToken, setPendingEmail]);

  const isEmailVerified = !!user?.is_email_verified;
  const isOnboardingCompleted = !!user?.onboarding_completed;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!authToken,
        isEmailVerified,
        isOnboardingCompleted,
        pendingEmail,
        setPendingEmail,
        login,
        register,
        setAuthSession,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
