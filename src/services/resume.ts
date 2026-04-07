import api from "./api";
import type { Resume, ResumeDetail, ResumeFeedback, ResumeListItem } from "@/types";

export const resumeService = {
  async upload(file: File, jobDescription?: string): Promise<Resume> {
    const formData = new FormData();
    formData.append("file", file);
    if (jobDescription?.trim()) {
      formData.append("job_description", jobDescription.trim());
    }
    const res = await api.post("/resumes/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },

  async listResumes(): Promise<ResumeListItem[]> {
    const res = await api.get("/resumes");
    return res.data;
  },

  async listResumeSelector(): Promise<ResumeListItem[]> {
    const res = await api.get("/resumes/selector");
    return res.data.map((item: { id: string; name: string }) => ({
      id: item.id,
      file_name: item.name,
      created_at: "",
    }));
  },

  async getResume(id: string): Promise<ResumeDetail> {
    const res = await api.get(`/resumes/${id}`);
    return res.data;
  },

  async deleteResume(id: string): Promise<{ message: string }> {
    const res = await api.delete(`/resumes/${id}`);
    return res.data;
  },

  async getFeedback(id: string, jobDescription?: string): Promise<ResumeFeedback> {
    const res = await api.get(`/resumes/${id}/feedback`, {
      params: jobDescription?.trim() ? { job_description: jobDescription.trim() } : undefined,
    });
    return res.data;
  },
};
