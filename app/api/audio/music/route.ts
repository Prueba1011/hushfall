import { NextResponse } from "next/server";
import { z } from "zod";
import {
  composeMusic,
  ElevenLabsApiError,
  elevenLabsAudioOutputFormats,
} from "@/lib/elevenlabs/audio";

const SongSectionSchema = z.object({
  sectionName: z.string().min(1).max(100),
  positiveLocalStyles: z.array(z.string().min(1)).max(50),
  negativeLocalStyles: z.array(z.string().min(1)).max(50),
  durationMs: z.number().int().min(3000).max(120000),
  lines: z.array(z.string().min(1).max(200)).max(30),
});

const CompositionPlanSchema = z.object({
  positiveGlobalStyles: z.array(z.string().min(1)).max(50),
  negativeGlobalStyles: z.array(z.string().min(1)).max(50),
  sections: z.array(SongSectionSchema).min(1).max(30),
});

const BodySchema = z
  .object({
    prompt: z.string().min(1).max(4100).optional(),
    compositionPlan: CompositionPlanSchema.optional(),
    musicLengthMs: z.number().int().min(3000).max(600000).optional(),
    modelId: z.literal("music_v1").optional(),
    seed: z.number().int().min(0).max(2147483647).optional(),
    forceInstrumental: z.boolean().optional(),
    respectSectionsDurations: z.boolean().optional(),
    storeForInpainting: z.boolean().optional(),
    signWithC2pa: z.boolean().optional(),
    outputFormat: z.enum(elevenLabsAudioOutputFormats).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.prompt && !value.compositionPlan) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "prompt or compositionPlan is required",
      });
    }

    if (value.prompt && value.compositionPlan) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "prompt and compositionPlan cannot be used together",
      });
    }

    if (value.musicLengthMs && !value.prompt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "musicLengthMs can only be used with prompt",
        path: ["musicLengthMs"],
      });
    }

    if (value.forceInstrumental && !value.prompt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "forceInstrumental can only be used with prompt",
        path: ["forceInstrumental"],
      });
    }

    if (value.seed !== undefined && value.prompt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "seed cannot be used with prompt",
        path: ["seed"],
      });
    }

    if (value.respectSectionsDurations !== undefined && !value.compositionPlan) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "respectSectionsDurations requires compositionPlan",
        path: ["respectSectionsDurations"],
      });
    }
  });

export async function POST(request: Request) {
  let parsed: z.infer<typeof BodySchema>;

  try {
    parsed = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const result = await composeMusic(parsed);

    return new Response(result.audio, {
      status: 200,
      headers: {
        "content-type": result.contentType,
        "cache-control": "no-store",
        ...(result.songId ? { "song-id": result.songId } : {}),
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
