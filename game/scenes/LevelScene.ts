import Phaser from "phaser";
import { Player, type FootstepEvent } from "@/game/entities/Player";
import { Echo } from "@/game/entities/Echo";
import {
  levels,
  type LevelDefinition,
  type LevelEchoDefinition,
  type LevelGridPoint,
  type LevelNpcBlessingType,
  type LevelNpcDefinition,
} from "@/game/data/levels";
import { NoiseSystem } from "@/game/systems/NoiseSystem";
import { WorldSwitcher, type World } from "@/game/systems/WorldSwitcher";
import type { Surface } from "@/game/data/surfaces";
import { allSoulProfiles, getSoulProfile, type SoulId, type SoulLevelId } from "@/game/data/souls";

type BrowserWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

const TILE = 32;
const ROOM_W = 24;
const ROOM_H = 16;
const STATIC_RANGE = 160;
const MEMORY_GLOW_RANGE = 150;
const ECHO_PRESENCE_RANGE = 240;
const ECHO_HUNT_RANGE = 320;
const MIRROR_FLARE_ECHO_RADIUS = 92;
const MIRROR_FLARE_COOLDOWN_MS = 2800;
const MIRROR_FLARE_PUSH_DISTANCE = 116;
const NPC_VOICE_ROOT = "/audio/generated/voice/npcs";

const SURFACE_FROM_CHAR: Record<string, Surface> = {
  ".": "wood",
  r: "rug",
  s: "stone",
  g: "grass",
};

interface SurfacePalette {
  base: number;
  shadow: number;
  highlight: number;
}

const PALETTE_LIVING: Record<Surface, SurfacePalette> = {
  wood: { base: 0x7a4f2e, shadow: 0x4a2f1b, highlight: 0x8d5e3a },
  rug: { base: 0x9c3f3f, shadow: 0x5e2424, highlight: 0xc55a52 },
  stone: { base: 0x6c6c74, shadow: 0x40404a, highlight: 0x8a8a92 },
  grass: { base: 0x547234, shadow: 0x2e4220, highlight: 0x6f8c46 },
  water: { base: 0x2d5d7c, shadow: 0x153852, highlight: 0x4a83a3 },
};

const PALETTE_BROKEN: Record<Surface, SurfacePalette> = {
  wood: { base: 0x2e2033, shadow: 0x120915, highlight: 0x46304d },
  rug: { base: 0x411732, shadow: 0x180914, highlight: 0x612447 },
  stone: { base: 0x2a2c3b, shadow: 0x10121b, highlight: 0x3f4458 },
  grass: { base: 0x223244, shadow: 0x0d141d, highlight: 0x335069 },
  water: { base: 0x15253f, shadow: 0x07111d, highlight: 0x274668 },
};

const WALL_PALETTE: Record<World, { face: number; top: number; mortar: number }> = {
  living: { face: 0x352a26, top: 0x564238, mortar: 0x1d1612 },
  broken: { face: 0x13101d, top: 0x251d34, mortar: 0x08060d },
};

const WORLD_BG: Record<World, number> = {
  living: 0x2a1f17,
  broken: 0x040309,
};

const WALL_FACE_DEPTH = 0.4;

const VIGNETTE_ALPHA: Record<World, number> = {
  living: 0.42,
  broken: 0.82,
};

const GENERATED_AUDIO = {
  mirrorCrossing: {
    key: "sfx-mirror-crossing",
    path: "audio/generated/sfx/mirror-crossing.mp3",
  },
  mirrorShatter: {
    key: "sfx-mirror-shatter",
    path: "audio/generated/sfx/landing-shatter.mp3",
  },
  memoryReturn: {
    key: "sfx-memory-return",
    path: "audio/generated/sfx/memory-return.mp3",
  },
  memoryLost: {
    key: "sfx-memory-ripped",
    path: "audio/generated/sfx/memory-ripped.mp3",
  },
  exitAwaken: {
    key: "sfx-exit-awaken",
    path: "audio/generated/sfx/exit-awaken.mp3",
  },
  victoryRelease: {
    key: "sfx-victory-release",
    path: "audio/generated/sfx/victory-release.mp3",
  },
  echoAlert: {
    key: "sfx-echo-alert",
    path: "audio/generated/sfx/echo-alert.mp3",
  },
  footstepWood: {
    key: "sfx-footstep-wood",
    path: "audio/generated/sfx/footstep-wood.mp3",
  },
  footstepStone: {
    key: "sfx-footstep-stone",
    path: "audio/generated/sfx/footstep-stone.mp3",
  },
  footstepRug: {
    key: "sfx-footstep-rug",
    path: "audio/generated/sfx/footstep-rug.mp3",
  },
  footstepGrass: {
    key: "sfx-footstep-grass",
    path: "audio/generated/sfx/footstep-grass.mp3",
  },
  echoPresence: {
    key: "sfx-echo-presence",
    path: "audio/generated/sfx/echo-presence.mp3",
  },
  echoHunt: {
    key: "sfx-echo-hunt",
    path: "audio/generated/sfx/echo-hunt.mp3",
  },
  vaseShatter: {
    key: "sfx-vase-shatter",
    path: "audio/generated/sfx/vase-shatter.mp3",
  },
  tableBump: {
    key: "sfx-table-bump",
    path: "audio/generated/sfx/table-bump.mp3",
  },
  livingMusic: {
    key: "music-stilled-kitchen-living",
    path: "audio/generated/music/stilled-kitchen-living.mp3",
  },
  brokenMusic: {
    key: "music-stilled-kitchen-broken",
    path: "audio/generated/music/stilled-kitchen-broken.mp3",
  },
} as const;

const FOOTSTEP_AUDIO_BY_SURFACE: Record<Surface, (typeof GENERATED_AUDIO)[keyof typeof GENERATED_AUDIO]> = {
  wood: GENERATED_AUDIO.footstepWood,
  rug: GENERATED_AUDIO.footstepRug,
  stone: GENERATED_AUDIO.footstepStone,
  grass: GENERATED_AUDIO.footstepGrass,
  water: GENERATED_AUDIO.footstepStone,
};

const FOOTSTEP_VOLUME_BY_SURFACE: Record<Surface, number> = {
  wood: 0.52,
  rug: 0.26,
  stone: 0.46,
  grass: 0.38,
  water: 0.42,
};

interface TileVisual {
  img: Phaser.GameObjects.Image;
  surface: Surface;
}

type PropKind = "vase" | "table" | "mirror";
type MirrorMode = "cross" | "exit";

interface Prop {
  body: Phaser.GameObjects.Container;
  hit: Phaser.GameObjects.Rectangle;
  kind: PropKind;
}

interface MirrorProp extends Prop {
  mode: MirrorMode;
  glow: Phaser.GameObjects.Arc;
  aura: Phaser.GameObjects.Arc;
  sensors: Phaser.GameObjects.Rectangle[];
  marker: Phaser.GameObjects.Container | null;
  lastFlareAt: number;
}

interface LostMemory {
  id: SoulId;
  memoryX: number;
  memoryY: number;
  sprite: Phaser.GameObjects.Container;
  collected: boolean;
}

interface MemoryProgressDetail {
  collected: number;
  total: number;
}

interface NpcRuntime {
  definition: LevelNpcDefinition;
  body: Phaser.GameObjects.Container;
  halo: Phaser.GameObjects.Arc;
  resolved: boolean;
  blessingGiven: boolean;
}

interface BlessingState {
  type: LevelNpcBlessingType;
  label: string;
  subtitle: string;
  auraColor: number;
  expiresAt: number;
  cosmeticOnly: boolean;
}

interface BlessingHudDetail {
  label: string;
  subtitle: string;
  cosmeticOnly: boolean;
}

interface EndingHudDetail {
  kicker: string;
  title: string;
  body: string;
  epilogue?: string;
  prompt: string;
  releasedCount: number;
}

type AdjustableSound = Phaser.Sound.BaseSound & {
  setVolume: (value: number) => Phaser.Sound.BaseSound;
  setRate: (value: number) => Phaser.Sound.BaseSound;
};

export class LevelScene extends Phaser.Scene {
  private readonly unlockAudio = (): void => {
    void this.ensureAudioReady();
    this.unlockSceneAudio();
  };

  private readonly handleInteract = (): void => {
    this.tryInteract();
  };

  private readonly handleDialogueKey = (event: KeyboardEvent): void => {
    if (!this.dialogueNpc) return;

    if (event.key === "1") {
      this.chooseNpcResponse(0);
      event.preventDefault();
      return;
    }
    if (event.key === "2") {
      this.chooseNpcResponse(1);
      event.preventDefault();
      return;
    }
    if (event.key === "3") {
      this.chooseNpcResponse(2);
      event.preventDefault();
      return;
    }
    if (event.key === "Escape") {
      this.closeNpcDialogue();
      event.preventDefault();
    }
  };

  private player!: Player;
  private noise!: NoiseSystem;
  private world!: WorldSwitcher;
  private activeLevel!: LevelDefinition;
  private levelIndex = 0;

  private tiles: TileVisual[] = [];
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private wallImages: Array<{ img: Phaser.GameObjects.Image; cap: Phaser.GameObjects.Rectangle }> = [];
  private props: Prop[] = [];
  private mirrors: MirrorProp[] = [];
  private exitMirror!: MirrorProp;
  private npcs: NpcRuntime[] = [];
  private echoes: Echo[] = [];
  private memories: LostMemory[] = [];
  private collectedMemories: LostMemory[] = [];

  private playerHalo!: Phaser.GameObjects.Arc;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private vignette!: Phaser.GameObjects.Image;
  private darkness!: Phaser.GameObjects.Rectangle;
  private haloMask!: Phaser.GameObjects.Image;
  private hintText!: Phaser.GameObjects.Text;
  private mirrorPrompt!: Phaser.GameObjects.Container;
  private mirrorPromptText!: Phaser.GameObjects.Text;
  private dialoguePanel!: Phaser.GameObjects.Container;
  private dialogueNameText!: Phaser.GameObjects.Text;
  private dialogueLineText!: Phaser.GameObjects.Text;
  private dialogueChoiceTexts: Phaser.GameObjects.Text[] = [];
  private subtitleBox!: Phaser.GameObjects.Rectangle;
  private subtitleText!: Phaser.GameObjects.Text;
  private subtitleHide: Phaser.Time.TimerEvent | null = null;

  private currentObjective = "";
  private collectedCount = 0;
  private won = false;
  private sprinterSpawned = false;
  private brokenHintShown = false;
  private mirrorFlareHintShown = false;
  private activeNpc: NpcRuntime | null = null;
  private dialogueNpc: NpcRuntime | null = null;
  private blessing: BlessingState | null = null;
  private activeMirror: MirrorProp | null = null;
  private livingMusic: Phaser.Sound.BaseSound | null = null;
  private brokenMusic: Phaser.Sound.BaseSound | null = null;
  private echoPresenceAudio: AdjustableSound | null = null;
  private echoHuntAudio: AdjustableSound | null = null;
  private echoPresenceLevel = 0;
  private echoHuntLevel = 0;
  private sceneAudioUnlocked = false;
  private lastVaseImpactAt = 0;
  private lastTableImpactAt = 0;
  private activeNpcVoiceKey: string | null = null;

