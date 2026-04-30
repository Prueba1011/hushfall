import type { ElevenLabs } from "@elevenlabs/elevenlabs-js";

export type VoiceDesignDefinition = {
  id: string;
  label: string;
  voiceName: string;
  outputStem: string;
  selectedPreviewIndex?: number;
  labels?: Record<string, string>;
  request: ElevenLabs.VoiceDesignRequestModel;
};

const DEFAULT_OUTPUT_FORMAT = "mp3_44100_128" satisfies ElevenLabs.AllowedOutputFormats;
const DEFAULT_MODEL = "eleven_ttv_v3" satisfies ElevenLabs.VoiceDesignRequestModelModelId;

export const voiceDesignDefinitions: VoiceDesignDefinition[] = [
  {
    id: "soul-cloth-matron",
    label: "Cloth soul spectral matron",
    voiceName: "Hushfall Soul - Cloth Matron",
    outputStem: "voice-designs/soul-cloth-matron",
    labels: {
      project: "hushfall",
      role: "soul",
      material: "cloth",
      tone: "mourning",
    },
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      modelId: DEFAULT_MODEL,
      voiceDescription:
        "A ghostly older woman speaking from just beyond the veil, intimate and human, warm but exhausted, airy grief, a slight tremor of tenderness, antique cadence, candlelit melancholy, no horror monster, no cartoon ghost, only a sorrowful soul remembered through dust.",
      text:
        "I only wanted one more evening at her table, but the room kept folding around me until even my name felt like cloth in cold water.",
      shouldEnhance: true,
      guidanceScale: 6.2,
      loudness: -0.2,
      seed: 1103,
    },
  },
  {
    id: "soul-stone-sepulcher",
    label: "Stone soul sepulchral keeper",
    voiceName: "Hushfall Soul - Stone Sepulcher",
    outputStem: "voice-designs/soul-stone-sepulcher",
    labels: {
      project: "hushfall",
      role: "soul",
      material: "stone",
      tone: "sepulchral",
    },
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      modelId: DEFAULT_MODEL,
      voiceDescription:
        "A deep spectral man speaking from a stone chamber beyond death, resonant and grave, calm but broken by centuries of silence, dry air in the throat, funeral dignity, old-world diction, human and mournful, never demonic, never synthetic.",
      text:
        "You heard me through the stone at last, and the cold has started to loosen from my chest like mortar giving way under rain.",
      shouldEnhance: true,
      guidanceScale: 6.6,
      loudness: -0.12,
      seed: 2719,
    },
  },
  {
    id: "soul-wall-child",
    label: "Wall soul trapped whisper",
    voiceName: "Hushfall Soul - Wall Child",
    outputStem: "voice-designs/soul-wall-child",
    labels: {
      project: "hushfall",
      role: "soul",
      material: "wall",
      tone: "trapped",
    },
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      modelId: DEFAULT_MODEL,
      voiceDescription:
        "A young spectral voice trapped inside old plaster, fragile and breathy, frightened but lucid, dusty consonants, close-mic intimacy, a faint wall resonance around the words, deeply human, plaintive and haunting without becoming theatrical.",
      text:
        "I kept calling from inside the wall until the plaster learned my breathing and answered me back with its own dust-filled mouth.",
      shouldEnhance: true,
      guidanceScale: 6.3,
      loudness: -0.28,
      seed: 8831,
    },
  },
  {
    id: "soul-glass-widow",
    label: "Glass soul mirrored widow",
    voiceName: "Hushfall Soul - Glass Widow",
    outputStem: "voice-designs/soul-glass-widow",
    labels: {
      project: "hushfall",
      role: "soul",
      material: "glass",
      tone: "mirrored",
    },
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      modelId: DEFAULT_MODEL,
      voiceDescription:
        "A spectral woman whose voice carries a subtle mirrored shimmer, soft and intimate, elegant but frayed by grief, silvery high detail, faint crystalline breath on the edges, melancholy and uncanny, still recognizably human, not robotic and not horror-camp.",
      text:
        "Even the broken glass kept an echo of me, bright and splintered, as if grief could learn to sing from every shard at once.",
      shouldEnhance: true,
      guidanceScale: 6.4,
      loudness: -0.18,
      seed: 5427,
    },
  },
  {
    id: "soul-cloth-seamstress",
    label: "Cloth soul hall seamstress",
    voiceName: "Hushfall Soul - Cloth Seamstress",
    outputStem: "voice-designs/soul-cloth-seamstress",
    labels: {
      project: "hushfall",
      role: "soul",
      material: "cloth",
      tone: "frayed",
      level: "listening-hall",
    },
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      modelId: DEFAULT_MODEL,
      voiceDescription:
        "A spectral seamstress in late middle age, intimate and close, a little finer and more anxious than the kitchen matron, threadbare breath, soft needle-like consonants, melancholy intelligence, human and sorrowful, no camp, no monster affectation.",
      text:
        "This hall kept tugging at my sleeves like it knew my name, until even the hems remembered me better than the living did.",
      shouldEnhance: true,
      guidanceScale: 6.25,
      loudness: -0.16,
      seed: 7139,
    },
  },
  {
    id: "soul-stone-warden",
    label: "Stone soul hall warden",
    voiceName: "Hushfall Soul - Stone Warden",
    outputStem: "voice-designs/soul-stone-warden",
    labels: {
      project: "hushfall",
      role: "soul",
      material: "stone",
      tone: "watchful",
      level: "listening-hall",
    },
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      modelId: DEFAULT_MODEL,
      voiceDescription:
        "A weathered spectral keeper of halls and thresholds, older male voice with firmer breath and a more watchful authority than the sepulcher soul, resonant chest tone, old grief held under discipline, grave but lucid, deeply human, never demonic.",
      text:
        "Every footfall in this hall kept waking the old stone around me, and it answered like a watchman who had forgotten what he was guarding.",
      shouldEnhance: true,
      guidanceScale: 6.55,
      loudness: -0.1,
      seed: 4821,
    },
  },
  {
    id: "soul-wall-listener",
    label: "Wall soul listening plaster",
    voiceName: "Hushfall Soul - Wall Listener",
    outputStem: "voice-designs/soul-wall-listener",
    labels: {
      project: "hushfall",
      role: "soul",
      material: "wall",
      tone: "absorbed",
      level: "listening-hall",
    },
    request: {
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      modelId: DEFAULT_MODEL,
      voiceDescription:
        "A thin adult spectral voice dissolved into old plaster, androgynous and exhausted, whisper-close, walls drinking the breath between words, less childlike and more numb than the kitchen wall soul, intimate, uncanny, but unmistakably human.",
      text:
        "The hall kept learning my breathing from inside the plaster, until the wall listened harder than any living ear ever had.",
      shouldEnhance: true,
      guidanceScale: 6.35,
      loudness: -0.24,
      seed: 9254,
    },
  },
];