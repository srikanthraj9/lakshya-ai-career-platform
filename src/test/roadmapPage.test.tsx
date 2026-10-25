import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RoadmapPage from "@/pages/RoadmapPage";
import { RoadmapHeader } from "@/components/roadmap/RoadmapHeader";
import { RoadmapMilestoneCard } from "@/components/roadmap/RoadmapMilestoneCard";
import { RoadmapInsights } from "@/components/roadmap/RoadmapInsights";
import { roadmapService } from "@/services/roadmap";
import type { RoadmapStep } from "@/types";

// Mock AuthContext
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user-id", email: "test@example.com", name: "Test User" },
    isAuthenticated: true,
  }),
}));

// Mock CareerContext
const mockAddSkillToRoadmap = vi.fn();
const mockSetTargetRole = vi.fn();
vi.mock("@/hooks/useCareerContext", () => ({
  useCareerContext: () => ({
    targetRole: "Full Stack Developer",
    setTargetRole: mockSetTargetRole,
    detectedSkills: ["React", "JavaScript", "CSS"],
    missingSkills: ["Docker", "PostgreSQL", "TypeScript"],
    addSkillToRoadmap: mockAddSkillToRoadmap,
    readiness: { overall_score: 75 },
    activeResume: null,
    resumes: [],
    refreshCareerData: vi.fn(),
  }),
}));

// Mock roadmapService
vi.mock("@/services/roadmap", () => ({
  roadmapService: {
    generate: vi.fn(),
    getProgress: vi.fn().mockResolvedValue([]),
    saveProgress: vi.fn().mockResolvedValue({}),
  },
}));

// Mock userStorage
const storageMock: Record<string, any> = {};
vi.mock("@/lib/userStorage", () => ({
  getUserStorage: vi.fn((_userId, key, fallback) => storageMock[key] ?? fallback),
  setUserStorage: vi.fn((_userId, key, val) => {
    storageMock[key] = val;
  }),
  removeUserStorage: vi.fn((_userId, key) => {
    delete storageMock[key];
  }),
}));

