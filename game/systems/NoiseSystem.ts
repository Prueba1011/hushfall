import Phaser from "phaser";

export interface NoiseEvent {
  x: number;
  y: number;
  radius: number;
  intensity: number;
  source: "footstep" | "bump" | "break" | "voice";
}

const NOISE_EVENT = "noise";

export class NoiseSystem extends Phaser.Events.EventEmitter {
  emitNoise(event: NoiseEvent): void {
    this.emit(NOISE_EVENT, event);
  }

  onNoise(handler: (event: NoiseEvent) => void): void {
    this.on(NOISE_EVENT, handler);
  }

  offNoise(handler: (event: NoiseEvent) => void): void {
    this.off(NOISE_EVENT, handler);
  }
}
