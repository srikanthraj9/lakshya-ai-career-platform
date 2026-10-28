import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import ResumeStudioPage from "@/pages/ResumeStudioPage";
import { ATSDiagnostics } from "@/components/resume/ATSDiagnostics";
import { resumeService } from "@/services/resume";
import type { ResumeDetail, ResumeListItem } from "@/types";

// Mock AuthContext
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user-123", email: "test@example.com", name: "Test User" },
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

const mockResume1: ResumeDetail = {
  id: "resume-1",
  file_name: "Resume_1_Beginner_Developer_Arjun_Kumar.pdf",
  original_filename: "Resume_1_Beginner_Developer_Arjun_Kumar.pdf",
  created_at: "2026-10-25T03:53:15.000Z",
  ats_score: 73,
  skills: ["css", "django", "fastapi", "flask", "html", "numpy", "pandas", "python"],
  breakdown: {
    keyword_match: 100.0,
    skill_diversity: 63.21,
    formatting: 76.0,
    action_verbs: 25.0,
    section_coverage: 46.67,
  },
  feedback: {
    summary: [
      "Increase keyword coverage and section completeness to improve ATS score.",
      "Start more bullets with strong action verbs.",
    ],
    weak_points: ["Add measurable impact to beginner projects."],
    formatting: ["Add concise bullet points for experience and projects."],
    missing_skills: ["docker", "postgresql", "redis"],
  },
  extracted_text: `ARJUN KUMAR
Beginner Developer
Email: arjun.test@example.com | Phone: +1 0000000000 | Location: India
PROFESSIONAL SUMMARY
Entry-level developer building foundational skills in Python and web development.
TECHNICAL SKILLS
Python, Django, FastAPI, Flask, HTML, CSS, NumPy, Pandas
PROJECTS
- Built a personal portfolio website with responsive design
- Created a weather API scraper using Python
EDUCATION
B.Tech in Computer Science, 2026
EXPERIENCE
- Academic project lead for web development module`,
  parsed_text: "Clean text stream",
};

const mockResume2: ResumeDetail = {
  id: "resume-2",
  file_name: "Resume_2_Junior_Web_Developer_Arjun_Kumar.pdf",
  original_filename: "Resume_2_Junior_Web_Developer_Arjun_Kumar.pdf",
  created_at: "2026-10-25T03:53:31.000Z",
  ats_score: 80,
  skills: ["css", "django", "fastapi", "flask", "git", "html", "javascript", "numpy", "pandas", "python", "sql"],
  breakdown: {
    keyword_match: 100.0,
    skill_diversity: 88.67,
    formatting: 76.0,
    action_verbs: 25.0,
    section_coverage: 46.67,
  },
  feedback: {
    summary: ["Start more bullets with strong action verbs."],
    weak_points: [],
    formatting: ["Add concise bullet points for experience."],
    missing_skills: ["docker", "react"],
  },
  extracted_text: `ARJUN KUMAR
Junior Web Developer
Email: arjun.test@example.com | Phone: +1 0000000000 | Location: India
PROFESSIONAL SUMMARY
Junior developer with web development experience in Python, JavaScript, and SQL.
TECHNICAL SKILLS
Python, JavaScript, SQL, Git, Django, FastAPI, HTML, CSS
PROJECTS
- Developed full-stack e-commerce store with authentication
EDUCATION
B.Tech in Computer Science
EXPERIENCE
- Junior Web Developer intern at Tech Solutions`,
  parsed_text: "Clean text stream 2",
};

