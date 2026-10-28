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
  AdminAuditLogListResponse,
  AdminUserBulkStatusResponse,
  OperationalAlertItem,
  OperationalAlertListResponse,
  OperationalAlertSummaryResponse,
  OperationalAlertTransitionRequest,
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
  relationships?: Record<string, { table: string; foreign_key?: string; local_key?: string }>;
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
    relationships?: Record<string, { table: string; foreign_key?: string; local_key?: string }>;
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
    sort_by?: string;
    sort_order?: "asc" | "desc";
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

  async bulkUpdateUserStatus(
    userIds: string[],
    action: "suspend" | "activate",
    reason?: string
  ): Promise<AdminUserBulkStatusResponse> {
    const res = await api.post<AdminUserBulkStatusResponse>("/admin/users/bulk-status", {
      user_ids: userIds,
      action,
      reason: reason || "Bulk administrative status update",
    });
    return res.data;
  },

  async getPlatformAnalytics(): Promise<PlatformAnalyticsStats> {
    const res = await api.get<PlatformAnalyticsStats>("/admin/analytics");
    return res.data;
  },

  async getAIMetrics(timeRange?: string): Promise<AIUsageStats> {
    const params = timeRange && timeRange !== "all" ? { time_range: timeRange } : undefined;
    const res = await api.get<AIUsageStats>("/admin/ai/metrics", { params });
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

  async deleteFeatureFlag(flagId: string): Promise<{ message: string; flag_id: string }> {
    const res = await api.delete<{ message: string; flag_id: string }>(`/admin/feature-flags/${flagId}`);
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

  async updateAnnouncement(
    announcementId: string,
    payload: {
      title?: string;
      message?: string;
      type?: string;
      target_audience?: string;
      is_active?: boolean;
      expires_at?: string | null;
    }
  ): Promise<PlatformAnnouncement> {
    const res = await api.patch<PlatformAnnouncement>(`/admin/announcements/${announcementId}`, payload);
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
    resource_type?: string;
    resource_id?: string;
    severity?: string;
    search?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<AdminAuditLogListResponse> {
    const res = await api.get<AdminAuditLogListResponse | AdminAuditLog[]>("/admin/audit", { params });
    if (Array.isArray(res.data)) {
      return {
        items: res.data,
        total: res.data.length,
        page: params?.page || 1,
        page_size: params?.page_size || res.data.length,
        total_pages: 1,
      };
    }
    return res.data;
  },

  async exportAuditLogs(params?: {
    action_type?: string;
    target_user_id?: string;
    resource_type?: string;
    resource_id?: string;
    severity?: string;
    search?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<Blob> {
    const res = await api.get("/admin/audit/export", {
      params,
      responseType: "blob",
    });
    return res.data as Blob;
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
      filter_field?: string;
      filter_value?: string;
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

  // Operational Visibility & Intelligent Alert Center (Phase 2)
  async getOperationalAlerts(params?: {
    status?: string;
    severity?: string;
    source_service?: string;
    search?: string;
  }): Promise<OperationalAlertListResponse> {
    const res = await api.get<OperationalAlertListResponse>("/admin/alerts", { params });
    return res.data;
  },

  async getOperationalAlertsSummary(): Promise<OperationalAlertSummaryResponse> {
    const res = await api.get<OperationalAlertSummaryResponse>("/admin/alerts/summary");
    return res.data;
  },

  async transitionOperationalAlert(
    alertId: string,
    payload: OperationalAlertTransitionRequest
  ): Promise<OperationalAlertItem> {
    const res = await api.post<OperationalAlertItem>(`/admin/alerts/${alertId}/transition`, payload);
    return res.data;
  },
};

