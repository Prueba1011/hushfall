import { z } from "zod";

const ServerEnvSchema = z.object({
  ELEVENLABS_API_KEY: z.string().min(1).optional(),
  ELEVENLABS_AGENT_IDS: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    ),
});

export const serverEnv = ServerEnvSchema.parse({
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  ELEVENLABS_AGENT_IDS: process.env.ELEVENLABS_AGENT_IDS,
});

export function isAgentAllowed(agentId: string): boolean {
  return serverEnv.ELEVENLABS_AGENT_IDS.includes(agentId);
}
