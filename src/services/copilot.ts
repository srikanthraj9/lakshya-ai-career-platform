import api from "./api";
import type { CopilotChatMessage, CopilotResponse } from "@/types";

export const copilotService = {
  async chat(messages: CopilotChatMessage[]): Promise<CopilotResponse> {
    const res = await api.post("/copilot/chat", {
      messages,
    });
    return res.data;
  },
};
