export type Surface = "wood" | "rug" | "stone" | "water" | "grass";

export interface SurfaceProfile {
  walkRadius: number;
  walkIntensity: number;
  sneakRadius: number;
  sneakIntensity: number;
  stepIntervalMs: number;
}

export const SURFACE_PROFILES: Record<Surface, SurfaceProfile> = {
  wood:  { walkRadius: 250, walkIntensity: 0.95, sneakRadius: 70,  sneakIntensity: 0.25, stepIntervalMs: 320 },
  stone: { walkRadius: 225, walkIntensity: 0.82, sneakRadius: 60,  sneakIntensity: 0.22, stepIntervalMs: 340 },
  rug:   { walkRadius: 18,  walkIntensity: 0.06, sneakRadius: 0,   sneakIntensity: 0.0,  stepIntervalMs: 430 },
  grass: { walkRadius: 110, walkIntensity: 0.42, sneakRadius: 20,  sneakIntensity: 0.08, stepIntervalMs: 390 },
  water: { walkRadius: 260, walkIntensity: 1.0, sneakRadius: 140, sneakIntensity: 0.5, stepIntervalMs: 320 },
};
