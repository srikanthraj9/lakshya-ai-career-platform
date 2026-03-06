import api from "./api";
import type { InterviewSession, InterviewQuestion, InterviewReport } from "@/types";

export const interviewService = {
  async start(role: string, difficulty: string, mode: string): Promise<InterviewSession> {
    const res = await api.post("/interview/start", { role, difficulty, mode });
    return res.data;
  },

  async getQuestion(): Promise<InterviewQuestion> {
    const res = await api.get("/interview/question");
    return res.data;
  },

  async submitAnswer(questionId: string, answer: string): Promise<{ status: string }> {
    const res = await api.post("/interview/answer", { question_id: questionId, answer });
    return res.data;
  },

  async getReport(sessionId: string): Promise<InterviewReport> {
    const res = await api.get(`/interview/report/${sessionId}`);
    return res.data;
  },
};