const mockResumeList: ResumeListItem[] = [
  {
    id: "resume-1",
    file_name: "Resume_1_Beginner_Developer_Arjun_Kumar.pdf",
    created_at: "2026-10-25T03:53:15.000Z",
    ats_score: 73,
  },
  {
    id: "resume-2",
    file_name: "Resume_2_Junior_Web_Developer_Arjun_Kumar.pdf",
    created_at: "2026-10-25T03:53:31.000Z",
    ats_score: 80,
  },
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderWithProviders(ui: React.ReactElement, initialEntries = ["/resume"]) {
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

describe("ATS Diagnostics Component & Resume Studio Tab Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders ATS Diagnostics without leaving the main content area blank", async () => {
    vi.mocked(resumeService.listResumes).mockResolvedValue(mockResumeList);
    vi.mocked(resumeService.getResume).mockResolvedValue(mockResume1);

    renderWithProviders(<ResumeStudioPage initialTab="ats" />);

    await waitFor(() => {
      expect(screen.getByText(/ATS Compatibility & Parsing Diagnostics/i)).toBeInTheDocument();
    });

    // Master Score & Metadata
    expect(screen.getByText("73%")).toBeInTheDocument();
    expect(screen.getAllByText(/Resume_1_Beginner_Developer_Arjun_Kumar\.pdf/i).length).toBeGreaterThan(0);

    // Section Checklist
    expect(screen.getByText(/Contact Information/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Professional Summary/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Technical Skills/i).length).toBeGreaterThan(0);

    // Breakdown components
    expect(screen.getByText(/Keyword Match/i)).toBeInTheDocument();
    expect(screen.getByText(/Skill Diversity/i)).toBeInTheDocument();
    expect(screen.getByText(/Formatting & Layout/i)).toBeInTheDocument();
  });

  it("switches to ATS Diagnostics tab when tab button is clicked from Overview", async () => {
    vi.mocked(resumeService.listResumes).mockResolvedValue(mockResumeList);
    vi.mocked(resumeService.getResume).mockResolvedValue(mockResume1);

    renderWithProviders(<ResumeStudioPage initialTab="overview" />);

    await waitFor(() => {
      expect(screen.getByText(/Master Resume Health/i)).toBeInTheDocument();
    });

    // Click "ATS Diagnostics" tab
    const atsTab = screen.getByRole("tab", { name: /ATS Diagnostics/i });
    fireEvent.click(atsTab);

    // Diagnostics content renders smoothly
    await waitFor(() => {
      expect(screen.getByText(/ATS Compatibility & Parsing Diagnostics/i)).toBeInTheDocument();
      expect(screen.getByText("73%")).toBeInTheDocument();
    });
  });

  it("updates ATS score, skills, and diagnostics when switching resume versions", async () => {
    vi.mocked(resumeService.listResumes).mockResolvedValue(mockResumeList);
    vi.mocked(resumeService.getResume).mockImplementation((id: string) => {
      if (id === "resume-2") return Promise.resolve(mockResume2);
      return Promise.resolve(mockResume1);
    });

    // Render with Resume 1 active
    const { unmount } = renderWithProviders(<ResumeStudioPage initialTab="ats" resumeId="resume-1" />);

    await waitFor(() => {
      expect(screen.getByText("73%")).toBeInTheDocument();
      expect(screen.getByText(/8 Skills Cataloged/i)).toBeInTheDocument();
    });

    unmount();

    // Now render with Resume 2 active — verifies distinct score, skills count, and content
    renderWithProviders(<ResumeStudioPage initialTab="ats" resumeId="resume-2" />);

    await waitFor(() => {
      expect(screen.getByText("80%")).toBeInTheDocument();
      expect(screen.getByText(/11 Skills Cataloged/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Resume_2_Junior_Web_Developer_Arjun_Kumar\.pdf/i).length).toBeGreaterThan(0);
    });
  });

  it("renders loading state gracefully", () => {
    render(
      <ATSDiagnostics
        resume={null}
        isLoading={true}
      />
    );

    expect(screen.getByText(/Analyzing ATS Compliance\.\.\./i)).toBeInTheDocument();
  });

  it("renders error state with retry button on API failure", () => {
    const handleRetry = vi.fn();
    render(
      <ATSDiagnostics
        resume={null}
        isError={true}
        onRetry={handleRetry}
      />
    );

    expect(screen.getByText(/ATS Diagnostics Failed/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /Retry Analysis/i });
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it("renders empty state when no resume is selected", () => {
    const handleUpload = vi.fn();
    render(
      <ATSDiagnostics
        resume={null}
        isLoading={false}
        isError={false}
        onOpenUpload={handleUpload}
      />
    );

    expect(screen.getByText(/No Resume Version Selected/i)).toBeInTheDocument();
    const uploadBtn = screen.getByRole("button", { name: /Upload Resume Version/i });
    fireEvent.click(uploadBtn);
    expect(handleUpload).toHaveBeenCalledTimes(1);
  });

  it("renders unreadable text warning when document contains no extracted text", () => {
    const emptyResume: ResumeDetail = {
      ...mockResume1,
      extracted_text: "",
      parsed_text: "",
    };

    render(
      <ATSDiagnostics
        resume={emptyResume}
      />
    );

    expect(screen.getByText(/No Readable Text Extracted/i)).toBeInTheDocument();
  });

  it("interactively computes target role matching keywords and alignment percentage", () => {
    render(
      <ATSDiagnostics
        resume={mockResume1}
      />
    );

    // Preset for Full-Stack Developer is active by default
    expect(screen.getByText(/Target Role Match/i)).toBeInTheDocument();

    // Click "Python Backend Developer" preset
    const pythonRoleBtn = screen.getByRole("button", { name: /Python Backend Developer/i });
    fireEvent.click(pythonRoleBtn);

    // Verified skills for Python Backend
    expect(screen.getByText(/Matched Technical Keywords/i)).toBeInTheDocument();
  });

  it("switches cleanly between Base Quality, Job-Specific Match, and Assessment History tabs", async () => {
    render(
      <ATSDiagnostics
        resume={{
          ...mockResume1,
          version_number: 2,
          version_label: "v2.0 Full-Stack Optimized",
        }}
      />
    );

    // Verify version badge renders
    expect(screen.getByText("v2.0 Full-Stack Optimized")).toBeInTheDocument();

    // Verify Base Quality Diagnostics mode is active by default
    expect(screen.getByRole("button", { name: /Base Quality Diagnostics/i })).toBeInTheDocument();
    expect(screen.getByText(/Document Quality Diagnostics/i)).toBeInTheDocument();

    // Switch to Job-Specific ATS Match mode
    const jobMatchTab = screen.getByRole("button", { name: /Job-Specific ATS Match/i });
    fireEvent.click(jobMatchTab);
    expect(screen.getByText(/Target Job Match Assessment/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Run Job Assessment/i })).toBeInTheDocument();

    // Switch to Assessment History tab
    const historyTab = screen.getByRole("button", { name: /Assessment History/i });
    fireEvent.click(historyTab);
    expect(screen.getByText(/Historical ATS Assessment Runs/i)).toBeInTheDocument();
  });
});

