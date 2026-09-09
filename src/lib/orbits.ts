import { DEG, clamp } from "./math";

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export interface OrbitSpec {
  /** Semi-major axis in scene units (the radius for a circular orbit). 0 means the body does not orbit. */
  orbitRadius: number;
  /** Seconds for one revolution at time scale 1. 0 holds the phase; negative runs backwards. */
  orbitPeriod: number;
  /** Mean anomaly at time zero, in radians. 0 is perihelion on the +x axis. */
  phase: number;
  /** Tilt of the orbital plane about the x axis, in degrees. */
  inclination?: number;
  /** 0 (circle) to 0.95. The parent sits at a focus of the ellipse. */
  eccentricity?: number;
}

export const MAX_ECCENTRICITY = 0.95;

/** Mean anomaly at `time`: the phase advanced by one turn per period. */
export function orbitAngle(spec: OrbitSpec, time: number): number {
  if (spec.orbitPeriod === 0) return spec.phase;
  return spec.phase + (Math.PI * 2 * time) / spec.orbitPeriod;
}

const TWO_PI = Math.PI * 2;

/**
 * Solve Kepler's equation E - e sin E = M for the eccentric anomaly E.
 * Newton's method from Danby's starting guess converges for every e below 1.
 */
export function solveKepler(meanAnomaly: number, eccentricity: number): number {
  const e = clamp(eccentricity, 0, MAX_ECCENTRICITY);
  if (e === 0) return meanAnomaly;
  // Work in (-pi, pi] and add the whole turns back at the end.
  const turns = Math.round(meanAnomaly / TWO_PI);
  const m = meanAnomaly - turns * TWO_PI;
  let E = m + 0.85 * e * Math.sign(Math.sin(m));
  for (let i = 0; i < 50; i++) {
    const f = E - e * Math.sin(E) - m;
    const fp = 1 - e * Math.cos(E);
    const dE = f / fp;
    E -= dE;
    if (Math.abs(dE) < 1e-15) break;
  }
  return E + turns * TWO_PI;
}

/** True anomaly (angle from perihelion as seen from the focus) for an eccentric anomaly. */
export function trueAnomaly(eccentricAnomaly: number, eccentricity: number): number {
  const e = clamp(eccentricity, 0, MAX_ECCENTRICITY);
  const half = eccentricAnomaly / 2;
  return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(half), Math.sqrt(1 - e) * Math.cos(half));
}

/** Position on a circular or elliptical, optionally inclined orbit whose parent sits at the origin. */
export function orbitalPosition<T extends Vec3Like>(spec: OrbitSpec, time: number, out: T): T {
  if (spec.orbitRadius === 0) {
    out.x = 0;
    out.y = 0;
    out.z = 0;
    return out;
  }
  const e = clamp(spec.eccentricity ?? 0, 0, MAX_ECCENTRICITY);
  const M = orbitAngle(spec, time);
  let x: number;
  let zPlanar: number;
  if (e === 0) {
    x = Math.cos(M) * spec.orbitRadius;
    zPlanar = Math.sin(M) * spec.orbitRadius;
  } else {
    const nu = trueAnomaly(solveKepler(M, e), e);
    const r = (spec.orbitRadius * (1 - e * e)) / (1 + e * Math.cos(nu));
    x = Math.cos(nu) * r;
    zPlanar = Math.sin(nu) * r;
  }
  const inc = (spec.inclination ?? 0) * DEG;
  out.x = x;
  out.y = zPlanar * Math.sin(inc);
  out.z = zPlanar * Math.cos(inc);
  return out;
}
