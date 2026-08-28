export function resolveSpeechRecognitionConstructor<T>(scope: {
  SpeechRecognition?: T;
  webkitSpeechRecognition?: T;
}): T | null {
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export const VOICE_RECORDING_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/mp4",
  "audio/webm",
] as const;

export function resolveVoiceRecordingMimeType(scope: {
  isTypeSupported?: (mimeType: string) => boolean;
}): string | null {
  if (!scope.isTypeSupported) return "";
  return (
    VOICE_RECORDING_MIME_TYPES.find((mimeType) =>
      scope.isTypeSupported?.(mimeType),
    ) ?? null
  );
}

export function shouldPreferRecordedTranscription(scope: {
  userAgent?: string;
  maxTouchPoints?: number;
}): boolean {
  const userAgent = scope.userAgent || "";
  return (
    /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && (scope.maxTouchPoints || 0) > 1)
  );
}

export function voiceRecognitionErrorMessage(error?: string): string {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access is blocked. Allow microphone access for useclippy.com in your browser settings, then try again.";
    case "audio-capture":
      return "Clippy could not access a microphone on this device.";
    case "network":
      return "The speech service could not connect. Check your internet connection and try again.";
    case "no-speech":
      return "I could not hear any speech. Tap the microphone and try again.";
    case "language-not-supported":
      return "Australian English speech recognition is unavailable on this device.";
    case "aborted":
      return "Voice recognition stopped before Clippy received your command.";
    case "transcription-unavailable":
      return "Secure voice transcription is not configured yet. Open Copilot and type your command for now.";
    case "recording-too-short":
      return "The recording was too short. Tap the microphone, speak your command, then tap again to finish.";
    default:
      return "Clippy could not start voice recognition. Reload the page and try again.";
  }
}
