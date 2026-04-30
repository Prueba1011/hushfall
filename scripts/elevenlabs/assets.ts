import type { ElevenLabs } from "@elevenlabs/elevenlabs-js";
import { allSoulProfiles } from "../../game/data/souls";

type BaseAssetDefinition<TKind extends "sfx" | "music" | "voice", TRequest> = {
  id: string;
  label: string;
  kind: TKind;
  outputStem: string;
  request: TRequest;
};

export type SoundEffectAssetDefinition = BaseAssetDefinition<
  "sfx",
  ElevenLabs.CreateSoundEffectRequest
>;

export type MusicAssetDefinition = BaseAssetDefinition<
  "music",
  ElevenLabs.BodyComposeMusicV1MusicPost
>;

export type VoiceAssetDefinition = BaseAssetDefinition<
  "voice",
  ElevenLabs.BodyTextToSpeechFull
> & {
  voiceId: string;
};

export type AudioAssetDefinition =
  | SoundEffectAssetDefinition
  | MusicAssetDefinition
  | VoiceAssetDefinition;

const DEFAULT_OUTPUT_FORMAT = "mp3_44100_128" satisfies ElevenLabs.AllowedOutputFormats;
const DEFAULT_TTS_MODEL = "eleven_multilingual_v2";

function outputStemFromPublicPath(publicPath: string): string {
  return publicPath.replace(/^\/audio\/generated\//, "").replace(/\.[^.]+$/, "");
}

export const soundEffectAssets: SoundEffectAssetDefinition[] = [
  {
    id: "mirror-crossing",
    label: "Mirror crossing transition",
    kind: "sfx",
    outputStem: "sfx/mirror-crossing",
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      text: "A thin cracked mirror membrane peeling open with a cold inhale, glass shimmer, brief supernatural transition, cinematic game sound, no voice, no melody.",
      durationSeconds: 3.2,
      promptInfluence: 0.55,
      modelId: "eleven_text_to_sound_v2",
    },
  },
  {
    id: "memory-return",
    label: "Memory collected cue",
    kind: "sfx",
    outputStem: "sfx/memory-return",
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      text: "A fragile remembered chime blooming into warm dust and faint breath, intimate, melancholic, magical pickup cue, no voice.",
      durationSeconds: 2.4,
      promptInfluence: 0.48,
      modelId: "eleven_text_to_sound_v2",
    },
  },
  {
    id: "memory-ripped",
    label: "Memory loss punishment cue",
    kind: "sfx",
    outputStem: "sfx/memory-ripped",
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      text: "A stolen memory ripping out of a haunted chest, sharp spectral tear, snapped glass fibers, breath being pulled away, intimate supernatural punishment cue, sorrowful and unsettling, no speech, no music.",
      durationSeconds: 2.1,
      promptInfluence: 0.63,
      modelId: "eleven_text_to_sound_v2",
    },
  },
  {
    id: "landing-shatter",
    label: "Landing glass shatter",
    kind: "sfx",
    outputStem: "sfx/landing-shatter",
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      text: "A large haunted mirror or window sheet cracking sharply and breaking apart into real glass shards, piercing crystalline snap, brittle mirror fracture, cascading shard spray, splinters skittering and raining down, close-up authentic glass break, no bass hit, no dull thud, no music.",
      durationSeconds: 3.2,
      promptInfluence: 0.66,
      modelId: "eleven_text_to_sound_v2",
    },
  },
  {
    id: "exit-awaken",
    label: "Exit mirror awakened cue",
    kind: "sfx",
    outputStem: "sfx/exit-awaken",
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      text: "A large antique mirror awakening with golden resonance, warm chime bloom, glass singing and ceremonial light, supernatural unlock cue, hopeful and clear, no voice, no melody.",
      durationSeconds: 2.8,
      promptInfluence: 0.56,
      modelId: "eleven_text_to_sound_v2",
    },
  },
  {
    id: "victory-release",
    label: "Victory soul release swell",
    kind: "sfx",
    outputStem: "sfx/victory-release",
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      text: "Three trapped souls rising free in a warm spectral swell, airy choir without words, cracked glass light and emotional release, melancholy but hopeful victory cue, no speech.",
      durationSeconds: 4,
      promptInfluence: 0.58,
      modelId: "eleven_text_to_sound_v2",
    },
  },
  {
    id: "echo-alert",
    label: "Echo alert cue",
    kind: "sfx",
    outputStem: "sfx/echo-alert",
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      text: "A sudden ghostly shriek swallowed into a low hit and air suck, stealth detection cue, ominous, sharp, no music.",
      durationSeconds: 1.8,
      promptInfluence: 0.62,
      modelId: "eleven_text_to_sound_v2",
    },
  },
  {
    id: "vase-shatter",
    label: "Ceramic vase shatter",
    kind: "sfx",
    outputStem: "sfx/vase-shatter",
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      text: "A small ceramic vase shattering on a hard kitchen stone floor in an old room, close, dry, detailed.",
      durationSeconds: 2,
      promptInfluence: 0.5,
      modelId: "eleven_text_to_sound_v2",
    },
  },
  {
    id: "table-bump",
    label: "Wooden table bump",
    kind: "sfx",
    outputStem: "sfx/table-bump",
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      text: "LOUD heavy wooden thud, a body slamming hard into the side of a thick old oak dining table, deep percussive low-end whomp with sharp transient attack, hollow wood resonance, woody crack of joints under stress, plates and silverware rattling and clattering loudly on top, dust shaking, close mic, dry interior, full-volume foley, no music, no voice, no reverb tail.",
      durationSeconds: 1.6,
      promptInfluence: 0.7,
      modelId: "eleven_text_to_sound_v2",
    },
  },
  {
    id: "footstep-wood",
    label: "Wood footstep",
    kind: "sfx",
    outputStem: "sfx/footstep-wood",
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      text: "A single clear leather boot step on old wooden floorboards, close and detailed, audible board creak, hollow plank resonance, crisp heel then toe, realistic interior wood footstep for a stealth game, dry and readable, no voice.",
      durationSeconds: 1.35,
      promptInfluence: 0.62,
      modelId: "eleven_text_to_sound_v2",
    },
  },
  {
    id: "footstep-stone",
    label: "Stone footstep",
    kind: "sfx",
    outputStem: "sfx/footstep-stone",
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      text: "A single cautious leather boot step on cold stone tile in an empty old kitchen, dry and detailed, short decay, no voice.",
      durationSeconds: 1.2,
      promptInfluence: 0.54,
      modelId: "eleven_text_to_sound_v2",
    },
  },
  {
    id: "footstep-rug",
    label: "Rug footstep",
    kind: "sfx",
    outputStem: "sfx/footstep-rug",
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      text: "A single soft footstep pressing into an old woven rug, muffled fabric thump with faint fiber shift, intimate and dry, no voice.",
      durationSeconds: 1,
      promptInfluence: 0.48,
      modelId: "eleven_text_to_sound_v2",
    },
  },
  {
    id: "footstep-grass",
    label: "Grass footstep",
    kind: "sfx",
    outputStem: "sfx/footstep-grass",
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      text: "A single careful footstep through short dry grass with a light rustle and compressed stems, close and natural, no voice.",
      durationSeconds: 1.2,
      promptInfluence: 0.5,
      modelId: "eleven_text_to_sound_v2",
    },
  },
  {
    id: "soul-release-cloth",
    label: "Cloth soul release",
    kind: "sfx",
    outputStem: "sfx/soul-release-cloth",
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      text: "A fragile soul unfurling from old cloth with a close whispering ghost voice, sorrowful feminine half-words, trembling breath, silk-like thread whispers and pale glass shimmer, intimate supernatural release, clearly vocal but spectral, not clean speech, not TTS.",
      durationSeconds: 3,
      promptInfluence: 0.62,
      modelId: "eleven_text_to_sound_v2",
    },
  },
  {
    id: "soul-release-stone",
    label: "Stone soul release",
    kind: "sfx",
    outputStem: "sfx/soul-release-stone",
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      text: "A trapped soul lifting from cold stone with a deep sepulchral voice, ancient male lament, resonant broken syllables from a tomb, hollow breath, mineral vibration and graveyard echo, powerful spectral human presence, not clear dialogue, not TTS.",
      durationSeconds: 3.1,
      promptInfluence: 0.64,
      modelId: "eleven_text_to_sound_v2",
    },
  },
  {
    id: "soul-release-wall",
    label: "Wall soul release",
    kind: "sfx",
    outputStem: "sfx/soul-release-wall",
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      text: "A soul peeling free from a plaster wall with a cracked desperate ghost voice, dusty exhale, whispering plea from inside the wall, splintered breath, strained cry and rising supernatural pull, distinct spectral vocal texture, not clean speech, not TTS.",
      durationSeconds: 3,
      promptInfluence: 0.63,
      modelId: "eleven_text_to_sound_v2",
    },
  },
  {
    id: "echo-presence",
    label: "Echo presence layer",
    kind: "sfx",
    outputStem: "sfx/echo-presence",
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      text: "Loop-friendly supernatural proximity bed: distant breaths, glass harmonics, thin whispering air, melancholy and ominous, no melody, no speech, suitable as a monster presence layer.",
      durationSeconds: 14,
      promptInfluence: 0.58,
      modelId: "eleven_text_to_sound_v2",
    },
  },
  {
    id: "echo-hunt",
    label: "Echo hunt layer",
    kind: "sfx",
    outputStem: "sfx/echo-hunt",
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      text: "Loop-friendly predatory hunt layer: strained inhalations, low unstable pulse, scraping glass air and dread, tense and threatening, no voice, no drums, for a stealth monster chase.",
      durationSeconds: 12,
      promptInfluence: 0.62,
      modelId: "eleven_text_to_sound_v2",
    },
  },
];

