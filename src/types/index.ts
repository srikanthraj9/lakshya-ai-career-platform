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

export interface RegisterResponse {
  id?: string;
  full_name?: string;
  email?: string;
  created_at?: string;
  message?: string;
}

export interface ResumeSkill {
  skill: string;
  category: string;
  confidence: number;
}

export interface ResumeScoreBreakdown {
  keyword_match: number;
  skill_diversity: number;
  formatting: number;
  action_verbs: number;
  section_coverage: number;
}

export interface ResumeMissingSkill {
  skill: string;
  category: string;
  importance: number;
}

export interface Resume {
  id: string;
  file_name?: string;
  original_filename: string;
  extracted_text?: string | null;
  parsed_text?: string | null;
  ats_score: number;
  created_at: string;
  skills: ResumeSkill[];
  ats_breakdown?: ResumeScoreBreakdown | null;
  missing_skills: ResumeMissingSkill[];
}

export interface ResumeListItem {
  id: string;
  file_name: string;
  created_at: string;
}

export interface ResumeDetailFeedback {
  summary: string[];
  weak_points: string[];
  formatting: string[];
  missing_skills: string[];
}

export interface ResumeDetail {
  id: string;
  file_name: string;
  original_filename: string;
  created_at: string;
  extracted_text?: string | null;
  parsed_text?: string | null;
  ats_score: number;
  skills: string[];
  breakdown: ResumeScoreBreakdown;
  feedback: ResumeDetailFeedback;
}

export interface ResumeFeedback {
  resume_id: string;
  summary: string[];
  missing_skills: ResumeMissingSkill[];
  weak_bullet_points: string[];
  formatting_issues: string[];
  llm_feedback: string[];
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

export interface RoleAlignmentMatch {
  role_id: string;
  rank: number;
  canonical_role_key: string;
  role: string;
  role_name: string;
  category: string;
  demand_level: string;
  description: string;
  average_salary?: number | null;
  similarity: number;
  score: number;
  skill_score: number;
  semantic_score: number;
  readiness_score: number;
  score_label: string;
  core_skills: string[];
  advanced_skills: string[];
  matched_core_skills: string[];
  matched_advanced_skills: string[];
  matched_skills: string[];
  missing_core_skills: string[];
  missing_advanced_skills: string[];
  missing_skills: string[];
  core_skill_coverage: number;
  advanced_skill_coverage: number;
  strengths: string[];
  risks: string[];
  verdict: string;
  verdict_reason: string;
  explanation: string;
  recommendation: string;
  next_steps: CareerAction[];
}

export interface CareerAction {
  priority: string;
  category: string;
  skill?: string | null;
  action: string;
  rationale: string;
  estimated_weeks: number;
}

export interface CareerDecision {
  target_role: string;
  career_verdict: string;
  confidence_label: string;
  decision_guidance: string;
  why: string;
  focus_skills: string[];
  readiness_band: string;
  resume_skill_count: number;
}

export interface RoleAlignmentResponse {
  resume_id: string;
  resume_skills: string[];
  career_decision: CareerDecision;
  matches: RoleAlignmentMatch[];
}

export interface InterviewSession {
  session_id: string;
  role: string;
  difficulty: string;
  mode: string;
  question: string;
  question_index: number;
  total_questions: number;
  remaining_seconds: number;
}

export interface InterviewNextResponse {
  session_id: string;
  feedback: string;
  score: number;
  question: string;
  question_index: number;
  total_questions: number;
  completed: boolean;
  report_url?: string | null;
}

export interface InterviewReport {
  session_id: string;
  role: string;
  difficulty: string;
  mode: string;
  technical_score: number;
  communication_score: number;
  confidence_score: number;
  overall_score: number;
  strengths: string[];
  weaknesses: string[];
  questions_answered: number;
  summary: string;
}

export interface JobRecommendation {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  job_type: string;
  source: string;
  match_score: number;
  matched_skills: string[];
  skill_tags: string[];
  why: string;
  published_at?: string | null;
}

export interface JobRecommendationsResponse {
  resume_id: string;
  resume_skills: string[];
  jobs: JobRecommendation[];
}

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  intent?: string;
  sections?: Record<string, CopilotSection>;
  resources?: CopilotResource[];
  suggestions?: string[];
  memory_turns?: number;
}

export interface CopilotResource {
  title: string;
  url: string;
  reason: string;
}

export interface CopilotSection {
  title: string;
  body: string;
  items: string[];
}

export interface CopilotResponse {
  reply: string;
  intent: string;
  suggestions: string[];
  optional_sections: Record<string, CopilotSection>;
  resources: CopilotResource[];
  memory_turns: number;
}

export interface RoadmapStep {
  step: string;
  resources: string[];
  duration: string;
}

export interface RoadmapRequest {
  target_role: string;
  experience_level: string;
}

export interface RoadmapResponse {
  roadmap: RoadmapStep[];
}

export interface ResumeRewriteEducationEntry {
  college: string;
  degree: string;
  year: string;
  cgpa: string;
}

export interface ResumeRewriteExperienceEntry {
  role: string;
  company: string;
  duration: string;
  points: string[];
}

export interface ResumeRewriteProjectEntry {
  title: string;
  duration: string;
  points: string[];
}

export interface ResumeRewriteSkillGroups {
  programming: string[];
  web: string[];
  cs: string[];
  databases: string[];
  tools: string[];
  professional: string[];
}

export interface ResumeRewriteStructuredResponse {
  name: string;
  phone: string;
  email: string;
  linkedin: string;
  github: string;
  portfolio: string;
  summary: string;
  education: ResumeRewriteEducationEntry[];
  experience: ResumeRewriteExperienceEntry[];
  projects: ResumeRewriteProjectEntry[];
  skills: ResumeRewriteSkillGroups;
  certifications: string[];
}

export interface ResumeRewriteResponse {
  original: string;
  rewritten: string;
  structured: ResumeRewriteStructuredResponse;
  latex: string;
  pdf_url: string;
  tex_url: string;
  document_id: string;
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
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  job_type: string;
  source: string;
  skill_tags: string[];
  why: string;
  published_at?: string | null;
}

export interface CareerProgress {
  week: string;
  score: number;
}
