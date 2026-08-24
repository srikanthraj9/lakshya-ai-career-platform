import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, CheckCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface ResumeEmptyStateProps {
  onFileSelected: (file: File) => void;
  isUploading?: boolean;
  uploadProgress?: number;
}

export function ResumeEmptyState({
  onFileSelected,
  isUploading = false,
  uploadProgress = 0,
}: ResumeEmptyStateProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped && dropped.name.toLowerCase().endsWith(".pdf")) {
        setSelectedFile(dropped);
        onFileSelected(dropped);
      }
    },
    [onFileSelected]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFileSelected(file);
    }
  };

  return (
    <div className="glass-card gradient-border relative overflow-hidden rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <StatusBadge variant="ai" dot className="mx-auto">
          Resume Intelligence Workspace
        </StatusBadge>
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Your Career Story Starts Here
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          Upload your resume in PDF format to instantly unlock comprehensive ATS scoring, detected tech skills, keyword gaps, and 1-click AI optimization.
        </p>
      </div>

      {/* Dropzone Container */}
      <motion.div
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 sm:p-10 transition-all ${
          dragOver
            ? "border-primary bg-primary/10 scale-[1.01]"
            : "border-border/80 bg-secondary/20 hover:border-primary/40 hover:bg-secondary/40"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".pdf"
          disabled={isUploading}
          onChange={handleFileChange}
          className="absolute inset-0 cursor-pointer opacity-0 z-10"
        />

        <div className="flex flex-col items-center space-y-3 pointer-events-none">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
            <Upload className={`h-6 w-6 transition-transform duration-200 ${dragOver ? "scale-110" : ""}`} />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Drag & drop your PDF resume here
            </p>
            <p className="text-xs text-muted-foreground">or click to browse your local files</p>
          </div>

          <span className="text-[10px] text-muted-foreground/80 font-medium">Supported Format: PDF (up to 10MB)</span>
        </div>
      </motion.div>

      {/* Uploading Progress Bar */}
      {isUploading && (
        <div className="space-y-2 pt-2 text-left">
          <div className="flex justify-between text-xs text-muted-foreground font-medium">
            <span>Uploading & Analyzing Resume...</span>
            <span className="text-primary font-bold">{Math.round(uploadProgress)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/80">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
              animate={{ width: `${uploadProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
