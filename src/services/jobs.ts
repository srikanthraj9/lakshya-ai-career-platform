import api from "./api";
import type { JobRecommendationsResponse } from "@/types";

export const jobsService = {
  async getRecommendations(resumeId: string): Promise<JobRecommendationsResponse> {
    const res = await api.get(`/jobs/recommend/${resumeId}`);
    return res.data;
  },
};
