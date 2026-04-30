import "server-only";

import { serverEnv } from "@/lib/env";

const ELEVENLABS_API_BASE_URL = "https://api.elevenlabs.io/v1";

export const elevenLabsAudioOutputFormats = [
  "mp3_22050_32",
  "mp3_24000_48",
  "mp3_44100_32",
  "mp3_44100_64",
  "mp3_44100_96",
  "mp3_44100_128",
  "mp3_44100_192",
  "pcm_8000",
  "pcm_16000",
  "pcm_22050",
  "pcm_24000",
  "pcm_32000",
  "pcm_44100",
  "pcm_48000",
  "ulaw_8000",
  "alaw_8000",
  "opus_48000_32",
  "opus_48000_64",
  "opus_48000_96",
  "opus_48000_128",
  "opus_48000_192",
] as const;

export type ElevenLabsAudioOutputFormat =
  (typeof elevenLabsAudioOutputFormats)[number];

export type MusicSection = {
  sectionName: string;
  positiveLocalStyles: string[];
  negativeLocalStyles: string[];
  durationMs: number;
  lines: string[];
};

export type MusicCompositionPlan = {
  positiveGlobalStyles: string[];
  negativeGlobalStyles: string[];
  sections: MusicSection[];
};

export type GenerateSoundEffectInput = {
  text: string;
  loop?: boolean;
  durationSeconds?: number;
  promptInfluence?: number;
  modelId?: string;
  outputFormat?: ElevenLabsAudioOutputFormat;
};

export type ComposeMusicInput = {
  prompt?: string;
  compositionPlan?: MusicCompositionPlan;
  musicLengthMs?: number;
  modelId?: "music_v1";
  seed?: number;
  forceInstrumental?: boolean;
  respectSectionsDurations?: boolean;
  storeForInpainting?: boolean;
  signWithC2pa?: boolean;
  outputFormat?: ElevenLabsAudioOutputFormat;
};

export type ElevenLabsAudioResult = {
  audio: ArrayBuffer;
  contentType: string;
  characterCost: string | null;
  songId: string | null;
};

export class ElevenLabsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: string
  ) {
    super(message);
    this.name = "ElevenLabsApiError";
  }
}

function getApiKey(): string {
  if (!serverEnv.ELEVENLABS_API_KEY) {
    throw new ElevenLabsApiError(
      "Server is missing ELEVENLABS_API_KEY",
      500
    );
  }

  return serverEnv.ELEVENLABS_API_KEY;
}

function extractUpstreamError(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.detail === "string") {
    return record.detail;
  }

  if (
    record.detail &&
    typeof record.detail === "object" &&
    typeof (record.detail as Record<string, unknown>).message === "string"
  ) {
    return (record.detail as Record<string, unknown>).message as string;
  }

  if (typeof record.message === "string") {
    return record.message;
  }

  if (typeof record.error === "string") {
    return record.error;
  }

  return null;
}

async function postAudio(
  path: string,
  body: Record<string, unknown>,
  outputFormat?: ElevenLabsAudioOutputFormat
): Promise<ElevenLabsAudioResult> {
  const url = new URL(path, ELEVENLABS_API_BASE_URL);
  if (outputFormat) {
    url.searchParams.set("output_format", outputFormat);
  }

  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": getApiKey(),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!upstream.ok) {
    let detail: string | null = null;

    try {
      detail = extractUpstreamError(await upstream.json());
    } catch {
      try {
        const text = await upstream.text();
        detail = text || null;
      } catch {
        detail = null;
      }
    }

    throw new ElevenLabsApiError(
      detail ?? "ElevenLabs request failed",
      upstream.status,
      detail ?? undefined
    );
  }

  return {
    audio: await upstream.arrayBuffer(),
    contentType: upstream.headers.get("content-type") ?? "audio/mpeg",
    characterCost: upstream.headers.get("character-cost"),
    songId: upstream.headers.get("song-id"),
  };
}

export async function generateSoundEffect(
  input: GenerateSoundEffectInput
): Promise<ElevenLabsAudioResult> {
  return postAudio(
    "/sound-generation",
    {
      text: input.text,
      loop: input.loop,
      duration_seconds: input.durationSeconds,
      prompt_influence: input.promptInfluence,
      model_id: input.modelId ?? "eleven_text_to_sound_v2",
    },
    input.outputFormat
  );
}

export async function composeMusic(
  input: ComposeMusicInput
): Promise<ElevenLabsAudioResult> {
  return postAudio(
    "/music",
    {
      prompt: input.prompt,
      composition_plan: input.compositionPlan
        ? {
            positive_global_styles: input.compositionPlan.positiveGlobalStyles,
            negative_global_styles: input.compositionPlan.negativeGlobalStyles,
            sections: input.compositionPlan.sections.map((section) => ({
              section_name: section.sectionName,
              positive_local_styles: section.positiveLocalStyles,
              negative_local_styles: section.negativeLocalStyles,
              duration_ms: section.durationMs,
              lines: section.lines,
            })),
          }
        : undefined,
      music_length_ms: input.musicLengthMs,
      model_id: input.modelId ?? "music_v1",
      seed: input.seed,
      force_instrumental: input.forceInstrumental,
      respect_sections_durations: input.respectSectionsDurations,
      store_for_inpainting: input.storeForInpainting,
      sign_with_c2pa: input.signWithC2pa,
    },
    input.outputFormat
  );
}
