import { DEG } from "./math";

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export interface OrbitSpec {
  /** Distance from the parent body in scene units. 0 means the body does not orbit. */
  orbitRadius: number;
  /** Seconds for one revolution at time scale 1. */
  orbitPeriod: number;
  /** Starting angle in radians. */
  phase: number;
  /** Tilt of the orbital plane about the x axis, in degrees. */
  inclination?: number;
}

export function orbitAngle(spec: OrbitSpec, time: number): number {
  if (spec.orbitPeriod <= 0) return spec.phase;
  return spec.phase + (Math.PI * 2 * time) / spec.orbitPeriod;
}

/** Position on a circular, optionally inclined orbit centred on the origin. */
export function orbitalPosition<T extends Vec3Like>(spec: OrbitSpec, time: number, out: T): T {
  if (spec.orbitRadius === 0) {
    out.x = 0;
    out.y = 0;
    out.z = 0;
    return out;
  }
  const a = orbitAngle(spec, time);
  const r = spec.orbitRadius;
  const x = Math.cos(a) * r;
  const zPlanar = Math.sin(a) * r;
  const inc = (spec.inclination ?? 0) * DEG;
  out.x = x;
  out.y = zPlanar * Math.sin(inc);
  out.z = zPlanar * Math.cos(inc);
  return out;
}
