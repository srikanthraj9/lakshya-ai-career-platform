import api from "./api";
import { sessionService } from "./sessionService";
import { telemetryService } from "./telemetryService";

export interface RecommendationReason {
  signal: string;
  impact: number;
  confidence: number;
  urgency: number;
  explanation: string;
  factors: string[];
}

export interface CareerRecommendation {
  id: string;
  client_event_id?: string;
  recommendation_type: string;
  title: string;
  description: string;
  source_module: string;
  target_module: string;
  priority: "critical" | "high" | "medium" | "opportunity";
  impact_score: number;
  confidence_score: number;
  urgency_score: number;
  status: "active" | "completed" | "dismissed" | "expired" | "superseded";
  action_url?: string;
  action_label?: string;
  reason?: RecommendationReason;
  recommendation_metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface CareerGoal {
  id: string;
  target_role: string;
  target_company?: string;
  target_salary?: string;
  target_date?: string;
  target_readiness_score: number;
  priority: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CriticalSkillGapItem {
  skill: string;
  frequency_in_jobs: number;
  is_role_requirement: boolean;
  priority: string;
  roadmap_status: string;
}

export interface CareerMomentum {
  score: number;
  trend: "improving" | "stable" | "declining";
  delta_text: string;
  signals: Record<string, any>;
}

export interface CareerIntelligenceData {
  readiness_score: number;
  career_momentum: CareerMomentum;
  active_goal?: CareerGoal;
  top_priority?: CareerRecommendation;
  recommendations: CareerRecommendation[];
  critical_gaps: CriticalSkillGapItem[];
  strengths: string[];
  next_milestone?: {
    title: string;
    description: string;
    module: string;
  };
  signals: Record<string, any>;
}

export interface CareerAutomationRule {
  id: string;
  trigger_type: string;
  condition_config: Record<string, any>;
  action_type: string;
  action_config: Record<string, any>;
  is_enabled: boolean;
  last_triggered_at?: string;
  created_at: string;
  updated_at: string;
}

export const intelligenceService = {
  async getIntelligence(resumeId?: string): Promise<CareerIntelligenceData> {
    const res = await api.get("/intelligence", {
      params: resumeId ? { resume_id: resumeId } : undefined,
    });
    return res.data;
  },

  async refreshIntelligence(resumeId?: string): Promise<CareerIntelligenceData> {
    const res = await api.post("/intelligence/refresh", null, {
      params: resumeId ? { resume_id: resumeId } : undefined,
    });
    return res.data;
  },

  async updateRecommendationStatus(
    id: string,
    status: "active" | "completed" | "dismissed"
  ): Promise<CareerRecommendation> {
    const res = await api.patch(`/intelligence/recommendations/${id}`, { status });
    return res.data;
  },

  async getGoals(): Promise<CareerGoal[]> {
    const res = await api.get("/intelligence/goals");
    return res.data;
  },

  async createGoal(payload: Partial<CareerGoal>): Promise<CareerGoal> {
    const res = await api.post("/intelligence/goals", payload);
    return res.data;
  },

  async updateGoal(id: string, payload: Partial<CareerGoal>): Promise<CareerGoal> {
    const res = await api.patch(`/intelligence/goals/${id}`, payload);
    return res.data;
  },

  async getAutomationRules(): Promise<CareerAutomationRule[]> {
    const res = await api.get("/intelligence/automation-rules");
    return res.data;
  },

  async updateAutomationRule(
    id: string,
    payload: Partial<CareerAutomationRule>
  ): Promise<CareerAutomationRule> {
    const res = await api.patch(`/intelligence/automation-rules/${id}`, payload);
    return res.data;
  },
};
