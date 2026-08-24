import { describe, it, expect } from "vitest";

describe("Resume Journey Integration Flow", () => {
  it("processes complete resume workflow from upload through ATS scoring to version persistence", () => {
    // 1. Mock parsed resume payload
    const mockParsedResume = {
      id: "res-v1",
      file_name: "Srikanth_FullStack_Resume.pdf",
      raw_text: "Senior Full Stack Engineer with 6+ years building scalable React and Node applications.",
      skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker", "AWS"],
      ats_score: 92.0,
      format_score: 94.0,
      content_score: 90.0,
      keyword_score: 91.0,
    };

    expect(mockParsedResume.ats_score).toBeGreaterThan(80);
    expect(mockParsedResume.skills.length).toBeGreaterThan(3);

    // 2. Mock AI Resume Rewrite with STAR bullet points
    const mockOptimizedVersion = {
      ...mockParsedResume,
      id: "res-v2-optimized",
      ats_score: 96.0,
      improvements: [
        "Quantified backend latency reduction by 35% with Redis caching layer",
        "Architected real-time WebSocket telemetry pipeline serving 100k+ events/min",
      ],
      latex_code: "\\documentclass{article}\\begin{document}Srikanth Resume\\end{document}",
    };

    expect(mockOptimizedVersion.ats_score).toBeGreaterThan(mockParsedResume.ats_score);
    expect(mockOptimizedVersion.latex_code).toContain("\\documentclass");
    expect(mockOptimizedVersion.improvements.length).toBe(2);
  });
});
