import { useState, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { voiceInterviewService } from "@/services/voiceInterview";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Mic, Square, Loader2, Award, MessageSquare, Shield } from "lucide-react";
import { toast } from "sonner";
import type { VoiceAnswerResponse } from "@/types";

export default function VoiceInterviewPage() {
  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState<VoiceAnswerResponse | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const mutation = useMutation({
    mutationFn: (blob: Blob) => voiceInterviewService.submitVoiceAnswer(blob),
    onSuccess: (data) => { setResult(data); toast.success("Voice answer evaluated!"); },
    onError: () => toast.error("Failed to process voice answer."),
  });

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunks.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        mutation.mutate(blob);
      };
      recorder.start();
      mediaRecorder.current = recorder;
      setRecording(true);
    } catch {
      toast.error("Microphone access required.");
    }
  }, [mutation]);

  const stopRecording = useCallback(() => {
    mediaRecorder.current?.stop();
    setRecording(false);
  }, []);

  const scoreCards = result ? [
    { label: "Technical", value: result.scores.technical, icon: Award, color: "text-primary" },
    { label: "Communication", value: result.scores.communication, icon: MessageSquare, color: "text-accent" },
    { label: "Confidence", value: result.scores.confidence, icon: Shield, color: "text-chart-3" },
  ] : [];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Voice Interview AI</h1>
        <p className="text-muted-foreground">Record your answer and get instant AI evaluation.</p>
      </div>

      <div className="glass-card flex flex-col items-center gap-6 rounded-2xl p-10">
        {recording && (
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="flex h-28 w-28 items-center justify-center rounded-full bg-destructive/20">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/30">
              <Mic className="h-10 w-10 text-destructive" />
            </div>
          </motion.div>
        )}
        {!recording && !mutation.isPending && (
          <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-dashed border-border">
            <Mic className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        {mutation.isPending && <Loader2 className="h-12 w-12 animate-spin text-primary" />}

        <p className="text-sm text-muted-foreground">{recording ? "Recording... Speak your answer" : mutation.isPending ? "Processing your answer..." : "Click to start recording"}</p>

        {!recording ? (
          <Button variant="gradient" size="lg" onClick={startRecording} disabled={mutation.isPending}>
            <Mic className="mr-2 h-4 w-4" /> Start Recording
          </Button>
        ) : (
          <Button variant="destructive" size="lg" onClick={stopRecording}>
            <Square className="mr-2 h-4 w-4" /> Stop Recording
          </Button>
        )}
      </div>

      {mutation.isPending && <Skeleton className="h-48 w-full rounded-2xl" />}

      {result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {scoreCards.map((s) => (
              <div key={s.label} className="glass-card rounded-xl p-6 text-center">
                <s.icon className={`mx-auto mb-2 h-6 w-6 ${s.color}`} />
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-3xl font-bold text-foreground">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold">Transcript</h3>
            <p className="text-sm text-muted-foreground">{result.transcript}</p>
          </div>
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold">AI Feedback</h3>
            <p className="text-sm text-foreground">{result.feedback}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
