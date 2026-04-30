export type SoulId = "cloth" | "stone" | "wall" | "glass";
export type SoulLevelId = "stilled-kitchen" | "listening-hall";

export type SoulProfile = {
  gratitudeLine: string;
  gratitudeAudioKey: string;
  gratitudeAudioPath: string;
  voiceId: string;
  voiceDesignId: string;
  voiceAssetId: string;
};

const levelSoulProfiles: Record<SoulLevelId, Partial<Record<SoulId, SoulProfile>>> = {
  "stilled-kitchen": {
    cloth: {
      gratitudeLine:
        "Thank you. The kitchen finally remembers me as warm again. I only wanted one more evening at her table.",
      gratitudeAudioKey: "tts-soul-stilled-kitchen-cloth",
      gratitudeAudioPath: "/audio/generated/voice/souls/stilled-kitchen-cloth.mp3",
      voiceId: "osRDDvhNwFCIq3tT3l97",
      voiceDesignId: "soul-cloth-matron",
      voiceAssetId: "tts-soul-stilled-kitchen-cloth",
    },
    stone: {
      gratitudeLine:
        "You heard me through the kitchen stone. Thank you for lifting that cellar-cold silence out of my chest.",
      gratitudeAudioKey: "tts-soul-stilled-kitchen-stone",
      gratitudeAudioPath: "/audio/generated/voice/souls/stilled-kitchen-stone.mp3",
      voiceId: "q5L2wkvj4TRFS5Dws1bs",
      voiceDesignId: "soul-stone-sepulcher",
      voiceAssetId: "tts-soul-stilled-kitchen-stone",
    },
    wall: {
      gratitudeLine:
        "I thought I would stay inside that kitchen wall forever. Thank you for opening a seam back into the light.",
      gratitudeAudioKey: "tts-soul-stilled-kitchen-wall",
      gratitudeAudioPath: "/audio/generated/voice/souls/stilled-kitchen-wall.mp3",
      voiceId: "fHyV6nkHh0oJRWb9FeKB",
      voiceDesignId: "soul-wall-child",
      voiceAssetId: "tts-soul-stilled-kitchen-wall",
    },
  },
  "listening-hall": {
    cloth: {
      gratitudeLine:
        "This hall kept tugging at my sleeves like it knew my name. Thank you for unthreading me from its listening dark.",
      gratitudeAudioKey: "tts-soul-listening-hall-cloth",
      gratitudeAudioPath: "/audio/generated/voice/souls/listening-hall-cloth.mp3",
      voiceId: "WfhJBY5Pq9lhobNt2X3u",
      voiceDesignId: "soul-cloth-seamstress",
      voiceAssetId: "tts-soul-listening-hall-cloth",
    },
    stone: {
      gratitudeLine:
        "Every footfall in this hall kept waking the old stone around me. Thank you for breaking the echo before it sealed again.",
      gratitudeAudioKey: "tts-soul-listening-hall-stone",
      gratitudeAudioPath: "/audio/generated/voice/souls/listening-hall-stone.mp3",
      voiceId: "WZY6Ydvem2y1Qz3mNhjh",
      voiceDesignId: "soul-stone-warden",
      voiceAssetId: "tts-soul-listening-hall-stone",
    },
    wall: {
      gratitudeLine:
        "The hall kept learning my breathing from inside the plaster. Thank you for pulling me out before it learned the rest of me.",
      gratitudeAudioKey: "tts-soul-listening-hall-wall",
      gratitudeAudioPath: "/audio/generated/voice/souls/listening-hall-wall.mp3",
      voiceId: "PAhXaJhxaI8rnmdKifkP",
      voiceDesignId: "soul-wall-listener",
      voiceAssetId: "tts-soul-listening-hall-wall",
    },
    glass: {
      gratitudeLine:
        "Even the broken glass kept my voice pinned here. Thank you for giving every shard somewhere else to fall.",
      gratitudeAudioKey: "tts-soul-listening-hall-glass",
      gratitudeAudioPath: "/audio/generated/voice/souls/listening-hall-glass.mp3",
      voiceId: "fFOgDoX6CkuNigB5wacG",
      voiceDesignId: "soul-glass-widow",
      voiceAssetId: "tts-soul-listening-hall-glass",
    },
  },
};

export const soulProfiles = {
  cloth: levelSoulProfiles["stilled-kitchen"].cloth!,
  stone: levelSoulProfiles["stilled-kitchen"].stone!,
  wall: levelSoulProfiles["stilled-kitchen"].wall!,
  glass: levelSoulProfiles["listening-hall"].glass!,
} satisfies Record<SoulId, SoulProfile>;

export const allSoulProfiles = Object.values(levelSoulProfiles).flatMap((profilesByLevel) =>
  Object.values(profilesByLevel)
);

export function getSoulProfile(levelId: SoulLevelId, id: SoulId): SoulProfile;
export function getSoulProfile(id: SoulId): SoulProfile;
export function getSoulProfile(levelIdOrId: SoulLevelId | SoulId, id?: SoulId): SoulProfile {
  if (!id) {
    return soulProfiles[levelIdOrId as SoulId]!;
  }

  const profile = levelSoulProfiles[levelIdOrId as SoulLevelId][id];
  if (!profile) {
    return soulProfiles[id]!;
  }

  return profile;
}