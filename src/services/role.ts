import api from "./api";
import type { RoleAlignmentResponse } from "@/types";

export const roleService = {
  async alignRole(resumeId: string, targetRole?: string): Promise<RoleAlignmentResponse> {
    const params = targetRole ? { target_role: targetRole } : undefined;
    const res = await api.get(`/roles/intelligence/${resumeId}`, { params });
    return res.data;
  },
};
