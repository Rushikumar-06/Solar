import { describe, expect, it } from "vitest";
import { createRandom } from "@/lib/random";

describe("createRandom", () => {
  it("produces the same sequence for the same seed", () => {
    const a = createRandom(42);
    const b = createRandom(42);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });
  it("produces different sequences for different seeds", () => {
    const a = createRandom(1);
    const b = createRandom(2);
    expect([a(), a(), a()]).not.toEqual([b(), b(), b()]);
  });
  it("stays within the half-open unit range and is not constant", () => {
    const r = createRandom(7);
    const values = Array.from({ length: 2000 }, () => r());
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(new Set(values).size).toBeGreaterThan(1900);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });
});
