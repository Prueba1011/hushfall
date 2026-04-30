import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { z } from "zod";
import type { ElevenLabs } from "@elevenlabs/elevenlabs-js";

type BinaryResponsePromise = {
  withRawResponse(): Promise<{
    data: ReadableStream<Uint8Array>;
    rawResponse: { headers: Headers; status: number };
  }>;
};

const AssetEnvSchema = z.object({
  ELEVENLABS_API_KEY: z.string().min(1),
});

export type GeneratedAudioResult = {
  buffer: Buffer;
  contentType: string | null;
  characterCost: string | null;
  songId: string | null;
  status: number;
};

export function loadAssetGenerationEnv(projectDir = process.cwd()): void {
  loadEnvConfig(projectDir);
}

export function createElevenLabsAssetClient(): ElevenLabsClient {
  const env = AssetEnvSchema.parse(process.env);
  return new ElevenLabsClient({ apiKey: env.ELEVENLABS_API_KEY });
}

export function resolveAudioExtension(
  outputFormat: string = "mp3_44100_128"
): string {
  if (outputFormat.startsWith("mp3_")) return "mp3";
  if (outputFormat.startsWith("pcm_")) return "pcm";
  if (outputFormat.startsWith("opus_")) return "opus";
  if (outputFormat.startsWith("ulaw_")) return "ulaw";
  if (outputFormat.startsWith("alaw_")) return "alaw";
  if (outputFormat.startsWith("wav_")) return "wav";
  return "bin";
}

async function readBinaryResponse(
  responsePromise: BinaryResponsePromise
): Promise<GeneratedAudioResult> {
  const { data, rawResponse } = await responsePromise.withRawResponse();
  const buffer = Buffer.from(await new Response(data).arrayBuffer());

  return {
    buffer,
    contentType: rawResponse.headers.get("content-type"),
    characterCost: rawResponse.headers.get("character-cost"),
    songId: rawResponse.headers.get("song-id"),
    status: rawResponse.status,
  };
}

export async function generateSoundEffectAsset(
  client: ElevenLabsClient,
  request: ElevenLabs.CreateSoundEffectRequest
): Promise<GeneratedAudioResult> {
  return readBinaryResponse(client.textToSoundEffects.convert(request));
}

export async function generateMusicAsset(
  client: ElevenLabsClient,
  request: ElevenLabs.BodyComposeMusicV1MusicPost
): Promise<GeneratedAudioResult> {
  return readBinaryResponse(client.music.compose(request));
}

export async function generateSpeechAsset(
  client: ElevenLabsClient,
  voiceId: string,
  request: ElevenLabs.BodyTextToSpeechFull
): Promise<GeneratedAudioResult> {
  return readBinaryResponse(client.textToSpeech.convert(voiceId, request));
}

export async function designVoiceAsset(
  client: ElevenLabsClient,
  request: ElevenLabs.VoiceDesignRequestModel
): Promise<ElevenLabs.VoiceDesignPreviewResponse> {
  return client.textToVoice.design(request);
}

export async function createDesignedVoice(
  client: ElevenLabsClient,
  request: ElevenLabs.BodyCreateANewVoiceFromVoicePreviewV1TextToVoicePost
): Promise<ElevenLabs.Voice> {
  return client.textToVoice.create(request);
}

export async function writeGeneratedAudioFile(
  absoluteFilePath: string,
  buffer: Buffer
): Promise<void> {
  await mkdir(path.dirname(absoluteFilePath), { recursive: true });
  await writeFile(absoluteFilePath, buffer);
}
