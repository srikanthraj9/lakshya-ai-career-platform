import api from "./api";
import type { Resume } from "@/types";

export const resumeService = {
  async upload(file: File): Promise<Resume> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post("/resumes", formData);
    return res.data;
  },

  async getResume(id: string): Promise<Resume> {
    const res = await api.get(`/resumes/${id}`);
    return res.data;
  },
};
