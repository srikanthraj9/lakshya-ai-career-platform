import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RoleAlignmentPage from "@/pages/RoleAlignmentPage";
import { RoleMatchCard } from "@/components/role/RoleMatchCard";
import { roleService } from "@/services/role";
import type { RoleAlignmentResponse, RoleAlignmentMatch } from "@/types";

let mockActiveResumeId: string | null = "res-uuid-123";
let mockTargetRole = "Full Stack Engineer";
const mockAddSkillToRoadmap = vi.fn();
const mockSetActiveResumeId = vi.fn();

vi.mock("@/hooks/useCareerContext", () => ({
  useCareerContext: () => ({
    activeResumeId: mockActiveResumeId,
    targetRole: mockTargetRole,
    activeResume: { id: "res-uuid-123", file_name: "John_Doe_Resume.pdf", ats_score: 82 },
    resumes: [{ id: "res-uuid-123", file_name: "John_Doe_Resume.pdf", ats_score: 82 }],
    setActiveResumeId: mockSetActiveResumeId,
    addSkillToRoadmap: mockAddSkillToRoadmap,
  }),
}));

vi.mock("@/services/role", () => ({
  roleService: {
    alignRole: vi.fn(),
  },
}));

const sampleMatch: RoleAlignmentMatch = {
  role_id: "role-1",
  rank: 1,
  canonical_role_key: "frontend_engineer",
  role: "Frontend Engineer",
  role_name: "Frontend Engineer",
  category: "Frontend",
  demand_level: "High",
  description: "Architects modern web applications using React and TypeScript.",
  average_salary: 125000,
  similarity: 0.88,
  score: 82,
  skill_score: 85,
  semantic_score: 88,
  readiness_score: 82,
  score_label: "Strong Match",
  core_skills: ["React", "TypeScript", "HTML5", "CSS3"],
  advanced_skills: ["Next.js", "Performance Optimization"],
  matched_core_skills: ["React", "TypeScript"],
  matched_advanced_skills: ["Next.js"],
  matched_skills: ["React", "TypeScript", "Next.js"],
  missing_core_skills: ["HTML5", "CSS3"],
  missing_advanced_skills: ["Performance Optimization"],
  missing_skills: ["HTML5", "CSS3", "Performance Optimization"],
  core_skill_coverage: 50,
  advanced_skill_coverage: 50,
  strengths: ["Strong modern JavaScript & React fundamentals"],
  risks: ["Missing core semantic markup verification"],
  verdict: "Close fit",
  verdict_reason: "You are within reach of this role.",
  explanation: "Your resume shows strong modern frontend capabilities.",
  recommendation: "Focus on closing core gaps.",
  next_steps: [
    {
      priority: "high",
      category: "skill-depth",
      skill: "HTML5",
      action: "Build an accessible HTML5 application.",
      rationale: "Required for senior frontend interviews.",
      estimated_weeks: 1,
    },
  ],
};

const sampleResponse: RoleAlignmentResponse = {
  resume_id: "res-uuid-123",
  resume_skills: ["React", "TypeScript", "Next.js"],
  career_decision: {
    target_role: "Frontend Engineer",
    career_verdict: "Close fit",
    confidence_label: "High Confidence",
    decision_guidance: "Prioritize Frontend Engineer next. Close 2 core gaps before applying.",
    why: "Candidate has strong signals in modern frontend technologies.",
    focus_skills: ["HTML5", "CSS3"],
    readiness_band: "Medium",
    resume_skill_count: 3,
  },
  matches: [sampleMatch],
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe("RoleAlignmentPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveResumeId = "res-uuid-123";
    mockTargetRole = "Full Stack Engineer";
  });

  it("renders empty state when no active resume ID is present", () => {
    mockActiveResumeId = null;
    renderWithProviders(<RoleAlignmentPage />);

    expect(screen.getByText(/Upload a Resume to Analyze Roles/i)).toBeInTheDocument();
    expect(screen.getByText(/Go to Resume Studio/i)).toBeInTheDocument();
  });

  it("renders role alignment successfully with real data", async () => {
    vi.mocked(roleService.alignRole).mockResolvedValue(sampleResponse);
    renderWithProviders(<RoleAlignmentPage />);

    await waitFor(() => {
      expect(screen.getByText(/Role Alignment & Skill Gap Analysis/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Frontend Engineer/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Close fit/i)).toBeInTheDocument();
    expect(screen.getByText(/Verified Matched Skills \(3\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Priority Skill Gaps \(3\)/i)).toBeInTheDocument();
    expect(screen.getByText("82%")).toBeInTheDocument();
  });

  it("displays normalized coverage percentages and not 4000%", () => {
    renderWithProviders(
      <RoleMatchCard
        match={{
          ...sampleMatch,
          core_skill_coverage: 40,
          advanced_skill_coverage: 60,
        }}
      />
    );

    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.queryByText("4000%")).not.toBeInTheDocument();
  });

  it("allows adding a missing skill to career roadmap", () => {
    renderWithProviders(<RoleMatchCard match={sampleMatch} />);

    const skillButton = screen.getByText("HTML5");
    fireEvent.click(skillButton);
    expect(mockAddSkillToRoadmap).toHaveBeenCalledWith("HTML5");
  });

  it("displays ErrorFallback when API call fails and allows retry", async () => {
    vi.mocked(roleService.alignRole).mockRejectedValue(new Error("Network Error"));
    renderWithProviders(<RoleAlignmentPage />);

    await waitFor(() => {
      expect(screen.getByText(/Role Alignment Failed/i)).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole("button", { name: /try again/i });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(roleService.alignRole).toHaveBeenCalledTimes(2);
  });
});
