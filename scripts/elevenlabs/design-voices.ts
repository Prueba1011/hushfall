import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { ElevenLabs } from "@elevenlabs/elevenlabs-js";
import { voiceDesignDefinitions } from "./voice-designs";
import {
  createDesignedVoice,
  createElevenLabsAssetClient,
  designVoiceAsset,
  loadAssetGenerationEnv,
  resolveAudioExtension,
  writeGeneratedAudioFile,
} from "./sdk";

type VoiceDesignManifestEntry = {
  id: string;
  label: string;
  voiceName: string;
  voiceId: string | null;
  voiceDescription: string;
  previewText: string;
  previewPublicPaths: string[];
  selectedPreviewIndex: number;
  selectedGeneratedVoiceId: string;
  labels: Record<string, string>;
  request: ElevenLabs.VoiceDesignRequestModel;
  generatedAt: string;
};

const projectRoot = process.cwd();
const outputRoot = path.join(projectRoot, "public", "audio", "generated");
const voiceDesignRoot = path.join(outputRoot, "voice-designs");

function getFlag(name: string): string | undefined {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match?.slice(prefix.length);
}

function getSelectedVoiceDesigns() {
  const ids = getFlag("id")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return voiceDesignDefinitions.filter((definition) => {
    if (ids && ids.length > 0 && !ids.includes(definition.id)) {
      return false;
    }

    return true;
  });
}

async function readExistingManifestEntries(): Promise<VoiceDesignManifestEntry[]> {
  const manifestPath = path.join(voiceDesignRoot, "manifest.json");

  try {
    const raw = await readFile(manifestPath, "utf8");
    const parsed = JSON.parse(raw) as { voices?: VoiceDesignManifestEntry[] };
    return Array.isArray(parsed.voices) ? parsed.voices : [];
  } catch {
    return [];
  }
}

async function writeManifest(entries: VoiceDesignManifestEntry[]): Promise<void> {
  await mkdir(voiceDesignRoot, { recursive: true });
  const manifestPath = path.join(voiceDesignRoot, "manifest.json");
  const merged = new Map<string, VoiceDesignManifestEntry>();

  for (const entry of await readExistingManifestEntries()) {
    merged.set(entry.id, entry);
  }

  for (const entry of entries) {
    merged.set(entry.id, entry);
  }

  const voices = Array.from(merged.values()).sort((a, b) => a.id.localeCompare(b.id));
  await writeFile(
    manifestPath,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), voices }, null, 2)}\n`
  );
}

async function savePreviewFiles(
  definition: (typeof voiceDesignDefinitions)[number],
  previews: ElevenLabs.VoicePreviewResponseModel[]
): Promise<string[]> {
  const outputFormat = definition.request.outputFormat ?? "mp3_44100_128";
  const extension = resolveAudioExtension(outputFormat);
  const publicPaths: string[] = [];

  for (const [index, preview] of previews.entries()) {
    const relativeFilePath = `${definition.outputStem}/preview-${index + 1}.${extension}`;
    const absoluteFilePath = path.join(outputRoot, relativeFilePath);
    const publicPath = `/audio/generated/${relativeFilePath}`.replace(/\\/g, "/");

    await writeGeneratedAudioFile(
      absoluteFilePath,
      Buffer.from(preview.audioBase64, "base64")
    );

    publicPaths.push(publicPath);
  }

  return publicPaths;
}

async function main() {
  const selectedDesigns = getSelectedVoiceDesigns();
  const dryRun = process.argv.includes("--dry-run");
  const persist = process.argv.includes("--persist");

  if (selectedDesigns.length === 0) {
    throw new Error("No voice designs matched the selected filters.");
  }

  if (dryRun) {
    for (const definition of selectedDesigns) {
      console.log(
        `[dry-run] voice ${definition.id} -> /audio/generated/${definition.outputStem}/preview-1.${resolveAudioExtension(
          definition.request.outputFormat
        )}`
      );
    }
    return;
  }

  loadAssetGenerationEnv(projectRoot);
  const client = createElevenLabsAssetClient();
  const manifestEntries: VoiceDesignManifestEntry[] = [];

  for (const [index, definition] of selectedDesigns.entries()) {
    console.log(
      `[${index + 1}/${selectedDesigns.length}] Designing ${definition.id} (${definition.label})`
    );

    const previewResponse = await designVoiceAsset(client, definition.request);
    if (previewResponse.previews.length === 0) {
      throw new Error(`Voice design ${definition.id} returned no previews.`);
    }

    const previewPublicPaths = await savePreviewFiles(
      definition,
      previewResponse.previews
    );

    const selectedPreviewIndex = Math.min(
      definition.selectedPreviewIndex ?? 0,
      previewResponse.previews.length - 1
    );
    const selectedPreview = previewResponse.previews[selectedPreviewIndex];

    let voiceId: string | null = null;
    if (persist) {
      const createdVoice = await createDesignedVoice(client, {
        voiceName: definition.voiceName,
        voiceDescription: definition.request.voiceDescription,
        generatedVoiceId: selectedPreview.generatedVoiceId,
        labels: definition.labels,
        playedNotSelectedVoiceIds: previewResponse.previews
          .filter((_preview, previewIndex) => previewIndex !== selectedPreviewIndex)
          .map((preview) => preview.generatedVoiceId),
      });
      voiceId = createdVoice.voiceId;
      console.log(`Created voice ${definition.voiceName} (${voiceId})`);
    }

    manifestEntries.push({
      id: definition.id,
      label: definition.label,
      voiceName: definition.voiceName,
      voiceId,
      voiceDescription: definition.request.voiceDescription,
      previewText: previewResponse.text,
      previewPublicPaths,
      selectedPreviewIndex,
      selectedGeneratedVoiceId: selectedPreview.generatedVoiceId,
      labels: definition.labels ?? {},
      request: definition.request,
      generatedAt: new Date().toISOString(),
    });

    console.log(
      `Saved ${previewPublicPaths.length} previews for ${definition.id} under /audio/generated/${definition.outputStem}`
    );
  }

  await writeManifest(manifestEntries);
  console.log("Manifest written to /audio/generated/voice-designs/manifest.json");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});