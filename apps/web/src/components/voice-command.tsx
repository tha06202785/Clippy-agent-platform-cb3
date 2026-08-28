"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Mic, Square } from "lucide-react";
import {
  resolveSpeechRecognitionConstructor,
  resolveVoiceRecordingMimeType,
  shouldPreferRecordedTranscription,
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
type VoicePhase =
  | "idle"
  | "starting"
  | "listening"
  | "recording"
  | "transcribing";

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const MAX_RECORDING_MS = 30_000;
const MIN_RECORDING_MS = 500;

function recordingFileName(type: string) {
  return type.includes("mp4") ? "voice-command.m4a" : "voice-command.webm";
}

export function VoiceCommand() {
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [supported, setSupported] = useState<boolean | null>(null);
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unavailableMessage, setUnavailableMessage] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef(0);
  const recordingTimeoutRef = useRef<number | null>(null);
  const recordingAvailableRef = useRef(false);
  const preferRecordedRef = useRef(false);
  const transcriptRef = useRef("");
  const failedRef = useRef(false);
  const submittedRef = useRef(false);
  const unmountedRef = useRef(false);

  const submitTranscript = useCallback((value: string) => {
    const command = value.trim();
    if (!command || submittedRef.current) return;
    submittedRef.current = true;
    setPhase("idle");
    window.location.assign(`/copilot?prompt=${encodeURIComponent(command)}`);
  }, []);

  const releaseRecording = useCallback(() => {
    if (recordingTimeoutRef.current !== null) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  const transcribeRecording = useCallback(
    async (audio: Blob) => {
      if (audio.size < 100) {
        setPhase("idle");
        setErrorMessage(voiceRecognitionErrorMessage("recording-too-short"));
        return;
      }

      setPhase("transcribing");
      setTranscript("Securely transcribing your command…");
      try {
        const form = new FormData();
        form.append("audio", audio, recordingFileName(audio.type));
        const response = await fetch("/api/ai/transcribe", {
          method: "POST",
          body: form,
        });
        const result = (await response.json().catch(() => ({}))) as {
          transcript?: string;
          error?: string;
          code?: string;
        };
        if (!response.ok || !result.transcript?.trim()) {
          if (
            result.code === "transcription_unavailable" &&
            recognitionRef.current
          ) {
            // A following tap can still try the browser's speech service.
            preferRecordedRef.current = false;
          }
          throw new Error(
            result.error || "Clippy could not transcribe that recording.",
          );
        }
        transcriptRef.current = result.transcript.trim();
        setTranscript(result.transcript.trim());
        submitTranscript(result.transcript);
      } catch (error) {
        if (unmountedRef.current) return;
        setPhase("idle");
        setTranscript("");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Clippy could not transcribe that recording.",
        );
      }
    },
    [submitTranscript],
  );

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    setPhase("transcribing");
    recorder.stop();
  }, []);

  const startRecording = useCallback(async () => {
    if (
      !recordingAvailableRef.current ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setPhase("idle");
      setErrorMessage(
        "Audio recording is unavailable in this browser. Open Copilot and type your command.",
      );
      return;
    }

    setPhase("starting");
    setTranscript("");
    setErrorMessage(null);
    submittedRef.current = false;
    transcriptRef.current = "";
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      if (unmountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const mimeType = resolveVoiceRecordingMimeType(MediaRecorder);
      if (mimeType === null) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("This browser cannot create a supported audio format.");
      }
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        releaseRecording();
        if (unmountedRef.current) return;
        setPhase("idle");
        setErrorMessage("Clippy could not record from this microphone.");
      };
      recorder.onstop = () => {
        const duration = Date.now() - recordingStartedAtRef.current;
        const chunks = chunksRef.current;
        chunksRef.current = [];
        const type = recorder.mimeType || mimeType || "audio/webm";
        releaseRecording();
        if (unmountedRef.current) return;
        if (duration < MIN_RECORDING_MS) {
          setPhase("idle");
          setErrorMessage(
            voiceRecognitionErrorMessage("recording-too-short"),
          );
          return;
        }
        void transcribeRecording(new Blob(chunks, { type }));
      };
      recorder.start(250);
      setPhase("recording");
      recordingTimeoutRef.current = window.setTimeout(
        stopRecording,
        MAX_RECORDING_MS,
      );
    } catch (error) {
      releaseRecording();
      if (unmountedRef.current) return;
      setPhase("idle");
      const denied =
        error instanceof DOMException &&
        ["NotAllowedError", "SecurityError"].includes(error.name);
      setErrorMessage(
        denied
          ? voiceRecognitionErrorMessage("not-allowed")
          : error instanceof Error
            ? error.message
            : voiceRecognitionErrorMessage("audio-capture"),
      );
    }
  }, [releaseRecording, stopRecording, transcribeRecording]);

  useEffect(() => {
    unmountedRef.current = false;
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
    const canRecord = Boolean(
      typeof MediaRecorder !== "undefined" &&
        navigator.mediaDevices?.getUserMedia,
    );
    recordingAvailableRef.current = canRecord;
    preferRecordedRef.current =
      canRecord &&
      (shouldPreferRecordedTranscription({
        userAgent: navigator.userAgent,
        maxTouchPoints: navigator.maxTouchPoints,
      }) ||
        !Recognition);

    if (!Recognition && !canRecord) {
      setUnavailableMessage(
        "Voice is unavailable in this browser. Open Copilot and type your command.",
      );
      setSupported(false);
      return;
    }

    if (Recognition) {
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
        if (
          canRecord &&
          !["not-allowed", "audio-capture"].includes(event.error || "")
        ) {
          preferRecordedRef.current = true;
          setErrorMessage(
            "The browser speech service stopped. Tap again to use Clippy’s secure recording fallback.",
          );
          return;
        }
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
          // Some mobile browsers end after an interim result without marking
          // it final. Preserve that command instead of silently dropping it.
          submitTranscript(transcriptRef.current);
          return;
        }
        setErrorMessage(voiceRecognitionErrorMessage("no-speech"));
      };
      recognitionRef.current = recognition;
    }
    setSupported(true);

    return () => {
      unmountedRef.current = true;
      failedRef.current = true;
      const recognition = recognitionRef.current;
      if (recognition) {
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
      }
      recognitionRef.current = null;
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onerror = null;
        recorder.onstop = null;
        if (recorder.state !== "inactive") recorder.stop();
      }
      releaseRecording();
    };
  }, [releaseRecording, submitTranscript]);

  const toggleListening = () => {
    if (!supported) {
      setErrorMessage(unavailableMessage);
      return;
    }
    if (phase === "recording") {
      stopRecording();
      return;
    }
    if (phase === "listening" || phase === "starting") {
      recognitionRef.current?.stop();
      return;
    }
    if (phase === "transcribing") return;

    if (preferRecordedRef.current && recordingAvailableRef.current) {
      void startRecording();
      return;
    }

    const recognition = recognitionRef.current;
    if (!recognition) {
      void startRecording();
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
      if (recordingAvailableRef.current) {
        preferRecordedRef.current = true;
        setErrorMessage(
          "The browser speech service could not start. Tap again to use Clippy’s secure recording fallback.",
        );
      } else {
        setErrorMessage(voiceRecognitionErrorMessage());
      }
    }
  };

  if (supported === null) return null;

  const active = phase !== "idle";
  const processing = phase === "transcribing";
  const statusTitle = errorMessage
    ? "Voice command needs attention"
    : phase === "starting"
      ? "Starting microphone…"
      : phase === "recording"
        ? "Recording — tap again when done"
        : phase === "transcribing"
          ? "Turning speech into text…"
          : "Listening…";
  const statusBody =
    errorMessage ||
    transcript ||
    (phase === "recording"
      ? "Speak your command, then tap the red button to finish. Audio is not saved by Clippy."
      : "Start speaking. Your words will open in Clippy for review.");

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
            ) : processing ? (
              <Loader2
                className="h-4 w-4 shrink-0 animate-spin text-primary"
                aria-hidden="true"
              />
            ) : (
              <div
                className="h-2 w-2 rounded-full bg-red-500 motion-safe:animate-pulse"
                aria-hidden="true"
              />
            )}
            <span className="text-xs font-medium text-foreground">
              {statusTitle}
            </span>
          </div>
          <p
            className={
              "rounded-lg p-2 text-sm " +
              (errorMessage
                ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-200"
                : "bg-muted text-muted-foreground")
            }
          >
            {statusBody}
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
        disabled={processing}
        aria-label={
          phase === "recording"
            ? "Stop voice recording"
            : processing
              ? "Transcribing voice command"
              : active
                ? "Stop voice command"
                : "Start voice command"
        }
        aria-pressed={active}
        className={
          "flex h-12 w-12 items-center justify-center rounded-full shadow-xl transition-all disabled:cursor-wait " +
          (phase === "recording" || phase === "listening"
            ? "scale-110 bg-red-500 hover:bg-red-600"
            : supported
              ? "bg-primary hover:bg-primary/90"
              : "border border-border bg-muted")
        }
        title={phase === "recording" ? "Stop recording" : "Voice command"}
      >
        {processing ? (
          <Loader2
            className="h-5 w-5 animate-spin text-white"
            aria-hidden="true"
          />
        ) : phase === "recording" || phase === "listening" ? (
          <Square className="h-5 w-5 text-white" aria-hidden="true" />
        ) : (
          <Mic
            className={
              "h-5 w-5 " +
              (supported ? "text-white" : "text-muted-foreground")
            }
            aria-hidden="true"
          />
        )}
      </button>
    </div>
  );
}
