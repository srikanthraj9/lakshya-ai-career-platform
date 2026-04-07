import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { voiceInterviewService } from "@/services/voiceInterview";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { Bot, Loader2, Mic, RefreshCw, Square, User, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { PageTransition } from "@/components/PageTransition";
import type { VoiceChatMessage, VoiceChatResponse } from "@/types";
import { getApiErrorMessage } from "@/services/api";

const MIN_AUDIO_BYTES = 6_000;
const ASSISTANT_INTRO = "Ask me anything. I will listen, transcribe your voice, answer with OpenRouter, and speak the response back.";

type AssistantStep = "ready" | "recording" | "processing";

type SubmitVoicePayload = {
  blob: Blob;
  messages: VoiceChatMessage[];
  transcript: string;
};

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  isFinal?: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export default function VoiceInterviewPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [messages, setMessages] = useState<VoiceChatMessage[]>([]);
  const [assistantStep, setAssistantStep] = useState<AssistantStep>("ready");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [transcriptPreview, setTranscriptPreview] = useState("");
  const [lastResponse, setLastResponse] = useState<VoiceChatResponse | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef("");
  const messagesRef = useRef<VoiceChatMessage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stopSpeechRecognition = useCallback(() => {
    if (!recognitionRef.current) {
      return;
    }

    recognitionRef.current.onresult = null;
    recognitionRef.current.onerror = null;
    recognitionRef.current.onend = null;
    try {
      recognitionRef.current.stop();
    } catch {
      recognitionRef.current.abort();
    }
    recognitionRef.current = null;
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    window.speechSynthesis.cancel();
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const normalizedText = text.trim();
    if (!normalizedText) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(normalizedText);
    utterance.lang = navigator.language || "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    return () => {
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.ondataavailable = null;
        mediaRecorder.onerror = null;
        mediaRecorder.onstop = null;
        mediaRecorder.stop();
      }
      stopSpeechRecognition();
      stopSpeaking();
      cleanupStream();
    };
  }, [cleanupStream, mediaRecorder, stopSpeaking, stopSpeechRecognition]);

  const mutation = useMutation({
    mutationFn: ({ blob, messages: history, transcript }: SubmitVoicePayload) =>
      voiceInterviewService.submitVoiceChat(blob, {
        messages: history,
        transcript,
      }),
    onSuccess: (data) => {
      console.info("[Voice Assistant Response]", data);
      const transcript = data.transcript.trim();
      const reply = data.reply.trim();

      if (!transcript) {
        setAssistantStep("ready");
        setStatusMessage("No voice detected. Please speak clearly.");
        setLastResponse(null);
        toast.error("No voice detected");
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "user", content: transcript },
        { role: "assistant", content: reply },
      ]);
      setLastResponse({
        transcript,
        reply,
      });
      setTranscriptPreview(transcript);
      setAssistantStep("ready");
      setStatusMessage(null);
      speak(reply);
      toast.success("Voice assistant replied.");
    },
    onError: (error) => {
      const message = getApiErrorMessage(error);
      setAssistantStep("ready");
      setStatusMessage(message);
      toast.error(message);
    },
  });

  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Audio recording is not supported in this browser.");
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      toast.error("MediaRecorder is not available in this browser.");
      return;
    }

    stopSpeaking();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const nextChunks: Blob[] = [];
      const SpeechRecognitionCtor = getSpeechRecognitionConstructor();

      streamRef.current = stream;
      transcriptRef.current = "";
      setAudioChunks([]);
      setTranscriptPreview("");
      setStatusMessage(null);
      setLastResponse(null);

      if (SpeechRecognitionCtor) {
        const recognition = new SpeechRecognitionCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.onresult = (event) => {
          let nextTranscript = "";
          for (let index = 0; index < event.results.length; index += 1) {
            const resultItem = event.results[index];
            const transcriptPart = resultItem?.[0]?.transcript;
            if (transcriptPart) {
              nextTranscript += `${transcriptPart} `;
            }
          }

          const normalizedTranscript = nextTranscript.trim();
          transcriptRef.current = normalizedTranscript;
          setTranscriptPreview(normalizedTranscript);
        };
        recognition.onerror = (event) => {
          if (event.error === "no-speech") {
            setStatusMessage("No voice detected yet. Please speak clearly.");
          } else {
            console.warn("[Voice Recognition Error]", event.error);
          }
        };
        try {
          recognition.start();
          recognitionRef.current = recognition;
        } catch {
          recognitionRef.current = null;
        }
      }

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          nextChunks.push(event.data);
          setAudioChunks([...nextChunks]);
        }
      };

      recorder.onerror = () => {
        stopSpeechRecognition();
        cleanupStream();
        setIsRecording(false);
        setAssistantStep("ready");
        setMediaRecorder(null);
        setAudioChunks([]);
        setTranscriptPreview("");
        toast.error("Recording failed. Please try again.");
      };

      recorder.onstop = () => {
        stopSpeechRecognition();
        cleanupStream();
        setIsRecording(false);
        setMediaRecorder(null);

        const blob = new Blob(nextChunks, { type: "audio/webm" });
        const transcriptHint = transcriptRef.current.trim();

        if (blob.size < MIN_AUDIO_BYTES && !transcriptHint) {
          setAudioChunks([]);
          setAssistantStep("ready");
          setStatusMessage("No voice detected. Please speak clearly.");
          toast.error("No voice detected");
          return;
        }

        setAssistantStep("processing");
        mutation.mutate({
          blob,
          messages: messagesRef.current,
          transcript: transcriptHint,
        });
        setAudioChunks([]);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setAssistantStep("recording");
    } catch (error) {
      stopSpeechRecognition();
      cleanupStream();
      setIsRecording(false);
      setAssistantStep("ready");
      setMediaRecorder(null);
      setAudioChunks([]);
      setTranscriptPreview("");

      if (error instanceof DOMException && error.name === "NotAllowedError") {
        toast.error("Microphone permission was denied.");
        return;
      }

      toast.error("Microphone access is required for voice conversations.");
    }
  }, [cleanupStream, mutation, stopSpeaking, stopSpeechRecognition]);

  const stopRecording = useCallback(() => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      return;
    }

    mediaRecorder.stop();
    setIsRecording(false);
  }, [mediaRecorder]);

  const resetConversation = useCallback(() => {
    if (mutation.isPending) {
      return;
    }

    stopSpeaking();
    setMessages([]);
    setLastResponse(null);
    setTranscriptPreview("");
    setStatusMessage(null);
  }, [mutation.isPending, stopSpeaking]);

  const latestAssistantMessage = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].role === "assistant") {
        return messages[index].content;
      }
    }
    return ASSISTANT_INTRO;
  }, [messages]);

  const recorderStatus = useMemo(() => {
    if (assistantStep === "recording") {
      return "Listening... Ask your question clearly.";
    }
    if (assistantStep === "processing" || mutation.isPending) {
      return "Thinking and preparing a spoken reply...";
    }
    if (statusMessage) {
      return statusMessage;
    }
    return "Click to start recording";
  }, [assistantStep, mutation.isPending, statusMessage]);

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Voice Interview AI</h1>
          <p className="text-muted-foreground">Speak naturally and get a live AI voice reply.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card glass-card-hover rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Assistant</p>
              <p className="mt-3 text-lg font-medium text-foreground">
                {latestAssistantMessage}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetConversation}
              disabled={isRecording || mutation.isPending || messages.length === 0}
              aria-label="Start a new voice conversation"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              New Conversation
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card glass-card-hover flex flex-col items-center gap-6 rounded-2xl p-10"
          role="region"
          aria-label="Voice recorder"
        >
          {isRecording ? (
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="flex h-28 w-28 items-center justify-center rounded-full bg-destructive/20"
              aria-live="polite"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/30">
                <Mic className="h-10 w-10 text-destructive" aria-hidden="true" />
              </div>
            </motion.div>
          ) : null}

          {!isRecording && !mutation.isPending ? (
            <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-dashed border-border transition-colors hover:border-primary/30">
              <Mic className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            </div>
          ) : null}

          {mutation.isPending ? <Loader2 className="h-12 w-12 animate-spin text-primary" aria-label="Processing" /> : null}

          <p className="text-sm text-muted-foreground" aria-live="polite">
            {recorderStatus}
          </p>

          {!isRecording ? (
            <Button
              variant="gradient"
              size="lg"
              onClick={startRecording}
              disabled={mutation.isPending}
              aria-label="Start recording"
            >
              <Mic className="mr-2 h-4 w-4" aria-hidden="true" /> Start Recording
            </Button>
          ) : (
            <Button variant="destructive" size="lg" onClick={stopRecording} aria-label="Stop recording">
              <Square className="mr-2 h-4 w-4" aria-hidden="true" /> Stop Recording
            </Button>
          )}
        </motion.div>

        {transcriptPreview && !lastResponse ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card glass-card-hover rounded-2xl p-6 space-y-4"
          >
            <h3 className="font-display text-lg font-semibold">Detected Transcript</h3>
            <p className="text-sm text-muted-foreground">{transcriptPreview}</p>
          </motion.div>
        ) : null}

        {mutation.isPending ? <Skeleton className="h-48 w-full rounded-2xl" /> : null}

        {messages.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card glass-card-hover rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-display text-lg font-semibold">Conversation</h3>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <Volume2 className="h-4 w-4" />
                Voice replies enabled
              </div>
            </div>

            <ScrollArea className="h-72 pr-4">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.role === "assistant" ? (
                      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    ) : null}

                    <div className={`max-w-[82%] rounded-[24px] px-4 py-4 ${message.role === "user" ? "bg-primary text-primary-foreground" : "border border-white/10 bg-secondary/55 text-foreground"}`}>
                      <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                    </div>

                    {message.role === "user" ? (
                      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20">
                        <User className="h-4 w-4 text-accent" />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </motion.div>
        ) : null}

        {lastResponse ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card glass-card-hover rounded-2xl p-6 space-y-4"
            >
              <h3 className="font-display text-lg font-semibold">Transcript</h3>
              <p className="text-sm text-muted-foreground">{lastResponse.transcript}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card glass-card-hover rounded-2xl p-6 space-y-4"
            >
              <h3 className="font-display text-lg font-semibold">AI Reply</h3>
              <p className="text-sm text-foreground">{lastResponse.reply}</p>
            </motion.div>
          </motion.div>
        ) : null}
      </div>
    </PageTransition>
  );
}
