import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CopilotChatArea } from "@/components/copilot/CopilotChatArea";
import { CopilotSidebar } from "@/components/copilot/CopilotSidebar";
import type { CopilotMessage, CopilotConversation } from "@/types";

describe("CopilotChatArea UI, Scrolling & Formatting Regression Suite", () => {
  const mockSendMessage = vi.fn().mockResolvedValue(true);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders rich Markdown tables, code blocks, lists, and headers using remark-gfm", async () => {
    const markdownMessage: CopilotMessage = {
      id: "msg-1",
      role: "assistant",
      content: `
# Architecture Assessment

Here is the comparison table:

| Skill | Current Level | Required Level | Priority |
| :--- | :--- | :--- | :--- |
| Docker | Beginner | Advanced | High |
| Redis | Missing | Intermediate | Urgent |

### Implementation Step
\`\`\`dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "start"]
\`\`\`

- Step 1: Containerize API
- Step 2: Configure Redis Cache
      `,
      created_at: new Date().toISOString(),
    };

    render(
      <CopilotChatArea
        messages={[markdownMessage]}
        onSendMessage={mockSendMessage}
        isLoading={false}
      />
    );

    // Header check
    expect(screen.getByRole("heading", { level: 1, name: /Architecture Assessment/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: /Implementation Step/i })).toBeInTheDocument();

    // Table check (parsed properly by remark-gfm)
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Skill/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Priority/i })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /Docker/i })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /Redis/i })).toBeInTheDocument();

    // Code block check
    expect(screen.getByText(/FROM node:20-alpine/i)).toBeInTheDocument();
    expect(screen.getByText("dockerfile")).toBeInTheDocument();

    // List items check
    expect(screen.getByText(/Step 1: Containerize API/i)).toBeInTheDocument();
  });

  it("handles keyboard events: Enter sends message, Shift+Enter permits newline", async () => {
    render(
      <CopilotChatArea
        messages={[]}
        onSendMessage={mockSendMessage}
        isLoading={false}
      />
    );

    const textarea = screen.getByPlaceholderText(/Ask Copilot anything/i);

    // Shift + Enter should NOT send
    fireEvent.change(textarea, { target: { value: "Line 1" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(mockSendMessage).not.toHaveBeenCalled();

    // Enter alone sends message
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(mockSendMessage).toHaveBeenCalledWith("Line 1");
  });

  it("displays error state with retry button without duplicating messages", async () => {
    const onRetry = vi.fn();
    const onClearError = vi.fn();

    render(
      <CopilotChatArea
        messages={[{ id: "m1", role: "user", content: "Explain microservices", created_at: "2026-10-25" }]}
        onSendMessage={mockSendMessage}
        isLoading={false}
        errorState={{ message: "Groq API timeout. Please retry.", retryContent: "Explain microservices" }}
        onRetry={onRetry}
        onClearError={onClearError}
      />
    );

    expect(screen.getByText(/Groq API timeout. Please retry./i)).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /Retry/i });
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("provides scroll to latest button and triggers scroll container", async () => {
    const messages: CopilotMessage[] = Array.from({ length: 8 }, (_, i) => ({
      id: `m-${i}`,
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Message ${i} content with details`,
      created_at: new Date().toISOString(),
    }));

    const { container } = render(
      <CopilotChatArea
        messages={messages}
        onSendMessage={mockSendMessage}
        isLoading={false}
      />
    );

    const scrollContainer = container.querySelector(".overflow-y-auto") as HTMLDivElement;
    expect(scrollContainer).toBeInTheDocument();

    // Simulate scrolled up state
    Object.defineProperty(scrollContainer, "scrollHeight", { value: 2000, configurable: true });
    Object.defineProperty(scrollContainer, "clientHeight", { value: 400, configurable: true });
    Object.defineProperty(scrollContainer, "scrollTop", { value: 200, configurable: true, writable: true });

    fireEvent.scroll(scrollContainer);

    // Scroll to latest button should be visible
    const scrollToLatestBtn = await screen.findByRole("button", { name: /Scroll to latest/i });
    expect(scrollToLatestBtn).toBeInTheDocument();

    // Clicking scroll to latest
    fireEvent.click(scrollToLatestBtn);
    expect(scrollContainer.scrollTop).toBe(2000);
  });
});

describe("CopilotSidebar Thread Management Regression Suite", () => {
  const mockSelect = vi.fn();
  const mockNew = vi.fn();
  const mockDelete = vi.fn();
  const mockRename = vi.fn().mockResolvedValue(undefined);

  const testConversations: CopilotConversation[] = [
    {
      id: "conv-1",
      user_id: "user-123",
      title: "Senior Full Stack Roadmap",
      created_at: "2026-10-25T10:00:00Z",
      updated_at: "2026-10-25T10:00:00Z",
      messages: [],
    },
    {
      id: "conv-2",
      user_id: "user-123",
      title: "System Design Prep",
      created_at: "2026-10-24T10:00:00Z",
      updated_at: "2026-10-24T10:00:00Z",
      messages: [],
    },
  ];

  it("allows renaming a conversation thread inline", async () => {
    render(
      <CopilotSidebar
        conversations={testConversations}
        activeConversationId="conv-1"
        onSelectConversation={mockSelect}
        onNewConversation={mockNew}
        onDeleteConversation={mockDelete}
        onRenameConversation={mockRename}
      />
    );

    // Find rename button for conv-1
    const renameButtons = screen.getAllByTitle("Rename thread");
    expect(renameButtons.length).toBeGreaterThan(0);

    fireEvent.click(renameButtons[0]);

    // Should render input with existing title
    const renameInput = screen.getByDisplayValue("Senior Full Stack Roadmap");
    expect(renameInput).toBeInTheDocument();

    fireEvent.change(renameInput, { target: { value: "Principal Architect Roadmap" } });

    // Click save button
    const saveButton = screen.getByTitle("Save");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockRename).toHaveBeenCalledWith("conv-1", "Principal Architect Roadmap");
    });
  });
});
