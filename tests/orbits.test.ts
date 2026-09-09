import { describe, expect, it } from "vitest";
import { orbitAngle, orbitalPosition } from "@/lib/orbits";

const circle = { orbitRadius: 10, orbitPeriod: 100, phase: 0, inclination: 0 };

describe("orbitAngle", () => {
  it("starts at the phase angle", () => {
    expect(orbitAngle({ ...circle, phase: 1.2 }, 0)).toBeCloseTo(1.2, 10);
  });
  it("advances a full turn per period", () => {
    expect(orbitAngle(circle, 100)).toBeCloseTo(Math.PI * 2, 10);
  });
});

describe("orbitalPosition", () => {
  it("sits on the +x axis at time zero", () => {
    const p = orbitalPosition(circle, 0, { x: 0, y: 0, z: 0 });
    expect(p.x).toBeCloseTo(10, 10);
    expect(p.y).toBeCloseTo(0, 10);
    expect(p.z).toBeCloseTo(0, 10);
  });
  it("reaches the +z axis after a quarter period", () => {
    const p = orbitalPosition(circle, 25, { x: 0, y: 0, z: 0 });
    expect(p.x).toBeCloseTo(0, 10);
    expect(p.z).toBeCloseTo(10, 10);
  });
  it("returns to the start after a full period", () => {
    const p = orbitalPosition(circle, 100, { x: 0, y: 0, z: 0 });
    expect(p.x).toBeCloseTo(10, 10);
    expect(p.z).toBeCloseTo(0, 10);
  });
  it("lifts out of the plane when inclined", () => {
    const tilted = { ...circle, inclination: 90 };
    const p = orbitalPosition(tilted, 25, { x: 0, y: 0, z: 0 });
    expect(p.y).toBeCloseTo(10, 10);
    expect(p.z).toBeCloseTo(0, 10);
  });
  it("stays at the origin when the orbit radius is zero", () => {
    const p = orbitalPosition({ ...circle, orbitRadius: 0 }, 42, { x: 1, y: 1, z: 1 });
    expect(p).toEqual({ x: 0, y: 0, z: 0 });
  });
  it("writes into and returns the provided output object", () => {
    const out = { x: 0, y: 0, z: 0 };
    expect(orbitalPosition(circle, 0, out)).toBe(out);
  });
});
