import api from "./api";
import type { CopilotResponse } from "@/types";

export const copilotService = {
  async chat(message: string): Promise<CopilotResponse> {
    const res = await api.post("/copilot/chat", { message });
    return res.data;
  },
};
