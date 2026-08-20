"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

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

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function VoiceCommand() {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const Recognition = (
      window as Window & {
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      }
    ).webkitSpeechRecognition;

    if (!Recognition) {
      setSupported(false);
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-AU";
    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const nextTranscript = result?.[0]?.transcript?.trim() ?? "";
      setTranscript(nextTranscript);

      if (result?.isFinal && nextTranscript) {
        setListening(false);
        window.location.href = `/copilot?prompt=${encodeURIComponent(nextTranscript)}`;
      }
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setSupported(true);

    return () => {
      recognition.onresult = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        // The browser may throw when recognition is already stopped.
      }
      recognitionRef.current = null;
    };
  }, []);

  const toggleListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (listening) {
      recognition.stop();
      setListening(false);
      return;
    }

    setTranscript("");
    recognition.start();
    setListening(true);
  };

  if (supported === null) return null;

  if (!supported) {
    return (
      <button
        type="button"
        disabled
        className="fixed bottom-36 right-4 z-50 flex h-12 w-12 cursor-not-allowed items-center justify-center rounded-full border border-border bg-muted opacity-50 shadow-xl lg:bottom-24 lg:right-6"
        aria-label="Voice commands are not supported in this browser"
        title="Voice commands are not supported in this browser"
      >
        <Mic className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-36 right-4 z-50 lg:bottom-24 lg:right-6">
      {listening ? (
        <div
          className="absolute bottom-16 right-0 w-72 rounded-xl border border-border bg-card p-4 shadow-xl"
          role="status"
          aria-live="polite"
        >
          <div className="mb-2 flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full bg-red-500 motion-safe:animate-pulse"
              aria-hidden="true"
            />
            <span className="text-xs font-medium text-foreground">
              Listening…
            </span>
          </div>
          <p className="rounded-lg bg-muted p-2 text-sm text-muted-foreground">
            {transcript ||
              "Start speaking. Your words will open in Clippy for review."}
          </p>
        </div>
      ) : null}
      <button
        type="button"
        data-voice-btn
        onClick={toggleListening}
        aria-label={listening ? "Stop voice command" : "Start voice command"}
        aria-pressed={listening}
        className={
          "flex h-12 w-12 items-center justify-center rounded-full shadow-xl transition-all " +
          (listening
            ? "scale-110 bg-red-500 hover:bg-red-600"
            : "bg-primary hover:bg-primary/90")
        }
        title={listening ? "Stop voice command" : "Voice command"}
      >
        {listening ? (
          <Square className="h-5 w-5 text-white" aria-hidden="true" />
        ) : (
          <Mic className="h-5 w-5 text-white" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
