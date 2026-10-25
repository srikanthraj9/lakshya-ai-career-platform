import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import ResumeStudioPage from "@/pages/ResumeStudioPage";
import { SkillIntelligence, normalizeSkillsList } from "@/components/resume/SkillIntelligence";
import { resumeService } from "@/services/resume";
import type { ResumeDetail, ResumeListItem } from "@/types";

// Mock AuthContext
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user-skills-123", email: "skills@example.com", name: "Skills Test User" },
    isAuthenticated: true,
  }),
}));

// Mock resumeService
vi.mock("@/services/resume", () => ({
  resumeService: {
    listResumes: vi.fn(),
    getResume: vi.fn(),
    deleteResume: vi.fn(),
    downloadResumeFile: vi.fn(),
    upload: vi.fn(),
  },
}));

const mockResumeBeginner: ResumeDetail = {
  id: "31dc6229-bf16-45c3-aa9b-445c03d49a09",
  file_name: "Resume_1_Beginner_Developer_Arjun_Kumar.pdf",
  original_filename: "Resume_1_Beginner_Developer_Arjun_Kumar.pdf",
  created_at: "2026-10-25T03:53:15.000Z",
  ats_score: 73,
  skills: ["CSS", "Git", "HTML", "JavaScript", "Python", "React", "REST API", "SQL"],
  breakdown: {
    keyword_match: 100.0,
    skill_diversity: 63.21,
    formatting: 76.0,
    action_verbs: 25.0,
    section_coverage: 46.67,
  },
  feedback: {
    summary: ["Focus on adding production projects."],
    weak_points: ["Add metrics to experience bullets."],
    formatting: [],
    missing_skills: ["Docker", "Redis", "TypeScript"],
  },
  extracted_text: "Arjun Kumar. Experienced in Python, React, JavaScript, SQL, HTML, CSS. Built REST API in Python.",
};

const mockResumeSenior: ResumeDetail = {
  id: "d4e87555-6690-4849-ac6d-124627c3002e",
  file_name: "Resume_5_Senior_Full_Stack_Developer_Arjun_Kumar.pdf",
  original_filename: "Resume_5_Senior_Full_Stack_Developer_Arjun_Kumar.pdf",
  created_at: "2026-10-25T03:53:19.000Z",
  ats_score: 77,
  skills: [
    "AWS", "CI/CD", "Docker", "GraphQL", "Java", "Kubernetes", "Microservices",
    "MongoDB", "Next.js", "Node.js", "PostgreSQL", "Python", "React", "Redis", "TypeScript"
  ],
  breakdown: {
    keyword_match: 95.0,
    skill_diversity: 88.0,
    formatting: 82.0,
    action_verbs: 80.0,
    section_coverage: 90.0,
  },
  feedback: {
    summary: ["Exceptional stack coverage."],
    weak_points: [],
    formatting: [],
    missing_skills: ["Kafka"],
  },
  extracted_text: "Senior Full Stack Architect with deep experience across AWS, Docker, Kubernetes, Next.js, Node.js.",
};

const mockResumeList: ResumeListItem[] = [
  {
    id: "31dc6229-bf16-45c3-aa9b-445c03d49a09",
    file_name: "Resume_1_Beginner_Developer_Arjun_Kumar.pdf",
    created_at: "2026-10-25T03:53:15.000Z",
    ats_score: 73,
  },
  {
    id: "d4e87555-6690-4849-ac6d-124627c3002e",
    file_name: "Resume_5_Senior_Full_Stack_Developer_Arjun_Kumar.pdf",
    created_at: "2026-10-25T03:53:19.000Z",
    ats_score: 77,
  },
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  });
}

