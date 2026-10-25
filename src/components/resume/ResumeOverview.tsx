import React from "react";
import { ResumeDocumentPreview } from "./ResumeDocumentPreview";
import { ResumeHealthCard } from "./ResumeHealthCard";
import { ResumeRecommendations } from "./ResumeRecommendations";
import type { ResumeDetail } from "@/types";

interface ResumeOverviewProps {
  resume: ResumeDetail | null;
  onDownloadOriginal?: () => void;
  isDownloading?: boolean;
  onSwitchTab: (tab: "ats" | "skills" | "optimize" | "history") => void;
}

export function ResumeOverview({
  resume,
  onDownloadOriginal,
  isDownloading = false,
  onSwitchTab,
}: ResumeOverviewProps) {
  if (!resume) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-12 items-start">
      {/* Left Column: Document Preview (5 cols) */}
      <div className="lg:col-span-5">
        <ResumeDocumentPreview
          fileName={resume.file_name || resume.original_filename}
          extractedText={resume.extracted_text || resume.parsed_text}
          atsScore={resume.ats_score ?? 0}
          onDownload={onDownloadOriginal}
          isDownloading={isDownloading}
        />
      </div>

      {/* Right Column: Health Score & AI Recommendations (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        <ResumeHealthCard
          overallScore={resume.ats_score ?? 0}
          breakdown={resume.breakdown}
          onViewDiagnostics={() => onSwitchTab("ats")}
        />

        <ResumeRecommendations
          feedback={resume.feedback}
          missingSkills={resume.feedback?.missing_skills}
          onFixWithAI={() => onSwitchTab("optimize")}
          onViewSkills={() => onSwitchTab("skills")}
        />
      </div>
    </div>
  );
}
