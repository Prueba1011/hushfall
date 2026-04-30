import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ElevenLabsApiError,
  elevenLabsAudioOutputFormats,
  generateSoundEffect,
} from "@/lib/elevenlabs/audio";

const BodySchema = z.object({
  text: z.string().min(1),
  loop: z.boolean().optional(),
  durationSeconds: z.number().min(0.5).max(30).optional(),
  promptInfluence: z.number().min(0).max(1).optional(),
  modelId: z.string().min(1).optional(),
  outputFormat: z.enum(elevenLabsAudioOutputFormats).optional(),
});

export async function POST(request: Request) {
  let parsed: z.infer<typeof BodySchema>;

  try {
    parsed = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const result = await generateSoundEffect(parsed);

    return new Response(result.audio, {
      status: 200,
      headers: {
        "content-type": result.contentType,
        "cache-control": "no-store",
        ...(result.characterCost
          ? { "character-cost": result.characterCost }
          : {}),
      },
    });
  } catch (error) {
    if (error instanceof ElevenLabsApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    throw error;
  }
}
