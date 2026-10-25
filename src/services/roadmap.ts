import api from "./api";
import { sessionService } from "./sessionService";
import type { RoadmapRequest, RoadmapResponse } from "@/types";

export interface RoadmapProgressItem {
  id: string;
  role: string;
  experience_level: string;
  completed_steps: number[];
  created_at: string;
  updated_at: string;
}

export const roadmapService = {
  async generate(payload: RoadmapRequest): Promise<RoadmapResponse> {
    try {
      // Primary roadmap generation endpoint
      let res;
      try {
        res = await api.post("/roadmap/generate", payload, {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err: any) {
        // Fallback compatibility endpoint if /roadmap/generate is unavailable
        if (err?.response?.status === 404 || err?.response?.status === 405) {
          res = await api.post("/roles/career-path", payload, {
            headers: { "Content-Type": "application/json" },
          });
        } else {
          throw err;
        }
      }

      if (!res?.data) {
        throw new Error("No data received from roadmap API");
      }

      return res.data;
    } catch (error: any) {
      console.error("❌ Roadmap API Error:", error?.response || error);
      throw new Error(error?.response?.data?.detail || "Failed to generate roadmap");
    }
  },

  async getProgress(): Promise<RoadmapProgressItem[]> {
    if (!sessionService.getToken()) return [];
    try {
      const res = await api.get("/roadmap/progress");
      return res.data || [];
    } catch {
      return [];
    }
  },

  async saveProgress(role: string, experience_level: string, completed_steps: number[]): Promise<RoadmapProgressItem | null> {
    if (!sessionService.getToken()) return null;
    try {
      const res = await api.post("/roadmap/progress", {
        role,
        experience_level,
        completed_steps,
      });
      return res.data;
    } catch {
      return null;
    }
  },
};