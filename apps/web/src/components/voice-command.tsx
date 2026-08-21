"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Mic, Square } from "lucide-react";
import {
  resolveSpeechRecognitionConstructor,
  voiceRecognitionErrorMessage,
} from "@/lib/voice-command";

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error?: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onnomatch: (() => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type VoicePhase = "idle" | "starting" | "listening";

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export function VoiceCommand() {
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [supported, setSupported] = useState<boolean | null>(null);
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unavailableMessage, setUnavailableMessage] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef("");
  const failedRef = useRef(false);
  const submittedRef = useRef(false);

  const submitTranscript = useCallback((value: string) => {
    const command = value.trim();
    if (!command || submittedRef.current) return;
    submittedRef.current = true;
    setPhase("idle");
    window.location.assign(`/copilot?prompt=${encodeURIComponent(command)}`);
  }, []);

  useEffect(() => {
    if (!window.isSecureContext) {
      setUnavailableMessage(
        "Voice commands require a secure HTTPS connection.",
      );
      setSupported(false);
      return;
    }

    const Recognition = resolveSpeechRecognitionConstructor(
      window as SpeechRecognitionWindow,
    );

    if (!Recognition) {
      setUnavailableMessage(
        "Voice recognition is unavailable in this browser. Use Safari on iPhone or Chrome on Android, or type your command in Copilot.",
      );
      setSupported(false);
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-AU";
    recognition.onstart = () => {
      failedRef.current = false;
      setErrorMessage(null);
      setPhase("listening");
    };
    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const nextTranscript = result?.[0]?.transcript?.trim() ?? "";
      if (!nextTranscript) return;
      transcriptRef.current = nextTranscript;
      setTranscript(nextTranscript);

      if (result?.isFinal && nextTranscript) {
        submitTranscript(nextTranscript);
      }
    };
    recognition.onerror = (event) => {
      failedRef.current = true;
      setPhase("idle");
      setErrorMessage(voiceRecognitionErrorMessage(event.error));
    };
    recognition.onnomatch = () => {
      failedRef.current = true;
      setPhase("idle");
      setErrorMessage(voiceRecognitionErrorMessage("no-speech"));
    };
    recognition.onend = () => {
      setPhase("idle");
      if (failedRef.current || submittedRef.current) return;
      if (transcriptRef.current) {
        // Some mobile browsers end after an interim result without marking it
        // final. Preserve the captured command instead of silently dropping it.
        submitTranscript(transcriptRef.current);
        return;
      }
      setErrorMessage(voiceRecognitionErrorMessage("no-speech"));
    };
    recognitionRef.current = recognition;
    setSupported(true);

    return () => {
      failedRef.current = true;
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onnomatch = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        // The browser may throw when recognition is already stopped.
      }
      recognitionRef.current = null;
    };
  }, [submitTranscript]);

  const toggleListening = () => {
    if (!supported) {
      setErrorMessage(unavailableMessage);
      return;
    }

    const recognition = recognitionRef.current;
    if (!recognition) {
      setErrorMessage(voiceRecognitionErrorMessage());
      return;
    }

    if (phase !== "idle") {
      recognition.stop();
      return;
    }

    failedRef.current = false;
    submittedRef.current = false;
    transcriptRef.current = "";
    setTranscript("");
    setErrorMessage(null);
    setPhase("starting");
    try {
      recognition.start();
    } catch {
      failedRef.current = true;
      setPhase("idle");
      setErrorMessage(voiceRecognitionErrorMessage());
    }
  };

  if (supported === null) return null;

  const active = phase !== "idle";

  return (
    <div className="fixed bottom-36 right-4 z-50 lg:bottom-24 lg:right-6">
      {active || errorMessage ? (
        <div
          className="absolute bottom-16 right-0 w-72 rounded-xl border border-border bg-card p-4 shadow-xl"
          role={errorMessage ? "alert" : "status"}
          aria-live="polite"
        >
          <div className="mb-2 flex items-center gap-2">
            {errorMessage ? (
              <AlertCircle
                className="h-4 w-4 shrink-0 text-red-500"
                aria-hidden="true"
              />
            ) : (
              <div
                className="h-2 w-2 rounded-full bg-red-500 motion-safe:animate-pulse"
                aria-hidden="true"
              />
            )}
            <span className="text-xs font-medium text-foreground">
              {errorMessage
                ? "Voice command needs attention"
                : phase === "starting"
                  ? "Starting microphone…"
                  : "Listening…"}
            </span>
          </div>
          <p
            className={
              "rounded-lg p-2 text-sm " +
              (errorMessage
                ? "bg-red-50 text-red-700"
                : "bg-muted text-muted-foreground")
            }
          >
            {errorMessage ||
              transcript ||
              "Start speaking. Your words will open in Clippy for review."}
          </p>
          {errorMessage ? (
            <Link
              href="/copilot"
              className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline"
            >
              Open Copilot and type instead
            </Link>
          ) : null}
        </div>
      ) : null}
      <button
        type="button"
        data-voice-btn
        onClick={toggleListening}
        aria-label={active ? "Stop voice command" : "Start voice command"}
        aria-pressed={active}
        className={
          "flex h-12 w-12 items-center justify-center rounded-full shadow-xl transition-all " +
          (active
            ? "scale-110 bg-red-500 hover:bg-red-600"
            : supported
              ? "bg-primary hover:bg-primary/90"
              : "border border-border bg-muted")
        }
        title={active ? "Stop voice command" : "Voice command"}
      >
        {active ? (
          <Square className="h-5 w-5 text-white" aria-hidden="true" />
        ) : (
          <Mic
            className={
              "h-5 w-5 " + (supported ? "text-white" : "text-muted-foreground")
            }
            aria-hidden="true"
          />
        )}
      </button>
    </div>
  );
}
