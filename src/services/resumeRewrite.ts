import api from "./api";
import type { ResumeRewriteResponse } from "@/types";

export const resumeRewriteService = {
  async rewrite(resumeText: string): Promise<ResumeRewriteResponse> {
    const res = await api.post("/resume/rewrite", { resume_text: resumeText });
    return res.data;
  },
};
