import api from "./api";
import type { ResumeRewriteResponse } from "@/types";

const REWRITE_TIMEOUT_MS = 120000;

export const resumeRewriteService = {
  async rewrite(resumeText: string, jobDescription?: string): Promise<ResumeRewriteResponse> {
    const payload = {
      text: resumeText,
      job_description: jobDescription,
    };
    console.info("[Resume Rewrite Request]", {
      url: "/resume/rewrite",
      textLength: resumeText.length,
      hasJobDescription: Boolean(jobDescription?.trim()),
      timeoutMs: REWRITE_TIMEOUT_MS,
    });

    const res = await api.post("/resume/rewrite", {
      ...payload,
    }, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: REWRITE_TIMEOUT_MS,
    });
    console.info("[Resume Rewrite Response]", {
      status: res.status,
      documentId: res.data?.document_id,
      pdfUrl: res.data?.pdf_url,
    });
    return res.data;
  },

  async downloadPdf(pdfUrl: string): Promise<Blob> {
    const res = await api.get(pdfUrl, { responseType: "blob" });
    return res.data;
  },
};
