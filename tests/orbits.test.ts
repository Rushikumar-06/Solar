import { describe, expect, it } from "vitest";
import { orbitAngle, orbitalPosition, solveKepler, trueAnomaly, type OrbitSpec } from "@/lib/orbits";

const circle = { orbitRadius: 10, orbitPeriod: 100, phase: 0, inclination: 0 };
const vec = () => ({ x: 0, y: 0, z: 0 });
const len = (v: { x: number; y: number; z: number }) => Math.hypot(v.x, v.y, v.z);

describe("orbitAngle", () => {
  it("starts at the phase angle", () => {
    expect(orbitAngle({ ...circle, phase: 1.2 }, 0)).toBeCloseTo(1.2, 10);
  });
  it("advances a full turn per period", () => {
    expect(orbitAngle(circle, 100)).toBeCloseTo(Math.PI * 2, 10);
  });
  it("holds the phase when the period is zero", () => {
    expect(orbitAngle({ ...circle, orbitPeriod: 0, phase: 0.7 }, 500)).toBeCloseTo(0.7, 10);
  });
  it("runs backwards for a negative period", () => {
    expect(orbitAngle({ ...circle, orbitPeriod: -100 }, 25)).toBeCloseTo(-Math.PI / 2, 10);
  });
});

describe("solveKepler", () => {
  it("returns the mean anomaly for a circular orbit", () => {
    expect(solveKepler(1.1, 0)).toBeCloseTo(1.1, 12);
  });
  it("satisfies Kepler's equation for a range of anomalies and eccentricities", () => {
    for (const e of [0.05, 0.3, 0.75, 0.95]) {
      for (let i = -12; i <= 12; i++) {
        const M = (i / 12) * Math.PI * 1.5;
        const E = solveKepler(M, e);
        // E - e sin E must equal M modulo a full turn.
        const residual = E - e * Math.sin(E) - M;
        const wrapped = residual - Math.round(residual / (Math.PI * 2)) * Math.PI * 2;
        expect(Math.abs(wrapped)).toBeLessThan(1e-10);
      }
    }
  });
  it("is odd in the mean anomaly", () => {
    expect(solveKepler(-0.8, 0.75)).toBeCloseTo(-solveKepler(0.8, 0.75), 12);
  });
});

describe("trueAnomaly", () => {
  it("matches the eccentric anomaly at perihelion and aphelion", () => {
    expect(trueAnomaly(0, 0.75)).toBeCloseTo(0, 12);
    expect(Math.abs(trueAnomaly(Math.PI, 0.75))).toBeCloseTo(Math.PI, 12);
  });
  it("runs ahead of the eccentric anomaly on the way out from perihelion", () => {
    expect(trueAnomaly(1, 0.75)).toBeGreaterThan(1);
  });
});

describe("orbitalPosition (circular)", () => {
  it("sits on the +x axis at time zero", () => {
    const p = orbitalPosition(circle, 0, vec());
    expect(p.x).toBeCloseTo(10, 10);
    expect(p.y).toBeCloseTo(0, 10);
    expect(p.z).toBeCloseTo(0, 10);
  });
  it("reaches the +z axis after a quarter period", () => {
    const p = orbitalPosition(circle, 25, vec());
    expect(p.x).toBeCloseTo(0, 10);
    expect(p.z).toBeCloseTo(10, 10);
  });
  it("returns to the start after a full period", () => {
    const p = orbitalPosition(circle, 100, vec());
    expect(p.x).toBeCloseTo(10, 10);
    expect(p.z).toBeCloseTo(0, 10);
  });
  it("lifts out of the plane when inclined", () => {
    const tilted = { ...circle, inclination: 90 };
    const p = orbitalPosition(tilted, 25, vec());
    expect(p.y).toBeCloseTo(10, 10);
    expect(p.z).toBeCloseTo(0, 10);
  });
  it("stays at the origin when the orbit radius is zero", () => {
    const p = orbitalPosition({ ...circle, orbitRadius: 0 }, 42, { x: 1, y: 1, z: 1 });
    expect(p).toEqual({ x: 0, y: 0, z: 0 });
  });
  it("writes into and returns the provided output object", () => {
    const out = vec();
    expect(orbitalPosition(circle, 0, out)).toBe(out);
  });
  it("treats an explicit eccentricity of zero exactly like a circle", () => {
    for (const t of [0, 7, 33, 61, 99]) {
      const a = orbitalPosition(circle, t, vec());
      const b = orbitalPosition({ ...circle, eccentricity: 0 }, t, vec());
      expect(b.x).toBeCloseTo(a.x, 12);
      expect(b.y).toBeCloseTo(a.y, 12);
      expect(b.z).toBeCloseTo(a.z, 12);
    }
  });
  it("runs the orbit backwards for a negative period", () => {
    const forward = orbitalPosition(circle, 25, vec());
    const backward = orbitalPosition({ ...circle, orbitPeriod: -100 }, 25, vec());
    expect(backward.x).toBeCloseTo(forward.x, 10);
    expect(backward.z).toBeCloseTo(-forward.z, 10);
  });
});

