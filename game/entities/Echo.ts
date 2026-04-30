import Phaser from "phaser";
import type { NoiseSystem, NoiseEvent } from "@/game/systems/NoiseSystem";

const DEFAULT_PATROL_SPEED = 36;
const DEFAULT_CHASE_SPEED = 98;
const DEFAULT_HEARING_RADIUS = 300;
const DEFAULT_FORGET_AFTER_MS = 2200;

export type EchoState = "patrol" | "hunt";

export interface EchoDeps {
  scene: Phaser.Scene;
  noise: NoiseSystem;
  patrol: { x: number; y: number }[];
  walls: Phaser.Physics.Arcade.StaticGroup;
  patrolSpeed?: number;
  chaseSpeed?: number;
  hearingRadius?: number;
  forgetAfterMs?: number;
  auraColor?: number;
  eyeColor?: number;
}

export class Echo {
  readonly sprite: Phaser.GameObjects.Container;
  readonly body: Phaser.Physics.Arcade.Body;

  private readonly scene: Phaser.Scene;
  private readonly patrol: { x: number; y: number }[];
  private readonly patrolSpeed: number;
  private readonly chaseSpeed: number;
  private readonly hearingRadius: number;
  private readonly forgetAfterMs: number;
  private readonly aura: Phaser.GameObjects.Arc;
  private readonly auraInner: Phaser.GameObjects.Arc;
  private readonly wisp: Phaser.GameObjects.Graphics;
  private readonly mask: Phaser.GameObjects.Graphics;
  private readonly maskShade: Phaser.GameObjects.Ellipse;
  private readonly eyeL: Phaser.GameObjects.Arc;
  private readonly eyeR: Phaser.GameObjects.Arc;
  private readonly eyeGlowL: Phaser.GameObjects.Arc;
  private readonly eyeGlowR: Phaser.GameObjects.Arc;
  private readonly mouth: Phaser.GameObjects.Graphics;
  private readonly head: Phaser.GameObjects.Container;
  private readonly auraColor: number;
  private readonly baseEyeColor: number;

  private state: EchoState = "patrol";
  private patrolIndex = 0;
  private lastHeard: { x: number; y: number; at: number } | null = null;
  private wispOffset = 0;
  private vx = 0;
  private vy = 0;
  private speedMultiplier = 1;