const sampleStep: RoadmapStep = {
  step: "Master Modern Web Foundations (HTML5, Modern CSS, Responsive Design)",
  title: "Web Foundations & Responsive UI",
  duration: "2 weeks",
  stage: "Phase 1: Foundations",
  skills: ["HTML5", "CSS3", "Flexbox/Grid"],
  why_it_matters: "Every modern application interface relies on semantic structure.",
  prerequisites: ["Basic computer literacy"],
  beginner_friendly_explanation: "Think of HTML as the skeleton and CSS as the styling.",
  practical_project: "Build and deploy a responsive personal portfolio with dark mode.",
  checklist: [
    "Construct semantic HTML5 structure",
    "Build responsive layouts using CSS Grid",
    "Implement CSS variables for dark mode",
  ],
  resources: [
    { name: "MDN Web Development Tutorial", url: "https://developer.mozilla.org" },
    { name: "CSS Tricks Guide", url: "https://css-tricks.com" },
  ],
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe("Career Roadmap Regression & Feature Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(storageMock).forEach((k) => delete storageMock[k]);
    (roadmapService.generate as any).mockResolvedValue({
      roadmap: [sampleStep],
      track: "fullstack",
      is_personalized: true,
      role_supported: true,
    });
  });

  it("renders RoadmapHeader with title, target role input, and experience selector", () => {
    const handleGenerate = vi.fn();
    const handleRoleChange = vi.fn();
    const handleExpChange = vi.fn();

    render(
      <RoadmapHeader
        role="Full Stack Developer"
        onRoleChange={handleRoleChange}
        experience="Intermediate"
        onExperienceChange={handleExpChange}
        onGenerate={handleGenerate}
        totalMilestones={4}
        completedMilestones={1}
      />
    );

    expect(screen.getByText("Personalized Learning Milestones")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Full Stack Developer")).toBeInTheDocument();
    expect(screen.getByText("1 of 4 Completed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate roadmap/i })).toBeInTheDocument();
  });

  it("renders RoadmapMilestoneCard with full details and collapses/expands properly", () => {
    const handleToggleComplete = vi.fn();

    render(
      <BrowserRouter>
        <RoadmapMilestoneCard
          step={sampleStep}
          index={0}
          isCompleted={false}
          onToggleComplete={handleToggleComplete}
          isExpanded={true}
        />
      </BrowserRouter>
    );

    expect(screen.getByText("Web Foundations & Responsive UI")).toBeInTheDocument();
    expect(screen.getByText("Milestone 01")).toBeInTheDocument();
    expect(screen.getByText("• Phase 1: Foundations")).toBeInTheDocument();
    expect(screen.getByText("2 weeks")).toBeInTheDocument();
    expect(screen.getByText("HTML5")).toBeInTheDocument();

    // Expanded details
    expect(screen.getByText("Why This Milestone Matters for Your Target Role")).toBeInTheDocument();
    expect(screen.getByText(sampleStep.why_it_matters!)).toBeInTheDocument();
    expect(screen.getByText(sampleStep.practical_project!)).toBeInTheDocument();
    expect(screen.getByText("Construct semantic HTML5 structure")).toBeInTheDocument();
    expect(screen.getByText("MDN Web Development Tutorial")).toBeInTheDocument();
  });

  it("toggles milestone completion on checkbox click", () => {
    const handleToggleComplete = vi.fn();

    render(
      <BrowserRouter>
        <RoadmapMilestoneCard
          step={sampleStep}
          index={0}
          isCompleted={false}
          onToggleComplete={handleToggleComplete}
          isExpanded={false}
        />
      </BrowserRouter>
    );

    const completeBtn = screen.getByLabelText(/mark milestone complete/i);
    fireEvent.click(completeBtn);
    expect(handleToggleComplete).toHaveBeenCalledWith(0);
  });

  it("renders RoadmapInsights with momentum stats and skill gap actions", () => {
    const handleAddSkill = vi.fn();
    const handleAddAll = vi.fn();

    render(
      <BrowserRouter>
        <RoadmapInsights
          roadmap={[sampleStep]}
          completedCount={0}
          targetRole="Full Stack Developer"
          missingSkills={["Docker", "PostgreSQL"]}
          onAddSkill={handleAddSkill}
          onAddAllSkills={handleAddAll}
        />
      </BrowserRouter>
    );

    expect(screen.getByText("Cross-Platform Skill Gaps")).toBeInTheDocument();
    expect(screen.getByText("Docker")).toBeInTheDocument();
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
    expect(screen.getByText("Roadmap Momentum")).toBeInTheDocument();

    // Click skill pill
    fireEvent.click(screen.getByText("Docker"));
    expect(handleAddSkill).toHaveBeenCalledWith("Docker");

    // Click Add All button
    const addAllBtn = screen.getByRole("button", { name: /add all/i });
    fireEvent.click(addAllBtn);
    expect(handleAddAll).toHaveBeenCalled();
  });

  it("displays 100% Core Skill Alignment when missing skills is empty", () => {
    render(
      <BrowserRouter>
        <RoadmapInsights
          roadmap={[sampleStep]}
          completedCount={1}
          targetRole="Frontend Engineer"
          missingSkills={[]}
          onAddSkill={vi.fn()}
        />
      </BrowserRouter>
    );

    expect(screen.getByText("100% Core Skill Alignment")).toBeInTheDocument();
  });

  it("generates and renders roadmap in RoadmapPage", async () => {
    renderWithProviders(<RoadmapPage />);

    // Wait for header or card
    await waitFor(() => {
      expect(screen.getByText("Milestones & Learning Path")).toBeInTheDocument();
    });

    expect(screen.getByText("0 of 1 Milestones Completed")).toBeInTheDocument();
  });

  it("adds a missing skill to the roadmap dynamically", async () => {
    renderWithProviders(<RoadmapPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Web Foundations & Responsive UI")[0]).toBeInTheDocument();
    });

    // Find and click the Docker skill pill
    const dockerPills = screen.getAllByText("Docker");
    fireEvent.click(dockerPills[0]);

    // Verify newly added milestone appears in the curriculum
    await waitFor(() => {
      expect(screen.getByText("Master Docker")).toBeInTheDocument();
    });

    expect(screen.getByText("0 of 2 Milestones Completed")).toBeInTheDocument();
  });

  it("marks milestone as completed and recalculates progress", async () => {
    renderWithProviders(<RoadmapPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Web Foundations & Responsive UI")[0]).toBeInTheDocument();
    });

    const completeBtn = screen.getByLabelText(/mark milestone complete/i);
    fireEvent.click(completeBtn);

    await waitFor(() => {
      expect(screen.getByText("1 of 1 Milestones Completed")).toBeInTheDocument();
    });

    expect(roadmapService.saveProgress).toHaveBeenCalledWith(
      "Full Stack Developer",
      "Intermediate",
      [0]
    );
  });
});
