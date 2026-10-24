import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProfilePage from "@/pages/ProfilePage";
import { profileService } from "@/services/profileService";

// Mock AuthContext
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "u-123",
      email: "engineer@example.com",
      full_name: "Jane Dev",
      role: "user",
      is_email_verified: true,
    },
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

// Mock CareerContext
vi.mock("@/hooks/useCareerContext", () => ({
  useCareerContext: () => ({
    targetRole: "Cloud Architect",
    setTargetRole: vi.fn(),
    readiness: {
      overallScore: 85,
      resumeHealth: 88,
      roleMatch: 82,
      interviewReadiness: 84,
    },
    detectedSkills: ["Kubernetes", "Terraform", "Go", "AWS", "Python"],
    missingSkills: ["Kafka"],
  }),
}));

// Mock profileService
vi.mock("@/services/profileService", () => ({
  profileService: {
    getProfile: vi.fn().mockResolvedValue({
      id: "u-123",
      full_name: "Jane Dev",
      email: "engineer@example.com",
      headline: "Senior Cloud Architect | Distributed Systems",
      bio: "Passionate about cloud-native infrastructure.",
      location: "San Francisco, CA",
      target_role: "Cloud Architect",
      experience_level: "Senior",
      education_level: "Master of Science in CS",
      college: "Stanford University",
      graduation_year: "2022",
      work_preference: "Remote Only",
      employment_type: "Full-time",
      portfolio_url: "https://janedev.io",
      github_url: "https://github.com/janedev",
      linkedin_url: "https://linkedin.com/in/janedev",
      primary_goals: ["Design high-scale cloud platforms"],
      skills: [],
      profile_completeness: 95,
      share_token: "tok-abc-123",
      is_public_passport: true,
    }),
    updateProfile: vi.fn().mockImplementation((data) => Promise.resolve(data)),
    getSettings: vi.fn().mockResolvedValue({
      notification_preferences: {
        in_app_enabled: true,
        email_enabled: false,
        job_matches: true,
        interview_reminders: true,
        roadmap_reminders: true,
        career_insights: true,
        weekly_summary: false,
      },
      privacy_settings: {
        passport_public: true,
        analytics_opt_in: true,
        personalized_recommendations: true,
      },
      appearance_settings: {
        theme: "dark",
        reduced_motion: false,
        compact_mode: false,
      },
      career_preferences: {
        target_role: "Cloud Architect",
        work_location: "Remote",
        employment_type: "Full-time",
        actively_looking: true,
      },
    }),
    updateSettings: vi.fn().mockImplementation((data) => Promise.resolve(data)),
    changePassword: vi.fn().mockResolvedValue({ message: "Password updated successfully" }),
    getDeletionToken: vi.fn().mockResolvedValue({
      deletion_token: "mock-oauth-del-token-123",
      expires_in_seconds: 300,
      auth_provider: "google",
    }),
    deleteAccount: vi.fn().mockResolvedValue({ success: true, message: "Account deleted successfully" }),
  },
}));

