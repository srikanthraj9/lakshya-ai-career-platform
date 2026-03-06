import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { resumeService } from "@/services/resume";
import { Button } from "@/components/ui/button";
import { Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function ResumeUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const navigate = useNavigate();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const resume = await resumeService.upload(file);
      toast.success("Resume uploaded successfully!");
      navigate(`/resume/${resume.id}`);
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Upload Resume</h1>
        <p className="text-muted-foreground">Upload your resume for AI-powered analysis.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`glass-card flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {file ? (
          <>
            <FileText className="mb-4 h-12 w-12 text-primary" />
            <p className="text-lg font-medium text-foreground">{file.name}</p>
            <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
          </>
        ) : (
          <>
            <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground">Drag & drop your resume</p>
            <p className="text-sm text-muted-foreground">or click to browse</p>
          </>
        )}
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </motion.div>

      <Button variant="gradient" className="w-full" disabled={!file || uploading} onClick={handleUpload}>
        {uploading ? "Analyzing..." : "Upload & Analyze"}
      </Button>
    </div>
  );
}
