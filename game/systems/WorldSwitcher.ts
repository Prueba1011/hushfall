import Phaser from "phaser";

export type World = "living" | "broken";

const LIVING_TINT = 0xfff1d6;
const BROKEN_TINT = 0x7a6f9b;

export class WorldSwitcher {
  private current: World = "living";
  private readonly emitter = new Phaser.Events.EventEmitter();

  constructor(private readonly scene: Phaser.Scene) {}

  get world(): World {
    return this.current;
  }

  toggle(): World {
    return this.set(this.current === "living" ? "broken" : "living");
  }

  set(target: World): World {
    if (target === this.current) return this.current;
    this.current = target;
    this.emitter.emit("change", this.current);
    return this.current;
  }

  tintFor(world: World = this.current): number {
    return world === "living" ? LIVING_TINT : BROKEN_TINT;
  }

  onChange(handler: (world: World) => void): void {
    this.emitter.on("change", handler);
  }
}
