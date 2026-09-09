export type QualityTier = 0 | 1 | 2;

export interface DeviceHints {
  coarsePointer: boolean;
  cores: number;
  memory?: number;
}

/** Pick a rendering tier once, from coarse device hints. */
export function detectQuality(env: DeviceHints): QualityTier {
  const memory = env.memory ?? 8;
  if (env.coarsePointer || env.cores <= 4 || memory <= 4) return 0;
  if (env.cores <= 8) return 1;
  return 2;
}

export function detectQualityFromBrowser(): QualityTier {
  if (typeof window === "undefined") return 0;
  const nav = navigator as Navigator & { deviceMemory?: number };
  return detectQuality({
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    cores: navigator.hardwareConcurrency ?? 8,
    memory: nav.deviceMemory,
  });
}

export interface QualitySettings {
  maxDpr: number;
  post: boolean;
  antialias: boolean;
  stars: number;
  asteroids: number;
  dust: number;
  flares: number;
  nebulaOctaves: number;
}

const SETTINGS: readonly QualitySettings[] = [
  { maxDpr: 1, post: false, antialias: true, stars: 6000, asteroids: 1200, dust: 300, flares: 250, nebulaOctaves: 3 },
  { maxDpr: 1.5, post: true, antialias: false, stars: 14000, asteroids: 3000, dust: 800, flares: 500, nebulaOctaves: 4 },
  { maxDpr: 2, post: true, antialias: false, stars: 24000, asteroids: 6000, dust: 1400, flares: 800, nebulaOctaves: 5 },
];

export const qualitySettings = (tier: QualityTier): QualitySettings => SETTINGS[tier];
