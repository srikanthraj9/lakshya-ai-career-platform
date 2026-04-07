import api from "./api";
import type { InterviewNextResponse, InterviewReport, InterviewSession } from "@/types";

export const interviewService = {
  async start(role: string, difficulty: string, mode: string): Promise<InterviewSession> {
    const res = await api.post("/interview/start", { role, difficulty, mode });
    return res.data;
  },

  async next(sessionId: string, answer: string): Promise<InterviewNextResponse> {
    const res = await api.post("/interview/next", { session_id: sessionId, answer });
    return res.data;
  },

  async getReport(sessionId: string): Promise<InterviewReport> {
    const res = await api.get(`/interview/report/${sessionId}`);
    return res.data;
  },
};
