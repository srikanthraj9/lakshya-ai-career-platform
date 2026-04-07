import api from "./api";
import type { CopilotResponse } from "@/types";

export const copilotService = {
  async chat({
    resumeId,
    userId,
    message,
    contextProfile,
  }: {
    resumeId: string;
    userId?: string;
    message: string;
    contextProfile?: {
      resume_name?: string;
      target_role?: string;
      focus_skills?: string[];
      notes?: string;
    };
  }): Promise<CopilotResponse> {
    const res = await api.post("/copilot/chat", {
      resume_id: resumeId,
      user_id: userId,
      message,
      context_profile: contextProfile,
    });
    return res.data;
  },
};
