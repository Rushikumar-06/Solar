import { describe, expect, it } from "vitest";
import { frameBody, type Pose } from "@/lib/camera";

const pose = (): Pose => ({ position: { x: 0, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } });
const len = (v: { x: number; y: number; z: number }) => Math.hypot(v.x, v.y, v.z);
const sub = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});
const dot = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) =>
  a.x * b.x + a.y * b.y + a.z * b.z;

const body = { x: 30, y: 0, z: 40 };

describe("frameBody", () => {
  it("places the camera at distanceFactor times the radius from the body", () => {
    const p = frameBody(body, 2, { distanceFactor: 4, side: 1 }, pose());
    expect(len(sub(p.position, body))).toBeCloseTo(8, 6);
  });
  it("views the body from its sunlit side", () => {
    const p = frameBody(body, 2, { distanceFactor: 4, side: 1 }, pose());
    const toSun = { x: -body.x, y: 0, z: -body.z };
    expect(dot(sub(p.position, body), toSun)).toBeGreaterThan(0);
  });
  it("mirrors the camera when the side flips", () => {
    const right = frameBody(body, 2, { distanceFactor: 4, side: 1 }, pose());
    const left = frameBody(body, 2, { distanceFactor: 4, side: -1 }, pose());
    // Same height and distance, different lateral position.
    expect(right.position.y).toBeCloseTo(left.position.y, 6);
    expect(len(sub(right.position, body))).toBeCloseTo(len(sub(left.position, body)), 6);
    expect(len(sub(right.position, left.position))).toBeGreaterThan(1);
  });
  it("offsets the look target sideways so the body sits off centre", () => {
    const p = frameBody(body, 2, { distanceFactor: 4, side: 1 }, pose());
    expect(len(sub(p.target, body))).toBeGreaterThan(0.1);
    const centred = frameBody(body, 2, { distanceFactor: 4, side: 0 }, pose());
    expect(len(sub(centred.target, body))).toBeCloseTo(0, 6);
  });
  it("still produces finite numbers for a body at the origin", () => {
    const p = frameBody({ x: 0, y: 0, z: 0 }, 6, { distanceFactor: 3, side: 1 }, pose());
    for (const v of [p.position.x, p.position.y, p.position.z, p.target.x, p.target.y, p.target.z]) {
      expect(Number.isFinite(v)).toBe(true);
    }
    expect(len(p.position)).toBeCloseTo(18, 6);
  });
  it("writes into and returns the provided pose", () => {
    const out = pose();
    expect(frameBody(body, 2, { distanceFactor: 4, side: 1 }, out)).toBe(out);
  });
});
