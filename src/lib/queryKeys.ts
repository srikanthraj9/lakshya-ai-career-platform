/**
 * Centralized TanStack React Query Cache Keys for Lakshya AI
 *
 * All user-owned queries are parameterized by `userId: string` to prevent
 * cross-user cache leakage in single-page application sessions.
 */

export const queryKeys = {
  auth: {
    me: ["users", "me"] as const,
  },
  profile: {
    current: (userId: string) => ["profile", userId] as const,
    skills: (userId: string) => ["profile", userId, "skills"] as const,
  },
  resumes: {
    all: (userId: string) => ["resumes", userId] as const,
    list: (userId: string) => ["resumes", userId, "list"] as const,
    detail: (userId: string, id: string) => ["resumes", userId, "detail", id] as const,
    active: (userId: string) => ["resumes", userId, "active"] as const,
    rewrites: (userId: string) => ["resumes", userId, "rewrites"] as const,
  },
  roles: {
    all: ["roles"] as const,
    active: (userId: string) => ["roles", userId, "active"] as const,
    analyze: (roleId: string) => ["roles", "analyze", roleId] as const,
  },
  roadmap: {
    all: (userId: string) => ["roadmap", userId] as const,
    generated: (userId: string, role: string, level: string) => ["roadmap", userId, role, level] as const,
    progress: (userId: string, role: string, level: string) => ["roadmap", userId, "progress", role, level] as const,
    allProgress: (userId: string) => ["roadmap", userId, "progress", "all"] as const,
  },
  interviews: {
    all: (userId: string) => ["interviews", userId] as const,
    detail: (userId: string, id: string) => ["interviews", userId, "detail", id] as const,
    sessions: (userId: string) => ["interviews", userId, "sessions"] as const,
  },
  jobs: {
    matches: (userId: string) => ["jobs", userId, "matches"] as const,
    live: (query?: string, location?: string) => ["jobs", "live", query || "", location || ""] as const,
  },
  activity: {
    all: (userId: string, limit?: number) => ["activity", userId, limit ?? 50] as const,
  },
  notifications: {
    all: (userId: string) => ["notifications", userId] as const,
    unread: (userId: string) => ["notifications", userId, "unread"] as const,
  },
  analytics: {
    summary: (userId: string) => ["analytics", userId, "summary"] as const,
    atsTrend: (userId: string) => ["analytics", userId, "ats-trend"] as const,
    skillGrowth: (userId: string) => ["analytics", userId, "skill-growth"] as const,
    careerProgress: (userId: string) => ["analytics", userId, "career-progress"] as const,
  },
  copilot: {
    conversations: (userId: string) => ["copilot", userId, "conversations"] as const,
    detail: (userId: string, id: string) => ["copilot", userId, "conversations", id] as const,
  },
  career: {
    context: (userId: string) => ["career-context", userId] as const,
  },
  intelligence: {
    all: (userId: string) => ["intelligence", userId] as const,
    overview: (userId: string) => ["intelligence", userId, "overview"] as const,
    recommendations: (userId: string, status?: string) =>
      ["intelligence", userId, "recommendations", status || "all"] as const,
    goals: (userId: string) => ["intelligence", userId, "goals"] as const,
    automationRules: (userId: string) => ["intelligence", userId, "automation-rules"] as const,
  },
  applications: {
    all: (userId: string) => ["applications", userId] as const,
    list: (userId: string, stage?: string, status?: string) =>
      ["applications", userId, "list", stage || "all", status || "all"] as const,
    detail: (userId: string, id: string) => ["applications", userId, "detail", id] as const,
    stats: (userId: string) => ["applications", userId, "stats"] as const,
    company: (name: string) => ["applications", "company", name] as const,
    debriefs: (userId: string, id: string) => ["applications", userId, id, "debriefs"] as const,
    outcomeInsights: (userId: string) => ["applications", userId, "outcome-insights"] as const,
  },
  admin: {
    dashboard: ["admin", "dashboard"] as const,
    users: (filters?: Record<string, any>) => ["admin", "users", filters || {}] as const,
    user: (userId: string) => ["admin", "user", userId] as const,
    userWorkspace: (userId: string) => ["admin", "inspection", userId, "workspace"] as const,
    analytics: ["admin", "analytics"] as const,
    aiMetrics: ["admin", "ai-metrics"] as const,
    systemHealth: ["admin", "system-health"] as const,
    featureFlags: ["admin", "feature-flags"] as const,
    announcements: ["admin", "announcements"] as const,
    audit: (filters?: Record<string, any>) => ["admin", "audit", filters || {}] as const,
    alerts: (filters?: Record<string, any>) => ["admin", "alerts", filters || {}] as const,
    alertsSummary: ["admin", "alerts", "summary"] as const,
  },
} as const;
