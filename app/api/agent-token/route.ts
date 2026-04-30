import { NextResponse } from "next/server";
import { z } from "zod";
import { isAgentAllowed, serverEnv } from "@/lib/env";

const BodySchema = z.object({ agentId: z.string().min(1) });

export async function POST(request: Request) {
  if (!serverEnv.ELEVENLABS_API_KEY) {
    return NextResponse.json(
      { error: "Server is missing ELEVENLABS_API_KEY" },
      { status: 500 }
    );
  }

  let parsed: z.infer<typeof BodySchema>;
  try {
    parsed = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!isAgentAllowed(parsed.agentId)) {
    return NextResponse.json({ error: "Agent not allowed" }, { status: 403 });
  }

  const url = new URL(
    "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url"
  );
  url.searchParams.set("agent_id", parsed.agentId);

  const upstream = await fetch(url, {
    headers: { "xi-api-key": serverEnv.ELEVENLABS_API_KEY },
    cache: "no-store",
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "Failed to obtain signed URL" },
      { status: 502 }
    );
  }

  const data = (await upstream.json()) as { signed_url?: string };
  if (!data.signed_url) {
    return NextResponse.json({ error: "Malformed upstream response" }, { status: 502 });
  }

  return NextResponse.json({ signedUrl: data.signed_url });
}