  private audioCtx: AudioContext | null = null;
  private staticSource: AudioBufferSourceNode | null = null;
  private staticGain: GainNode | null = null;
  private staticPan: StereoPannerNode | null = null;
  private staticFilter: BiquadFilterNode | null = null;

  constructor() {
    super("LevelScene");
  }

  private getLevelIndexFromUrl(): number | null {
    if (typeof window === "undefined") return null;

    const rawLevel = new URLSearchParams(window.location.search).get("level");
    if (!rawLevel) return null;

    const parsedLevel = Number.parseInt(rawLevel, 10);
    if (!Number.isFinite(parsedLevel) || parsedLevel < 1) return null;

    return parsedLevel - 1;
  }

  private get memoryTotal(): number {
    return this.activeLevel.memories.length;
  }

  init(data: { levelIndex?: number } = {}): void {
    const requestedLevel =
      typeof data.levelIndex === "number" ? data.levelIndex : (this.getLevelIndexFromUrl() ?? 0);
    this.levelIndex = Phaser.Math.Clamp(requestedLevel, 0, levels.length - 1);
    this.activeLevel = levels[this.levelIndex];
  }

  preload(): void {
    for (const asset of Object.values(GENERATED_AUDIO)) {
      if (!this.cache.audio.exists(asset.key)) {
        this.load.audio(asset.key, asset.path);
      }
    }

    for (const soul of allSoulProfiles) {
      if (!this.cache.audio.exists(soul.gratitudeAudioKey)) {
        this.load.audio(soul.gratitudeAudioKey, soul.gratitudeAudioPath);
      }
    }

    for (const npc of this.activeLevel.npcs) {
      this.preloadNpcVoice(npc.id, "intro");
      for (const response of npc.responses) {
        this.preloadNpcVoice(npc.id, response.id);
      }
    }
  }

