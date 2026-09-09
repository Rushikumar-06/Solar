import { clamp, smoothstep } from "./math";

/**
 * Convert a scroll offset into a tour parameter.
 * Integer values mean the camera is parked on that section; fractional values
 * mean it is flying toward the next one. Each section holds for the first
 * `dwell` fraction of its height, then flies for the remainder.
 */
export function tourParameter(scrollY: number, sectionTops: readonly number[], dwell = 0.4): number {
  const n = sectionTops.length;
  if (n === 0) return 0;
  if (scrollY <= sectionTops[0]) return 0;
  if (scrollY >= sectionTops[n - 1]) return n - 1;
  let i = 0;
  while (i < n - 2 && scrollY >= sectionTops[i + 1]) i++;
  const span = sectionTops[i + 1] - sectionTops[i];
  if (span <= 0) return i;
  const local = (scrollY - sectionTops[i]) / span;
  if (local <= dwell) return i;
  const flight = (local - dwell) / (1 - dwell);
  return i + smoothstep(flight);
}

export const sectionAt = (t: number): number => Math.round(t);

/** 1 while parked on section i, falling to 0 half way to a neighbour. */
export const sectionProximity = (t: number, i: number): number => clamp(1 - Math.abs(t - i) / 0.5, 0, 1);
