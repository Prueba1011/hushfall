type WhisperAsset = {
  line: string;
  audioPath: string | null;
};

const whisperAssets = {
  cloth: {
    line: "Under the red cloth where hands once trembled.",
    audioPath: null,
  },
  stone: {
    line: "Near the cold stone that kept the rain.",
    audioPath: null,
  },
  wall: {
    line: "By the wall that never learned the sun.",
    audioPath: null,
  },
} satisfies Record<string, WhisperAsset>;

export type WhisperId = keyof typeof whisperAssets;

export function getWhisperAsset(id: WhisperId): WhisperAsset {
  return whisperAssets[id];
}