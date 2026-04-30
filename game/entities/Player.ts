import Phaser from "phaser";
import { SURFACE_PROFILES, type Surface } from "@/game/data/surfaces";
import type { NoiseSystem } from "@/game/systems/NoiseSystem";

export type MoveState = "idle" | "walk" | "sneak";

const WALK_SPEED = 118;
const SNEAK_SPEED = 56;

// The Player sprite is a small container with a hooded silhouette: cloak base,
// shoulders, head, hood and a tiny "facing" tip that rotates with movement.
export interface PlayerDeps {
  scene: Phaser.Scene;
  x: number;
  y: number;
  noise: NoiseSystem;
  surfaceAt: (x: number, y: number) => Surface;
  onFootstep?: (event: FootstepEvent) => void;
}

export interface FootstepEvent {
  x: number;
  y: number;
  surface: Surface;
  state: Exclude<MoveState, "idle">;
}

export class Player {
  readonly sprite: Phaser.GameObjects.Container;
  readonly body: Phaser.Physics.Arcade.Body;

  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly cloak: Phaser.GameObjects.Graphics;
  private readonly hem: Phaser.GameObjects.Ellipse;
  private readonly hood: Phaser.GameObjects.Graphics;
  private readonly hoodBack: Phaser.GameObjects.Graphics;
  private readonly face: Phaser.GameObjects.Ellipse;
  private readonly faceShade: Phaser.GameObjects.Ellipse;
  private readonly eyeL: Phaser.GameObjects.Arc;
  private readonly eyeR: Phaser.GameObjects.Arc;
  private readonly headGroup: Phaser.GameObjects.Container;
  private readonly cloakGroup: Phaser.GameObjects.Container;
  private readonly lanternGlow: Phaser.GameObjects.Arc;
  private readonly lanternHalo: Phaser.GameObjects.Arc;
  private readonly lanternCore: Phaser.GameObjects.Arc;
  private readonly facing: Phaser.GameObjects.Triangle;

  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly keys: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    SHIFT: Phaser.Input.Keyboard.Key;
  };
  private readonly noise: NoiseSystem;
  private readonly surfaceAt: (x: number, y: number) => Surface;
  private readonly onFootstep?: (event: FootstepEvent) => void;

  private state: MoveState = "idle";
  private nextStepAt = 0;
  private bobT = 0;
  private facingAngle = Math.PI / 2; // start facing down (toward camera)
  private leanT = 0;
  private faceX = 0;
  private faceScaleX = 1;
  private controlsEnabled = true;
  private noiseMultiplier = 1;

  constructor({ scene, x, y, noise, surfaceAt, onFootstep }: PlayerDeps) {
    this.noise = noise;
    this.surfaceAt = surfaceAt;
    this.onFootstep = onFootstep;

    const c = scene.add.container(x, y);

    // Soft drop shadow under the feet.
    this.shadow = scene.add.ellipse(0, 11, 20, 6, 0x000000, 0.32);

    // Cloak silhouette: a teardrop shape drawn with Graphics for crisp curves.
    this.cloak = scene.add.graphics();
    this.cloak.fillStyle(0x141420, 1);
    this.cloak.lineStyle(1, 0x05050a, 0.85);
    // Body cloak (rounded triangle / bell shape)
    this.cloak.beginPath();
    this.cloak.moveTo(-10, 10);
    this.cloak.lineTo(-9, -2);
    this.cloak.lineTo(-6, -7);
    this.cloak.lineTo(6, -7);
    this.cloak.lineTo(9, -2);
    this.cloak.lineTo(10, 10);
    this.cloak.lineTo(7, 11);
    this.cloak.lineTo(-7, 11);
    this.cloak.closePath();
    this.cloak.fillPath();
    this.cloak.strokePath();
    // Inner cloak fold (subtle vertical highlight)
    this.cloak.fillStyle(0x252538, 0.85);
    this.cloak.fillEllipse(0, 2, 9, 12);
    // Shoulder rim light
    this.cloak.fillStyle(0x3a3a55, 0.55);
    this.cloak.fillEllipse(-5, -3, 6, 4);
    this.cloak.fillEllipse(5, -3, 6, 4);

    // Tattered hem just under the cloak.
    this.hem = scene.add.ellipse(0, 11, 18, 4, 0x05050a, 0.7);

    // Cloak group: contains shadow + cloak + hem so the upper body can lean
    // independently of the shadow / lantern halo.
    this.cloakGroup = scene.add.container(0, 0);
    this.cloakGroup.add([this.cloak, this.hem]);
    // Head group (face + hood + eyes) so it can bob as one unit.
    this.headGroup = scene.add.container(0, -5);

    // Hood: dark cowl framing the face.
    this.hood = scene.add.graphics();
    this.hood.fillStyle(0x0c0c14, 1);
    this.hood.lineStyle(1, 0x000000, 0.9);
    this.hood.beginPath();
    this.hood.arc(0, 0, 9, Math.PI, 0, false);
    this.hood.lineTo(8, 4);
    this.hood.lineTo(-8, 4);
    this.hood.closePath();
    this.hood.fillPath();
    this.hood.strokePath();
    // Hood inner shade (gives depth)
    this.hood.fillStyle(0x1a1a26, 0.9);
    this.hood.fillEllipse(0, 1, 12, 9);

    // Pale face peeking out of the cowl.
    this.face = scene.add.ellipse(0, 0, 9, 7, 0xe8d6b4);
    // Lower face shadow from the hood brim.
    this.faceShade = scene.add.ellipse(0, -2.5, 10, 4, 0x000000, 0.45);
    // Eyes: tiny warm glints.
    this.eyeL = scene.add.circle(-2, 0.5, 0.9, 0xffe6b0);
    this.eyeR = scene.add.circle(2, 0.5, 0.9, 0xffe6b0);

    // Hood "back": a solid dome that hides the face when the player walks
    // away from camera (facing up). Drawn last in the head group.
    this.hoodBack = scene.add.graphics();
    this.hoodBack.fillStyle(0x0c0c14, 1);
    this.hoodBack.lineStyle(1, 0x000000, 0.9);
    this.hoodBack.beginPath();
    this.hoodBack.arc(0, 0, 9, Math.PI, 0, false);
    this.hoodBack.lineTo(8, 4);
    this.hoodBack.lineTo(-8, 4);
    this.hoodBack.closePath();
    this.hoodBack.fillPath();
    this.hoodBack.strokePath();
    // Subtle crown highlight so it doesn't read as a flat blob.
    this.hoodBack.fillStyle(0x1a1a26, 0.9);
    this.hoodBack.fillEllipse(0, -1, 10, 4);
    this.hoodBack.setVisible(false);

    this.headGroup.add([this.hood, this.face, this.faceShade, this.eyeL, this.eyeR, this.hoodBack]);

    // Lantern: a soft warm orb the player carries. The halo is additive-ish
    // (high-alpha bright disc) so it reads as light against the dim palette.
    this.lanternHalo = scene.add.circle(8, 2, 14, 0xffd28a, 0.18);
    this.lanternGlow = scene.add.circle(8, 2, 7, 0xffba6a, 0.55);
    this.lanternCore = scene.add.circle(8, 2, 2.2, 0xfff2c8, 1);

    // Tiny chevron pointing where the player faces (kept for clarity).
    this.facing = scene.add.triangle(0, 0, 0, -6, -2.5, -1, 2.5, -1, 0xffe6b0, 0.85);

    c.add([
      this.shadow,
      this.cloakGroup,
      this.lanternHalo,
      this.headGroup,
      this.lanternGlow,
      this.lanternCore,
      this.facing,
    ]);
    c.setSize(18, 22);

    scene.physics.add.existing(c);
    this.body = c.body as Phaser.Physics.Arcade.Body;
    this.body.setSize(18, 16, true);
    this.body.setCollideWorldBounds(true);
    this.sprite = c;

    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keys = {
      W: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      SHIFT: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
    };
  }

  get currentState(): MoveState {
    return this.state;
  }

  setControlEnabled(enabled: boolean): void {
    this.controlsEnabled = enabled;
    if (!enabled) {
      this.body.setVelocity(0, 0);
      this.state = "idle";
    }
  }

  setNoiseMultiplier(multiplier: number): void {
    this.noiseMultiplier = Math.max(0, multiplier);
  }

  update(time: number): void {
    const left = this.controlsEnabled && (this.cursors.left?.isDown || this.keys.A.isDown);
    const right = this.controlsEnabled && (this.cursors.right?.isDown || this.keys.D.isDown);
    const up = this.controlsEnabled && (this.cursors.up?.isDown || this.keys.W.isDown);
    const down = this.controlsEnabled && (this.cursors.down?.isDown || this.keys.S.isDown);
    const sneaking = this.controlsEnabled && this.keys.SHIFT.isDown;

    let vx = 0;
    let vy = 0;
    if (left) vx -= 1;
    if (right) vx += 1;
    if (up) vy -= 1;
    if (down) vy += 1;

    const moving = vx !== 0 || vy !== 0;
    const speed = sneaking ? SNEAK_SPEED : WALK_SPEED;

    if (moving) {
      const len = Math.hypot(vx, vy);
      this.body.setVelocity((vx / len) * speed, (vy / len) * speed);
      this.state = sneaking ? "sneak" : "walk";
      this.facingAngle = Math.atan2(vy, vx);
    } else {
      this.body.setVelocity(0, 0);
      this.state = "idle";
    }

    // Cloak alpha softens when sneaking; the body crouches a touch.
    this.sprite.setAlpha(sneaking ? 0.78 : 1);
    const targetScaleY = sneaking ? 0.94 : 1;
    this.sprite.scaleY += (targetScaleY - this.sprite.scaleY) * 0.2;

    // Walk bob: head and lantern bounce gently while moving (not sneaking).
    const bobTarget = moving && !sneaking ? Math.sin(time * 0.018) * 0.9 : 0;
    this.bobT += (bobTarget - this.bobT) * 0.25;
    this.headGroup.y = -5 + this.bobT;

    // Direction-aware facing.
    // Cardinal classification: prefer the axis with the larger absolute speed.
    const dirX = vx;
    const dirY = vy;
    const horizontal = Math.abs(dirX) > Math.abs(dirY);
    const facingUp = !horizontal && dirY < 0;
    const facingDown = !horizontal && dirY > 0;
    const facingSign = horizontal ? Math.sign(dirX) : 0; // -1 left, 1 right, 0 vertical

    // Lean: torso/cloak rotates slightly toward the horizontal direction,
    // with a small step sway while walking. Going up tilts forward (negative).
    let leanTarget = facingSign * 0.18;
    if (facingUp) leanTarget += 0;
    if (moving && !sneaking) leanTarget += Math.sin(time * 0.018) * 0.04;
    this.leanT += (leanTarget - this.leanT) * 0.18;
    this.cloakGroup.rotation = this.leanT;

    // When facing up, hide the face entirely behind the back of the hood.
    this.hoodBack.setVisible(facingUp);
    const showFace = !facingUp;
    this.face.setVisible(showFace);
    this.faceShade.setVisible(showFace);
    this.eyeL.setVisible(showFace);
    this.eyeR.setVisible(showFace);

    // Profile: slide eyes/face toward the side we're walking and squash the
    // face horizontally so it reads as a side view. When facing down, reset.
    let faceXTarget = 0;
    let faceScaleXTarget = 1;
    let eyeSpread = 2;
    if (facingSign !== 0) {
      faceXTarget = facingSign * 1.6;
      faceScaleXTarget = 0.78;
      eyeSpread = 0.6;
    } else if (facingDown) {
      faceXTarget = 0;
      faceScaleXTarget = 1;
      eyeSpread = 2;
    }
    this.faceX += (faceXTarget - this.faceX) * 0.25;
    this.faceScaleX += (faceScaleXTarget - this.faceScaleX) * 0.25;
    this.face.x = this.faceX;
    this.face.scaleX = this.faceScaleX;
    this.faceShade.x = this.faceX;
    this.faceShade.scaleX = this.faceScaleX;
    // In side view both eyes collapse near each other (only one is "visible"
    // in profile, but we keep two for consistency).
    if (facingSign !== 0) {
      this.eyeL.x = this.faceX + facingSign * eyeSpread - 0.6;
      this.eyeR.x = this.faceX + facingSign * eyeSpread + 0.6;
    } else {
      this.eyeL.x = -eyeSpread;
      this.eyeR.x = eyeSpread;
    }

    // Lantern orbits slightly ahead of facing direction.
    const lanternRadius = 9;
    const lx = Math.cos(this.facingAngle) * lanternRadius;
    const ly = Math.sin(this.facingAngle) * lanternRadius - 1 + this.bobT * 0.6;
    this.lanternHalo.setPosition(lx, ly);
    this.lanternGlow.setPosition(lx, ly);
    this.lanternCore.setPosition(lx, ly);

    // Lantern flicker: tiny alpha wobble; dimmer when sneaking.
    const flicker = 0.92 + Math.sin(time * 0.012) * 0.06 + Math.sin(time * 0.037) * 0.04;
    const lanternIntensity = sneaking ? 0.55 : 1;
    this.lanternHalo.setAlpha(0.18 * flicker * lanternIntensity);
    this.lanternGlow.setAlpha(0.55 * flicker * lanternIntensity);
    this.lanternCore.setAlpha(1 * lanternIntensity);

    // Shadow tightens slightly when sneaking (lower stance).
    this.shadow.setScale(sneaking ? 0.85 : 1, sneaking ? 0.7 : 1);

    // Facing chevron: float just outside the hood in the move direction.
    const fx = Math.cos(this.facingAngle) * 7;
    const fy = Math.sin(this.facingAngle) * 7 - 5;
    this.facing.x = fx;
    this.facing.y = fy;
    this.facing.rotation = this.facingAngle + Math.PI / 2;
    this.facing.setAlpha(moving ? 0.85 : 0.35);

    if (this.state !== "idle" && time >= this.nextStepAt) {
      this.emitFootstep();
    }
  }

  private emitFootstep(): void {
    const footX = this.body.center.x;
    const footY = this.body.bottom - 2;
    const surface = this.surfaceAt(footX, footY);
    const profile = SURFACE_PROFILES[surface];
    const state = this.state === "sneak" ? "sneak" : "walk";

    const radius =
      (this.state === "sneak" ? profile.sneakRadius : profile.walkRadius) *
      this.noiseMultiplier;
    const intensity =
      (this.state === "sneak" ? profile.sneakIntensity : profile.walkIntensity) *
      this.noiseMultiplier;

    this.nextStepAt = this.sprite.scene.time.now + profile.stepIntervalMs;

    this.onFootstep?.({
      x: footX,
      y: footY,
      surface,
      state,
    });

    if (radius <= 0 || intensity <= 0) return;

    this.noise.emitNoise({
      x: footX,
      y: footY,
      radius,
      intensity,
      source: "footstep",
    });
  }

  bump(intensity = 0.8, radius = 240): void {
    this.noise.emitNoise({
      x: this.sprite.x,
      y: this.sprite.y,
      radius,
      intensity,
      source: "bump",
    });
  }
}
