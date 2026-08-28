import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/mp3",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
]);

function audioExtension(type: string): string {
  if (type.includes("mp4") || type.includes("m4a")) return "m4a";
  if (type.includes("wav")) return "wav";
  if (type.includes("mpeg") || type.includes("mp3")) return "mp3";
  return "webm";
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { data: membership } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!membership?.org_id) {
      return NextResponse.json(
        { error: "No organisation is linked to this account" },
        { status: 409 },
      );
    }

    const ip = await getClientIp();
    const rate = checkRateLimit(ip, "/api/ai/transcribe");
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many voice commands. Wait a moment and try again." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": String(rate.remaining),
            "X-RateLimit-Reset": String(Math.ceil(rate.resetAt / 1000)),
          },
        },
      );
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Secure voice transcription is not configured yet. Type your command in Copilot for now.",
          code: "transcription_unavailable",
        },
        { status: 503 },
      );
    }

    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > MAX_AUDIO_BYTES + 1_000_000) {
      return NextResponse.json(
        { error: "Voice recordings must be smaller than 8 MB" },
        { status: 413 },
      );
    }

    const form = await request.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File)) {
      return NextResponse.json(
        { error: "No voice recording was received" },
        { status: 400 },
      );
    }
    const baseType = audio.type.toLowerCase().split(";")[0];
    if (!ALLOWED_AUDIO_TYPES.has(baseType)) {
      return NextResponse.json(
        { error: "This audio format is not supported" },
        { status: 415 },
      );
    }
    if (audio.size < 100) {
      return NextResponse.json(
        { error: "The recording was too short to transcribe" },
        { status: 400 },
      );
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: "Voice recordings must be smaller than 8 MB" },
        { status: 413 },
      );
    }

    const openAiForm = new FormData();
    openAiForm.append(
      "file",
      audio,
      `clippy-voice-command.${audioExtension(baseType)}`,
    );
    openAiForm.append(
      "model",
      process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() || "gpt-transcribe",
    );
    openAiForm.append(
      "prompt",
      "Short Australian real estate command for Clippy. Preserve client names, property addresses and normal punctuation.",
    );

    const transcriptionResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: openAiForm,
        signal: AbortSignal.timeout(25_000),
      },
    );
    if (!transcriptionResponse.ok) {
      console.error("OpenAI transcription failed", {
        status: transcriptionResponse.status,
        requestId: transcriptionResponse.headers.get("x-request-id"),
      });
      return NextResponse.json(
        { error: "Clippy could not transcribe that recording. Try again." },
        { status: 502 },
      );
    }

    const result = (await transcriptionResponse.json()) as { text?: unknown };
    const transcript =
      typeof result.text === "string" ? result.text.trim().slice(0, 12_000) : "";
    if (!transcript) {
      return NextResponse.json(
        { error: "I could not hear any speech. Tap the microphone and try again." },
        { status: 422 },
      );
    }

    return NextResponse.json(
      { transcript },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    console.error("Voice transcription route failed", error);
    return NextResponse.json(
      {
        error: timedOut
          ? "Voice transcription took too long. Try a shorter command."
          : "Clippy could not process that voice command.",
      },
      { status: timedOut ? 504 : 500 },
    );
  }
}