export const musicAssets: MusicAssetDefinition[] = [
  {
    id: "intro-lament",
    label: "Landing lament loop",
    kind: "music",
    outputStem: "music/intro-lament",
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      prompt: "Seamless deeply depressive ambient loop for a haunted title screen, fragile piano fragments, distant cello sighs, cold room tone, exhausted grief and suspended sorrow, intimate and cinematic, no percussion, no vocals, instrumental only.",
      musicLengthMs: 52000,
      forceInstrumental: true,
      modelId: "music_v1",
    },
  },
  {
    id: "stilled-kitchen-living",
    label: "Living world ambience",
    kind: "music",
    outputStem: "music/stilled-kitchen-living",
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      prompt: "Seamless immersive ambient loop for a safe but melancholy frozen kitchen, soft felt piano, warm harmonium haze, subtle house creaks, floating dust-light tenderness, calm and restorative, no percussion, no vocals, instrumental stealth game ambience.",
      musicLengthMs: 52000,
      forceInstrumental: true,
      modelId: "music_v1",
    },
  },
  {
    id: "stilled-kitchen-broken",
    label: "Broken world ambience",
    kind: "music",
    outputStem: "music/stilled-kitchen-broken",
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      prompt: "Seamless haunting ambient loop for a mirror-corrupted room, deep drones, reversed cello sighs, cracked glass resonance, faint breathing texture, predatory stillness, dark and tenebrous, no percussion, no vocals, instrumental stealth game ambience.",
      musicLengthMs: 52000,
      forceInstrumental: true,
      modelId: "music_v1",
    },
  },
];

export const voiceAssets: VoiceAssetDefinition[] = allSoulProfiles.map((profile, index) => ({
  id: profile.voiceAssetId,
  label: `Soul voice ${profile.voiceAssetId.replace(/^tts-soul-/, "").replace(/-/g, " ")}`,
  kind: "voice",
  voiceId: profile.voiceId,
  outputStem: outputStemFromPublicPath(profile.gratitudeAudioPath),
  request: {
    outputFormat: DEFAULT_OUTPUT_FORMAT,
    text: profile.gratitudeLine,
    modelId: DEFAULT_TTS_MODEL,
    languageCode: "en",
    seed: 4101 + index * 97,
    voiceSettings: {
      stability: 0.42,
      similarityBoost: 0.78,
      style: 0.2,
      useSpeakerBoost: true,
    },
  },
}));

export const audioAssetDefinitions: AudioAssetDefinition[] = [
  ...soundEffectAssets,
  ...musicAssets,
  ...voiceAssets,
];
