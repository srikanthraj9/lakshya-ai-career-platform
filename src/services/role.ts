import api from "./api";
import type { RoleAlignmentResponse } from "@/types";

export const roleService = {
  async alignRole(resumeId: string): Promise<RoleAlignmentResponse> {
    const res = await api.get(`/roles/intelligence/${resumeId}`);
    return res.data;
  },
};
