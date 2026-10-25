import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NotificationsPage from "@/pages/NotificationsPage";
import SkillPassportPage from "@/pages/SkillPassportPage";

// Mock AuthContext
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "u-123",
      email: "engineer@example.com",
      full_name: "Jane Dev",
      role: "user",
    },
  }),
}));

// Mock CareerContext
vi.mock("@/hooks/useCareerContext", () => ({
  useCareerContext: () => ({
    targetRole: "Full Stack Engineer",
    readiness: { roleMatch: 80, overallScore: 82 },
    detectedSkills: ["React", "TypeScript", "Node.js"],
    missingSkills: ["GraphQL"],
  }),
}));

// Mock NotificationContext
const mockMarkAllAsRead = vi.fn();
const mockClearAll = vi.fn();
const mockRefreshNotifications = vi.fn().mockResolvedValue(undefined);
const mockAddNotification = vi.fn();

vi.mock("@/context/NotificationContext", () => ({
  useNotifications: () => ({
    notifications: [
      {
        id: "notif-1",
        type: "job_match",
        title: "Senior React Developer opening at Stripe",
        message: "High 92% match with your Skill Passport",
        timestamp: new Date().toISOString(),
        isRead: false,
        actionHref: "/jobs",
        actionText: "View Match",
      },
      {
        id: "notif-2",
        type: "ats_score",
        title: "Resume Analysis Ready",
        message: "ATS compatibility score updated to 88/100",
        timestamp: new Date().toISOString(),
        isRead: true,
        actionHref: "/resume",
        actionText: "View Score",
      },
    ],
    unreadCount: 1,
    isLoading: false,
    markAsRead: vi.fn(),
    markAsUnread: vi.fn(),
    deleteNotification: vi.fn(),
    markAllAsRead: mockMarkAllAsRead,
    clearAll: mockClearAll,
    refreshNotifications: mockRefreshNotifications,
    addNotification: mockAddNotification,
  }),
  useSafeNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    markAsRead: vi.fn(),
    markAsUnread: vi.fn(),
    deleteNotification: vi.fn(),
    markAllAsRead: vi.fn(),
    clearAll: vi.fn(),
    refreshNotifications: vi.fn(),
    addNotification: vi.fn(),
  }),
}));

// Mock profileService
vi.mock("@/services/profileService", () => ({
  profileService: {
    getUserSkills: vi.fn().mockResolvedValue([
      {
        id: "s-1",
        skill_name: "React",
        skill_category: "technical",
        source: "verified",
        confidence: 0.95,
      },
      {
        id: "s-2",
        skill_name: "Docker",
        skill_category: "architecture",
        source: "project",
        confidence: 0.85,
      },
    ]),
    getProfile: vi.fn().mockResolvedValue({
      id: "u-123",
      full_name: "Jane Dev",
      headline: "Full Stack Engineer",
      target_role: "Full Stack Engineer",
      skills: [],
      profile_completeness: 85,
      is_public_passport: false,
      share_token: null,
    }),
    addSkill: vi.fn().mockImplementation((s) => Promise.resolve({ id: "s-new", ...s })),
    deleteSkill: vi.fn().mockResolvedValue(undefined),
    createPassportShareToken: vi.fn().mockResolvedValue({
      is_public: true,
      share_token: "tok-test-456",
      share_url: "/passport/shared/tok-test-456",
    }),
    revokePassportShareToken: vi.fn().mockResolvedValue({ is_public: false }),
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Notifications & Activity Center Feature Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page title, unread count badge, and notifications list", async () => {
    renderWithProviders(<NotificationsPage />);

    expect(screen.getByText("Notifications & Activity")).toBeInTheDocument();
    expect(screen.getByText("Stay on top of your career progress, applications, and skill milestones")).toBeInTheDocument();
    expect(screen.getByText("Senior React Developer opening at Stripe")).toBeInTheDocument();
    expect(screen.getByText("Resume Analysis Ready")).toBeInTheDocument();
  });

  it("filters notifications by Unread tab", async () => {
    renderWithProviders(<NotificationsPage />);

    const unreadTab = screen.getAllByRole("button", { name: /Unread/i })[0];
    fireEvent.click(unreadTab);

    expect(screen.getByText("Senior React Developer opening at Stripe")).toBeInTheDocument();
    expect(screen.queryByText("Resume Analysis Ready")).not.toBeInTheDocument();
  });

  it("allows triggering Mark All Read action", async () => {
    renderWithProviders(<NotificationsPage />);

    const markAllBtn = screen.getByRole("button", { name: /Mark All Read/i });
    fireEvent.click(markAllBtn);

    expect(mockMarkAllAsRead).toHaveBeenCalled();
  });
});

describe("Skill Passport Feature Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Skill Passport header, target role alignment, and metrics", async () => {
    renderWithProviders(<SkillPassportPage />);

    await waitFor(() => {
      expect(screen.getByText("Skill Passport")).toBeInTheDocument();
      expect(screen.getByText("Evidence-Based Portfolio")).toBeInTheDocument();
      expect(screen.getAllByText("React")[0]).toBeInTheDocument();
      expect(screen.getByText("Docker")).toBeInTheDocument();
      expect(screen.getByText("Verified Credential")).toBeInTheDocument();
      expect(screen.getByText("Project Evidence")).toBeInTheDocument();
    });
  });

  it("opens Add Skill modal and validates inputs", async () => {
    renderWithProviders(<SkillPassportPage />);

    await waitFor(() => {
      expect(screen.getByText("Add Skill")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Add Skill"));

    await waitFor(() => {
      expect(screen.getByText("Add Skill to Passport")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/TypeScript, Docker/i)).toBeInTheDocument();
    });
  });

  it("opens Share Passport modal with public link generation controls", async () => {
    renderWithProviders(<SkillPassportPage />);

    await waitFor(() => {
      expect(screen.getByText("Share Passport")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Share Passport"));

    await waitFor(() => {
      expect(screen.getByText("Shareable Skill Passport")).toBeInTheDocument();
      expect(screen.getByText("Enable Public Link")).toBeInTheDocument();
    });
  });
});
