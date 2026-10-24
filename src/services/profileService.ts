import api from "./api";

export interface UserSkillItem {
  id: string;
  user_id?: string;
  skill_name: string;
  skill_category: string;
  source: string; // 'manual' | 'onboarding' | 'resume' | 'project' | 'interview' | 'verified'
  confidence: number;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfileData {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_email_verified: boolean;
  created_at: string;
  headline: string;
  bio: string;
  location: string;
  target_role: string;
  career_stage: string;
  experience_level: string;
  education_level: string;
  college: string;
  graduation_year: string;
  specialization: string;
  work_preference: string;
  employment_type: string;
  portfolio_url: string;
  linkedin_url: string;
  github_url: string;
  primary_goals: string[];
  skills: UserSkillItem[];
  profile_completeness: number;
  share_token?: string | null;
  is_public_passport?: boolean;
  auth_provider?: string;
}

export interface UserSettingsData {
  notification_preferences: {
    in_app_enabled: boolean;
    email_enabled: boolean;
    job_matches: boolean;
    interview_reminders: boolean;
    roadmap_reminders: boolean;
    career_insights: boolean;
    weekly_summary: boolean;
  };
  privacy_settings: {
    passport_public: boolean;
    analytics_opt_in: boolean;
    personalized_recommendations: boolean;
  };
  appearance_settings: {
    theme: string;
    reduced_motion: boolean;
    compact_mode: boolean;
  };
  career_preferences: {
    target_role: string;
    work_location: string;
    employment_type: string;
    actively_looking: boolean;
  };
}

export interface SharedPassportData {
  full_name: string;
  headline?: string;
  target_role?: string;
  experience_level?: string;
  skills: Array<{
    skill_name: string;
    skill_category: string;
    source: string;
    confidence: number;
  }>;
  alignment_score?: number;
  shared_at: string;
}

export const profileService = {
  async getProfile(): Promise<UserProfileData> {
    const res = await api.get("/users/profile");
    return res.data;
  },

  async updateProfile(updates: Partial<UserProfileData>): Promise<UserProfileData> {
    const res = await api.patch("/users/profile", updates);
    return res.data;
  },

  async getUserSkills(): Promise<UserSkillItem[]> {
    const res = await api.get("/users/skills");
    return res.data;
  },

  async addSkill(skill: {
    skill_name: string;
    skill_category?: string;
    source?: string;
    confidence?: number;
  }): Promise<UserSkillItem> {
    const res = await api.post("/users/skills", skill);
    return res.data;
  },

  async deleteSkill(skillId: string): Promise<void> {
    await api.delete(`/users/skills/${skillId}`);
  },

  async getSettings(): Promise<UserSettingsData> {
    const res = await api.get("/users/settings");
    return res.data;
  },

  async updateSettings(settings: Partial<UserSettingsData>): Promise<UserSettingsData> {
    const res = await api.patch("/users/settings", settings);
    return res.data;
  },

  async changePassword(current_password: string, new_password: string): Promise<{ message: string }> {
    const res = await api.post("/auth/change-password", {
      current_password,
      new_password,
    });
    return res.data;
  },

  async createPassportShareToken(): Promise<{ is_public: boolean; share_token: string; share_url: string }> {
    const res = await api.post("/users/passport/share");
    return res.data;
  },

  async revokePassportShareToken(): Promise<{ is_public: boolean }> {
    const res = await api.delete("/users/passport/share");
    return res.data;
  },

  async getSharedPassport(token: string): Promise<SharedPassportData> {
    const res = await api.get(`/users/passport/shared/${token}`);
    return res.data;
  },

  async getDeletionToken(): Promise<{
    deletion_token: string;
    expires_in_seconds: number;
    auth_provider: string;
    message?: string;
  }> {
    const res = await api.post("/users/me/deletion-token");
    return res.data;
  },

  async deleteAccount(payload: {
    confirmation: string;
    password?: string;
    deletion_token?: string;
  }): Promise<{ message: string; success: boolean }> {
    const res = await api.delete("/users/me", { data: payload });
    return res.data;
  },
};
