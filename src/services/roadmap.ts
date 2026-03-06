import api from "./api";
import type { RoadmapResponse } from "@/types";

export const roadmapService = {
  async generate(role: string): Promise<RoadmapResponse> {
    const res = await api.post("/roles/roadmap", { role });
    return res.data;
  },
};