describe("orbitalPosition (elliptical)", () => {
  const a = 76;
  const e = 0.75;
  const ellipse: OrbitSpec = { orbitRadius: a, orbitPeriod: 420, phase: 0, inclination: 0, eccentricity: e };

  it("starts at perihelion on the +x axis, a(1 - e) from the Sun", () => {
    const p = orbitalPosition(ellipse, 0, vec());
    expect(p.x).toBeCloseTo(a * (1 - e), 9);
    expect(p.y).toBeCloseTo(0, 9);
    expect(p.z).toBeCloseTo(0, 9);
  });
  it("reaches aphelion on the -x axis, a(1 + e) from the Sun, after half a period", () => {
    const p = orbitalPosition(ellipse, 210, vec());
    expect(p.x).toBeCloseTo(-a * (1 + e), 9);
    expect(p.z).toBeCloseTo(0, 9);
  });
  it("keeps the distance from the Sun within [a(1 - e), a(1 + e)]", () => {
    for (let i = 0; i <= 200; i++) {
      const r = len(orbitalPosition(ellipse, (i / 200) * 420, vec()));
      expect(r).toBeGreaterThanOrEqual(a * (1 - e) - 1e-9);
      expect(r).toBeLessThanOrEqual(a * (1 + e) + 1e-9);
    }
  });
  it("keeps the Sun at a focus: distances to both foci always sum to 2a", () => {
    const fx = -2 * a * e;
    for (let i = 0; i < 97; i++) {
      const p = orbitalPosition(ellipse, (i / 97) * 420, vec());
      const d1 = len(p);
      const d2 = Math.hypot(p.x - fx, p.y, p.z);
      expect(d1 + d2).toBeCloseTo(2 * a, 8);
    }
  });
  it("closes the loop after one period", () => {
    const start = orbitalPosition(ellipse, 0, vec());
    const end = orbitalPosition(ellipse, 420, vec());
    expect(end.x).toBeCloseTo(start.x, 8);
    expect(end.z).toBeCloseTo(start.z, 8);
    const q = orbitalPosition(ellipse, 100, vec());
    const q2 = orbitalPosition(ellipse, 100 + 420 * 3, vec());
    expect(q2.x).toBeCloseTo(q.x, 8);
    expect(q2.z).toBeCloseTo(q.z, 8);
  });
  it("moves fastest near perihelion and slowest near aphelion", () => {
    const dt = 0.5;
    const nearPeri = len(
      (() => {
        const p1 = orbitalPosition(ellipse, 0, vec());
        const p2 = orbitalPosition(ellipse, dt, vec());
        return { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
      })(),
    );
    const nearAp = len(
      (() => {
        const p1 = orbitalPosition(ellipse, 210, vec());
        const p2 = orbitalPosition(ellipse, 210 + dt, vec());
        return { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
      })(),
    );
    expect(nearPeri).toBeGreaterThan(nearAp * 5);
  });
  it("applies the inclination about the x axis, keeping perihelion on +x", () => {
    const tilted = { ...ellipse, inclination: 30 };
    const peri = orbitalPosition(tilted, 0, vec());
    expect(peri.x).toBeCloseTo(a * (1 - e), 9);
    expect(peri.y).toBeCloseTo(0, 9);
    const p = orbitalPosition(tilted, 105, vec());
    const flat = orbitalPosition(ellipse, 105, vec());
    expect(p.x).toBeCloseTo(flat.x, 9);
    expect(p.y).toBeCloseTo(flat.z * Math.sin(Math.PI / 6), 9);
    expect(p.z).toBeCloseTo(flat.z * Math.cos(Math.PI / 6), 9);
  });
  it("runs the ellipse backwards for a negative period", () => {
    const forward = orbitalPosition(ellipse, 50, vec());
    const backward = orbitalPosition({ ...ellipse, orbitPeriod: -420 }, 50, vec());
    expect(backward.x).toBeCloseTo(forward.x, 9);
    expect(backward.z).toBeCloseTo(-forward.z, 9);
  });
  it("draws the ellipse when the phase is stepped with a zero period, as OrbitLines does", () => {
    const fx = -2 * a * e;
    for (let i = 0; i < 64; i++) {
      const p = orbitalPosition({ ...ellipse, phase: (i / 64) * Math.PI * 2, orbitPeriod: 0 }, 0, vec());
      expect(len(p) + Math.hypot(p.x - fx, p.y, p.z)).toBeCloseTo(2 * a, 8);
    }
  });
  it("clamps the eccentricity so the orbit stays bounded", () => {
    const p = orbitalPosition({ ...ellipse, eccentricity: 0.999 }, 0, vec());
    expect(p.x).toBeCloseTo(a * (1 - 0.95), 9);
    const n = orbitalPosition({ ...ellipse, eccentricity: -0.5 }, 105, vec());
    expect(len(n)).toBeCloseTo(a, 9);
  });
});
