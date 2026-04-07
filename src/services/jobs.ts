import api from "./api";
import type { JobRecommendationsResponse } from "@/types";

export const jobsService = {
  async getRecommendations(resumeId: string): Promise<JobRecommendationsResponse> {
    if (!resumeId) {
      throw new Error("Resume ID is required to load job recommendations.");
    }

    try {
      const res = await api.get(`/jobs/recommend/${encodeURIComponent(resumeId)}`);
      return res.data;
    } catch (error: any) {
      console.error("[Jobs API Error]", {
        resumeId,
        error: error?.response?.data || error,
      });
      throw new Error(
        error?.response?.data?.detail || error?.message || "Failed to load job recommendations.",
      );
    }
  },
};