  constructor({
    scene,
    noise,
    patrol,
    walls,
    patrolSpeed = DEFAULT_PATROL_SPEED,
    chaseSpeed = DEFAULT_CHASE_SPEED,
    hearingRadius = DEFAULT_HEARING_RADIUS,
    forgetAfterMs = DEFAULT_FORGET_AFTER_MS,
    auraColor = 0x6e3aa6,
    eyeColor = 0xff5670,
  }: EchoDeps) {
    this.scene = scene;
    this.patrol = patrol;
    this.patrolSpeed = patrolSpeed;
    this.chaseSpeed = chaseSpeed;
    this.hearingRadius = hearingRadius;
    this.forgetAfterMs = forgetAfterMs;
    this.auraColor = auraColor;
    this.baseEyeColor = eyeColor;

    const start = patrol[0];
    const c = scene.add.container(start.x, start.y).setDepth(5);

    // Outer aura: large soft halo for menace at distance.
    this.aura = scene.add
      .circle(0, 2, 32, auraColor, 0.16)
      .setBlendMode(Phaser.BlendModes.ADD);
    // Inner aura: tighter, brighter ring near the body.
    this.auraInner = scene.add
      .circle(0, 2, 18, auraColor, 0.32)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Wispy trailing body drawn as overlapping smoky blobs.
    this.wisp = scene.add.graphics();
    this.redrawWisp(0);

    // Head group: floating mask above the wisp.
    this.head = scene.add.container(0, -6);

    // Mask: a hollow porcelain/bone-like shape with a dark interior.
    this.mask = scene.add.graphics();
    this.mask.fillStyle(0xe6dfd1, 1);
    this.mask.lineStyle(1, 0x1a1320, 0.9);
    // Elongated drop shape (chin pointed down).
    this.mask.beginPath();
    this.mask.moveTo(0, 7);
    this.mask.lineTo(-6, 4);
    this.mask.lineTo(-7, -2);
    this.mask.lineTo(-5, -7);
    this.mask.lineTo(0, -8);
    this.mask.lineTo(5, -7);
    this.mask.lineTo(7, -2);
    this.mask.lineTo(6, 4);
    this.mask.closePath();
    this.mask.fillPath();
    this.mask.strokePath();
    // Dark hollow forehead notch (cracked feel).
    this.mask.fillStyle(0x0a0612, 0.85);
    this.mask.fillTriangle(-1, -8, 1, -8, 0, -3);

    // Soft cheek/brow shadow on the mask.
    this.maskShade = scene.add.ellipse(0, 2, 12, 6, 0x000000, 0.25);

    // Eye sockets (pure black) with glowing pupils on top.
    const socketL = scene.add.ellipse(-2.6, -1.2, 4, 3, 0x05030a);
    const socketR = scene.add.ellipse(2.6, -1.2, 4, 3, 0x05030a);
    this.eyeGlowL = scene.add
      .circle(-2.6, -1.2, 3.2, eyeColor, 0.55)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.eyeGlowR = scene.add
      .circle(2.6, -1.2, 3.2, eyeColor, 0.55)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.eyeL = scene.add.circle(-2.6, -1.2, 1.1, eyeColor);
    this.eyeR = scene.add.circle(2.6, -1.2, 1.1, eyeColor);

    // Stitched / sealed mouth (subtle).
    this.mouth = scene.add.graphics();
    this.mouth.lineStyle(1, 0x1a1320, 0.85);
    this.mouth.beginPath();
    this.mouth.moveTo(-3, 3);
    this.mouth.lineTo(-1.5, 3.6);
    this.mouth.lineTo(0, 3);
    this.mouth.lineTo(1.5, 3.6);
    this.mouth.lineTo(3, 3);
    this.mouth.strokePath();

    this.head.add([
      this.mask,
      this.maskShade,
      socketL,
      socketR,
      this.eyeGlowL,
      this.eyeGlowR,
      this.eyeL,
      this.eyeR,
      this.mouth,
    ]);

    c.add([this.aura, this.auraInner, this.wisp, this.head]);
    c.setSize(20, 22);

    scene.physics.add.existing(c);
    this.body = c.body as Phaser.Physics.Arcade.Body;
    this.body.setSize(16, 14);
    this.body.setOffset(-8, -3);
    this.body.setCollideWorldBounds(true);
    this.sprite = c;

    scene.physics.add.collider(c, walls);

    noise.onNoise((e) => this.hear(e));

    // Eye pulse: glints breathe.
    scene.tweens.add({
      targets: [this.eyeL, this.eyeR],
      alpha: { from: 0.7, to: 1 },
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
    // Eye glow halo pulse, slightly out of phase.
    scene.tweens.add({
      targets: [this.eyeGlowL, this.eyeGlowR],
      alpha: { from: 0.35, to: 0.7 },
      scale: { from: 0.85, to: 1.15 },
      duration: 720,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
    // Outer aura breathes.
    scene.tweens.add({
      targets: this.aura,
      scale: { from: 0.95, to: 1.2 },
      alpha: { from: 0.1, to: 0.28 },
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
    // Subtle head sway / float.
    scene.tweens.add({
      targets: this.head,
      y: { from: -7, to: -5 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
  }

  get currentState(): EchoState {
    return this.state;
  }

  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = Math.max(0.1, multiplier);
  }

  setVisible(v: boolean): void {
    this.sprite.setVisible(v);
    this.body.enable = true;
  }

  divertFrom(sourceX: number, sourceY: number, distance = 104): void {
    if (!this.sprite.visible) return;

    const dx = this.sprite.x - sourceX;
    const dy = this.sprite.y - sourceY;
    const len = Math.hypot(dx, dy) || 1;

    this.setHuntTarget(
      this.sprite.x + (dx / len) * distance,
      this.sprite.y + (dy / len) * distance
    );
  }

  private hear(e: NoiseEvent): void {
    if (!this.sprite.visible) return;
    const d = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, e.x, e.y);
    const reach = this.hearingRadius * (0.4 + e.intensity * 0.6);
    if (d > reach) return;
    this.setHuntTarget(e.x, e.y);
  }

  private setHuntTarget(x: number, y: number): void {
    this.lastHeard = { x, y, at: this.scene.time.now };
    this.state = "hunt";
    const huntColor = 0xff2a4a;
    this.eyeL.fillColor = huntColor;
    this.eyeR.fillColor = huntColor;
    this.eyeGlowL.fillColor = huntColor;
    this.eyeGlowR.fillColor = huntColor;
    this.aura.fillColor = huntColor;
    this.auraInner.fillColor = huntColor;
  }

  private resumePatrol(): void {
    this.state = "patrol";
    this.lastHeard = null;
    this.eyeL.fillColor = this.baseEyeColor;
    this.eyeR.fillColor = this.baseEyeColor;
    this.eyeGlowL.fillColor = this.baseEyeColor;
    this.eyeGlowR.fillColor = this.baseEyeColor;
    this.aura.fillColor = this.auraColor;
    this.auraInner.fillColor = this.auraColor;

    let bestIndex = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < this.patrol.length; i++) {
      const point = this.patrol[i];
      const d = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, point.x, point.y);
      if (d < bestDist) {
        bestDist = d;
        bestIndex = i;
      }
    }
    this.patrolIndex = bestIndex;
  }

  update(time: number): void {
    if (!this.body.enable) return;

    if (this.state === "hunt" && this.lastHeard) {
      if (time - this.lastHeard.at > this.forgetAfterMs) {
        this.resumePatrol();
      }
    }

    let target =
      this.state === "hunt" && this.lastHeard
        ? this.lastHeard
        : this.patrol[this.patrolIndex];

    let dx = target.x - this.sprite.x;
    let dy = target.y - this.sprite.y;
    let dist = Math.hypot(dx, dy);

    if (dist < 6) {
      if (this.state === "patrol") {
        this.patrolIndex = (this.patrolIndex + 1) % this.patrol.length;
      } else {
        this.resumePatrol();
      }

      target = this.patrol[this.patrolIndex];
      dx = target.x - this.sprite.x;
      dy = target.y - this.sprite.y;
      dist = Math.hypot(dx, dy);
    }

    const speed =
      (this.state === "hunt" ? this.chaseSpeed : this.patrolSpeed) *
      this.speedMultiplier;
    const inv = dist > 0 ? 1 / dist : 0;
    this.vx = dx * inv * speed;
    this.vy = dy * inv * speed;
    this.body.setVelocity(this.vx, this.vy);

    // Wisp animation: phase advances faster when hunting.
    const phaseStep = this.state === "hunt" ? 0.06 : 0.025;
    this.wispOffset += phaseStep;
    this.redrawWisp(this.wispOffset);

    // Mask tilts slightly toward movement direction.
    const targetTilt = Phaser.Math.Clamp(this.vx / 220, -0.18, 0.18);
    this.head.rotation += (targetTilt - this.head.rotation) * 0.15;
  }

  private redrawWisp(phase: number): void {
    const g = this.wisp;
    g.clear();
    // Base cloak silhouette (wide bottom, tapered top).
    g.fillStyle(0x0a0612, 0.95);
    g.fillEllipse(0, 4, 22, 20);
    // Inner shade to deepen the body.
    g.fillStyle(0x18102a, 0.85);
    g.fillEllipse(0, 6, 14, 11);
    // Three smoky tendrils that drift sideways.
    const a = Math.sin(phase) * 2;
    const b = Math.sin(phase + 1.7) * 2;
    const c = Math.sin(phase + 3.1) * 2;
    g.fillStyle(0x0a0612, 0.7);
    g.fillEllipse(-7 + a, 9, 9, 8);
    g.fillEllipse(0 + b, 11, 11, 8);
    g.fillEllipse(7 + c, 9, 9, 8);
    // Faint upper rim light using the aura color tint (subtle).
    g.fillStyle(this.auraColor, 0.18);
    g.fillEllipse(0, -2, 14, 6);
  }
}
