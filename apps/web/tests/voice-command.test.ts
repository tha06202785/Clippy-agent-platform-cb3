import { describe, expect, it } from "vitest";
import {
  resolveSpeechRecognitionConstructor,
  voiceRecognitionErrorMessage,
} from "@/lib/voice-command";

describe("mobile voice command compatibility", () => {
  it("prefers the standard SpeechRecognition interface", () => {
    const standard = class StandardRecognition {};
    const prefixed = class PrefixedRecognition {};

    expect(
      resolveSpeechRecognitionConstructor({
        SpeechRecognition: standard,
        webkitSpeechRecognition: prefixed,
      }),
    ).toBe(standard);
  });

  it("falls back to the prefixed interface used by mobile Chrome", () => {
    const prefixed = class PrefixedRecognition {};

    expect(
      resolveSpeechRecognitionConstructor({
        webkitSpeechRecognition: prefixed,
      }),
    ).toBe(prefixed);
  });

  it("reports browsers without speech recognition", () => {
    expect(resolveSpeechRecognitionConstructor({})).toBeNull();
  });

  it("shows an actionable microphone permission error", () => {
    expect(voiceRecognitionErrorMessage("not-allowed")).toContain(
      "Allow microphone access",
    );
  });

  it("shows an actionable no-speech error", () => {
    expect(voiceRecognitionErrorMessage("no-speech")).toContain(
      "could not hear any speech",
    );
  });
});