function renderResumeStudio(ui: React.ReactElement = <ResumeStudioPage initialTab="skills" />, initialEntries = ["/resume?tab=skills"]) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/resume" element={ui} />
          <Route path="/resume/:id" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Skill Intelligence Regression Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Valid response containing skills
  it("renders valid response with detected skills, categories, and benchmarks without crashing", () => {
    render(
      <MemoryRouter>
        <SkillIntelligence resume={mockResumeBeginner} />
      </MemoryRouter>
    );

    expect(screen.getByTestId("skill-intelligence-success")).toBeInTheDocument();
    expect(screen.getByText(/8 verified technical skills detected/i)).toBeInTheDocument();
    expect(screen.getByText("Frontend Engineering")).toBeInTheDocument();
    expect(screen.getByText("Backend & APIs")).toBeInTheDocument();
    expect(screen.getByText("Databases & Caching")).toBeInTheDocument();
    expect(screen.getAllByText("Python").length).toBeGreaterThan(0);
    expect(screen.getAllByText("React").length).toBeGreaterThan(0);
  });

  // 2. Empty skills array
  it("handles empty skills array gracefully by displaying empty state message", () => {
    const emptyResume: ResumeDetail = {
      ...mockResumeBeginner,
      skills: [],
    };

    render(
      <MemoryRouter>
        <SkillIntelligence resume={emptyResume} />
      </MemoryRouter>
    );

    expect(screen.getByTestId("skill-intelligence-empty-no-skills")).toBeInTheDocument();
    expect(screen.getByText(/No Extractable Skills Detected/i)).toBeInTheDocument();
    expect(screen.getByText(/Tips to improve skill detection/i)).toBeInTheDocument();
  });

  // 3. Missing optional skills field
  it("handles missing optional skills field (undefined) safely without runtime forEach error", () => {
    const malformedResume: any = {
      id: "malformed-1",
      file_name: "Malformed_Resume.pdf",
      original_filename: "Malformed_Resume.pdf",
      created_at: "2026-10-25T00:00:00.000Z",
      ats_score: 50,
      // skills field completely absent
    };

    render(
      <MemoryRouter>
        <SkillIntelligence resume={malformedResume} />
      </MemoryRouter>
    );

    expect(screen.getByTestId("skill-intelligence-empty-no-skills")).toBeInTheDocument();
    expect(screen.queryByText(/Runtime Error/i)).not.toBeInTheDocument();
  });

  // 4. Null or malformed API response
  it("handles null and object-based skills safely through normalizeSkillsList", () => {
    expect(normalizeSkillsList(null)).toEqual([]);
    expect(normalizeSkillsList(undefined)).toEqual([]);
    expect(normalizeSkillsList("invalid-string")).toEqual([]);
    expect(
      normalizeSkillsList([
        "Python",
        { skill: "React" },
        { skill_name: "FastAPI" },
        { name: "Docker" },
        null,
        undefined,
        123,
      ])
    ).toEqual(["Python", "React", "FastAPI", "Docker"]);

    const mixedResume: any = {
      ...mockResumeBeginner,
      skills: [{ skill: "Python" }, { skill: "Django" }],
    };

    render(
      <MemoryRouter>
        <SkillIntelligence resume={mixedResume} />
      </MemoryRouter>
    );

    expect(screen.getByTestId("skill-intelligence-success")).toBeInTheDocument();
    expect(screen.getByText(/2 verified technical skills detected/i)).toBeInTheDocument();
  });

  // 5. API/network failure
  it("displays actionable error state with Retry button on API failure", () => {
    const onRetryMock = vi.fn();
    render(
      <MemoryRouter>
        <SkillIntelligence
          isError={true}
          onRetry={onRetryMock}
        />
      </MemoryRouter>
    );

    expect(screen.getByTestId("skill-intelligence-error")).toBeInTheDocument();
    expect(screen.getByText(/Unable to Load Skill Intelligence/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /Retry Analysis/i });
    fireEvent.click(retryBtn);
    expect(onRetryMock).toHaveBeenCalledTimes(1);
  });

  // 6. Switching between different resume versions
  it("updates skill stack and categories when switching between resume versions", () => {
    const { rerender } = render(
      <MemoryRouter>
        <SkillIntelligence resume={mockResumeBeginner} />
      </MemoryRouter>
    );

    expect(screen.getByText(/8 verified technical skills detected/i)).toBeInTheDocument();
    expect(screen.queryByText("Kubernetes")).not.toBeInTheDocument();

    // Switch to Senior Resume
    rerender(
      <MemoryRouter>
        <SkillIntelligence resume={mockResumeSenior} />
      </MemoryRouter>
    );

    expect(screen.getByText(/15 verified technical skills detected/i)).toBeInTheDocument();
    expect(screen.getAllByText("Kubernetes").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Docker").length).toBeGreaterThan(0);
  });

  // 7. Opening the Skill Intelligence tab directly using ?tab=skills
  it("opens Skill Intelligence tab directly from URL parameter without crashing", async () => {
    (resumeService.listResumes as any).mockResolvedValue(mockResumeList);
    (resumeService.getResume as any).mockResolvedValue(mockResumeBeginner);

    renderResumeStudio(
      <ResumeStudioPage initialTab="skills" />,
      ["/resume/31dc6229-bf16-45c3-aa9b-445c03d49a09?tab=skills"]
    );

    await waitFor(() => {
      expect(screen.getByText("Skill Intelligence & Stack Coverage")).toBeInTheDocument();
    });

    expect(screen.getByText(/8 verified technical skills detected/i)).toBeInTheDocument();
    expect(screen.queryByText(/Cannot read properties of undefined/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Unexpected Error/i)).not.toBeInTheDocument();
  });
});
