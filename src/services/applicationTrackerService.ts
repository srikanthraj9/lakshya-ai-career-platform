import api from "./api";

export interface ApplicationStageConfig {
  id: string;
  label: string;
  category: "active" | "closed";
  color: string;
}

export const APPLICATION_STAGES: ApplicationStageConfig[] = [
  { id: "wishlist", label: "Wishlist", category: "active", color: "text-muted-foreground border-border" },
  { id: "applied", label: "Applied", category: "active", color: "text-primary border-primary/30" },
  { id: "screening", label: "Screening", category: "active", color: "text-cyan-400 border-cyan-500/30" },
  { id: "interviewing", label: "Interviewing", category: "active", color: "text-amber-400 border-amber-500/30" },
  { id: "offer", label: "Offer", category: "active", color: "text-emerald-400 border-emerald-500/30" },
  { id: "closed", label: "Closed / Archived", category: "closed", color: "text-rose-400 border-rose-500/30" },
];

export interface ApplicationEvent {
  id: string;
  application_id: string;
  event_type: string;
  previous_stage?: string;
  new_stage?: string;
  title: string;
  description?: string;
  event_metadata: Record<string, any>;
  created_at: string;
}

export interface InterviewDebrief {
  id: string;
  application_id: string;
  company_name: string;
  round_type: string;
  date: string;
  difficulty_rating: number;
  technical_score?: number;
  communication_score?: number;
  problem_solving_score?: number;
  system_design_score?: number;
  confidence_score?: number;
  questions_asked: string[];
  candidate_reflection?: string;
  identified_weaknesses: string[];
  outcome: "passed" | "rejected" | "pending";
  created_at: string;
}

export interface JobApplication {
  id: string;
  company_name: string;
  job_title: string;
  location?: string;
  salary_range?: string;
  job_url?: string;
  job_source: string;
  external_job_id?: string;
  source_job_id?: string;
  stage: string;
  status: string;
  applied_date?: string;
  last_status_change: string;
  resume_version_id?: string;
  match_score_at_application: number;
  notes?: string;
  next_step_date?: string;
  next_step_notes?: string;
  outcome_notes?: string;
  application_metadata: Record<string, any>;
  events: ApplicationEvent[];
  debriefs: InterviewDebrief[];
  created_at: string;
  updated_at: string;
}

export interface JobApplicationStats {
  total_active: number;
  wishlist_count: number;
  applied_count: number;
  screening_count: number;
  interviewing_count: number;
  offer_count: number;
  closed_count: number;
  conversion_rate: number;
  average_response_days: number;
  stage_breakdown: Record<string, number>;
}

export interface CompanyIntelligence {
  id: string;
  name: string;
  company_name_normalized: string;
  domain?: string;
  logo_url?: string;
  tech_stack: string[];
  interview_stages: Array<{ round: string; duration: string; focus: string }>;
  hiring_culture_notes?: string;
  salary_benchmarks: Record<string, string>;
  common_questions: string[];
  data_source: string;
  source_url?: string;
  confidence_score: number;
  last_verified_at: string;
  created_at: string;
}

export interface OutcomeLearningInsight {
  id: string;
  insight_type: string;
  title: string;
  description: string;
  metric_value: number;
  data_points: Record<string, any>;
  source_count: number;
  confidence_score: number;
  fingerprint?: string;
  created_at: string;
}

export const applicationTrackerService = {
  async getApplications(stage?: string, status?: string): Promise<JobApplication[]> {
    const res = await api.get("/applications", { params: { stage, status } });
    return res.data;
  },

  async createApplication(payload: Partial<JobApplication>): Promise<JobApplication> {
    const res = await api.post("/applications", payload);
    return res.data;
  },

  async getApplicationDetail(id: string): Promise<JobApplication> {
    const res = await api.get(`/applications/${id}`);
    return res.data;
  },

  async updateApplication(id: string, payload: Partial<JobApplication>): Promise<JobApplication> {
    const res = await api.patch(`/applications/${id}`, payload);
    return res.data;
  },

  async transitionStage(id: string, stage: string, note?: string): Promise<JobApplication> {
    const res = await api.post(`/applications/${id}/transition`, { stage, note });
    return res.data;
  },

  async deleteApplication(id: string): Promise<void> {
    await api.delete(`/applications/${id}`);
  },

  async getStats(): Promise<JobApplicationStats> {
    const res = await api.get("/applications/stats");
    return res.data;
  },

  async getCompanyIntelligence(companyName: string): Promise<CompanyIntelligence> {
    const res = await api.get(`/applications/company/${encodeURIComponent(companyName)}`);
    return res.data;
  },

  async createDebrief(applicationId: string, payload: Partial<InterviewDebrief>): Promise<InterviewDebrief> {
    const res = await api.post(`/applications/${applicationId}/debrief`, payload);
    return res.data;
  },

  async getDebriefs(applicationId: string): Promise<InterviewDebrief[]> {
    const res = await api.get(`/applications/${applicationId}/debriefs`);
    return res.data;
  },

  async getOutcomeInsights(): Promise<OutcomeLearningInsight[]> {
    const res = await api.get("/applications/outcome-insights");
    return res.data;
  },
};
