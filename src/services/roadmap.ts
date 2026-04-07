import api from "./api";
import type { RoadmapRequest, RoadmapResponse } from "@/types";

export const roadmapService = {
  async generate(payload: RoadmapRequest): Promise<RoadmapResponse> {
    try {
      const res = await api.post(
        "/api/roles/career-path",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // ✅ Safety check
      if (!res?.data) {
        throw new Error("No data received from roadmap API");
      }

      return res.data;
    } catch (error: any) {
      console.error("❌ Roadmap API Error:", error?.response || error);

      // Optional: customize message
      throw new Error(
        error?.response?.data?.detail || "Failed to generate roadmap"
      );
    }
  },
};