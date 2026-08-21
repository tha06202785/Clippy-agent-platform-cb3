export function resolveSpeechRecognitionConstructor<T>(scope: {
  SpeechRecognition?: T;
  webkitSpeechRecognition?: T;
}): T | null {
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
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
    default:
      return "Clippy could not start voice recognition. Reload the page and try again.";
  }
}
