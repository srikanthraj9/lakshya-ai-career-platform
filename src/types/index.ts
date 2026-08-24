export interface User {
  id: string;
  full_name: string;
  email: string;
  role?: "user" | "admin" | "super_admin";
  is_active?: boolean;
  is_suspended?: boolean;
  suspended_reason?: string | null;
  is_email_verified?: boolean;
  onboarding_completed?: boolean;
  onboarding_current_step?: number;
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
  is_email_verified?: boolean;
  message?: string;
}

export interface VerifyEmailPayload {
  token: string;
}

export interface VerifyEmailResponse {
  success: boolean;
  message: string;
  is_email_verified: boolean;
  access_token?: string;
  token_type?: string;
}

export interface ResendVerificationPayload {
  email: string;
}

export interface ResendVerificationResponse {
  success: boolean;
  message: string;
}

export interface CareerProfile {
  user_id: string;
  onboarding_current_step: number;
  onboarding_completed: boolean;
  career_stage?: string | null;
  primary_goals: string[];
  education_level?: string | null;
  specialization?: string | null;
  graduation_year?: string | null;
  college?: string | null;
  experience_level?: string | null;
  target_role?: string | null;
  is_exploring_roles: boolean;
  skills: string[];
  updated_at?: string | null;
}

export interface OnboardingStepPayload {
  step: number;
  career_stage?: string | null;
  primary_goals?: string[];
  education_level?: string | null;
  specialization?: string | null;
  graduation_year?: string | null;
  college?: string | null;
  experience_level?: string | null;
  target_role?: string | null;
  is_exploring_roles?: boolean;
  skills?: string[];
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

export interface CopilotChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CopilotMessage extends CopilotChatMessage {
  id: string;
  timestamp: Date;
}

export interface CopilotResponse {
  reply: string;
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

export interface VoiceQuestionResponse {
  role: string;
  question: string;
}

export interface VoiceChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface VoiceChatResponse {
  transcript: string;
  reply: string;
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

export interface CopilotChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface CopilotResponse {
  reply: string;
  conversation_id?: string;
}

export interface CopilotConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface CopilotMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface CopilotConversationDetail extends CopilotConversation {
  messages: CopilotMessage[];
}

export interface InterviewSessionListItem {
  id: string;
  role: string;
  difficulty: string;
  mode: string;
  status: string;
  overall_score?: number | null;
  started_at: string;
  completed_at?: string | null;
  total_questions: number;
  current_index: number;
}

export interface InterviewMessageItem {
  id: string;
  sender: string;
  content: string;
  feedback?: string | null;
  score?: number | null;
  question_index: number;
  created_at: string;
}

export interface InterviewSessionDetail {
  id: string;
  role: string;
  difficulty: string;
  mode: string;
  status: string;
  overall_score?: number | null;
  technical_score?: number | null;
  communication_score?: number | null;
  confidence_score?: number | null;
  feedback_summary?: string | null;
  strengths: string[];
  weaknesses: string[];
  questions: string[];
  current_index: number;
  total_questions: number;
  messages: InterviewMessageItem[];
  started_at: string;
  completed_at?: string | null;
  created_at: string;
}

export interface AdminUserListItem {
  id: string;
  email: string;
  full_name?: string;
  role: "user" | "admin" | "super_admin";
  is_active: boolean;
  is_suspended: boolean;
  suspended_reason?: string | null;
  is_email_verified: boolean;
  onboarding_completed: boolean;
  target_role?: string | null;
  ats_score?: number | null;
  readiness_score?: number | null;
  applications_count: number;
  interviews_count: number;
  last_activity_at?: string | null;
  created_at: string;
}

export interface AdminUserListResponse {
  users: AdminUserListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AdminUserDetailResponse {
  id: string;
  email: string;
  full_name?: string;
  role: "user" | "admin" | "super_admin";
  is_active: boolean;
  is_suspended: boolean;
  suspended_reason?: string | null;
  is_email_verified: boolean;
  onboarding_completed: boolean;
  target_role?: string | null;
  career_profile?: Record<string, any> | null;
  skills: string[];
  resumes_count: number;
  latest_ats_score?: number | null;
  interviews_count: number;
  latest_interview_score?: number | null;
  applications_count: number;
  active_goals_count: number;
  recommendations_count: number;
  readiness_score: number;
  created_at: string;
  last_activity_at?: string | null;
}

export interface AdminDashboardStats {
  total_users: number;
  active_users_today: number;
  new_users_today: number;
  suspended_users: number;
  total_resumes: number;
  total_interviews: number;
  total_applications: number;
  total_ai_requests: number;
  recommendation_runs: number;
  platform_health: string;
  recent_activity: Array<{
    id: string;
    action_type: string;
    target_user_id?: string | null;
    created_at?: string | null;
  }>;
}

export interface PlatformAnalyticsStats {
  total_users: number;
  daily_active_users: number;
  weekly_active_users: number;
  monthly_active_users: number;
  new_users_30d: number;
  retention_rate: number;
  feature_usage: Record<string, number>;
  applications_by_stage: Record<string, number>;
  interview_conversion_rate: number;
  offer_conversion_rate: number;
  top_skill_gaps: Array<{ skill: string; frequency: number }>;
  top_target_roles: Array<{ role: string; count: number }>;
  top_companies: Array<{ company: string; applications: number }>;
}

export interface AIUsageStats {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  success_rate: number;
  average_response_time_ms: number;
  breakdown_by_feature: Record<string, number>;
}

export interface SystemHealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  services: Record<string, string>;
  timestamp: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  is_enabled: boolean;
  target_roles: string[];
  created_at: string;
  updated_at: string;
}

export interface PlatformAnnouncement {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "maintenance";
  target_audience: "all" | "users" | "admins";
  is_active: boolean;
  starts_at: string;
  expires_at?: string | null;
  created_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_user_id?: string | null;
  action_type: string;
  target_user_id?: string | null;
  resource_type?: string | null;
  resource_id?: string | null;
  action_metadata: Record<string, any>;
  ip_address?: string | null;
  created_at: string;
}

export interface AdminUserResumeItem {
  id: string;
  original_filename: string;
  file_size?: number | null;
  mime_type?: string | null;
  ats_score?: number | null;
  overall_feedback?: string | null;
  uploaded_at?: string | null;
  skills_count: number;
  missing_skills_count: number;
}

export interface AdminUserInterviewItem {
  id: string;
  role: string;
  difficulty: string;
  mode: string;
  status: string;
  overall_score?: number | null;
  technical_score?: number | null;
  communication_score?: number | null;
  feedback_summary?: string | null;
  messages_count: number;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface AdminUserApplicationItem {
  id: string;
  company_name: string;
  job_title: string;
  location?: string | null;
  salary_range?: string | null;
  stage: string;
  status: string;
  applied_date?: string | null;
  match_score_at_application: number;
  notes?: string | null;
  events_count: number;
  debriefs_count: number;
}

export interface AdminUserCopilotItem {
  id: string;
  title: string;
  messages_count: number;
  last_message_preview?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminUserActivityItem {
  id: string;
  activity_type: string;
  title: string;
  description: string;
  created_at: string;
}

export interface AdminSimulationSessionResponse {
  id: string;
  admin_user_id: string;
  target_user_id: string;
  token?: string | null;
  is_active: boolean;
  expires_at: string;
  created_at: string;
  ended_at?: string | null;
  ended_reason?: string | null;
  target_user_email?: string | null;
  target_user_name?: string | null;
}



