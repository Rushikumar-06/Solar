import { describe, expect, it } from "vitest";
import { sectionAt, sectionProximity, tourParameter } from "@/lib/tour";

// Three sections, each 1000px tall, then a final one.
const tops = [0, 1000, 2000, 3000];

describe("tourParameter", () => {
  it("is the section index at the top of a section", () => {
    expect(tourParameter(0, tops)).toBe(0);
    expect(tourParameter(1000, tops)).toBe(1);
    expect(tourParameter(2000, tops)).toBe(2);
  });
  it("holds on the section during the dwell portion", () => {
    expect(tourParameter(1200, tops, 0.4)).toBe(1);
    expect(tourParameter(1399, tops, 0.4)).toBe(1);
  });
  it("is half way between sections in the middle of the flight", () => {
    // flight runs from 1400 to 2000; midpoint 1700
    expect(tourParameter(1700, tops, 0.4)).toBeCloseTo(1.5, 10);
  });
  it("eases in and out of the flight", () => {
    const early = tourParameter(1460, tops, 0.4) - 1;
    const late = 2 - tourParameter(1940, tops, 0.4);
    expect(early).toBeGreaterThan(0);
    expect(early).toBeLessThan(0.1);
    expect(early).toBeCloseTo(late, 10);
  });
  it("clamps before the first and after the last section", () => {
    expect(tourParameter(-500, tops)).toBe(0);
    expect(tourParameter(3500, tops)).toBe(3);
    expect(tourParameter(99999, tops)).toBe(3);
  });
  it("never decreases as scroll increases", () => {
    let last = -1;
    for (let y = -100; y <= 3200; y += 7) {
      const t = tourParameter(y, tops, 0.4);
      expect(t).toBeGreaterThanOrEqual(last);
      last = t;
    }
  });
  it("returns 0 when there are no sections", () => {
    expect(tourParameter(500, [])).toBe(0);
  });
});

describe("sectionAt", () => {
  it("rounds to the nearest section", () => {
    expect(sectionAt(1.2)).toBe(1);
    expect(sectionAt(1.6)).toBe(2);
  });
});

describe("sectionProximity", () => {
  it("is 1 when parked on the section and fades to 0 half way to the next", () => {
    expect(sectionProximity(2, 2)).toBe(1);
    expect(sectionProximity(2.25, 2)).toBeCloseTo(0.5, 10);
    expect(sectionProximity(2.5, 2)).toBe(0);
    expect(sectionProximity(3.4, 2)).toBe(0);
  });
});
