import api from "./api";
import type { AnalyticsSummary, ATSTrend, SkillGrowth, CareerProgress } from "@/types";

export const analyticsService = {
  async getSummary(): Promise<AnalyticsSummary> {
    const res = await api.get("/analytics/summary");
    return res.data;
  },

  async getATSTrend(): Promise<ATSTrend[]> {
    const res = await api.get("/analytics/ats-trend");
    return res.data;
  },

  async getSkillGrowth(): Promise<SkillGrowth[]> {
    const res = await api.get("/analytics/skill-growth");
    return res.data;
  },

  async getCareerProgress(): Promise<CareerProgress[]> {
    const res = await api.get("/analytics/career-progress");
    return res.data;
  },
};
