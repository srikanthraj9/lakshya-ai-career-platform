import { api } from "@/services/api";

export interface SubmitFeedbackPayload {
  feedback_type: "helpful" | "unhelpful" | "issue" | "idea";
  module?: string;
  message?: string;
  metadata_json?: Record<string, unknown>;
}

export const feedbackService = {
  async submitFeedback(payload: SubmitFeedbackPayload) {
    const res = await api.post("/feedback", payload);
    return res.data;
  },
};
