import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { resumeService } from "@/services/resume";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { getApiErrorMessage } from "@/services/api";
import { ResumeReferenceList } from "@/components/resume/ResumeReferenceList";

export default function ResumeUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const navigate = useNavigate();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file) return;
    try {
      const resumes = await resumeService.listResumes();
      if (resumes.length >= 10) {
        toast.error("Maximum 10 resumes allowed");
        return;
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) { clearInterval(progressInterval); return 90; }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      const resume = await resumeService.upload(file);
      clearInterval(progressInterval);
      setUploadProgress(100);
      setSuccess(true);
      toast.success("Resume uploaded successfully!");
      setTimeout(() => navigate(`/resume/${resume.id}`), 1500);
    } catch (error) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      toast.error(getApiErrorMessage(error));
    } finally {
      setUploading(false);
    }
  }, [file, navigate]);

  return (
    <PageTransition>
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Upload Resume</h1>
          <p className="text-muted-foreground">Upload your resume for AI-powered analysis.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`glass-card relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-300 ${
            dragOver
              ? "border-primary bg-primary/5 shadow-[0_0_30px_-8px_hsl(var(--primary)/0.3)] scale-[1.02]"
              : success
              ? "border-chart-4 bg-chart-4/5"
              : "border-border hover:border-muted-foreground/30"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          role="region"
          aria-label="File upload area"
        >
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div key="success" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center">
                <CheckCircle className="mb-4 h-12 w-12 text-chart-4" aria-hidden="true" />
                <p className="text-lg font-medium text-foreground">Upload Complete!</p>
                <p className="text-sm text-muted-foreground">Redirecting to analysis...</p>
              </motion.div>
            ) : file ? (
              <motion.div key="file" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                <FileText className="mb-4 h-12 w-12 text-primary" aria-hidden="true" />
                <p className="text-lg font-medium text-foreground">{file.name}</p>
                <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                <Upload className={`mb-4 h-12 w-12 transition-transform duration-300 ${dragOver ? "text-primary scale-110" : "text-muted-foreground"}`} aria-hidden="true" />
                <p className="text-lg font-medium text-foreground">Drag & drop your resume</p>
                <p className="text-sm text-muted-foreground">or click to browse</p>
              </motion.div>
            )}
          </AnimatePresence>
          <input
            type="file"
            accept=".pdf"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            aria-label="Choose resume file"
          />
        </motion.div>

        {uploading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Uploading & Analyzing...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={Math.round(uploadProgress)} aria-valuemin={0} aria-valuemax={100}>
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}

        <Button variant="gradient" className="w-full" disabled={!file || uploading || success} onClick={handleUpload} aria-label="Upload and analyze resume">
          {uploading ? "Analyzing..." : success ? "Done!" : "Upload & Analyze"}
        </Button>

        <ResumeReferenceList />
      </div>
    </PageTransition>
  );
}
