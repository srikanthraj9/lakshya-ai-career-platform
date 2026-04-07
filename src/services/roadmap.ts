import api from "./api";
import type { RoadmapRequest, RoadmapResponse } from "@/types";

export const roadmapService = {
  async generate(payload: RoadmapRequest): Promise<RoadmapResponse> {
    const res = await api.post("/roadmap/generate", payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return res.data;
  },
};
