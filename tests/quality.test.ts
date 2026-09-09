import { describe, expect, it } from "vitest";
import { detectQuality, qualitySettings } from "@/lib/quality";

describe("detectQuality", () => {
  it("returns the lowest tier for coarse pointers", () => {
    expect(detectQuality({ coarsePointer: true, cores: 16, memory: 16 })).toBe(0);
  });
  it("returns the lowest tier for few cores or little memory", () => {
    expect(detectQuality({ coarsePointer: false, cores: 4, memory: 16 })).toBe(0);
    expect(detectQuality({ coarsePointer: false, cores: 16, memory: 4 })).toBe(0);
  });
  it("returns the middle tier for eight cores", () => {
    expect(detectQuality({ coarsePointer: false, cores: 8, memory: 8 })).toBe(1);
  });
  it("returns the top tier for many cores", () => {
    expect(detectQuality({ coarsePointer: false, cores: 16, memory: 16 })).toBe(2);
  });
  it("treats unknown memory as plenty", () => {
    expect(detectQuality({ coarsePointer: false, cores: 16 })).toBe(2);
  });
});

describe("qualitySettings", () => {
  it("disables post-processing on the lowest tier only", () => {
    expect(qualitySettings(0).post).toBe(false);
    expect(qualitySettings(1).post).toBe(true);
    expect(qualitySettings(2).post).toBe(true);
  });
  it("scales particle counts up with the tier", () => {
    expect(qualitySettings(0).stars).toBeLessThan(qualitySettings(1).stars);
    expect(qualitySettings(1).stars).toBeLessThan(qualitySettings(2).stars);
    expect(qualitySettings(0).asteroids).toBeLessThan(qualitySettings(2).asteroids);
  });
  it("caps device pixel ratio lower on weaker tiers", () => {
    expect(qualitySettings(0).maxDpr).toBeLessThan(qualitySettings(2).maxDpr);
  });
});
