import api from "./api";
import type { VoiceAnswerResponse } from "@/types";

export const voiceInterviewService = {
  async submitVoiceAnswer(audioBlob: Blob): Promise<VoiceAnswerResponse> {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    const res = await api.post("/interview/voice-answer", formData);
    return res.data;
  },
};
