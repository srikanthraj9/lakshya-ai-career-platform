import api from "./api";
import type { RoleAlignment } from "@/types";

export const roleService = {
  async alignRole(resumeId: string, role: string): Promise<RoleAlignment> {
    const res = await api.post(`/roles/align/${resumeId}`, { role });
    return res.data;
  },
};
