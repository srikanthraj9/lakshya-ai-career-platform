import { api } from "@/services/api";
import type {
  AdminDashboardStats,
  AdminUserListResponse,
  AdminUserDetailResponse,
  AdminUserResumeItem,
  AdminUserInterviewItem,
  AdminUserApplicationItem,
  AdminUserCopilotItem,
  AdminUserActivityItem,
  AdminSimulationSessionResponse,
  PlatformAnalyticsStats,
  AIUsageStats,
  SystemHealthResponse,
  FeatureFlag,
  PlatformAnnouncement,
  AdminAuditLog,
} from "@/types";

export interface DatabaseTableDefinition {
  table_name: string;
  category: string;
  description: string;
  is_destructive_allowed: boolean;
  requires_confirmation_to_delete: boolean;
  readable_fields: string[];
  masked_fields: string[];
  editable_fields: string[];
  immutable_fields: string[];
}

export interface DatabaseQueryResponse {
  table_name: string;
  category: string;
  total_records: number;
  page: number;
  page_size: number;
  total_pages: number;
  records: Array<Record<string, any>>;
  schema_info: {
    columns: string[];
    masked_columns: string[];
    editable_columns: string[];
    immutable_columns: string[];
  };
}

export const adminService = {
  async getDashboardStats(): Promise<AdminDashboardStats> {
    const res = await api.get<AdminDashboardStats>("/admin/dashboard");
    return res.data;
  },

  async getUsers(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    role?: string;
    is_suspended?: boolean;
  }): Promise<AdminUserListResponse> {
    const res = await api.get<AdminUserListResponse>("/admin/users", { params });
    return res.data;
  },

  async getUserDetail(userId: string): Promise<AdminUserDetailResponse> {
    const res = await api.get<AdminUserDetailResponse>(`/admin/users/${userId}/360`);
    return res.data;
  },

  async getUserResumes(userId: string): Promise<AdminUserResumeItem[]> {
    const res = await api.get<AdminUserResumeItem[]>(`/admin/users/${userId}/resumes`);
    return res.data;
  },

  async getUserInterviews(userId: string): Promise<AdminUserInterviewItem[]> {
    const res = await api.get<AdminUserInterviewItem[]>(`/admin/users/${userId}/interviews`);
    return res.data;
  },

  async getUserApplications(userId: string): Promise<AdminUserApplicationItem[]> {
    const res = await api.get<AdminUserApplicationItem[]>(`/admin/users/${userId}/applications`);
    return res.data;
  },

  async getUserCopilot(userId: string): Promise<AdminUserCopilotItem[]> {
    const res = await api.get<AdminUserCopilotItem[]>(`/admin/users/${userId}/copilot`);
    return res.data;
  },

  async getUserActivity(userId: string): Promise<AdminUserActivityItem[]> {
    const res = await api.get<AdminUserActivityItem[]>(`/admin/users/${userId}/activity`);
    return res.data;
  },

  async getUserAudit(userId: string): Promise<AdminAuditLog[]> {
    const res = await api.get<AdminAuditLog[]>(`/admin/users/${userId}/audit`);
    return res.data;
  },

  async updateUserRole(
    userId: string,
    payload: { role?: string; is_active?: boolean; is_email_verified?: boolean }
  ): Promise<{ message: string; user_id: string; role: string }> {
    const res = await api.patch<{ message: string; user_id: string; role: string }>(
      `/admin/users/${userId}`,
      payload
    );
    return res.data;
  },

  async suspendUser(
    userId: string,
    reason: string
  ): Promise<{ message: string; user_id: string; status: string }> {
    const res = await api.post<{ message: string; user_id: string; status: string }>(
      `/admin/users/${userId}/suspend`,
      { reason }
    );
    return res.data;
  },

  async activateUser(
    userId: string
  ): Promise<{ message: string; user_id: string; status: string }> {
    const res = await api.post<{ message: string; user_id: string; status: string }>(
      `/admin/users/${userId}/activate`
    );
    return res.data;
  },

  async getPlatformAnalytics(): Promise<PlatformAnalyticsStats> {
    const res = await api.get<PlatformAnalyticsStats>("/admin/analytics");
    return res.data;
  },

  async getAIMetrics(): Promise<AIUsageStats> {
    const res = await api.get<AIUsageStats>("/admin/ai/metrics");
    return res.data;
  },

  async getSystemHealth(): Promise<SystemHealthResponse> {
    const res = await api.get<SystemHealthResponse>("/admin/system/health");
    return res.data;
  },

  async getFeatureFlags(): Promise<FeatureFlag[]> {
    const res = await api.get<FeatureFlag[]>("/admin/feature-flags");
    return res.data;
  },

  async createFeatureFlag(payload: {
    key: string;
    name: string;
    description?: string;
    is_enabled: boolean;
    target_roles?: string[];
  }): Promise<FeatureFlag> {
    const res = await api.post<FeatureFlag>("/admin/feature-flags", payload);
    return res.data;
  },

  async updateFeatureFlag(
    flagId: string,
    payload: { name?: string; description?: string; is_enabled?: boolean; target_roles?: string[] }
  ): Promise<FeatureFlag> {
    const res = await api.patch<FeatureFlag>(`/admin/feature-flags/${flagId}`, payload);
    return res.data;
  },

  async getAnnouncements(): Promise<PlatformAnnouncement[]> {
    const res = await api.get<PlatformAnnouncement[]>("/admin/announcements");
    return res.data;
  },

  async createAnnouncement(payload: {
    title: string;
    message: string;
    type?: string;
    target_audience?: string;
    is_active?: boolean;
    expires_at?: string | null;
  }): Promise<PlatformAnnouncement> {
    const res = await api.post<PlatformAnnouncement>("/admin/announcements", payload);
    return res.data;
  },

  async deleteAnnouncement(announcementId: string): Promise<{ message: string }> {
    const res = await api.delete<{ message: string }>(`/admin/announcements/${announcementId}`);
    return res.data;
  },

  async getAuditLogs(params?: {
    page?: number;
    page_size?: number;
    action_type?: string;
    target_user_id?: string;
  }): Promise<AdminAuditLog[]> {
    const res = await api.get<AdminAuditLog[]>("/admin/audit", { params });
    return res.data;
  },

  // View-As Simulation methods
  async startSimulation(
    targetUserId: string,
    reason: string = "Administrative diagnosis",
    durationMinutes: number = 30
  ): Promise<AdminSimulationSessionResponse> {
    const res = await api.post<AdminSimulationSessionResponse>("/admin/simulation/start", {
      target_user_id: targetUserId,
      reason,
      duration_minutes: durationMinutes,
    });
    return res.data;
  },

  async endSimulation(): Promise<{ message: string; stopped: boolean }> {
    const res = await api.post<{ message: string; stopped: boolean }>("/admin/simulation/end");
    return res.data;
  },

  async getActiveSimulation(): Promise<AdminSimulationSessionResponse | null> {
    const res = await api.get<AdminSimulationSessionResponse | null>("/admin/simulation/active");
    return res.data;
  },

  // Database Explorer (Super Admin Only)
  async getDatabaseTables(): Promise<DatabaseTableDefinition[]> {
    const res = await api.get<DatabaseTableDefinition[]>("/admin/database/tables");
    return res.data;
  },

  async queryDatabaseTable(
    tableName: string,
    params?: {
      page?: number;
      page_size?: number;
      search?: string;
      order_by?: string;
      order_direction?: "asc" | "desc";
    }
  ): Promise<DatabaseQueryResponse> {
    const res = await api.get<DatabaseQueryResponse>(`/admin/database/tables/${tableName}`, { params });
    return res.data;
  },

  async mutateDatabaseRecord(
    tableName: string,
    recordId: string,
    updates: Record<string, any>,
    reason: string
  ): Promise<{ message: string; table_name: string; record_id: string; diff: Record<string, any>; audit_log_id: string }> {
    const res = await api.patch<{ message: string; table_name: string; record_id: string; diff: Record<string, any>; audit_log_id: string }>(
      `/admin/database/tables/${tableName}/${recordId}`,
      { updates, reason }
    );
    return res.data;
  },

  async deleteDatabaseRecord(
    tableName: string,
    recordId: string,
    reason: string,
    confirmationValue?: string
  ): Promise<{ message: string; table_name: string; record_id: string; audit_log_id: string }> {
    const res = await api.delete<{ message: string; table_name: string; record_id: string; audit_log_id: string }>(
      `/admin/database/tables/${tableName}/${recordId}`,
      { data: { reason, confirmation_value: confirmationValue } }
    );
    return res.data;
  },
};
