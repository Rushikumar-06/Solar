export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Hermite ease, clamped to the unit range. */
export const smoothstep = (t: number): number => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

/** Frame-rate independent exponential approach toward a target. */
export const damp = (current: number, target: number, lambda: number, dt: number): number =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

export const DEG = Math.PI / 180;
