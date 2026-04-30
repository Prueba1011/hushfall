import type { SoulId } from "@/game/data/souls";

export interface LevelGridPoint {
  x: number;
  y: number;
}

export interface LevelMirrorDefinition extends LevelGridPoint {
  mode: "cross" | "exit";
}

export interface LevelMemoryDefinition extends LevelGridPoint {
  id: SoulId;
}

export type LevelNpcBlessingType = "slowEchoes" | "quietFootsteps" | "falseGrace";

export interface LevelNpcResponseDefinition {
  id: string;
  text: string;
  reply: string;
  grantsBlessing?: boolean;
}

export interface LevelNpcDefinition extends LevelGridPoint {
  id: string;
  name: string;
  title: string;
  introLine: string;
  blessingType: LevelNpcBlessingType;
  blessingDurationMs: number;
  blessingLabel: string;
  blessingSubtitle: string;
  resolvedLine: string;
  auraColor?: number;
  responses: LevelNpcResponseDefinition[];
}

export interface LevelEchoDefinition {
  patrol: LevelGridPoint[];
  patrolSpeed: number;
  chaseSpeed: number;
  hearingRadius: number;
  auraColor?: number;
  eyeColor?: number;
}

export interface LevelDefinition {
  id: string;
  title: string;
  startObjective: string;
  introSubtitle?: string;
  nextLevelObjective?: string;
  nextLevelSubtitle?: string;
  room: string[];
  playerSpawn: LevelGridPoint;
  mirrors: LevelMirrorDefinition[];
  tables: LevelGridPoint[];
  vases: LevelGridPoint[];
  npcs: LevelNpcDefinition[];
  memories: LevelMemoryDefinition[];
  echoes: LevelEchoDefinition[];
  sprinter: LevelEchoDefinition;
}

const STILLED_KITCHEN_ROOM = [
  "WWWWWWWWWWWWWWWWWWWWWWWW",
  "W.....W......W....W....W",
  "W.rrrrW..W...WssssW....W",
  "W.rrrr...W...WssssW.W..W",
  "W.rrrrW..W...W....W.W..W",
  "W.WWWWW..WWW.W.WWWW.W.WW",
  "W....W.....W.W....W...WW",
  "WWW..W.ggg.W.W.WW.W.W..W",
  "W....W.ggg...W.W..W.W..W",
  "W.WWWW.WWWWWWW.W..W.WW.W",
  "W.W....W....W..W..W....W",
  "W.W.sssW.ss.W..W..WWWW.W",
  "W...sss..ss.W..W......WW",
  "W.W.sssW....W..W..g....W",
  "W......................W",
  "WWWWWWWWWWWWWWWWWWWWWWWW",
];

const LISTENING_HALL_ROOM = [
  "WWWWWWWWWWWWWWWWWWWWWWWW",
  "W..sss....W....ssss...WW",
  "W.WWW.WWW.W.WW.WWW.WW.WW",
  "W.W...W...W..W....W...WW",
  "W.W.sss.WWW.W.WWWW.WW.WW",
  "W...W...W...W....W...sWW",
  "WWW.W.WWW.WWW.WW.WWW..WW",
  "W...W.s...W...W..sW...WW",
  "W.WWW.WWWWW.WWW.W.WWW.WW",
  "W.W...W....W...W....W.WW",
  "W.W.WWW.ssss.W.WWWW.W.WW",
  "W...W....W...W....W...WW",
  "W.WWW.WW.W.WWWW.WW.WWWWW",
  "W.....W..W....W..s....WW",
  "W.sssss...sss......s..WW",
  "WWWWWWWWWWWWWWWWWWWWWWWW",
];

