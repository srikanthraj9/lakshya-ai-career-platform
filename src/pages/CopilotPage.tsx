import React, { useState, useEffect, useCallback, useMemo } from "react";
import { PageTransition } from "@/components/PageTransition";
import { CopilotSidebar } from "@/components/copilot/CopilotSidebar";
import { CopilotChatArea } from "@/components/copilot/CopilotChatArea";
import { CopilotContextCard } from "@/components/copilot/CopilotContextCard";
import { copilotService } from "@/services/copilot";
import { useCareerContext } from "@/hooks/useCareerContext";
import { getApiErrorMessage } from "@/services/api";
import { toast } from "sonner";
import type { CopilotChatMessage, CopilotConversation, CopilotMessage } from "@/types";

export default function CopilotPage() {
  const { targetRole, activeResume, readiness, missingSkills } = useCareerContext();

  const [conversations, setConversations] = useState<CopilotConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load conversations on mount
  const loadConversations = useCallback(async (selectId?: string) => {
    try {
      const list = await copilotService.listConversations();
      setConversations(list);

      const targetId = selectId || (list.length > 0 ? list[0].id : null);
      if (targetId) {
        setActiveConversationId(targetId);
        await loadConversationMessages(targetId);
      } else {
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  }, []);

  const loadConversationMessages = async (convId: string) => {
    setLoadingHistory(true);
    try {
      const detail = await copilotService.getConversation(convId);
      setMessages(
        detail.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
          timestamp: new Date(m.created_at),
        }))
      );
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  // Handle Switching Thread
  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    void loadConversationMessages(id);
  };

  // Handle Creating New Thread
  const handleNewConversation = async () => {
    try {
      const newConv = await copilotService.createConversation("New Career Discussion");
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setMessages([]);
      toast.success("New conversation started");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  // Handle Deleting Thread
  const handleDeleteConversation = async (id: string) => {
    try {
      await copilotService.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        const remaining = conversations.filter((c) => c.id !== id);
        if (remaining.length > 0) {
          setActiveConversationId(remaining[0].id);
          void loadConversationMessages(remaining[0].id);
        } else {
          setActiveConversationId(null);
          setMessages([]);
        }
      }
      toast.success("Conversation deleted");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  // Send Message with Career Context Injected
  const handleSendMessage = async (content: string) => {
    const userMsg: CopilotMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      let currentConvId = activeConversationId;
      if (!currentConvId) {
        const newConv = await copilotService.createConversation(
          content.slice(0, 30) + (content.length > 30 ? "..." : "")
        );
        currentConvId = newConv.id;
        setActiveConversationId(newConv.id);
        setConversations((prev) => [newConv, ...prev]);
      }

      // Format payload with context if needed
      const payload: CopilotChatMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Inject career context snapshot on the opening turn
      const contextualContent =
        messages.length === 0
          ? `[Candidate Context: Target Role="${targetRole}", ATS Score=${activeResume?.ats_score ?? 90}%, Top Gaps=${missingSkills.slice(0, 3).join(", ")}, Readiness=${readiness.overallScore}%]\n\n${content}`
          : content;

      payload.push({ role: "user", content: contextualContent });

      const response = await copilotService.chat(payload, currentConvId);

      const aiMsg: CopilotMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Left Sidebar: Threads & Career Context (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <CopilotContextCard />
            <CopilotSidebar
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleNewConversation}
              onDeleteConversation={handleDeleteConversation}
              isLoading={loadingHistory}
            />
          </div>

          {/* Right Main Column: Chat Workspace (8 cols) */}
          <div className="lg:col-span-8">
            <CopilotChatArea
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={loading}
            />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
