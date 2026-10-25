import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import CopilotPage from "@/pages/CopilotPage";
import { copilotService } from "@/services/copilot";

// Mock copilotService
vi.mock("@/services/copilot", () => ({
  copilotService: {
    listConversations: vi.fn().mockResolvedValue([
      {
        id: "conv-1",
        title: "Senior Full Stack Roadmap",
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ]),
    getConversation: vi.fn().mockResolvedValue({
      id: "conv-1",
      title: "Senior Full Stack Roadmap",
      messages: [],
    }),
    createConversation: vi.fn().mockResolvedValue({
      id: "conv-new-1",
      title: "New Career Discussion",
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }),
    deleteConversation: vi.fn().mockResolvedValue({ message: "Deleted" }),
    chat: vi.fn(),
    sendMessage: vi.fn(),
  },
}));

// Mock useCareerContext
vi.mock("@/hooks/useCareerContext", () => ({
  useCareerContext: () => ({
    targetRole: "Senior Full Stack Engineer",
    activeResume: { id: "res-1", ats_score: 92 },
    readiness: { overallScore: 88 },
    missingSkills: ["Docker", "Redis"],
  }),
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Career Copilot Dynamic Response & Non-Repeating Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Copilot workspace with starter prompts and context", async () => {
    renderWithProviders(<CopilotPage />);

    expect(screen.getByText(/Lakshya Career Copilot/i)).toBeInTheDocument();
    expect(screen.getByText(/How can I help you grow today\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Senior Full Stack roles/i)).toBeInTheDocument();
  });

  it("sends user question 'hi' and renders the personalized AI greeting instead of generic fallback", async () => {
    (copilotService.chat as any).mockResolvedValueOnce({
      reply: "Hello! Welcome to Lakshya AI. I am your career mentor. How can I assist with your resume or interview prep today?",
      conversation_id: "conv-1",
    });

    renderWithProviders(<CopilotPage />);
    await screen.findByText(/Senior Full Stack Roadmap/i);

    const textarea = screen.getByPlaceholderText(/Ask Copilot anything/i);
    fireEvent.change(textarea, { target: { value: "hi" } });

    const sendBtn = screen.getByRole("button", { name: /Send Message/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(copilotService.chat).toHaveBeenCalledTimes(1);
    });

    const callArgs = (copilotService.chat as any).mock.calls[0];
    const sentMessages = callArgs[0];
    expect(sentMessages[sentMessages.length - 1]).toEqual({
      role: "user",
      content: "hi",
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Hello! Welcome to Lakshya AI. I am your career mentor/i)
      ).toBeInTheDocument();
    });
  });

  it("submits 'create road map for me' and displays tailored roadmap response", async () => {
    (copilotService.chat as any).mockResolvedValueOnce({
      reply: "Here is your tailored 12-week roadmap for Senior Full Stack Engineer focusing on Docker and Redis.",
      conversation_id: "conv-1",
    });

    renderWithProviders(<CopilotPage />);
    await screen.findByText(/Senior Full Stack Roadmap/i);

    const textarea = screen.getByPlaceholderText(/Ask Copilot anything/i);
    fireEvent.change(textarea, { target: { value: "create road map for me" } });

    const sendBtn = screen.getByRole("button", { name: /Send Message/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(copilotService.chat).toHaveBeenCalledWith(
        expect.arrayContaining([{ role: "user", content: "create road map for me" }]),
        "conv-1",
        expect.objectContaining({ target_role: "Senior Full Stack Engineer" })
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Here is your tailored 12-week roadmap for Senior Full Stack Engineer/i)
      ).toBeInTheDocument();
    });
  });

  it("submits technical gap question and displays engineering competencies", async () => {
    const technicalQuestion = "How do I close my Docker and Redis skill gaps for Senior Full Stack roles?";
    (copilotService.chat as any).mockResolvedValueOnce({
      reply: "To close your Docker and Redis gaps: 1. Build multi-stage Dockerfiles with healthchecks. 2. Implement Redis caching patterns with distributed locks.",
      conversation_id: "conv-1",
    });

    renderWithProviders(<CopilotPage />);
    await screen.findByText(/Senior Full Stack Roadmap/i);

    const textarea = screen.getByPlaceholderText(/Ask Copilot anything/i);
    fireEvent.change(textarea, { target: { value: technicalQuestion } });

    const sendBtn = screen.getByRole("button", { name: /Send Message/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(copilotService.chat).toHaveBeenCalledWith(
        expect.arrayContaining([{ role: "user", content: technicalQuestion }]),
        "conv-1",
        expect.objectContaining({
          target_role: "Senior Full Stack Engineer",
          skill_gaps: expect.arrayContaining(["Docker", "Redis"]),
        })
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Build multi-stage Dockerfiles with healthchecks/i)
      ).toBeInTheDocument();
    });
  });

  it("prevents empty or duplicate message submissions while loading", async () => {
    (copilotService.chat as any).mockReturnValue(new Promise(() => {})); // pending promise

    renderWithProviders(<CopilotPage />);
    await screen.findByText(/Senior Full Stack Roadmap/i);

    const textarea = screen.getByPlaceholderText(/Ask Copilot anything/i);
    fireEvent.change(textarea, { target: { value: "first message" } });

    const sendBtn = screen.getByRole("button", { name: /Send Message/i });
    fireEvent.click(sendBtn);

    // Try sending again while loading
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(copilotService.chat).toHaveBeenCalledTimes(1);
    });
  });
});
