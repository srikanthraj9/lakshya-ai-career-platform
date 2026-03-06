import api from "./api";
import type { LiveJob } from "@/types";

export const liveJobsService = {
  async getLiveJobs(): Promise<LiveJob[]> {
    const res = await api.get("/jobs/live");
    return res.data;
  },
};