  create(): void {
    this.resetRuntimeState();
    this.noise = new NoiseSystem();
    this.world = new WorldSwitcher(this);

    this.cameras.main.setBackgroundColor(`#${WORLD_BG.living.toString(16).padStart(6, "0")}`);

    this.generateTextures();

    this.walls = this.physics.add.staticGroup();
    this.buildRoom();
    this.spawnDust();
    this.buildVignette();
    this.buildDarkness();

    this.playerShadow = this.add.ellipse(0, 0, 22, 8, 0x000000, 0.45).setDepth(4);
    this.playerHalo = this.add
      .circle(0, 0, 14, 0xffddb0, 0.12)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(71);

    const spawn = this.worldPoint(this.activeLevel.playerSpawn);
    this.player = new Player({
      scene: this,
      x: spawn.x,
      y: spawn.y,
      noise: this.noise,
      surfaceAt: (x, y) => this.surfaceAt(x, y),
      onFootstep: (event) => this.playFootstepSfx(event),
    });
    this.player.sprite.setDepth(5);

    this.physics.add.collider(this.player.sprite, this.walls);

    this.spawnProps();
    this.spawnNpcs();
    this.spawnMemories();
    this.spawnEchoes();
    this.buildHint();
    this.buildMirrorPrompt();
    this.buildSubtitle();
    this.buildNpcDialogue();
    this.initSceneAudio();
    if (!this.sound.locked) {
      void this.ensureAudioReady();
      this.unlockSceneAudio();
    }

    this.input.keyboard!.on("keydown-E", this.handleInteract);
    this.input.keyboard!.on("keydown", this.handleDialogueKey);
    this.input.keyboard!.once("keydown", this.unlockAudio);
    this.input.once("pointerdown", this.unlockAudio);

    this.world.onChange((w) => this.onWorldChanged(w));

    const cam = this.cameras.main;
    cam.setBounds(0, 0, ROOM_W * TILE, ROOM_H * TILE);
    cam.setZoom(1.7);
    cam.startFollow(this.player.sprite, true, 0.1, 0.1);
    cam.fadeIn(900, 0, 0, 0);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupAudio());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.cleanupAudio());

    this.emitMemoryCount();
    this.emitWorldState(this.world.world);
    this.emitLevelTitle(this.activeLevel.title);
    this.setObjective(this.activeLevel.startObjective);
    if (this.activeLevel.introSubtitle) {
      this.time.delayedCall(950, () => {
        if (!this.sys.isActive()) return;
        this.showSubtitle(this.activeLevel.introSubtitle!, 2600);
      });
    }
  }

  override update(time: number): void {
    this.player.update(time);
    for (const echo of this.echoes) {
      echo.update(time);
    }

    const px = this.player.sprite.x;
    const py = this.player.sprite.y;
    const inBroken = this.world.world === "broken";

    this.playerHalo.x = px;
    this.playerHalo.y = py - 4;
    this.playerShadow.x = px;
    this.playerShadow.y = py + 10;
    this.playerShadow.setDepth(this.worldDepth(py + 8, -0.08));
    this.player.sprite.setDepth(this.worldDepth(py + 7, 0.04));
    this.haloMask.x = px;
    this.haloMask.y = py;

    const haloTarget = inBroken ? (this.player.currentState === "sneak" ? 0.05 : 0.08) : 0.14;
    this.playerHalo.alpha += (haloTarget - this.playerHalo.alpha) * 0.08;
    this.playerShadow.scaleX = this.player.currentState === "sneak" ? 0.82 : 1;

    this.updateBlessing(time);
    this.updateMirrorPrompt(time, px, py);
    this.updateMemoryVisibility(px, py);
    this.updateResonances(px, py);
    this.updateEchoAudio(px, py);

    if (!inBroken || this.won) return;

    for (const memory of this.memories) {
      if (memory.collected) continue;
      const d = Phaser.Math.Distance.Between(px, py, memory.memoryX, memory.memoryY);
      if (d < 18) {
        this.collectMemory(memory);
      }
    }

    for (const echo of this.echoes) {
      if (!echo.sprite.visible) continue;
      const d = Phaser.Math.Distance.Between(px, py, echo.sprite.x, echo.sprite.y);
      if (d < 18) {
        this.onCaught();
        break;
      }
    }
  }

  private generateTextures(): void {
    this.makeWoodTexture("tile-wood-living", PALETTE_LIVING.wood);
    this.makeWoodTexture("tile-wood-broken", PALETTE_BROKEN.wood);
    this.makeRugTexture("tile-rug-living", PALETTE_LIVING.rug);
    this.makeRugTexture("tile-rug-broken", PALETTE_BROKEN.rug);
    this.makeStoneTexture("tile-stone-living", PALETTE_LIVING.stone);
    this.makeStoneTexture("tile-stone-broken", PALETTE_BROKEN.stone);
    this.makeGrassTexture("tile-grass-living", PALETTE_LIVING.grass);
    this.makeGrassTexture("tile-grass-broken", PALETTE_BROKEN.grass);
    this.makeWallTexture("tile-wall-living", WALL_PALETTE.living);
    this.makeWallTexture("tile-wall-broken", WALL_PALETTE.broken);
    this.makeVignetteTexture();
    this.makeHaloMaskTexture();
  }

  private makeWoodTexture(key: string, p: SurfacePalette): void {
    const g = this.add.graphics();
    const rng = new Phaser.Math.RandomDataGenerator([key]);
    // Base.
    g.fillStyle(p.base, 1).fillRect(0, 0, TILE, TILE);
    // Two horizontal planks with a thin dark seam between them.
    const seamY = 16;
    g.fillStyle(p.shadow, 0.55).fillRect(0, seamY - 1, TILE, 2);
    g.fillStyle(p.highlight, 0.18).fillRect(0, seamY + 1, TILE, 1);
    g.fillStyle(p.highlight, 0.18).fillRect(0, 0, TILE, 1);
    g.fillStyle(p.shadow, 0.5).fillRect(0, TILE - 1, TILE, 1);
    // Grain streaks per plank.
    for (let plank = 0; plank < 2; plank++) {
      const top = plank === 0 ? 1 : seamY + 1;
      const bottom = plank === 0 ? seamY - 1 : TILE - 1;
      for (let i = 0; i < 6; i++) {
        const y = top + rng.between(1, bottom - top - 1);
        const x = rng.between(0, TILE - 6);
        const len = rng.between(6, 18);
        g.fillStyle(p.shadow, 0.18 + rng.frac() * 0.18);
        g.fillRect(x, y, len, 1);
      }
      // A couple of knots.
      if (rng.frac() > 0.45) {
        const kx = rng.between(4, TILE - 4);
        const ky = top + Math.floor((bottom - top) / 2) + rng.between(-2, 2);
        g.fillStyle(p.shadow, 0.7);
        g.fillCircle(kx, ky, 1.6);
        g.fillStyle(p.shadow, 0.35);
        g.fillCircle(kx, ky, 2.6);
      }
    }
    // Speckle noise.
    for (let i = 0; i < 28; i++) {
      const x = rng.between(0, TILE - 1);
      const y = rng.between(0, TILE - 1);
      g.fillStyle(rng.frac() > 0.5 ? p.highlight : p.shadow, 0.12);
      g.fillRect(x, y, 1, 1);
    }
    g.generateTexture(key, TILE, TILE);
    g.destroy();
  }

  private makeRugTexture(key: string, p: SurfacePalette): void {
    const g = this.add.graphics();
    const rng = new Phaser.Math.RandomDataGenerator([key]);
    g.fillStyle(p.base, 1).fillRect(0, 0, TILE, TILE);
    // Woven warp/weft: alternating tiny squares.
    for (let y = 2; y < TILE - 2; y += 2) {
      for (let x = 2; x < TILE - 2; x += 2) {
        const isWarp = ((x + y) / 2) % 2 === 0;
        g.fillStyle(isWarp ? p.highlight : p.shadow, 0.22);
        g.fillRect(x, y, 1, 1);
      }
    }
    // Diagonal motif strands.
    g.fillStyle(p.highlight, 0.5);
    for (let i = 0; i < TILE; i += 6) {
      g.fillRect(i, (i + 2) % TILE, 2, 1);
      g.fillRect((i + 4) % TILE, (TILE - i - 4 + TILE) % TILE, 2, 1);
    }
    // Border with frayed inner edge.
    g.fillStyle(p.shadow, 0.7);
    g.fillRect(0, 0, TILE, 2);
    g.fillRect(0, TILE - 2, TILE, 2);
    g.fillRect(0, 0, 2, TILE);
    g.fillRect(TILE - 2, 0, 2, TILE);
    g.fillStyle(p.highlight, 0.4);
    g.fillRect(0, 1, TILE, 1);
    g.fillRect(0, TILE - 1, TILE, 1);
    // Small fringe ticks on top/bottom.
    g.fillStyle(p.shadow, 0.6);
    for (let x = 1; x < TILE; x += 3) {
      const off = rng.between(-1, 1);
      g.fillRect(x + off, 0, 1, 1);
      g.fillRect(x + off, TILE - 1, 1, 1);
    }
    g.generateTexture(key, TILE, TILE);
    g.destroy();
  }

  private makeStoneTexture(key: string, p: SurfacePalette): void {
    const g = this.add.graphics();
    const rng = new Phaser.Math.RandomDataGenerator([key]);
    // Mortar background.
    g.fillStyle(p.shadow, 1).fillRect(0, 0, TILE, TILE);
    // Four cobblestones with slight rounded corners and color jitter.
    const cells: Array<{ x: number; y: number; w: number; h: number }> = [
      { x: 1, y: 1, w: 14, h: 14 },
      { x: 17, y: 1, w: 14, h: 14 },
      { x: 1, y: 17, w: 14, h: 14 },
      { x: 17, y: 17, w: 14, h: 14 },
    ];
    for (const c of cells) {
      const tint = Phaser.Display.Color.IntegerToColor(p.base);
      const jitter = rng.between(-12, 12);
      tint.brighten(jitter);
      g.fillStyle(tint.color, 1);
      g.fillRoundedRect(c.x, c.y, c.w, c.h, 2);
      // Top-left highlight bevel.
      g.fillStyle(p.highlight, 0.55);
      g.fillRect(c.x + 1, c.y + 1, c.w - 2, 1);
      g.fillRect(c.x + 1, c.y + 1, 1, c.h - 2);
      // Bottom-right shadow.
      g.fillStyle(p.shadow, 0.55);
      g.fillRect(c.x + 1, c.y + c.h - 1, c.w - 2, 1);
      g.fillRect(c.x + c.w - 1, c.y + 1, 1, c.h - 2);
      // Tiny crack/spot.
      if (rng.frac() > 0.4) {
        const sx = c.x + rng.between(3, c.w - 4);
        const sy = c.y + rng.between(3, c.h - 4);
        g.fillStyle(p.shadow, 0.45);
        g.fillRect(sx, sy, 1 + rng.between(0, 2), 1);
      }
      // Speckle.
      for (let i = 0; i < 6; i++) {
        const sx = c.x + rng.between(2, c.w - 3);
        const sy = c.y + rng.between(2, c.h - 3);
        g.fillStyle(rng.frac() > 0.5 ? p.highlight : p.shadow, 0.18);
        g.fillRect(sx, sy, 1, 1);
      }
    }
    g.generateTexture(key, TILE, TILE);
    g.destroy();
  }

  private makeGrassTexture(key: string, p: SurfacePalette): void {
    const g = this.add.graphics();
    const rng = new Phaser.Math.RandomDataGenerator([key]);
    g.fillStyle(p.base, 1).fillRect(0, 0, TILE, TILE);
    // Subtle dirt patches darker than base.
    for (let i = 0; i < 4; i++) {
      const x = rng.between(2, TILE - 6);
      const y = rng.between(2, TILE - 6);
      g.fillStyle(p.shadow, 0.18);
      g.fillEllipse(x, y, rng.between(4, 8), rng.between(3, 6));
    }
    // Many grass blades, two-tone.
    for (let i = 0; i < 38; i++) {
      const x = rng.between(0, TILE - 1);
      const y = rng.between(0, TILE - 3);
      g.fillStyle(p.highlight, 0.55 + rng.frac() * 0.35);
      g.fillRect(x, y, 1, 2 + rng.between(0, 2));
    }
    for (let i = 0; i < 22; i++) {
      const x = rng.between(0, TILE - 1);
      const y = rng.between(0, TILE - 2);
      g.fillStyle(p.shadow, 0.35);
      g.fillRect(x, y + 1, 1, 2);
    }
    // Occasional tiny flower / pebble.
    if (rng.frac() > 0.5) {
      const fx = rng.between(4, TILE - 4);
      const fy = rng.between(4, TILE - 4);
      g.fillStyle(p.highlight, 0.9);
      g.fillCircle(fx, fy, 1.2);
    }
    g.generateTexture(key, TILE, TILE);
    g.destroy();
  }

  private makeWallTexture(key: string, p: { face: number; top: number; mortar: number }): void {
    const g = this.add.graphics();
    const rng = new Phaser.Math.RandomDataGenerator([key]);
    // Mortar background fills the whole tile.
    g.fillStyle(p.mortar, 1).fillRect(0, 0, TILE, TILE);
    // Three brick rows with offset (running bond).
    const rows = [
      { y: 0, h: 10, offset: 0 },
      { y: 11, h: 10, offset: 16 },
      { y: 22, h: 10, offset: 0 },
    ];
    const faceColor = Phaser.Display.Color.IntegerToColor(p.face);
    for (const row of rows) {
      // Bricks of width 16 with the row offset.
      for (let x = -16 + row.offset; x < TILE; x += 16) {
        const bw = 15;
        const bh = row.h - 1;
        const tint = faceColor.clone();
        tint.brighten(rng.between(-10, 10));
        g.fillStyle(tint.color, 1);
        const drawX = Math.max(0, x);
        const drawW = Math.min(TILE - drawX, x + bw - drawX);
        if (drawW <= 0) continue;
        g.fillRect(drawX, row.y, drawW, bh);
        // Top bevel highlight.
        g.fillStyle(p.top, 0.45);
        g.fillRect(drawX, row.y, drawW, 1);
        // Bottom shadow.
        g.fillStyle(0x000000, 0.3);
        g.fillRect(drawX, row.y + bh - 1, drawW, 1);
        // Speckle / pitting on the brick face.
        for (let i = 0; i < 3; i++) {
          const sx = drawX + rng.between(1, Math.max(1, drawW - 2));
          const sy = row.y + 1 + rng.between(0, bh - 3);
          g.fillStyle(0x000000, 0.18);
          g.fillRect(sx, sy, 1, 1);
        }
      }
    }
    g.generateTexture(key, TILE, TILE);
    g.destroy();
  }

  private makeVignetteTexture(): void {
    if (this.textures.exists("vignette")) return;

    const W = ROOM_W * TILE;
    const H = ROOM_H * TILE;
    const g = this.add.graphics();
    const cx = W / 2;
    const cy = H / 2;
    const maxR = Math.hypot(cx, cy);
    const steps = 28;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = maxR * (0.45 + t * 0.6);
      const alpha = Math.pow(t, 2.4) * 0.95;
      g.fillStyle(0x000000, alpha);
      g.fillCircle(cx, cy, r);
    }
    g.generateTexture("vignette", W, H);
    g.destroy();
  }

  private makeHaloMaskTexture(): void {
    if (this.textures.exists("player-halo-mask")) return;

    const SIZE = 44;
    const tex = this.textures.createCanvas("player-halo-mask", SIZE, SIZE);
    if (!tex) return;
    const ctx = tex.getContext();
    const c = SIZE / 2;
    const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.55, "rgba(255,255,255,0.45)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SIZE, SIZE);
    tex.refresh();
  }

  private buildRoom(): void {
    const room = this.activeLevel.room;
    for (let y = 0; y < ROOM_H; y++) {
      for (let x = 0; x < ROOM_W; x++) {
        const ch = room[y][x];
        const px = x * TILE + TILE / 2;
        const py = y * TILE + TILE / 2;

        if (ch === "W") {
          const img = this.add.image(px, py, "tile-wall-living").setDepth(WALL_FACE_DEPTH);
          const cap = this.add
            .rectangle(px, py - TILE / 2 + 3, TILE, 5, WALL_PALETTE.living.top, 0.95)
            .setDepth(this.worldDepth(py + TILE / 2, 0.08));
          this.wallImages.push({ img, cap });
          const body = this.add.rectangle(px, py, TILE, TILE, 0xffffff, 0).setVisible(false);
          this.physics.add.existing(body, true);
          this.walls.add(body);
          continue;
        }

        const surface = SURFACE_FROM_CHAR[ch];
        const img = this.add.image(px, py, `tile-${surface}-living`).setDepth(0);
        this.tiles.push({ img, surface });
      }
    }
  }

  private buildVignette(): void {
    this.vignette = this.add
      .image((ROOM_W * TILE) / 2, (ROOM_H * TILE) / 2, "vignette")
      .setDepth(50)
      .setAlpha(VIGNETTE_ALPHA.living);
  }

  private buildDarkness(): void {
    this.darkness = this.add
      .rectangle((ROOM_W * TILE) / 2, (ROOM_H * TILE) / 2, ROOM_W * TILE, ROOM_H * TILE, 0x03020a, 0.96)
      .setDepth(70)
      .setVisible(false);

    this.haloMask = this.add.image(0, 0, "player-halo-mask").setVisible(false);
    const mask = this.haloMask.createBitmapMask();
    mask.invertAlpha = true;
    this.darkness.setMask(mask);
  }

  private buildHint(): void {
    this.hintText = this.add
      .text((ROOM_W * TILE) / 2, ROOM_H * TILE - 18, "WASD move    SHIFT quiet steps    E interact", {
        fontFamily: "ui-monospace, Menlo, monospace",
        fontSize: "10px",
        color: "#cfc6b3",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(90)
      .setAlpha(0)
      .setScrollFactor(0);
    this.tweens.add({ targets: this.hintText, alpha: { from: 0, to: 0.85 }, duration: 900, delay: 1000 });
    this.tweens.add({ targets: this.hintText, alpha: 0, duration: 1500, delay: 6500 });
  }

  private buildMirrorPrompt(): void {
    this.mirrorPrompt = this.add.container(0, 0).setDepth(92).setAlpha(0);
    const bg = this.add.rectangle(0, 0, 64, 18, 0x000000, 0.6).setStrokeStyle(1, 0xc8d8e0, 0.7);
    this.mirrorPromptText = this.add
      .text(0, 0, "[ E ]  Cross", {
        fontFamily: "ui-monospace, Menlo, monospace",
        fontSize: "9px",
        color: "#e8e2d5",
      })
      .setOrigin(0.5);
    this.mirrorPrompt.add([bg, this.mirrorPromptText]);
  }

  private buildSubtitle(): void {
    const y = this.scale.height - 38;
    this.subtitleBox = this.add
      .rectangle(this.scale.width / 2, y, this.scale.width * 0.78, 28, 0x05040a, 0)
      .setStrokeStyle(1, 0xe8d2a8, 0)
      .setDepth(96)
      .setScrollFactor(0);
    this.subtitleText = this.add
      .text(this.scale.width / 2, y, "", {
        fontFamily: "Cormorant Garamond, serif",
        fontSize: "17px",
        color: "#f6e7c8",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(97)
      .setScrollFactor(0)
      .setAlpha(0);
  }

  private buildNpcDialogue(): void {
    const panelY = this.scale.height - 108;
    this.dialoguePanel = this.add
      .container(this.scale.width / 2, panelY)
      .setDepth(93)
      .setAlpha(0)
      .setVisible(false)
      .setScrollFactor(0);

    const bg = this.add
      .rectangle(0, 0, this.scale.width * 0.82, 116, 0x05040a, 0.9)
      .setStrokeStyle(1, 0xe8d2a8, 0.34);
    const nameRule = this.add.rectangle(0, -34, this.scale.width * 0.74, 1, 0xe8d2a8, 0.22);
    this.dialogueNameText = this.add
      .text(-this.scale.width * 0.37, -48, "", {
        fontFamily: "Cinzel, serif",
        fontSize: "12px",
        color: "#ffe7c1",
      })
      .setOrigin(0, 0.5);
    this.dialogueLineText = this.add
      .text(-this.scale.width * 0.37, -22, "", {
        fontFamily: "Georgia, serif",
        fontSize: "12px",
        color: "#efe5d6",
        wordWrap: { width: this.scale.width * 0.74 },
        lineSpacing: 4,
      })
      .setOrigin(0, 0);

    this.dialogueChoiceTexts = [0, 1, 2].map((index) =>
      this.add
        .text(-this.scale.width * 0.36, 30 + index * 18, "", {
          fontFamily: "ui-monospace, Menlo, monospace",
          fontSize: "10px",
          color: "#d8d0c2",
        })
        .setOrigin(0, 0.5)
    );

    this.dialoguePanel.add([
      bg,
      nameRule,
      this.dialogueNameText,
      this.dialogueLineText,
      ...this.dialogueChoiceTexts,
    ]);
  }

  private showSubtitle(text: string, duration = 2600): void {
    this.subtitleText.setText(text);
    this.tweens.killTweensOf([this.subtitleBox, this.subtitleText]);
    this.subtitleHide?.remove(false);
    this.subtitleBox.setAlpha(0.68);
    this.subtitleBox.setStrokeStyle(1, 0xe8d2a8, 0.45);
    this.subtitleText.setAlpha(1);
    this.subtitleHide = this.time.delayedCall(duration, () => {
      this.tweens.add({ targets: [this.subtitleBox, this.subtitleText], alpha: 0, duration: 500 });
    });
  }

  private openNpcDialogue(npc: NpcRuntime): void {
    if (this.dialogueNpc || this.world.world !== "living" || this.won) return;

    void this.ensureAudioReady();
    this.unlockSceneAudio();

    this.dialogueNpc = npc;
    this.player.setControlEnabled(false);
    this.dialogueNameText.setText(`${npc.definition.name}  -  ${npc.definition.title}`);
    this.dialogueLineText.setText(npc.definition.introLine);

    npc.definition.responses.forEach((response, index) => {
      const text = this.dialogueChoiceTexts[index];
      text.setText(`[${index + 1}] ${response.text}`).setAlpha(1).setVisible(true);
    });

    this.dialoguePanel.setVisible(true);
    this.tweens.killTweensOf(this.dialoguePanel);
    this.tweens.add({ targets: this.dialoguePanel, alpha: 1, duration: 160 });
    this.playNpcVoice(npc.definition.id, "intro");
  }

  private closeNpcDialogue(): void {
    if (!this.dialogueNpc) return;

    this.dialogueNpc = null;
    this.player.setControlEnabled(true);
    this.tweens.killTweensOf(this.dialoguePanel);
    this.tweens.add({
      targets: this.dialoguePanel,
      alpha: 0,
      duration: 140,
      onComplete: () => this.dialoguePanel.setVisible(false),
    });
  }

  private chooseNpcResponse(index: number): void {
    const npc = this.dialogueNpc;
    if (!npc) return;

    const response = npc.definition.responses[index];
    if (!response) return;

    this.dialogueLineText.setText(response.reply);
    this.playNpcVoice(npc.definition.id, response.id);
    for (const choice of this.dialogueChoiceTexts) {
      choice.setAlpha(0.28);
    }

    if (response.grantsBlessing && !npc.blessingGiven) {
      npc.blessingGiven = true;
      npc.resolved = true;
      this.grantBlessing(npc);
    }

    this.time.delayedCall(response.grantsBlessing ? 1800 : 1450, () => {
      if (!this.sys.isActive()) return;
      if (this.dialogueNpc === npc) {
        this.closeNpcDialogue();
      }
    });
  }

  private grantBlessing(npc: NpcRuntime): void {
    const def = npc.definition;
    const cosmeticOnly = def.blessingType === "falseGrace";
    this.blessing = {
      type: def.blessingType,
      label: def.blessingLabel,
      subtitle: def.blessingSubtitle,
      auraColor: def.auraColor ?? 0xffd49a,
      expiresAt: this.time.now + def.blessingDurationMs,
      cosmeticOnly,
    };

    this.emitBlessingState({
      label: def.blessingLabel,
      subtitle: def.blessingSubtitle,
      cosmeticOnly,
    });

    this.showSubtitle(def.blessingSubtitle, 3400);
    if (def.blessingType === "slowEchoes") {
      this.setObjective("Amalia's warmth lingers. Cross now while the Echoes still drift more slowly.");
    } else if (def.blessingType === "quietFootsteps") {
      this.setObjective("Mr. Vale stilled your steps. Cross now while the hall still forgets your footfalls.");
    } else {
      this.setObjective("The courtier's favor glitters around you. If you trust it, step through.");
    }
  }

  private updateBlessing(time: number): void {
    if (this.blessing && time >= this.blessing.expiresAt) {
      const fading = this.blessing;
      this.blessing = null;
      this.emitBlessingState(null);
      this.showSubtitle(`${fading.label} fades.`, 2200);
      if (this.world.world === "broken") {
        this.setObjective(
          this.collectedCount >= this.memoryTotal
            ? "All memories gathered. Follow the gold EXIT mirror and return to Living."
            : "Broken World: stay quiet and follow the static to each dim soul."
        );
      } else {
        this.setObjective(
          this.collectedCount === 0
            ? this.activeLevel.startObjective
            : this.collectedCount >= this.memoryTotal
            ? "All memories returned. Stand at the gold EXIT mirror and press E to leave."
            : `${this.collectedCount}/${this.memoryTotal} memories returned. Listen for the next static fracture.`
        );
      }
    }

    const blessing = this.blessing;
    const inBroken = this.world.world === "broken";
    this.player.setNoiseMultiplier(blessing?.type === "quietFootsteps" ? 0.48 : 1);

    const echoSpeedMultiplier = blessing?.type === "slowEchoes" && inBroken ? 0.76 : 1;
    for (const echo of this.echoes) {
      echo.setSpeedMultiplier(echoSpeedMultiplier);
    }

    if (!blessing) return;

    this.playerHalo.fillColor = blessing.auraColor;
    this.playerHalo.alpha = Math.max(this.playerHalo.alpha, inBroken ? 0.12 : 0.18);
  }

  private resetRuntimeState(): void {
    this.currentObjective = "";
    this.collectedCount = 0;
    this.won = false;
    this.sprinterSpawned = false;
    this.brokenHintShown = false;
    this.mirrorFlareHintShown = false;
    this.activeNpc = null;
    this.dialogueNpc = null;
    this.blessing = null;
    this.activeMirror = null;
    this.lastVaseImpactAt = 0;
    this.lastTableImpactAt = 0;
    this.tiles = [];
    this.wallImages = [];
    this.props = [];
    this.mirrors = [];
    this.npcs = [];
    this.echoes = [];
    this.memories = [];
    this.collectedMemories = [];
    this.subtitleHide?.remove(false);
    this.subtitleHide = null;
    this.emitBlessingState(null);
    this.emitEndingState(null);
  }

  private emitMemoryCount(): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent<MemoryProgressDetail>("hushfall:memories", {
          detail: {
            collected: this.collectedCount,
            total: this.memoryTotal,
          },
        })
      );
    }
  }

  private emitWorldState(world: World): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent<World>("hushfall:world", { detail: world }));
    }
  }

  private emitLevelTitle(title: string): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent<string>("hushfall:level-title", { detail: title }));
    }
  }

  private emitBlessingState(detail: BlessingHudDetail | null): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent<BlessingHudDetail | null>("hushfall:blessing", {
          detail,
        })
      );
    }
  }

  private emitEndingState(detail: EndingHudDetail | null): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent<EndingHudDetail | null>("hushfall:ending", {
          detail,
        })
      );
    }
  }

  private setObjective(text: string): void {
    if (this.currentObjective === text) return;
    this.currentObjective = text;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent<string>("hushfall:objective", { detail: text }));
    }
  }

  private spawnProps(): void {
    let exitMirror: MirrorProp | null = null;
    for (const mirror of this.activeLevel.mirrors) {
      const pos = this.worldPoint(mirror);
      const created = this.makeMirror(pos.x, pos.y, mirror.mode);
      if (mirror.mode === "exit") {
        exitMirror = created;
      }
      this.mirrors.push(created);
    }

    if (!exitMirror) {
      throw new Error(`Level ${this.activeLevel.id} is missing an exit mirror.`);
    }

    this.exitMirror = exitMirror;

    for (const table of this.activeLevel.tables) {
      const pos = this.worldPoint(table);
      this.makeTable(pos.x, pos.y);
    }
    for (const vase of this.activeLevel.vases) {
      const pos = this.worldPoint(vase);
      this.makeVase(pos.x, pos.y);
    }
    this.updateExitMirrorState();

    this.physics.add.collider(
      this.player.sprite,
      this.props.map((p) => p.hit),
      (_player, hit) => {
        const prop = this.props.find((p) => p.hit === hit);
        if (!prop || prop.kind === "mirror") return;
        const speed = this.player.body.velocity.length() ?? 0;
        if (speed > 24) {
          if (prop.kind === "vase" && this.time.now - this.lastVaseImpactAt > 160) {
            this.lastVaseImpactAt = this.time.now;
            this.playSceneSfx(GENERATED_AUDIO.vaseShatter.key, { volume: 0.46 });
          } else if (prop.kind === "table" && this.time.now - this.lastTableImpactAt > 320) {
            this.lastTableImpactAt = this.time.now;
            this.playSceneSfx(GENERATED_AUDIO.tableBump.key, { volume: 1 });
          }
          this.player.bump(prop.kind === "vase" ? 1 : 0.85, prop.kind === "vase" ? 300 : 260);
          this.shakeProp(prop.body);
        }
      }
    );
  }

  private spawnNpcs(): void {
    for (const def of this.activeLevel.npcs) {
      const pos = this.worldPoint(def);
      this.npcs.push(this.makeNpc(pos.x, pos.y, def));
    }
  }

  private makeNpc(x: number, y: number, def: LevelNpcDefinition): NpcRuntime {
    const c = this.add.container(x, y).setDepth(this.worldDepth(y + 8, 0.03));
    const auraColor = def.auraColor ?? 0xffd49a;

    const halo = this.add
      .circle(0, -3, 18, auraColor, 0.12)
      .setBlendMode(Phaser.BlendModes.ADD);
    const shadow = this.add.ellipse(0, 11, 20, 6, 0x000000, 0.36);
    const body = this.add.graphics();
    body.fillStyle(def.blessingType === "falseGrace" ? 0x2d2836 : 0x1b1723, 1);
    body.lineStyle(1, 0x05050a, 0.9);
    body.fillRoundedRect(-8, -2, 16, 16, 5);
    body.strokeRoundedRect(-8, -2, 16, 16, 5);
    body.fillStyle(def.blessingType === "falseGrace" ? 0xcfd9ef : 0xe3d7c5, 1);
    body.fillCircle(0, -5, 5.5);

    const accent = this.add.graphics();
    if (def.blessingType === "slowEchoes") {
      accent.fillStyle(0x97b55a, 0.85);
      accent.fillCircle(6, 2, 2.2);
      accent.fillCircle(8, 0, 2);
      accent.fillStyle(0xd9a3ba, 0.9);
      accent.fillCircle(4, -1, 1.5);
      accent.fillCircle(7, -3, 1.4);
      accent.fillStyle(0x6f8a45, 0.9);
      accent.fillRect(5, -1, 1, 8);
    } else if (def.blessingType === "quietFootsteps") {
      accent.fillStyle(0x90b3ac, 0.95);
      accent.fillRect(6, -4, 2, 10);
      accent.fillCircle(7, -6, 1.8);
      accent.fillStyle(0xc8d8d2, 0.8);
      accent.fillRect(-1, 3, 3, 5);
    } else {
      accent.fillStyle(0xdce4ff, 0.95);
      accent.fillRect(-6, -1, 12, 2);
      accent.fillStyle(0xf5f7ff, 0.8);
      accent.fillTriangle(0, -12, -2, -6, 2, -6);
    }

    c.add([halo, shadow, body, accent]);

    this.tweens.add({
      targets: halo,
      alpha: { from: 0.08, to: 0.22 },
      scale: { from: 0.92, to: 1.14 },
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
    this.tweens.add({
      targets: c,
      y: { from: y, to: y - 2 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });

    return {
      definition: def,
      body: c,
      halo,
      resolved: false,
      blessingGiven: false,
    };
  }

  private addPropHit(
    x: number,
    y: number,
    w: number,
    h: number,
    kind: PropKind,
    body: Phaser.GameObjects.Container,
    offsetY = 0
  ): Prop {
    body.setDepth(this.worldDepth(y + h / 2 + offsetY, 0.04));
    const hit = this.add.rectangle(x, y + offsetY, w, h, 0xff0000, 0).setVisible(false);
    this.physics.add.existing(hit, true);
    const prop: Prop = { body, hit, kind };
    this.props.push(prop);
    return prop;
  }

  private worldDepth(y: number, bias = 0): number {
    return y / 10 + bias;
  }

  private worldPoint(point: LevelGridPoint): { x: number; y: number } {
    return {
      x: point.x * TILE + TILE / 2,
      y: point.y * TILE + TILE / 2,
    };
  }

  private isWalkableTile(tx: number, ty: number): boolean {
    return this.activeLevel.room[ty]?.[tx] !== undefined && this.activeLevel.room[ty][tx] !== "W";
  }

  private makeMirror(x: number, y: number, mode: MirrorMode): MirrorProp {
    const c = this.add.container(x, y);
    const isExit = mode === "exit";
    const frameOuter = isExit ? 0x4a3a1f : 0x3a2f1f;
    const frameMid = isExit ? 0xd9b46a : 0xb89466;
    const frameHi = isExit ? 0xfde7a8 : 0xe6c79a;
    const glassTop = isExit ? 0xb8c6dc : 0x8aa7ad;
    const glassBot = isExit ? 0x5d6f8a : 0x3f5860;
    const glintColor = isExit ? 0xfff0c0 : 0xdfeef2;

    // Drop shadow on the floor.
    c.add(this.add.ellipse(0, 16, 30, 7, 0x000000, 0.45));

    // Outer carved frame (dark wood) with a subtle bevel.
    const outerFrame = this.add.graphics();
    outerFrame.fillStyle(frameOuter, 1);
    outerFrame.lineStyle(1, 0x000000, 0.7);
    outerFrame.fillRoundedRect(-12, -17, 24, 34, 4);
    outerFrame.strokeRoundedRect(-12, -17, 24, 34, 4);
    c.add(outerFrame);

    // Inner gilded band (mid).
    const midFrame = this.add.graphics();
    midFrame.fillStyle(frameMid, 1);
    midFrame.fillRoundedRect(-10, -15, 20, 30, 3);
    // Thin bright bevel on top-left of the gilded band.
    midFrame.fillStyle(frameHi, 0.7);
    midFrame.fillRoundedRect(-10, -15, 20, 2, 1);
    midFrame.fillRect(-10, -15, 1.5, 30);
    c.add(midFrame);

    // Glass: vertical gradient via two stacked rectangles.
    const glassUpper = this.add.rectangle(0, -5, 14, 12, glassTop);
    const glassLower = this.add.rectangle(0, 6, 14, 11, glassBot);
    c.add(glassUpper);
    c.add(glassLower);
    // Diagonal sheen on the glass.
    const sheen = this.add.graphics();
    sheen.fillStyle(0xffffff, isExit ? 0.18 : 0.12);
    sheen.fillTriangle(-7, -11, -2, -11, -7, -1);
    sheen.fillStyle(0xffffff, isExit ? 0.1 : 0.07);
    sheen.fillTriangle(2, 4, 7, 4, 7, 11);
    c.add(sheen);

    // Tiny ornamental nails at the four corners of the gilded band.
    c.add(this.add.circle(-7, -12, 1.4, frameHi));
    c.add(this.add.circle(7, -12, 1.4, frameHi));
    c.add(this.add.circle(-7, 12, 1.4, frameHi));
    c.add(this.add.circle(7, 12, 1.4, frameHi));

    // Crown ornament on top (small flourish).
    const crown = this.add.graphics();
    crown.fillStyle(frameMid, 1);
    crown.lineStyle(1, frameOuter, 0.8);
    crown.fillTriangle(-4, -17, 4, -17, 0, -22);
    crown.strokeTriangle(-4, -17, 4, -17, 0, -22);
    crown.fillStyle(frameHi, 1);
    crown.fillCircle(0, -23, 1.6);
    c.add(crown);

    // Single sparkling glint on the glass.
    const glint = this.add.circle(-3, -7, 1.2, glintColor, 0.95).setBlendMode(Phaser.BlendModes.ADD);
    c.add(glint);
    this.tweens.add({
      targets: glint,
      alpha: { from: 0.4, to: 1 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });

    const base = this.addPropHit(x, y, 24, 34, "mirror", c);
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    const sensors = [
      { dx: 0, dy: -24, w: 28, h: 16, tx: 0, ty: -1 },
      { dx: 0, dy: 24, w: 28, h: 16, tx: 0, ty: 1 },
      { dx: -24, dy: 0, w: 16, h: 28, tx: -1, ty: 0 },
      { dx: 24, dy: 0, w: 16, h: 28, tx: 1, ty: 0 },
    ]
      .filter((sensor) => this.isWalkableTile(tx + sensor.tx, ty + sensor.ty))
      .map((sensor) => {
        const zone = this.add
          .rectangle(x + sensor.dx, y + sensor.dy, sensor.w, sensor.h, 0x00ffcc, 0)
          .setVisible(false);
        this.physics.add.existing(zone, true);
        return zone;
      });
    const glowColor = mode === "exit" ? 0xe9cf9e : 0xc8d8e0;
    const glow = this.add.circle(x, y, mode === "exit" ? 24 : 20, glowColor, mode === "exit" ? 0.14 : 0.24)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(74);
    const aura = this.add.circle(x, y, mode === "exit" ? 64 : 52, glowColor, mode === "exit" ? 0.08 : 0.1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(73);
    let marker: Phaser.GameObjects.Container | null = null;
    if (mode === "exit") {
      const markerGlow = this.add.circle(0, 0, 20, 0xffd49a, 0.16).setBlendMode(Phaser.BlendModes.ADD);
      const markerBadge = this.add
        .rectangle(0, 0, 56, 18, 0x120c09, 0.76)
        .setStrokeStyle(1, 0xe9cf9e, 0.42);
      const markerText = this.add
        .text(0, -1, "EXIT", {
          fontFamily: "Cinzel, serif",
          fontSize: "10px",
          color: "#fff2cf",
        })
        .setOrigin(0.5);
      const markerTip = this.add.triangle(0, 12, 0, 6, -5, 0, 5, 0, 0xffd49a, 0.9);
      marker = this.add.container(x, y - 42, [markerGlow, markerBadge, markerText, markerTip]).setDepth(76);
      marker.setVisible(false).setAlpha(0);
      this.tweens.add({
        targets: markerGlow,
        alpha: { from: 0.1, to: 0.28 },
        scale: { from: 0.92, to: 1.18 },
        duration: 1600,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });
    }
    this.tweens.add({
      targets: [glow, aura],
      alpha: { from: mode === "exit" ? 0.08 : 0.14, to: mode === "exit" ? 0.24 : 0.34 },
      scale: { from: 0.92, to: 1.22 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });

    return {
      ...base,
      mode,
      glow,
      aura,
      sensors,
      marker,
      lastFlareAt: Number.NEGATIVE_INFINITY,
    };
  }

  private makeTable(x: number, y: number): Prop {
    const c = this.add.container(x, y);
    // Floor shadow.
    c.add(this.add.ellipse(0, 14, 36, 7, 0x000000, 0.45));
    // Legs (front pair brighter than back to suggest light direction).
    c.add(this.add.rectangle(-12, 9, 3, 9, 0x382214));
    c.add(this.add.rectangle(12, 9, 3, 9, 0x382214));
    c.add(this.add.rectangle(-11, 9, 1, 9, 0x5a3a1f, 0.7));
    c.add(this.add.rectangle(11, 9, 1, 9, 0x5a3a1f, 0.7));
    // Apron under the top.
    c.add(this.add.rectangle(0, 6, 28, 4, 0x4a3220).setStrokeStyle(1, 0x1f140a, 0.8));
    // Tabletop with two grain rectangles for texture.
    const top = this.add.graphics();
    top.fillStyle(0x8a5e36, 1);
    top.lineStyle(1, 0x1f140a, 0.85);
    top.fillRoundedRect(-15, -6, 30, 10, 2);
    top.strokeRoundedRect(-15, -6, 30, 10, 2);
    // Wood grain streaks.
    top.fillStyle(0x6f4a2a, 0.6);
    top.fillRect(-13, -3, 26, 1);
    top.fillRect(-13, 0, 26, 1);
    // Top edge highlight.
    top.fillStyle(0xc09064, 0.8);
    top.fillRect(-14, -6, 28, 1.2);
    c.add(top);
    return this.addPropHit(x, y, 32, 22, "table", c, 3);
  }

  private makeVase(x: number, y: number): Prop {
    const c = this.add.container(x, y);
    // Floor shadow.
    c.add(this.add.ellipse(0, 11, 20, 5, 0x000000, 0.45));
    // Body of the vase: bulb shape using two ellipses.
    const body = this.add.graphics();
    body.fillStyle(0xc97b4a, 1);
    body.lineStyle(1, 0x4a2208, 0.85);
    body.fillEllipse(0, 4, 18, 18);
    body.strokeEllipse(0, 4, 18, 18);
    // Neck taper.
    body.fillStyle(0xb2683a, 1);
    body.fillEllipse(0, -7, 10, 6);
    body.strokeEllipse(0, -7, 10, 6);
    // Rim lip.
    body.fillStyle(0xe09a64, 1);
    body.fillEllipse(0, -10, 12, 3.5);
    body.strokeEllipse(0, -10, 12, 3.5);
    // Decorative band around the belly.
    body.lineStyle(1, 0x4a2208, 0.9);
    body.strokeEllipse(0, 4, 18, 6);
    body.fillStyle(0x7a3d18, 0.55);
    body.fillRect(-9, 2, 18, 4);
    c.add(body);
    // Glossy highlight on the left shoulder.
    const gloss = this.add.graphics();
    gloss.fillStyle(0xffffff, 0.28);
    gloss.fillEllipse(-4, -1, 3, 9);
    gloss.fillStyle(0xffffff, 0.18);
    gloss.fillEllipse(-3, 5, 2.2, 5);
    c.add(gloss);
    return this.addPropHit(x, y, 18, 22, "vase", c, 0);
  }

  private shakeProp(body: Phaser.GameObjects.Container): void {
    const ox = body.x;
    this.tweens.add({
      targets: body,
      x: { from: ox - 1, to: ox + 1 },
      yoyo: true,
      duration: 60,
      repeat: 2,
      onComplete: () => body.setX(ox),
    });
  }

  private spawnMemories(): void {
    for (const def of this.activeLevel.memories) {
      const pos = this.worldPoint(def);
      const sprite = this.add.container(pos.x, pos.y).setDepth(76).setVisible(false).setAlpha(0.05);
      const aura = this.add.circle(0, 0, 11, 0xffd59b, 0.2).setBlendMode(Phaser.BlendModes.ADD);
      const core = this.add.circle(0, 0, 3, 0xfff1cf, 1).setBlendMode(Phaser.BlendModes.ADD);
      const ring = this.add.circle(0, 0, 6, 0xffffff, 0).setStrokeStyle(1, 0xffefc1, 0.75);
      sprite.add([aura, ring, core]);
      this.tweens.add({
        targets: aura,
        scale: { from: 0.8, to: 1.35 },
        alpha: { from: 0.16, to: 0.42 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });
      this.tweens.add({
        targets: sprite,
        y: pos.y - 3,
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });
      this.memories.push({ id: def.id, memoryX: pos.x, memoryY: pos.y, sprite, collected: false });
    }
  }

  private createEcho(def: LevelEchoDefinition): Echo {
    return new Echo({
      scene: this,
      noise: this.noise,
      patrol: def.patrol.map((point) => this.worldPoint(point)),
      walls: this.walls,
      patrolSpeed: def.patrolSpeed,
      chaseSpeed: def.chaseSpeed,
      hearingRadius: def.hearingRadius,
      auraColor: def.auraColor,
      eyeColor: def.eyeColor,
    });
  }

  private spawnEchoes(): void {
    for (const def of this.activeLevel.echoes) {
      const echo = this.createEcho(def);
      echo.sprite.setDepth(75);
      echo.setVisible(false);
      this.echoes.push(echo);
    }
  }

  private spawnSprinter(): void {
    if (this.sprinterSpawned) return;
    this.sprinterSpawned = true;
    const sprinter = this.createEcho(this.activeLevel.sprinter);
    sprinter.sprite.setDepth(75);
    sprinter.setVisible(this.world.world === "broken");
    this.echoes.push(sprinter);
    this.playSceneSfx(GENERATED_AUDIO.echoAlert.key, { volume: 0.52 });
    this.noise.emitNoise({
      x: this.player.sprite.x,
      y: this.player.sprite.y,
      radius: 360,
      intensity: 1,
      source: "voice",
    });
    this.showSubtitle("A sharper Echo wakes.", 2200);
  }

  private onCaught(): void {
    if (this.world.world !== "broken") return;
    this.playSceneSfx(GENERATED_AUDIO.echoAlert.key, { volume: 0.4 });
    const cam = this.cameras.main;
    cam.flash(240, 220, 36, 64);
    cam.shake(260, 0.012);
    const lostMemory = this.loseLatestMemory();
    if (lostMemory) {
      this.playSceneSfx(GENERATED_AUDIO.memoryLost.key, {
        volume: 0.74,
      });
    }
    this.showSubtitle(
      lostMemory
        ? "An Echo tears one memory loose and spits you back into warmth."
        : "The room spits you back into warmth.",
      2200
    );
    this.world.set("living");
    const spawn = this.worldPoint(this.activeLevel.playerSpawn);
    this.player.sprite.setPosition(spawn.x, spawn.y);
  }

  private collectMemory(memory: LostMemory): void {
    if (memory.collected) return;
    memory.collected = true;
    this.collectedCount += 1;
    this.collectedMemories.push(memory);
    this.emitMemoryCount();
    this.playSceneSfx(GENERATED_AUDIO.memoryReturn.key, { volume: 0.44 });
    this.playSoulRelease(memory.id);
    this.cameras.main.flash(180, 255, 226, 160);
    const releaseRadius = this.activeLevel.id === "listening-hall" ? 280 : 320;
    const releaseIntensity = this.activeLevel.id === "listening-hall" ? 0.82 : 0.95;
    this.noise.emitNoise({
      x: memory.memoryX,
      y: memory.memoryY,
      radius: releaseRadius,
      intensity: releaseIntensity,
      source: "voice",
    });
    this.tweens.add({
      targets: memory.sprite,
      scale: 2.2,
      alpha: 0,
      duration: 320,
      ease: "Cubic.Out",
      onComplete: () => {
        memory.sprite.setVisible(false);
        memory.sprite.setScale(1);
        memory.sprite.setAlpha(0.05);
        memory.sprite.setPosition(memory.memoryX, memory.memoryY);
      },
    });

    if (this.collectedCount >= this.memoryTotal) {
      this.spawnSprinter();
      this.updateExitMirrorState();
      this.playSceneSfx(GENERATED_AUDIO.exitAwaken.key, { volume: 0.58 });
      this.setObjective("All memories gathered. The gold EXIT mirror is awake. Cross it once, then press E again in Living to leave.");
      this.time.delayedCall(2400, () => {
        if (!this.sys.isActive()) return;
        this.showSubtitle("Follow the gold EXIT mirror. Return once, then leave.", 3200);
      });
      return;
    }

    this.setObjective(`${this.collectedCount}/${this.memoryTotal} memories returned. Follow another fracture.`);
  }

  private loseLatestMemory(): LostMemory | null {
    const memory = this.collectedMemories.pop() ?? null;
    if (!memory || !memory.collected) return null;

    memory.collected = false;
    this.collectedCount = Math.max(0, this.collectedCount - 1);
    memory.sprite.setScale(1);
    memory.sprite.setAlpha(0.05);
    memory.sprite.setPosition(memory.memoryX, memory.memoryY);
    memory.sprite.setVisible(false);

    this.emitMemoryCount();
    this.updateExitMirrorState();
    this.setObjective(
      this.collectedCount === 0
        ? this.activeLevel.startObjective
        : `${this.collectedCount}/${this.memoryTotal} memories returned. Listen for the next static fracture.`
    );

    return memory;
  }

  private triggerMirrorFlare(mirror: MirrorProp): void {
    if (this.world.world !== "broken" || this.won) return;
    if (this.time.now - mirror.lastFlareAt < MIRROR_FLARE_COOLDOWN_MS) return;

    const nearbyEchoes = this.echoes.filter(
      (echo) =>
        echo.sprite.visible &&
        Phaser.Math.Distance.Between(
          echo.sprite.x,
          echo.sprite.y,
          mirror.body.x,
          mirror.body.y
        ) <= MIRROR_FLARE_ECHO_RADIUS
    );

    if (nearbyEchoes.length === 0) return;

    mirror.lastFlareAt = this.time.now;
    this.playSceneSfx(GENERATED_AUDIO.exitAwaken.key, {
      volume: 0.2,
      rate: 1.08,
      detune: 180,
    });

    this.tweens.killTweensOf([mirror.glow, mirror.aura]);
    mirror.glow.setScale(1.04);
    mirror.aura.setScale(1.02);
    this.tweens.add({
      targets: mirror.glow,
      scale: 1.48,
      alpha: { from: 0.46, to: 0.18 },
      duration: 340,
      yoyo: true,
      ease: "Sine.Out",
    });
    this.tweens.add({
      targets: mirror.aura,
      scale: 1.28,
      alpha: { from: 0.2, to: 0.08 },
      duration: 420,
      yoyo: true,
      ease: "Sine.Out",
    });

    for (const echo of nearbyEchoes) {
      echo.divertFrom(
        mirror.body.x,
        mirror.body.y,
        MIRROR_FLARE_PUSH_DISTANCE + Phaser.Math.Between(-16, 18)
      );
    }

    if (!this.mirrorFlareHintShown) {
      this.mirrorFlareHintShown = true;
      this.showSubtitle("The mirror stings nearby Echoes away from the glass.", 2200);
    }
  }

  private onWin(): void {
    if (this.won) return;
    this.won = true;
    this.stopStaticAudio();
    this.fadeOutSceneMusic();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    const cam = this.cameras.main;
    cam.flash(800, 255, 245, 220);
    this.playSceneSfx(GENERATED_AUDIO.victoryRelease.key, { volume: 0.72 });
    const nextLevel = levels[this.levelIndex + 1];
    if (nextLevel) {
      this.setObjective(this.activeLevel.nextLevelObjective ?? `${this.activeLevel.title} yields, but another room still listens.`);
      this.showSubtitle(this.activeLevel.nextLevelSubtitle ?? `${nextLevel.title} waits deeper in the house.`, 2400);
      this.time.delayedCall(1800, () => {
        if (!this.sys.isActive()) return;
        this.scene.restart({ levelIndex: this.levelIndex + 1 });
      });
      return;
    }

    this.setObjective("You freed the lost ones. The room softens.");
    this.emitEndingState({
      kicker: "The house releases its breath",
      title: `${this.activeLevel.title} falls silent`,
      body:
        "The last trapped voices rise through the glass and the old corridors finally stop listening for grief.",
      epilogue:
        "Warmth returns to the frames, the walls forget their hunger, and the Finder is left with a room that can mourn without swallowing anyone else.",
      prompt: "Press R to begin again",
      releasedCount: this.memoryTotal,
    });

    this.input.keyboard!.once("keydown-R", () => this.scene.restart({ levelIndex: 0 }));
  }

  private spawnDust(): void {
    if (!this.textures.exists("dust-px")) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 2);
      g.generateTexture("dust-px", 2, 2);
      g.destroy();
    }

    this.dust = this.add.particles(0, 0, "dust-px", {
      x: { min: 0, max: ROOM_W * TILE },
      y: { min: 0, max: ROOM_H * TILE },
      lifespan: 6000,
      speedY: { min: -6, max: -2 },
      speedX: { min: -4, max: 4 },
      scale: { start: 1, end: 0.4 },
      alpha: { start: 0.18, end: 0 },
      tint: 0xffe9c8,
      frequency: 220,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.dust.setDepth(20);
  }

  private updateMirrorPrompt(time: number, px: number, py: number): void {
    let bestNpc: NpcRuntime | null = null;
    let bestNpcDist = Number.POSITIVE_INFINITY;
    if (this.world.world === "living" && !this.dialogueNpc) {
      for (const npc of this.npcs) {
        if (npc.resolved || !npc.body.visible) continue;
        const d = Phaser.Math.Distance.Between(px, py, npc.body.x, npc.body.y);
        if (d < 30 && d < bestNpcDist) {
          bestNpc = npc;
          bestNpcDist = d;
        }
      }
    }

    let best: MirrorProp | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const mirror of this.mirrors) {
      if (!mirror.sensors.some((sensor) => this.physics.overlap(this.player.sprite, sensor))) {
        continue;
      }

      const d = Phaser.Math.Distance.Between(px, py, mirror.body.x, mirror.body.y);
      if (d < bestDist) {
        best = mirror;
        bestDist = d;
      }
    }
    this.activeNpc = bestNpc;
    this.activeMirror = bestNpcDist <= bestDist ? null : best;
    const visible = (this.activeNpc || this.activeMirror) && !this.won && !this.dialogueNpc;
    const targetAlpha = visible ? 1 : 0;
    this.mirrorPrompt.alpha += (targetAlpha - this.mirrorPrompt.alpha) * 0.15;
    if (this.activeNpc) {
      this.mirrorPrompt.x = this.activeNpc.body.x;
      this.mirrorPrompt.y = this.activeNpc.body.y - 26 + Math.sin(time * 0.004) * 2;
      this.mirrorPromptText.setText("[ E ]  Speak");
      return;
    }
    if (!this.activeMirror) return;
    if (this.world.world === "broken") {
      this.triggerMirrorFlare(this.activeMirror);
    }
    this.mirrorPrompt.x = this.activeMirror.body.x;
    this.mirrorPrompt.y = this.activeMirror.body.y - 26 + Math.sin(time * 0.004) * 2;
    const label =
      this.activeMirror.mode === "exit" && this.collectedCount >= this.memoryTotal
        ? this.world.world === "living"
          ? "[ E ]  Leave"
          : "[ E ]  Return"
        : "[ E ]  Cross";
    this.mirrorPromptText.setText(label);
  }

  private updateMemoryVisibility(px: number, py: number): void {
    const inBroken = this.world.world === "broken";
    for (const memory of this.memories) {
      if (memory.collected) continue;
      memory.sprite.setVisible(inBroken);
      if (!inBroken) continue;
      const d = Phaser.Math.Distance.Between(px, py, memory.memoryX, memory.memoryY);
      const t = Phaser.Math.Clamp(1 - d / MEMORY_GLOW_RANGE, 0, 1);
      memory.sprite.setAlpha(0.03 + t * 0.22);
      memory.sprite.setScale(0.9 + t * 0.14);
    }
  }

  private updateResonances(px: number, py: number): void {
    const target = this.findNearestMemory(px, py, STATIC_RANGE);
    this.updateStaticAudio(target, px, this.world.world === "broken");
  }

  private findNearestMemory(px: number, py: number, range: number): LostMemory | null {
    let best: LostMemory | null = null;
    let bestDist = range;
    for (const memory of this.memories) {
      if (memory.collected) continue;
      const d = Phaser.Math.Distance.Between(px, py, memory.memoryX, memory.memoryY);
      if (d < bestDist) {
        best = memory;
        bestDist = d;
      }
    }
    return best;
  }

  private updateExitMirrorState(): void {
    const active = this.collectedCount >= this.memoryTotal;
    this.exitMirror.glow.fillColor = active ? 0xffd49a : 0x8f6d54;
    this.exitMirror.aura.fillColor = active ? 0xffd49a : 0x5b4332;
    if (this.exitMirror.marker) {
      this.tweens.killTweensOf(this.exitMirror.marker);
      if (active) {
        this.exitMirror.marker.setVisible(true).setAlpha(0).setScale(0.94);
        this.tweens.add({
          targets: this.exitMirror.marker,
          alpha: 1,
          scale: 1,
          duration: 420,
          ease: "Cubic.Out",
        });
      } else {
        this.exitMirror.marker.setVisible(false).setAlpha(0);
      }
    }
  }

  private initSceneAudio(): void {
    this.livingMusic = this.sound.add(GENERATED_AUDIO.livingMusic.key, {
      loop: true,
      volume: 0,
    });
    this.brokenMusic = this.sound.add(GENERATED_AUDIO.brokenMusic.key, {
      loop: true,
      volume: 0,
    });
    this.echoPresenceAudio = this.sound.add(GENERATED_AUDIO.echoPresence.key, {
      loop: true,
      volume: 0,
    }) as AdjustableSound;
    this.echoHuntAudio = this.sound.add(GENERATED_AUDIO.echoHunt.key, {
      loop: true,
      volume: 0,
    }) as AdjustableSound;
    this.echoPresenceLevel = 0;
    this.echoHuntLevel = 0;
  }

  private unlockSceneAudio(): void {
    if (!this.livingMusic || !this.brokenMusic || !this.echoPresenceAudio || !this.echoHuntAudio) return;

    if (!this.sceneAudioUnlocked) {
      this.sceneAudioUnlocked = true;
      if (!this.livingMusic.isPlaying) {
        this.livingMusic.play();
      }
      if (!this.brokenMusic.isPlaying) {
        this.brokenMusic.play();
      }
      if (!this.echoPresenceAudio.isPlaying) {
        this.echoPresenceAudio.play();
      }
      if (!this.echoHuntAudio.isPlaying) {
        this.echoHuntAudio.play();
      }
    }

    this.syncWorldMusic(true);
  }

  private syncWorldMusic(immediate = false): void {
    if (!this.sceneAudioUnlocked || !this.livingMusic || !this.brokenMusic) return;

    const duration = immediate ? 0 : 700;
    const livingVolume = this.won ? 0 : this.world.world === "living" ? 0.36 : 0;
    const brokenVolume = this.won ? 0 : this.world.world === "broken" ? 0.48 : 0;

    this.tweens.killTweensOf(this.livingMusic);
    this.tweens.killTweensOf(this.brokenMusic);

    this.tweens.add({
      targets: this.livingMusic,
      volume: livingVolume,
      duration,
      ease: "Sine.InOut",
    });
    this.tweens.add({
      targets: this.brokenMusic,
      volume: brokenVolume,
      duration,
      ease: "Sine.InOut",
    });
  }

  private fadeOutSceneMusic(): void {
    if (!this.livingMusic || !this.brokenMusic || !this.echoPresenceAudio || !this.echoHuntAudio) return;

    this.tweens.killTweensOf(this.livingMusic);
    this.tweens.killTweensOf(this.brokenMusic);
    this.tweens.killTweensOf(this.echoPresenceAudio);
    this.tweens.killTweensOf(this.echoHuntAudio);

    this.tweens.add({
      targets: this.livingMusic,
      volume: 0,
      duration: 600,
      ease: "Sine.InOut",
    });
    this.tweens.add({
      targets: this.brokenMusic,
      volume: 0,
      duration: 600,
      ease: "Sine.InOut",
    });
    this.tweens.add({
      targets: this.echoPresenceAudio,
      volume: 0,
      duration: 350,
      ease: "Sine.InOut",
    });
    this.tweens.add({
      targets: this.echoHuntAudio,
      volume: 0,
      duration: 350,
      ease: "Sine.InOut",
    });
  }

  private playSceneSfx(key: string, config?: Phaser.Types.Sound.SoundConfig): void {
    if (!this.sceneAudioUnlocked || !this.cache.audio.exists(key)) return;
    this.sound.play(key, config);
  }

  private getNpcVoiceKey(npcId: string, lineId: string): string {
    return `tts-npc-${npcId}-${lineId}`;
  }

  private getNpcVoicePath(npcId: string, lineId: string): string {
    return `${NPC_VOICE_ROOT}/${npcId}/${lineId}.mp3`;
  }

  private preloadNpcVoice(npcId: string, lineId: string): void {
    const key = this.getNpcVoiceKey(npcId, lineId);
    if (!this.cache.audio.exists(key)) {
      this.load.audio(key, this.getNpcVoicePath(npcId, lineId));
    }
  }

  private playNpcVoice(npcId: string, lineId: string): void {
    const key = this.getNpcVoiceKey(npcId, lineId);
    if (!this.cache.audio.exists(key)) return;

    void this.ensureAudioReady();
    this.unlockSceneAudio();

    if (this.activeNpcVoiceKey) {
      this.sound.stopByKey(this.activeNpcVoiceKey);
    }

    this.activeNpcVoiceKey = key;
    this.playSceneSfx(key, {
      volume: 0.88,
    });
  }

  private playFootstepSfx(event: FootstepEvent): void {
    if (!this.sceneAudioUnlocked) return;

    const asset = FOOTSTEP_AUDIO_BY_SURFACE[event.surface];
    const baseVolume = FOOTSTEP_VOLUME_BY_SURFACE[event.surface];
    const stateFactor = event.state === "sneak" ? 0.58 : 1;
    const worldFactor = this.world.world === "broken" ? 0.98 : 1;
    const detune = this.world.world === "broken"
      ? Phaser.Math.Between(-280, -120)
      : Phaser.Math.Between(-60, 90);
    const rate = this.world.world === "broken"
      ? Phaser.Math.FloatBetween(0.84, 0.92)
      : Phaser.Math.FloatBetween(0.96, 1.04);

    this.playSceneSfx(asset.key, {
      volume: Phaser.Math.Clamp(baseVolume * stateFactor * worldFactor, 0.14, 0.62),
      rate,
      detune,
    });
  }

  private updateEchoAudio(px: number, py: number): void {
    if (!this.echoPresenceAudio || !this.echoHuntAudio) return;

    let presenceTarget = 0;
    let huntTarget = 0;

    if (this.sceneAudioUnlocked && this.world.world === "broken" && !this.won) {
      let nearestVisible = Number.POSITIVE_INFINITY;
      let nearestHunt = Number.POSITIVE_INFINITY;

      for (const echo of this.echoes) {
        if (!echo.sprite.visible) continue;
        const distance = Phaser.Math.Distance.Between(px, py, echo.sprite.x, echo.sprite.y);
        nearestVisible = Math.min(nearestVisible, distance);

        if (echo.currentState === "hunt") {
          nearestHunt = Math.min(nearestHunt, distance);
        }
      }

      if (Number.isFinite(nearestVisible)) {
        const presenceStrength = Phaser.Math.Clamp(1 - nearestVisible / ECHO_PRESENCE_RANGE, 0, 1);
        presenceTarget = 0.02 + presenceStrength * 0.12;
      }

      if (Number.isFinite(nearestHunt)) {
        const huntStrength = Phaser.Math.Clamp(1 - nearestHunt / ECHO_HUNT_RANGE, 0, 1);
        huntTarget = 0.05 + huntStrength * 0.18;
      }
    }

    const nextPresence = Phaser.Math.Linear(this.echoPresenceLevel, presenceTarget, 0.08);
    const nextHunt = Phaser.Math.Linear(this.echoHuntLevel, huntTarget, 0.1);
    this.echoPresenceLevel = nextPresence;
    this.echoHuntLevel = nextHunt;
    this.echoPresenceAudio.setVolume(nextPresence);
    this.echoPresenceAudio.setRate(0.94 + presenceTarget * 0.35);
    this.echoHuntAudio.setVolume(nextHunt);
    this.echoHuntAudio.setRate(0.92 + huntTarget * 0.25);
  }

  private async ensureAudioReady(): Promise<void> {
    if (typeof window === "undefined") return;
    if (!this.audioCtx) {
      this.initStaticAudio();
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }
  }

  private initStaticAudio(): void {
    if (typeof window === "undefined") return;
    const AudioCtor = window.AudioContext ?? (window as BrowserWindow).webkitAudioContext;
    if (!AudioCtor) return;

    const ctx = new AudioCtor();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1200;
    filter.Q.value = 0.7;

    const pan = ctx.createStereoPanner();
    const gain = ctx.createGain();
    gain.gain.value = 0;

    source.connect(filter);
    filter.connect(pan);
    pan.connect(gain);
    gain.connect(ctx.destination);
    source.start();

    this.audioCtx = ctx;
    this.staticSource = source;
    this.staticFilter = filter;
    this.staticPan = pan;
    this.staticGain = gain;
  }

  private updateStaticAudio(target: LostMemory | null, px: number, inBroken: boolean): void {
    if (!this.audioCtx || !this.staticGain || !this.staticPan || !this.staticFilter) return;
    const now = this.audioCtx.currentTime;
    if (!target) {
      this.staticGain.gain.linearRampToValueAtTime(0, now + 0.08);
      return;
    }

    const dist = Phaser.Math.Distance.Between(px, this.player.sprite.y, target.memoryX, target.memoryY);
    const strength = Phaser.Math.Clamp(1 - dist / STATIC_RANGE, 0, 1);
    const pan = Phaser.Math.Clamp((target.memoryX - px) / 140, -1, 1);
    const gainFloor = inBroken ? 0.02 : 0.014;
    const gainCeiling = inBroken ? 0.18 : 0.14;
    this.staticGain.gain.linearRampToValueAtTime(gainFloor + strength * gainCeiling, now + 0.08);
    this.staticPan.pan.linearRampToValueAtTime(pan, now + 0.08);
    this.staticFilter.frequency.linearRampToValueAtTime((inBroken ? 520 : 700) + strength * 1750, now + 0.08);
    this.staticFilter.Q.linearRampToValueAtTime(inBroken ? 1.05 : 0.72, now + 0.08);
  }

  private stopStaticAudio(): void {
    if (!this.audioCtx || !this.staticGain) return;
    this.staticGain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.08);
  }

  private playSoulRelease(id: SoulId): void {
    const soul = getSoulProfile(this.activeLevel.id as SoulLevelId, id);
    this.showSubtitle(soul.gratitudeLine, Math.max(4200, soul.gratitudeLine.length * 52));
    this.playSceneSfx(soul.gratitudeAudioKey, {
      volume: 0.82,
    });
  }

  private cleanupAudio(): void {
    this.input.keyboard?.off("keydown-E", this.handleInteract);
    this.input.keyboard?.off("keydown", this.unlockAudio);
    this.input.keyboard?.off("keydown", this.handleDialogueKey);
    this.input.off("pointerdown", this.unlockAudio);
    this.player?.setControlEnabled(true);
    if (this.activeNpcVoiceKey) {
      this.sound.stopByKey(this.activeNpcVoiceKey);
      this.activeNpcVoiceKey = null;
    }

    const source = this.staticSource;
    const filter = this.staticFilter;
    const pan = this.staticPan;
    const gain = this.staticGain;
    const ctx = this.audioCtx;

    this.staticSource = null;
    this.staticFilter = null;
    this.staticPan = null;
    this.staticGain = null;
    this.audioCtx = null;

    this.livingMusic?.stop();
    this.livingMusic?.destroy();
    this.livingMusic = null;

    this.brokenMusic?.stop();
    this.brokenMusic?.destroy();
    this.brokenMusic = null;

    this.echoPresenceAudio?.stop();
    this.echoPresenceAudio?.destroy();
    this.echoPresenceAudio = null;
    this.echoPresenceLevel = 0;

    this.echoHuntAudio?.stop();
    this.echoHuntAudio?.destroy();
    this.echoHuntAudio = null;
    this.echoHuntLevel = 0;
    this.sceneAudioUnlocked = false;

    try {
      source?.stop();
    } catch {}
    source?.disconnect();
    filter?.disconnect();
    pan?.disconnect();
    gain?.disconnect();
    void ctx?.close().catch(() => undefined);
  }

  private onWorldChanged(w: World): void {
    const tileSuffix = w === "living" ? "living" : "broken";
    for (const t of this.tiles) {
      t.img.setTexture(`tile-${t.surface}-${tileSuffix}`);
    }
    for (const wall of this.wallImages) {
      wall.img.setTexture(`tile-wall-${tileSuffix}`);
      wall.cap.fillColor = WALL_PALETTE[w].top;
    }

    const cam = this.cameras.main;
    cam.setBackgroundColor(`#${WORLD_BG[w].toString(16).padStart(6, "0")}`);
    cam.flash(240, w === "living" ? 240 : 90, w === "living" ? 220 : 110, w === "living" ? 200 : 180);
    this.syncWorldMusic();
    this.tweens.add({
      targets: cam,
      zoom: { from: 1.92, to: 1.7 },
      duration: 420,
      ease: "Cubic.Out",
    });

    this.dust.setParticleTint(w === "living" ? 0xffe9c8 : 0x94a9bd);
    this.playerHalo.fillColor = w === "living" ? 0xffddb0 : 0xb3b6d8;
    this.vignette.setAlpha(VIGNETTE_ALPHA[w]);

    const inBroken = w === "broken";
    this.darkness.setVisible(inBroken);
    if (inBroken) {
      this.closeNpcDialogue();
    }
    for (const npc of this.npcs) {
      npc.body.setVisible(!inBroken && !this.won);
      npc.halo.setVisible(!inBroken && !this.won);
    }
    for (const echo of this.echoes) {
      echo.setVisible(inBroken && !this.won);
    }
    for (const memory of this.memories) {
      if (!memory.collected) {
        memory.sprite.setVisible(inBroken);
      }
    }

    if (inBroken && !this.brokenHintShown) {
      this.brokenHintShown = true;
      this.showSubtitle("Let the static lean you toward the lost.", 2400);
    }

    if (inBroken) {
      this.setObjective(
        this.collectedCount >= this.memoryTotal
          ? "All memories gathered. Follow the gold EXIT mirror and return to Living."
          : "Broken World: stay quiet and follow the static to each dim soul."
      );
    } else {
      this.setObjective(
        this.collectedCount === 0
          ? this.activeLevel.startObjective
          : this.collectedCount >= this.memoryTotal
          ? "All memories returned. Stand at the gold EXIT mirror and press E to leave."
          : `${this.collectedCount}/${this.memoryTotal} memories returned. Listen for the next static fracture.`
      );
    }

    this.emitWorldState(w);
  }

  private surfaceAt(worldX: number, worldY: number): Surface {
    const tx = Math.floor(worldX / TILE);
    const ty = Math.floor(worldY / TILE);
    const ch = this.activeLevel.room[ty]?.[tx];
    return SURFACE_FROM_CHAR[ch] ?? "stone";
  }

  private tryInteract(): void {
    if (this.dialogueNpc || this.won) return;
    if (this.activeNpc && this.world.world === "living") {
      this.openNpcDialogue(this.activeNpc);
      return;
    }
    if (!this.activeMirror) return;
    if (this.activeMirror.mode === "exit" && this.world.world === "living" && this.collectedCount >= this.memoryTotal) {
      this.onWin();
      return;
    }
    this.playSceneSfx(GENERATED_AUDIO.mirrorCrossing.key, { volume: 0.55 });
    this.playSceneSfx(GENERATED_AUDIO.mirrorShatter.key, { volume: 0.85 });
    this.playMirrorShatterEffect(this.activeMirror.body.x, this.activeMirror.body.y);
    this.world.toggle();
    if (this.activeMirror.mode === "exit" && this.collectedCount >= this.memoryTotal && this.world.world === "living") {
      this.showSubtitle("One more step. Press E again to leave.", 2200);
    }
  }

  private playMirrorShatterEffect(x: number, y: number): void {
    const cam = this.cameras.main;
    // Camera punch.
    cam.flash(220, 240, 230, 255, false);
    cam.shake(260, 0.006);

    // Expanding shockwave ring.
    const ring = this.add
      .circle(x, y, 8, 0xffffff, 0)
      .setStrokeStyle(2, 0xe6f0ff, 0.95)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(95);
    this.tweens.add({
      targets: ring,
      radius: 220,
      alpha: 0,
      duration: 520,
      ease: "Cubic.Out",
      onComplete: () => ring.destroy(),
    });

    // Bright core flash.
    const core = this.add
      .circle(x, y, 22, 0xffffff, 0.85)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(96);
    this.tweens.add({
      targets: core,
      scale: 2.4,
      alpha: 0,
      duration: 360,
      ease: "Quad.Out",
      onComplete: () => core.destroy(),
    });

    // Glass shards flying outward in 8 directions.
    const shardCount = 9;
    for (let i = 0; i < shardCount; i++) {
      const angle = (i / shardCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const len = 6 + Math.random() * 4;
      const shard = this.add
        .triangle(x, y, 0, -len, -2, len, 2, len, 0xdfe8f0, 0.95)
        .setDepth(97);
      shard.rotation = angle + Math.PI / 2;
      const dist = 80 + Math.random() * 70;
      const tx = x + Math.cos(angle) * dist;
      const ty = y + Math.sin(angle) * dist;
      this.tweens.add({
        targets: shard,
        x: tx,
        y: ty,
        rotation: shard.rotation + (Math.random() - 0.5) * 4,
        alpha: 0,
        duration: 520 + Math.random() * 200,
        ease: "Quad.Out",
        onComplete: () => shard.destroy(),
      });
    }
  }
}




