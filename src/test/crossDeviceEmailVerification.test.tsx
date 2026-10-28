import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import { authService } from "@/services/auth";
import { sessionService } from "@/services/sessionService";

// Mock router navigation
const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams],
    useLocation: () => ({ state: null }),
  };
});

// Mock AuthContext
let mockUser: any = {
  id: "test-user-123",
  email: "candidate@example.com",
  full_name: "Candidate One",
  is_email_verified: false,
  onboarding_completed: false,
};
let mockPendingEmail: string | null = "candidate@example.com";
let mockIsEmailVerified = false;
const mockRefreshUser = vi.fn().mockImplementation(async () => {
  mockIsEmailVerified = true;
  mockUser = { ...mockUser, is_email_verified: true };
  return mockUser;
});
const mockSetAuthSession = vi.fn().mockResolvedValue(mockUser);
const mockLogout = vi.fn();

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
    pendingEmail: mockPendingEmail,
    isEmailVerified: mockIsEmailVerified,
    refreshUser: mockRefreshUser,
    setAuthSession: mockSetAuthSession,
    logout: mockLogout,
  }),
}));

// Mock authService and sessionService
vi.mock("@/services/auth", () => ({
  authService: {
    getVerificationStatus: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
  },
}));

vi.mock("@/services/sessionService", () => ({
  sessionService: {
    getToken: vi.fn().mockReturnValue("mock_access_token_123"),
    setToken: vi.fn(),
    clearSession: vi.fn(),
    getStatus: vi.fn().mockReturnValue("authenticated"),
    setStatus: vi.fn(),
  },
}));

// Mock Sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

describe("Cross-Device Automatic Email Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockUser = {
      id: "test-user-123",
      email: "candidate@example.com",
      full_name: "Candidate One",
      is_email_verified: false,
      onboarding_completed: false,
    };
    mockPendingEmail = "candidate@example.com";
    mockIsEmailVerified = false;
    vi.mocked(authService.getVerificationStatus).mockResolvedValue({
      is_email_verified: false,
    });
  });

  it("renders pending state with cross-device detection banner", () => {
    render(
      <MemoryRouter initialEntries={["/verify-email"]}>
        <Routes>
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/check your inbox/i)).toBeInTheDocument();
    expect(screen.getByText("candidate@example.com")).toBeInTheDocument();
    expect(
      screen.getByText(/listening for verification across devices/i)
    ).toBeInTheDocument();
  });

  it("automatically detects verification from second device via polling without manual refresh", async () => {
    vi.useFakeTimers();
    try {
      let callCount = 0;
      vi.mocked(authService.getVerificationStatus).mockImplementation(async () => {
        callCount += 1;
        if (callCount >= 2) {
          return { is_email_verified: true, onboarding_completed: false };
        }
        return { is_email_verified: false };
      });

      render(
        <MemoryRouter initialEntries={["/verify-email"]}>
          <Routes>
            <Route path="/verify-email" element={<VerifyEmailPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText(/check your inbox/i)).toBeInTheDocument();

      // Tick 1: Mount effect and register interval
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });

      // Tick 2: First polling check (returns false)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });

      // Tick 3: Second polling check (returns true - verified on Device 2!)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });

      // Page updates automatically to Success state!
      expect(screen.getByText("Email Verified!")).toBeInTheDocument();
      expect(mockRefreshUser).toHaveBeenCalled();

      // After brief redirect timer (1500ms), navigates to onboarding
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });

      expect(mockNavigate).toHaveBeenCalledWith("/onboarding", { replace: true });
    } finally {
      vi.useRealTimers();
    }
  });

  it("redirects to dashboard if user has already completed onboarding", async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(authService.getVerificationStatus).mockResolvedValue({
        is_email_verified: true,
        onboarding_completed: true,
      });

      mockUser.onboarding_completed = true;

      render(
        <MemoryRouter initialEntries={["/verify-email"]}>
          <Routes>
            <Route path="/verify-email" element={<VerifyEmailPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Tick 1: Mount effect
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });

      // Tick 2: Poll triggers getVerificationStatus
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });

      // Tick 3: Settle refreshUser and state updates
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });

      expect(screen.getByText("Email Verified!")).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });

      expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
    } finally {
      vi.useRealTimers();
    }
  });

  it("cleans up polling interval when unmounted", () => {
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");

    const { unmount } = render(
      <MemoryRouter initialEntries={["/verify-email"]}>
        <Routes>
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Routes>
      </MemoryRouter>
    );

    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it("handles expired verification token with clear expired state and resend option", async () => {
    mockSearchParams = new URLSearchParams("token=expired_token_xyz");
    vi.mocked(authService.verifyEmail).mockRejectedValue(
      new Error("Verification token has expired. Please request a new one.")
    );

    render(
      <MemoryRouter initialEntries={["/verify-email?token=expired_token_xyz"]}>
        <Routes>
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(authService.verifyEmail).toHaveBeenCalledWith({ token: "expired_token_xyz" });
    });

    // Flush microtasks so the rejected promise catch & finally blocks complete
    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByText(/verification link expired/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/request new verification link/i)).toBeInTheDocument();
  });

  it("handles resend verification request and displays cooldown timer", async () => {
    vi.mocked(authService.resendVerification).mockResolvedValue({
      success: true,
      message: "A new verification email has been sent.",
      email_sent: true,
      delivery_status: "sent",
    });

    render(
      <MemoryRouter initialEntries={["/verify-email"]}>
        <Routes>
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Routes>
      </MemoryRouter>
    );

    const resendBtn = screen.getByRole("button", { name: /resend verification email/i });
    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(authService.resendVerification).toHaveBeenCalledWith({
        email: "candidate@example.com",
      });
    });

    // Button should now reflect cooldown countdown
    expect(screen.getByText(/resend available in 60s/i)).toBeInTheDocument();
  });

  it("tolerates transient network errors during polling without crashing", async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(authService.getVerificationStatus).mockRejectedValue(new Error("Network Error"));

      render(
        <MemoryRouter initialEntries={["/verify-email"]}>
          <Routes>
            <Route path="/verify-email" element={<VerifyEmailPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Advance 4 polling intervals with errors
      for (let i = 0; i < 4; i++) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(3000);
        });
      }

      // Should display soft recoverable notice
      expect(
        screen.getByText(/checking verification status is taking longer than expected/i)
      ).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
