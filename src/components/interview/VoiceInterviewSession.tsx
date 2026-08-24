import React, { useState, useEffect, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Mic, Square, RefreshCw, Volume2, Bot, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceVisualizer, type VoiceState } from "./VoiceVisualizer";
import { LiveTranscript } from "./LiveTranscript";
import { voiceInterviewService } from "@/services/voiceInterview";
import { getApiErrorMessage } from "@/services/api";
import { toast } from "sonner";
import type { VoiceChatMessage, VoiceChatResponse } from "@/types";

const MIN_AUDIO_BYTES = 6_000;
const ASSISTANT_INTRO =
  "Hello! I am your AI Voice Interviewer. Let's begin your technical practice session. Tell me about your engineering background and your core technical stack.";

type SpeechRecognitionAlternativeLike = { transcript: string };
type SpeechRecognitionResultLike = { isFinal?: boolean; [index: number]: SpeechRecognitionAlternativeLike };
type SpeechRecognitionEventLike = { results: ArrayLike<SpeechRecognitionResultLike> };
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface VoiceInterviewSessionProps {
  role?: string;
  onExit: () => void;
}

export function VoiceInterviewSession({
  role = "Software Engineer",
  onExit,
}: VoiceInterviewSessionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [messages, setMessages] = useState<VoiceChatMessage[]>([]);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState("");

  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef("");
  const messagesRef = useRef<VoiceChatMessage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const stopRecognition = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.onresult = null;
    recognitionRef.current.onerror = null;
    recognitionRef.current.onend = null;
    try {
      recognitionRef.current.stop();
    } catch {}
    recognitionRef.current = null;
  }, []);

  const speakText = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setVoiceState("speaking");
      setStatusMessage("AI is speaking...");
    };
    utterance.onend = () => {
      setVoiceState("idle");
      setStatusMessage(null);
    };
    utterance.onerror = () => {
      setVoiceState("idle");
      setStatusMessage(null);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  // Initial intro speak
  useEffect(() => {
    setMessages([{ role: "assistant", content: ASSISTANT_INTRO }]);
    const timeout = setTimeout(() => {
      speakText(ASSISTANT_INTRO);
    }, 400);
    return () => {
      clearTimeout(timeout);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      cleanupStream();
      stopRecognition();
    };
  }, [speakText, cleanupStream, stopRecognition]);

  // Voice Chat Mutation
  const mutation = useMutation({
    mutationFn: async ({ blob, transcript }: { blob: Blob; transcript: string }) => {
      return voiceInterviewService.submitVoiceChat(blob, {
        messages: messagesRef.current,
        transcript,
      });
    },
    onSuccess: (data: VoiceChatResponse) => {
      setVoiceState("idle");
      setStatusMessage(null);
      const nextMessages = [...messagesRef.current, { role: "assistant" as const, content: data.reply }];
      setMessages(nextMessages);
      speakText(data.reply);
    },
    onError: (err) => {
      setVoiceState("idle");
      setStatusMessage(null);
      toast.error(getApiErrorMessage(err));
    },
  });

  const startRecording = useCallback(async () => {
    try {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      rec.onstop = () => {
        const fullBlob = new Blob(chunks, { type: "audio/webm" });
        const finalTranscript = transcriptRef.current.trim();
        stopRecognition();
        cleanupStream();

        if (fullBlob.size < MIN_AUDIO_BYTES && !finalTranscript) {
          toast.error("Recording was too short. Please speak again.");
          setVoiceState("idle");
          setStatusMessage(null);
          return;
        }

        const userMsg = finalTranscript || "Spoken response recorded.";
        setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
        setVoiceState("processing");
        setStatusMessage("Transcribing & synthesizing response...");
        mutation.mutate({ blob: fullBlob, transcript: finalTranscript });
      };

      setAudioChunks([]);
      transcriptRef.current = "";
      setInterimTranscript("");

      const SpeechConstructor = getSpeechRecognition();
      if (SpeechConstructor) {
        const sr = new SpeechConstructor();
        sr.continuous = true;
        sr.interimResults = true;
        sr.lang = "en-US";

        sr.onresult = (ev) => {
          let interim = "";
          for (let i = 0; i < ev.results.length; i++) {
            const item = ev.results[i];
            if (item && item[0]) {
              const piece = item[0].transcript;
              if (item.isFinal) {
                transcriptRef.current = `${transcriptRef.current} ${piece}`.trim();
              } else {
                interim = piece;
              }
            }
          }
          setInterimTranscript(interim);
        };
        sr.onerror = () => {};
        sr.start();
        recognitionRef.current = sr;
      }

      rec.start(250);
      setMediaRecorder(rec);
      setIsRecording(true);
      setVoiceState("listening");
      setStatusMessage("Listening... Speak clearly into your mic.");
    } catch (err) {
      toast.error("Microphone access is required. Please check your browser permissions.");
    }
  }, [mutation, cleanupStream, stopRecognition]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  }, [mediaRecorder]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between glass-card rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onExit}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div className="h-4 w-[1px] bg-border" />
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-foreground">AI Voice Interviewer</span>
            <p className="text-[11px] text-muted-foreground">Target Role: {role}</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (window.speechSynthesis) window.speechSynthesis.cancel();
            setMessages([{ role: "assistant", content: ASSISTANT_INTRO }]);
            speakText(ASSISTANT_INTRO);
          }}
          className="h-8 gap-1.5 text-xs rounded-xl border-border/80 text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Restart Dialogue</span>
        </Button>
      </div>

      {/* 2-Column Voice Workspace */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Visualizer & Controls (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <VoiceVisualizer state={voiceState} statusMessage={statusMessage} />

          {/* Primary Voice Action Trigger */}
          <div className="flex justify-center">
            {!isRecording ? (
              <Button
                onClick={startRecording}
                disabled={mutation.isPending || voiceState === "speaking"}
                variant="gradient"
                className="h-14 px-8 gap-2.5 rounded-2xl text-sm font-bold text-white shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all"
              >
                <Mic className="h-5 w-5" />
                <span>Start Speaking</span>
              </Button>
            ) : (
              <Button
                onClick={stopRecording}
                variant="destructive"
                className="h-14 px-8 gap-2.5 rounded-2xl text-sm font-bold text-white shadow-xl animate-pulse"
              >
                <Square className="h-5 w-5" />
                <span>End Answer & Evaluate</span>
              </Button>
            )}
          </div>
        </div>

        {/* Right Column: Live Transcript (6 cols) */}
        <div className="lg:col-span-6">
          <LiveTranscript
            messages={messages}
            interimTranscript={interimTranscript}
            isListening={isRecording}
          />
        </div>
      </div>
    </div>
  );
}
