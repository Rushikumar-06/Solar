import { describe, expect, it } from "vitest";
import { BODIES, MOON_IDS, PRIMARY_ORDER, type Body } from "@/data/bodies";
import { DEG, clamp } from "@/lib/math";
import { orbitalPosition } from "@/lib/orbits";
import { spinAngle, spinFrame } from "@/lib/spin";

interface V {
  x: number;
  y: number;
  z: number;
}

const vec = (): V => ({ x: 0, y: 0, z: 0 });
const dot = (a: V, b: V) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: V, b: V): V => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const unit = (v: V): V => {
  const l = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
};
const angleBetween = (a: V, b: V) => Math.acos(clamp(dot(unit(a), unit(b)), -1, 1)) / DEG;

/** Applies the spin frame, which the scene hangs on a group as an Euler in ZYX order. */
function tilt(body: Body, v: V): V {
  const { x: rx, z: rz } = spinFrame(body);
  const a = { x: v.x, y: v.y * Math.cos(rx) - v.z * Math.sin(rx), z: v.y * Math.sin(rx) + v.z * Math.cos(rx) };
  return { x: a.x * Math.cos(rz) - a.y * Math.sin(rz), y: a.x * Math.sin(rz) + a.y * Math.cos(rz), z: a.z };
}

/** Where the body's prime meridian, object-space +x, points at a given time. */
function meridian(body: Body, time: number): V {
  const a = spinAngle(body, time);
  return tilt(body, { x: Math.cos(a), y: 0, z: -Math.sin(a) });
}

/** The spin as a vector: along the axis for a body turning forwards, against it otherwise. */
function spinVector(body: Body): V {
  const rate = spinAngle(body, 1) - spinAngle(body, 0);
  const axis = tilt(body, { x: 0, y: 1, z: 0 });
  return { x: axis.x * rate, y: axis.y * rate, z: axis.z * rate };
}

/** Orbital angular momentum, r cross v: the direction the orbit turns about. */
function orbitVector(body: Body, time = 0): V {
  const r = orbitalPosition(body.orbit, time, vec());
  const next = orbitalPosition(body.orbit, time + 0.01, vec());
  return cross(r, { x: next.x - r.x, y: next.y - r.y, z: next.z - r.z });
}

const SAMPLE_TIMES = [0, 3.7, 21.4, 96.2, 613.5];

describe("spin frames", () => {
  it("leans a planet by its axial tilt, in a direction that never changes", () => {
    for (const id of PRIMARY_ORDER) {
      const body = BODIES[id];
      const axis = tilt(body, { x: 0, y: 1, z: 0 });
      expect(angleBetween(axis, { x: 0, y: 1, z: 0 })).toBeCloseTo(body.axialTilt, 6);
    }
  });

  it("stands a moon's axis square to the orbit it travels, give or take its own tilt", () => {
    for (const id of MOON_IDS) {
      const body = BODIES[id];
      expect(angleBetween(spinVector(body), orbitVector(body))).toBeCloseTo(body.axialTilt, 5);
    }
  });

  it("keeps our own Moon's axis all but upright, as the real one is", () => {
    // 6.7 degrees from its orbit and 5 of orbital inclination cancel down to
    // little more than one degree away from the ecliptic.
    expect(angleBetween(tilt(BODIES.moon, { x: 0, y: 1, z: 0 }), { x: 0, y: 1, z: 0 })).toBeCloseTo(1.7, 6);
  });
});

describe("spin direction", () => {
  const northward = (body: Body) => spinVector(body).y;

  it("turns most worlds the same way they orbit", () => {
    for (const id of ["mercury", "earth", "mars", "jupiter", "saturn", "neptune"] as const) {
      expect(northward(BODIES[id])).toBeGreaterThan(0);
      expect(orbitVector(BODIES[id]).y).toBeGreaterThan(0);
    }
  });

  it("turns the three tipped-over worlds backwards", () => {
    for (const id of ["venus", "uranus", "pluto"] as const) {
      expect(BODIES[id].axialTilt).toBeGreaterThan(90);
      expect(northward(BODIES[id])).toBeLessThan(0);
    }
  });

  it("carries every moon round its planet the way that planet turns, except Triton", () => {
    for (const id of MOON_IDS) {
      const moon = BODIES[id];
      const planet = BODIES[moon.parent!];
      const together = dot(orbitVector(moon), spinVector(planet));
      if (id === "triton") expect(together).toBeLessThan(0);
      else expect(together).toBeGreaterThan(0);
    }
  });
});

describe("tidal locking", () => {
  it("holds one face of every moon toward its planet", () => {
    for (const id of MOON_IDS) {
      const moon = BODIES[id];
      for (const t of SAMPLE_TIMES) {
        const home = orbitalPosition(moon.orbit, t, vec());
        const toPlanet = { x: -home.x, y: -home.y, z: -home.z };
        // The near side wanders by the moon's own tilt and no further: that
        // wander is the libration that lets us see round the edge of ours.
        expect(angleBetween(meridian(moon, t), toPlanet)).toBeLessThanOrEqual(moon.axialTilt + 1e-3);
      }
    }
  });

  it("holds Pluto and Charon facing each other, the only pair that does", () => {
    for (const t of SAMPLE_TIMES) {
      const charon = orbitalPosition(BODIES.charon.orbit, t, vec());
      expect(angleBetween(meridian(BODIES.pluto, t), charon)).toBeCloseTo(0, 3);
    }
    expect(Object.values(BODIES).filter((b) => b.tidalLock && !b.parent)).toEqual([BODIES.pluto]);
  });

  it("turns a locked body exactly once per orbit", () => {
    for (const id of MOON_IDS) {
      const moon = BODIES[id];
      const turn = spinAngle(moon, moon.orbit.orbitPeriod) - spinAngle(moon, 0);
      expect(turn).toBeCloseTo(Math.PI * 2, 9);
    }
  });

  it("turns an unlocked body once per rotation period", () => {
    for (const id of PRIMARY_ORDER) {
      const body = BODIES[id];
      if (body.tidalLock || body.rotationPeriod === 0) continue;
      expect(spinAngle(body, body.rotationPeriod) - spinAngle(body, 0)).toBeCloseTo(Math.PI * 2, 9);
    }
  });
});
