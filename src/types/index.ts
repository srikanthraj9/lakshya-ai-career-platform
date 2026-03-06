export interface User {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
}

export interface Resume {
  id: string;
  filename: string;
  ats_score: number;
  score_breakdown: Record<string, number>;
  skills: string[];
  issues: string[];
  uploaded_at: string;
}

export interface AnalyticsSummary {
  ats_score: number;
  total_resumes: number;
  skill_count: number;
  interview_score: number;
}

export interface ATSTrend {
  date: string;
  score: number;
}

export interface SkillGrowth {
  skill: string;
  count: number;
}

export interface RoleAlignment {
  match_percentage: number;
  matched_skills: string[];
  missing_skills: string[];
  learning_path: string[];
}

export interface InterviewSession {
  session_id: string;
  role: string;
  difficulty: string;
  mode: string;
}

export interface InterviewQuestion {
  question_id: string;
  question: string;
}

export interface InterviewReport {
  session_id: string;
  technical_score: number;
  communication_score: number;
  confidence_score: number;
  strengths: string[];
  weaknesses: string[];
}

export interface JobRecommendation {
  id: string;
  title: string;
  company: string;
  match_percentage: number;
  required_skills: string[];
}

// ─── New AI Feature Types ───

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface CopilotResponse {
  reply: string;
}

export interface RoadmapStage {
  stage: string;
  skills: string[];
}

export interface RoadmapResponse {
  roadmap: RoadmapStage[];
}

export interface ResumeRewriteResponse {
  rewritten_resume: string;
}

export interface VoiceAnswerResponse {
  transcript: string;
  scores: {
    technical: number;
    communication: number;
    confidence: number;
  };
  feedback: string;
}

export interface LiveJob {
  title: string;
  company: string;
  location: string;
  skills: string[];
  match_percent: number;
}

export interface CareerProgress {
  week: string;
  score: number;
}
