"use client";
import { useState, useEffect, useRef } from "react";
import { Mic, Square, Loader } from "lucide-react";

export function VoiceCommand() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [processing, setProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-AU";
      recognitionRef.current.onresult = (event: any) => {
        const result = event.results[event.results.length - 1];
        setTranscript(result[0].transcript);
        if (result.isFinal) {
          setProcessing(true);
          // Send to copilot
          fetch("/api/copilot/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [{ role: "user", content: result[0].transcript }],
            }),
          })
            .then((r) => r.json())
            .then((data) => {
              setProcessing(false);
              setListening(false);
              setTranscript("");
              // Navigate to copilot with the result
              window.location.href = "/copilot";
            })
            .catch(() => {
              setProcessing(false);
              setListening(false);
              setTranscript("");
            });
        }
      };
      recognitionRef.current.onend = () => setListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    } else {
      setTranscript("");
      recognitionRef.current?.start();
      setListening(true);
    }
  };

  // Fallback for unsupported browsers
  if (!recognitionRef.current) {
    return (
      <button
        className="fixed bottom-24 right-6 z-50 w-12 h-12 rounded-full bg-muted border border-border shadow-xl flex items-center justify-center cursor-not-allowed opacity-50"
        title="Voice commands not supported in this browser"
      >
        <Mic className="w-5 h-5 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-6 z-50">
      {listening && (
        <div className="absolute bottom-16 right-0 bg-card border border-border rounded-xl p-4 shadow-xl w-72 animate-slide-up">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-medium text-foreground">
              Listening...
            </span>
          </div>
          {transcript && (
            <p className="text-sm text-muted-foreground bg-muted rounded-lg p-2">
              {transcript}
            </p>
          )}
          {processing && (
            <div className="flex items-center gap-2 mt-2">
              <Loader className="w-3 h-3 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">
                Processing...
              </span>
            </div>
          )}
        </div>
      )}
      <button
        data-voice-btn
        onClick={toggleListening}
        aria-label={listening ? "Stop voice command" : "Start voice command"}
        className={
          "w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all " +
          (listening
            ? "bg-red-500 hover:bg-red-600 scale-110"
            : "bg-primary hover:bg-primary/90")
        }
        title={listening ? "Stop voice command" : "Voice command"}
      >
        {listening ? (
          <Square className="w-5 h-5 text-white" />
        ) : (
          <Mic className="w-5 h-5 text-white" />
        )}
      </button>
    </div>
  );
}
