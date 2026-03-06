import api from "./api";
import type { JobRecommendation } from "@/types";

export const jobsService = {
  async getRecommendations(resumeId: string): Promise<JobRecommendation[]> {
    const res = await api.get(`/jobs/recommend/${resumeId}`);
    return res.data;
  },
};
