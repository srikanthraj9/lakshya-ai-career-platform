import api from "./api";
import type {
  CopilotChatMessage,
  CopilotConversation,
  CopilotConversationDetail,
  CopilotResponse,
} from "@/types";

export const copilotService = {
  async chat(
    messages: CopilotChatMessage[],
    conversationId?: string,
  ): Promise<CopilotResponse> {
    const res = await api.post<CopilotResponse>("/copilot/chat", {
      messages,
      conversation_id: conversationId,
    });
    return res.data;
  },

  async listConversations(): Promise<CopilotConversation[]> {
    const res = await api.get<CopilotConversation[]>("/copilot/conversations");
    return res.data;
  },

  async getConversation(id: string): Promise<CopilotConversationDetail> {
    const res = await api.get<CopilotConversationDetail>(`/copilot/conversations/${id}`);
    return res.data;
  },

  async createConversation(title?: string): Promise<CopilotConversation> {
    const res = await api.post<CopilotConversation>("/copilot/conversations", null, {
      params: { title: title || "Career Advice" },
    });
    return res.data;
  },

  async deleteConversation(id: string): Promise<{ message: string }> {
    const res = await api.delete<{ message: string }>(`/copilot/conversations/${id}`);
    return res.data;
  },
};
