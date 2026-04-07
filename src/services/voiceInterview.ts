import api from "./api";
import type { VoiceAnswerResponse, VoiceChatMessage, VoiceChatResponse, VoiceQuestionResponse } from "@/types";

export const voiceInterviewService = {
  async getQuestion(role: string): Promise<VoiceQuestionResponse> {
    const res = await api.get("/voice/question", {
      params: { role },
    });
    return res.data;
  },

  async submitVoiceAnswer(
    audioBlob: Blob,
    options: {
      role: string;
      question: string;
      transcript: string;
    },
  ): Promise<VoiceAnswerResponse> {
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    formData.append("role", options.role);
    formData.append("question", options.question);
    formData.append("transcript", options.transcript);
    const res = await api.post("/voice/analyze", formData);
    return res.data;
  },

  async submitVoiceChat(
    audioBlob: Blob,
    options: {
      messages: VoiceChatMessage[];
      transcript?: string;
    },
  ): Promise<VoiceChatResponse> {
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    formData.append("messages", JSON.stringify(options.messages));
    if (options.transcript?.trim()) {
      formData.append("transcript", options.transcript.trim());
    }
    const res = await api.post("/voice/chat", formData);
    return res.data;
  },
};