function renderProfilePage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Profile & Settings Feature Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders professional profile with authenticated identity and headline", async () => {
    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByText("Jane Dev")).toBeInTheDocument();
      expect(screen.getByText("Verified Account")).toBeInTheDocument();
      expect(screen.getByText("Senior Cloud Architect | Distributed Systems")).toBeInTheDocument();
      expect(screen.getByText("engineer@example.com")).toBeInTheDocument();
      expect(screen.getAllByText("Cloud Architect")[0]).toBeInTheDocument();
    });
  });

  it("displays profile completeness progress bar", async () => {
    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByText("Profile Completeness")).toBeInTheDocument();
      expect(screen.getByText("95% Complete")).toBeInTheDocument();
    });
  });

  it("switches to Settings & Preferences tab and renders settings categories", async () => {
    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByText("Settings & Preferences")).toBeInTheDocument();
    });

    const settingsTab = screen.getByRole("button", { name: /Settings & Preferences/i });
    fireEvent.click(settingsTab);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Personal Information/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Career Preferences/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Account & Security/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Privacy & Visibility/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Notifications/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Appearance & Theme/i })).toBeInTheDocument();
    });
  });

  it("navigates into Account & Security settings and renders change password controls", async () => {
    renderProfilePage();

    const settingsTab = screen.getByRole("button", { name: /Settings & Preferences/i });
    fireEvent.click(settingsTab);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Account & Security/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Account & Security/i }));

    await waitFor(() => {
      expect(screen.getByText("Change Account Password")).toBeInTheDocument();
      expect(screen.getByText("Current Password")).toBeInTheDocument();
      expect(screen.getByText("New Password")).toBeInTheDocument();
      expect(screen.getByText("Confirm New Password")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Update Password/i })).toBeInTheDocument();
    });
  });

  it("renders Danger Zone in Account & Security and allows opening and canceling deletion modal", async () => {
    renderProfilePage();

    const settingsTab = screen.getByRole("button", { name: /Settings & Preferences/i });
    fireEvent.click(settingsTab);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Account & Security/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Account & Security/i }));

    await waitFor(() => {
      expect(screen.getByText("Danger Zone")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Delete My Account/i })).toBeInTheDocument();
    });

    // Click "Delete My Account" button to open modal
    fireEvent.click(screen.getByRole("button", { name: /Delete My Account/i }));

    await waitFor(() => {
      expect(screen.getByText("Permanently Delete Account?")).toBeInTheDocument();
      expect(screen.getByText(/The following personal data categories will be permanently destroyed/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Current Account Password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm permanent deletion/i)).toBeInTheDocument();
    });

    // Click Cancel to dismiss
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText("Permanently Delete Account?")).not.toBeInTheDocument();
    });
  });

  it("handles account deletion for password account requiring password and DELETE confirmation", async () => {
    renderProfilePage();

    const settingsTab = screen.getByRole("button", { name: /Settings & Preferences/i });
    fireEvent.click(settingsTab);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Account & Security/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Account & Security/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Delete My Account/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Delete My Account/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Current Account Password/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: /Permanently Delete/i });
    expect(submitBtn).toBeDisabled();

    // Type DELETE only -> still disabled without password
    const confirmInput = screen.getByLabelText(/confirm permanent deletion/i);
    fireEvent.change(confirmInput, { target: { value: "DELETE" } });
    expect(submitBtn).toBeDisabled();

    // Enter password -> now enabled
    const passwordInput = screen.getByLabelText(/Current Account Password/i);
    fireEvent.change(passwordInput, { target: { value: "MySecurePassword123!" } });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(profileService.deleteAccount).toHaveBeenCalledWith({
        confirmation: "DELETE",
        password: "MySecurePassword123!",
        deletion_token: undefined,
      });
    });
  });

  it("handles account deletion for Google OAuth account with single-use deletion token without requiring password", async () => {
    (profileService.getProfile as any).mockResolvedValueOnce({
      id: "u-oauth-999",
      full_name: "Google User",
      email: "googleuser@gmail.com",
      auth_provider: "google",
      headline: "Staff Engineer",
      skills: [],
      profile_completeness: 80,
    });

    renderProfilePage();

    const settingsTab = screen.getByRole("button", { name: /Settings & Preferences/i });
    fireEvent.click(settingsTab);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Account & Security/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Account & Security/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Delete My Account/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Delete My Account/i }));

    await waitFor(() => {
      // Must NOT render current password input
      expect(screen.queryByLabelText(/Current Account Password/i)).not.toBeInTheDocument();
      // Must render Google sign-in badge and clear explanation
      expect(screen.getByText(/Google Sign-In Account/i)).toBeInTheDocument();
      expect(screen.getByText(/Lakshya AI will never ask for your Google password/i)).toBeInTheDocument();
      expect(screen.getByText(/Authorization token active/i)).toBeInTheDocument();
    });

    // Verify getDeletionToken was automatically called on modal open
    expect(profileService.getDeletionToken).toHaveBeenCalled();

    const submitBtn = screen.getByRole("button", { name: /Permanently Delete/i });
    expect(submitBtn).toBeDisabled();

    // Enter confirmation DELETE -> button becomes enabled immediately without password
    const confirmInput = screen.getByLabelText(/confirm permanent deletion/i);
    fireEvent.change(confirmInput, { target: { value: "DELETE" } });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(profileService.deleteAccount).toHaveBeenCalledWith({
        confirmation: "DELETE",
        password: undefined,
        deletion_token: "mock-oauth-del-token-123",
      });
    });
  });

  it("handles failed deletion-token request and displays actionable error in dialog", async () => {
    (profileService.getProfile as any).mockResolvedValueOnce({
      id: "u-oauth-err",
      full_name: "OAuth Error User",
      email: "erroruser@gmail.com",
      auth_provider: "google",
      skills: [],
      profile_completeness: 80,
    });
    (profileService.getDeletionToken as any).mockRejectedValueOnce({
      response: {
        data: {
          detail: "Unable to issue deletion token. Token service temporarily unavailable.",
        },
      },
    });

    renderProfilePage();

    const settingsTab = screen.getByRole("button", { name: /Settings & Preferences/i });
    fireEvent.click(settingsTab);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Account & Security/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Account & Security/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Delete My Account/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Delete My Account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Unable to issue deletion token/i)).toBeInTheDocument();
      expect(screen.getByText(/Authorization token not active/i)).toBeInTheDocument();
    });

    // Enter confirmation DELETE -> submit button must still be disabled because no active token
    const confirmInput = screen.getByLabelText(/confirm permanent deletion/i);
    fireEvent.change(confirmInput, { target: { value: "DELETE" } });
    const submitBtn = screen.getByRole("button", { name: /Permanently Delete/i });
    expect(submitBtn).toBeDisabled();
  });

  it("correctly renders deletion dialog for existing Google account with legacy or backfilled provider metadata", async () => {
    (profileService.getProfile as any).mockResolvedValueOnce({
      id: "u-legacy-backfilled",
      full_name: "Srikanthraj Uppalapati",
      email: "srikanthrajuppalapati999@gmail.com",
      auth_provider: "google",
      headline: "Full Stack Developer",
      skills: [],
      profile_completeness: 85,
    });

    renderProfilePage();

    const settingsTab = screen.getByRole("button", { name: /Settings & Preferences/i });
    fireEvent.click(settingsTab);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Account & Security/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Account & Security/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Delete My Account/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Delete My Account/i }));

    await waitFor(() => {
      expect(screen.queryByLabelText(/Current Account Password/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Google Sign-In Account/i)).toBeInTheDocument();
      expect(screen.getByText(/Google OAuth/i)).toBeInTheDocument();
      expect(screen.getByText(/Authorization token active/i)).toBeInTheDocument();
    });
  });
});