export const levels: LevelDefinition[] = [
  {
    id: "stilled-kitchen",
    title: "The Stilled Kitchen",
    startObjective: "Find the lost ones. They remember where their souls fell.",
    nextLevelObjective: "The kitchen loosens, but another room still listens.",
    nextLevelSubtitle: "The Listening Hall is tighter. Echoes hear farther there.",
    room: STILLED_KITCHEN_ROOM,
    playerSpawn: { x: 8, y: 6 },
    mirrors: [
      { x: 16, y: 4, mode: "cross" },
      { x: 3, y: 10, mode: "cross" },
      { x: 16, y: 12, mode: "exit" },
    ],
    tables: [
      { x: 9, y: 8 },
      { x: 18, y: 12 },
    ],
    vases: [
      { x: 7, y: 6 },
      { x: 19, y: 10 },
    ],
    npcs: [],
    memories: [
      { id: "cloth", x: 3, y: 3 },
      { id: "stone", x: 4, y: 13 },
      { id: "wall", x: 20, y: 13 },
    ],
    echoes: [
      {
        patrol: [
          { x: 8, y: 6 },
          { x: 10, y: 6 },
          { x: 10, y: 8 },
          { x: 8, y: 8 },
        ],
        patrolSpeed: 34,
        chaseSpeed: 92,
        hearingRadius: 280,
      },
      {
        patrol: [
          { x: 17, y: 12 },
          { x: 20, y: 12 },
          { x: 20, y: 14 },
          { x: 17, y: 14 },
        ],
        patrolSpeed: 37,
        chaseSpeed: 98,
        hearingRadius: 300,
      },
    ],
    sprinter: {
      patrol: [
        { x: 12, y: 14 },
        { x: 20, y: 14 },
        { x: 20, y: 12 },
        { x: 17, y: 12 },
      ],
      patrolSpeed: 56,
      chaseSpeed: 148,
      hearingRadius: 360,
      auraColor: 0x9d3358,
      eyeColor: 0xff6a5e,
    },
  },
  {
    id: "listening-hall",
    title: "The Listening Hall",
    startObjective:
      "Four souls are pinned across a single listening hall. Quiet routes are gone. Recover all four before the Echoes fold the room shut.",
    introSubtitle: "Four Echoes patrol this hall. There are no sealed rooms now, only narrow routes and bad footing.",
    room: LISTENING_HALL_ROOM,
    playerSpawn: { x: 2, y: 14 },
    mirrors: [
      { x: 7, y: 5, mode: "cross" },
      { x: 17, y: 9, mode: "cross" },
      { x: 20, y: 13, mode: "exit" },
    ],
    tables: [],
    vases: [],
    npcs: [],
    memories: [
      { id: "cloth", x: 4, y: 1 },
      { id: "stone", x: 10, y: 10 },
      { id: "glass", x: 20, y: 3 },
      { id: "wall", x: 19, y: 14 },
    ],
    echoes: [
      {
        patrol: [
          { x: 2, y: 1 },
          { x: 8, y: 1 },
          { x: 8, y: 3 },
          { x: 3, y: 3 },
        ],
        patrolSpeed: 44,
        chaseSpeed: 122,
        hearingRadius: 330,
      },
      {
        patrol: [
          { x: 7, y: 7 },
          { x: 9, y: 7 },
          { x: 10, y: 10 },
          { x: 8, y: 11 },
        ],
        patrolSpeed: 48,
        chaseSpeed: 128,
        hearingRadius: 340,
      },
      {
        patrol: [
          { x: 15, y: 3 },
          { x: 17, y: 3 },
          { x: 16, y: 5 },
          { x: 14, y: 5 },
        ],
        patrolSpeed: 46,
        chaseSpeed: 124,
        hearingRadius: 335,
      },
      {
        patrol: [
          { x: 17, y: 13 },
          { x: 20, y: 13 },
          { x: 20, y: 14 },
          { x: 16, y: 14 },
        ],
        patrolSpeed: 50,
        chaseSpeed: 134,
        hearingRadius: 350,
      },
    ],
    sprinter: {
      patrol: [
        { x: 10, y: 14 },
        { x: 16, y: 14 },
        { x: 20, y: 13 },
        { x: 17, y: 9 },
      ],
      patrolSpeed: 72,
      chaseSpeed: 168,
      hearingRadius: 400,
      auraColor: 0xa83254,
      eyeColor: 0xff7864,
    },
  },
];