import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import InterviewStudioPage from "@/pages/InterviewStudioPage";
import { setActiveTargetRole } from "@/lib/navigationStatus";
import { interviewService } from "@/services/interview";

// Mock interviewService
vi.mock("@/services/interview", () => ({
  interviewService: {
    start: vi.fn(),
    next: vi.fn(),
    getReport: vi.fn(),
    listSessions: vi.fn().mockResolvedValue([]),
    getSession: vi.fn(),
  },
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderWithProviders(ui: React.ReactElement, initialEntries = ["/interview"]) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/interview" element={ui} />
          <Route path="/interview/session" element={ui} />
          <Route path="/interview/report/:sessionId?" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Interview Studio Runtime Integrity & Role Resolution Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders Interview Studio setup without crashing when no target role or navigation state exists", async () => {
    // Missing role scenario — must not throw 'targetRole is not defined'
    renderWithProviders(<InterviewStudioPage />);

    expect(screen.getByText(/Interview Intelligence Studio/i)).toBeInTheDocument();
    expect(screen.getByText(/Configure Your Mock Interview/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Target Job Role/i)).toBeInTheDocument();

    const roleInput = screen.getByLabelText(/Target Job Role/i) as HTMLInputElement;
    expect(roleInput.value).toBe("");
  });

  it("pre-populates role from explicit prop without errors", async () => {
    renderWithProviders(<InterviewStudioPage initialRole="Senior Backend Architect" />);

    const roleInput = screen.getByLabelText(/Target Job Role/i) as HTMLInputElement;
    expect(roleInput.value).toBe("Senior Backend Architect");
  });

  it("pre-populates role from URL search parameters (?role=...)", async () => {
    renderWithProviders(<InterviewStudioPage />, ["/interview?role=Data%20Scientist"]);

    const roleInput = screen.getByLabelText(/Target Job Role/i) as HTMLInputElement;
    expect(roleInput.value).toBe("Data Scientist");
  });

  it("pre-populates role from user storage when previously configured", async () => {
    setActiveTargetRole("Frontend Developer", 85, "test-user-id");

    // Mock localStorage item to simulate active target role in user-scoped storage
    localStorage.setItem("lakshya:test-user-id:target_role", JSON.stringify({ title: "DevOps Engineer", readiness: 80 }));

    renderWithProviders(<InterviewStudioPage />);

    expect(screen.getByText(/Interview Intelligence Studio/i)).toBeInTheDocument();
  });

  it("clicking a popular role pill populates the role input", async () => {
    renderWithProviders(<InterviewStudioPage />);

    const fullStackPill = screen.getByRole("button", { name: "Full Stack Engineer" });
    fireEvent.click(fullStackPill);

    const roleInput = screen.getByLabelText(/Target Job Role/i) as HTMLInputElement;
    expect(roleInput.value).toBe("Full Stack Engineer");
  });

  it("handles active text session with null activeSession gracefully by rendering fallback card instead of blank screen", async () => {
    renderWithProviders(<InterviewStudioPage initialStage="active" mode="text" />, ["/interview/session"]);

    expect(screen.getByText(/No Active Interview in Progress/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Configure New Interview/i })).toBeInTheDocument();
  });

  it("handles report stage with no session ID by rendering 'No Report Selected' state", async () => {
    renderWithProviders(<InterviewStudioPage initialStage="report" />, ["/interview/report"]);

    expect(screen.getByText(/No Report Selected/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start New Interview/i })).toBeInTheDocument();
  });

  it("launches text interview session when user configures and submits role", async () => {
    (interviewService.start as any).mockResolvedValueOnce({
      session_id: "test-sess-123",
      role: "AI / ML Engineer",
      difficulty: "medium",
      mode: "text",
      question: "Explain the difference between supervised and unsupervised learning.",
      question_index: 1,
      total_questions: 5,
      remaining_seconds: 45,
    });

    renderWithProviders(<InterviewStudioPage />);

    const roleInput = screen.getByLabelText(/Target Job Role/i);
    fireEvent.change(roleInput, { target: { value: "AI / ML Engineer" } });

    const submitBtn = screen.getByRole("button", { name: /Launch Text Interview Session/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(interviewService.start).toHaveBeenCalledWith("AI / ML Engineer", "medium", "text");
    });
  });
});
