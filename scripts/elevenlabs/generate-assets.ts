import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { audioAssetDefinitions } from "./assets";
import {
  createElevenLabsAssetClient,
  generateMusicAsset,
  generateSoundEffectAsset,
  generateSpeechAsset,
  loadAssetGenerationEnv,
  resolveAudioExtension,
  writeGeneratedAudioFile,
} from "./sdk";

const projectRoot = process.cwd();
const outputRoot = path.join(projectRoot, "public", "audio", "generated");

type AssetScope = "all" | "sfx" | "music" | "voice";

type ManifestEntry = {
  id: string;
  label: string;
  kind: "sfx" | "music" | "voice";
  filePath: string;
  publicPath: string;
  outputFormat: string;
  contentType: string | null;
  characterCost: string | null;
  songId: string | null;
  request: unknown;
  generatedAt: string;
};

function getFlag(name: string): string | undefined {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match?.slice(prefix.length);
}

function parseScope(): AssetScope {
  const scope = getFlag("scope");
  if (scope === "sfx" || scope === "music" || scope === "voice") {
    return scope;
  }
  return "all";
}

function getSelectedAssets() {
  const scope = parseScope();
  const id = getFlag("id");

  return audioAssetDefinitions.filter((asset) => {
    if (scope !== "all" && asset.kind !== scope) {
      return false;
    }

    if (id && asset.id !== id) {
      return false;
    }

    return true;
  });
}

async function writeManifest(entries: ManifestEntry[]): Promise<void> {
  await mkdir(outputRoot, { recursive: true });
  const manifestPath = path.join(outputRoot, "manifest.json");
  const payload = {
    generatedAt: new Date().toISOString(),
    assets: entries,
  };

  await writeFile(manifestPath, `${JSON.stringify(payload, null, 2)}\n`);
}

async function main() {
  const selectedAssets = getSelectedAssets();
  const dryRun = process.argv.includes("--dry-run");

  if (selectedAssets.length === 0) {
    throw new Error("No assets matched the selected filters.");
  }

  if (dryRun) {
    for (const asset of selectedAssets) {
      const outputFormat = asset.request.outputFormat ?? "mp3_44100_128";
      const extension = resolveAudioExtension(outputFormat);
      const publicPath = `/audio/generated/${asset.outputStem}.${extension}`;
      console.log(`[dry-run] ${asset.kind} ${asset.id} -> ${publicPath}`);
    }
    return;
  }

  loadAssetGenerationEnv(projectRoot);
  const client = createElevenLabsAssetClient();
  const manifestEntries: ManifestEntry[] = [];

  for (const [index, asset] of selectedAssets.entries()) {
    console.log(
      `[${index + 1}/${selectedAssets.length}] Generating ${asset.id} (${asset.label})`
    );

    const result =
      asset.kind === "sfx"
        ? await generateSoundEffectAsset(client, asset.request)
        : asset.kind === "music"
        ? await generateMusicAsset(client, asset.request)
        : await generateSpeechAsset(client, asset.voiceId, asset.request);

    const outputFormat = asset.request.outputFormat ?? "mp3_44100_128";
    const extension = resolveAudioExtension(outputFormat);
    const relativeFilePath = `${asset.outputStem}.${extension}`;
    const absoluteFilePath = path.join(outputRoot, relativeFilePath);
    const publicPath = `/audio/generated/${relativeFilePath}`.replace(/\\/g, "/");

    await writeGeneratedAudioFile(absoluteFilePath, result.buffer);

    manifestEntries.push({
      id: asset.id,
      label: asset.label,
      kind: asset.kind,
      filePath: absoluteFilePath,
      publicPath,
      outputFormat,
      contentType: result.contentType,
      characterCost: result.characterCost,
      songId: result.songId,
      request: asset.request,
      generatedAt: new Date().toISOString(),
    });

    console.log(`Saved ${publicPath}`);
  }

  await writeManifest(manifestEntries);
  console.log(`Manifest written to /audio/generated/manifest.json`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});

