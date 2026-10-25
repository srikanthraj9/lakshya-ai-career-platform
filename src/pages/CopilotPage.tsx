import React, { useState, useEffect, useCallback } from "react";
import { PageTransition } from "@/components/PageTransition";
import { CopilotSidebar } from "@/components/copilot/CopilotSidebar";
import { CopilotChatArea } from "@/components/copilot/CopilotChatArea";
import { CopilotContextCard } from "@/components/copilot/CopilotContextCard";
import { copilotService } from "@/services/copilot";
import { useCareerContext } from "@/hooks/useCareerContext";
import { getApiErrorMessage } from "@/services/api";
import { toast } from "sonner";
import type { CopilotChatMessage, CopilotConversation, CopilotMessage } from "@/types";

const SAVED_THREAD_KEY = "lakshya_active_copilot_thread";

export default function CopilotPage() {
  const { targetRole, activeResume, readiness, detectedSkills, missingSkills } = useCareerContext();

  const [conversations, setConversations] = useState<CopilotConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errorState, setErrorState] = useState<{ message: string; retryContent?: string } | null>(null);

  // Load conversation messages
  const loadConversationMessages = useCallback(async (convId: string) => {
    setLoadingHistory(true);
    setErrorState(null);
    try {
      const detail = await copilotService.getConversation(convId);
      setMessages(
        (detail.messages || []).map((m) => ({
          id: m.id,
          conversation_id: m.conversation_id,
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
          created_at: m.created_at,
          timestamp: new Date(m.created_at),
        }))
      );
    } catch (err) {
      console.error("Failed to load messages:", err);
      toast.error("Could not load conversation history");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Load conversations list on mount
  const loadConversations = useCallback(async (selectId?: string) => {
    try {
      const list = await copilotService.listConversations();
      setConversations(list);

      const savedThreadId = localStorage.getItem(SAVED_THREAD_KEY);
      let targetId = selectId;
      if (!targetId && savedThreadId && list.some((c) => c.id === savedThreadId)) {
        targetId = savedThreadId;
      } else if (!targetId && list.length > 0) {
        targetId = list[0].id;
      }

      if (targetId) {
        setActiveConversationId(targetId);
        localStorage.setItem(SAVED_THREAD_KEY, targetId);
        await loadConversationMessages(targetId);
      } else {
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  }, [loadConversationMessages]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  // Handle Switching Thread
  const handleSelectConversation = (id: string) => {
    if (id === activeConversationId) return;
    setActiveConversationId(id);
    localStorage.setItem(SAVED_THREAD_KEY, id);
    void loadConversationMessages(id);
  };

  // Handle Creating New Thread
  const handleNewConversation = async () => {
    try {
      const newConv = await copilotService.createConversation("New Career Discussion");
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      localStorage.setItem(SAVED_THREAD_KEY, newConv.id);
      setMessages([]);
      setErrorState(null);
      toast.success("New conversation started");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  // Handle Renaming Thread
  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      const updated = await copilotService.renameConversation(id, newTitle);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: updated.title } : c))
      );
      toast.success("Thread renamed");
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
          const nextId = remaining[0].id;
          setActiveConversationId(nextId);
          localStorage.setItem(SAVED_THREAD_KEY, nextId);
          void loadConversationMessages(nextId);
        } else {
          setActiveConversationId(null);
          localStorage.removeItem(SAVED_THREAD_KEY);
          setMessages([]);
        }
      }
      toast.success("Conversation deleted");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  // Send Message with Career Context Injected
  const handleSendMessage = async (content: string): Promise<boolean> => {
    const trimmed = content.trim();
    if (!trimmed || loading) return false;

    setErrorState(null);
    const userMsg: CopilotMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      let currentConvId = activeConversationId;
      if (!currentConvId) {
        const titleSnippet = trimmed.slice(0, 32) + (trimmed.length > 32 ? "..." : "");
        const newConv = await copilotService.createConversation(titleSnippet);
        currentConvId = newConv.id;
        setActiveConversationId(newConv.id);
        localStorage.setItem(SAVED_THREAD_KEY, newConv.id);
        setConversations((prev) => [newConv, ...prev]);
      }

      // Format payload from conversation history + latest user turn
      const payload: CopilotChatMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      payload.push({ role: "user", content: trimmed });

      const candidateContext = {
        target_role: targetRole || undefined,
        skills: detectedSkills?.length > 0 ? detectedSkills : undefined,
        skill_gaps: missingSkills?.length > 0 ? missingSkills : undefined,
        readiness_score: readiness?.overallScore ?? undefined,
        active_resume_file: activeResume?.file_name ?? undefined,
        ats_score: activeResume?.ats_score ?? undefined,
      };

      const response = await copilotService.chat(payload, currentConvId, candidateContext);

      const aiMsg: CopilotMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
      return true;
    } catch (err) {
      const errMsg = getApiErrorMessage(err);
      setErrorState({ message: errMsg, retryContent: trimmed });
      toast.error(errMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Handle Retry
  const handleRetry = () => {
    if (errorState?.retryContent) {
      // Remove the last user message if it was added, so it's not duplicated
      setMessages((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].role === "user") {
          return prev.slice(0, -1);
        }
        return prev;
      });
      const toRetry = errorState.retryContent;
      setErrorState(null);
      void handleSendMessage(toRetry);
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
              onRenameConversation={handleRenameConversation}
              isLoading={loadingHistory}
            />
          </div>

          {/* Right Main Column: Chat Workspace (8 cols) */}
          <div className="lg:col-span-8 h-[calc(100vh-12rem)] min-h-[580px]">
            <CopilotChatArea
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={loading}
              activeConversationId={activeConversationId}
              errorState={errorState}
              onRetry={handleRetry}
              onClearError={() => setErrorState(null)}
            />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
