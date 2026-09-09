import { describe, expect, it } from "vitest";
import { clamp, damp, lerp, smoothstep } from "@/lib/math";

describe("clamp", () => {
  it("keeps values inside the range", () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-2, 0, 1)).toBe(0);
    expect(clamp(0.4, 0, 1)).toBe(0.4);
  });
});

describe("lerp", () => {
  it("interpolates linearly", () => {
    expect(lerp(0, 10, 0.25)).toBe(2.5);
  });
});

describe("smoothstep", () => {
  it("is 0 at the start, 1 at the end and 0.5 in the middle", () => {
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(1)).toBe(1);
    expect(smoothstep(0.5)).toBeCloseTo(0.5, 10);
  });
  it("clamps outside the unit range", () => {
    expect(smoothstep(-3)).toBe(0);
    expect(smoothstep(7)).toBe(1);
  });
});

describe("damp", () => {
  it("moves toward the target without overshooting", () => {
    const next = damp(0, 10, 4, 0.1);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(10);
  });
  it("does not move when no time has passed", () => {
    expect(damp(3, 10, 4, 0)).toBe(3);
  });
  it("reaches the target after a long time", () => {
    expect(damp(3, 10, 4, 100)).toBeCloseTo(10, 6);
  });
});
