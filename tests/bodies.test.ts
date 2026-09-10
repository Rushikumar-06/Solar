import { describe, expect, it } from "vitest";
import { BODIES, BODY_ORDER, MOON_IDS, PRIMARY_ORDER, TOUR_SECTIONS, bodyFor, moonsOf } from "@/data/bodies";

const HEX = /^#[0-9a-f]{6}$/i;

describe("bodies data", () => {
  it("lists every body exactly once in the tour order", () => {
    const ids = Object.keys(BODIES).sort();
    expect([...BODY_ORDER].sort()).toEqual(ids);
    expect(new Set(BODY_ORDER).size).toBe(BODY_ORDER.length);
  });
  it("runs the tour from hero to outro through every body", () => {
    expect(TOUR_SECTIONS[0]).toBe("hero");
    expect(TOUR_SECTIONS[TOUR_SECTIONS.length - 1]).toBe("outro");
    const middle = TOUR_SECTIONS.slice(1, -1);
    expect(middle).toEqual(PRIMARY_ORDER.filter((id) => id !== "comet"));
  });
  it("orders orbiting bodies outward from the Sun", () => {
    const radii = BODY_ORDER.filter((id) => !BODIES[id].parent && id !== "sun" && BODIES[id].family !== "comet").map(
      (id) => BODIES[id].orbit.orbitRadius,
    );
    for (let i = 1; i < radii.length; i++) expect(radii[i]).toBeGreaterThan(radii[i - 1]);
  });
  it("gives every body a story, a wonder line and four stats", () => {
    for (const body of Object.values(BODIES)) {
      expect(body.story.split(/\s+/).length).toBeLessThanOrEqual(50);
      expect(body.wonder.length).toBeGreaterThan(10);
      expect(body.stats).toHaveLength(4);
      for (const s of body.stats) {
        expect(s.label.length).toBeGreaterThan(0);
        expect(s.value.length).toBeGreaterThan(0);
      }
    }
  });
  it("uses valid hex colours in every palette", () => {
    for (const body of Object.values(BODIES)) {
      expect(body.palette).toHaveLength(4);
      for (const c of body.palette) expect(c).toMatch(HEX);
    }
  });
  it("puts the comet on a retrograde ellipse that reaches from inside Venus to Pluto's orbit", () => {
    const { orbit } = BODIES.comet;
    expect(orbit.eccentricity).toBeGreaterThan(0.5);
    expect(orbit.orbitPeriod).toBeLessThan(0);
    const perihelion = orbit.orbitRadius * (1 - (orbit.eccentricity ?? 0));
    const aphelion = orbit.orbitRadius * (1 + (orbit.eccentricity ?? 0));
    expect(perihelion).toBeGreaterThan(BODIES.mercury.orbit.orbitRadius);
    expect(perihelion).toBeLessThan(BODIES.venus.orbit.orbitRadius);
    expect(aphelion).toBeCloseTo(BODIES.pluto.orbit.orbitRadius, -1);
  });
  it("attaches the Moon to Earth", () => {
    expect(BODIES.moon.parent).toBe("earth");
  });
  it("never uses an em dash in visible copy", () => {
    for (const body of Object.values(BODIES)) {
      const text = [body.name, body.epithet, body.story, body.wonder, ...body.stats.map((s) => s.value)].join(" ");
      expect(text).not.toMatch(/[—–]/);
    }
  });
  it("hangs every moon off a planet that is not itself a moon", () => {
    for (const id of MOON_IDS) {
      const parent = BODIES[id].parent;
      expect(parent).toBeDefined();
      expect(BODIES[parent!]).toBeDefined();
      expect(BODIES[parent!].parent).toBeUndefined();
    }
  });
  it("lists a moon after its parent, which is what updatePositions relies on", () => {
    for (const id of MOON_IDS) {
      expect(BODY_ORDER.indexOf(id)).toBeGreaterThan(BODY_ORDER.indexOf(BODIES[id].parent!));
    }
  });
  it("keeps every moon clear of its planet's surface and rings", () => {
    for (const id of MOON_IDS) {
      const moon = BODIES[id];
      const planet = BODIES[moon.parent!];
      const clearance = Math.max(planet.radius + 0.9, planet.rings?.outer ?? 0);
      expect(moon.orbit.orbitRadius).toBeGreaterThan(clearance + moon.radius);
    }
  });
  it("turns the inner moons of a planet faster than the outer ones", () => {
    for (const id of PRIMARY_ORDER) {
      const moons = moonsOf(id);
      for (let i = 1; i < moons.length; i++) {
        expect(moons[i].orbit.orbitRadius).toBeGreaterThan(moons[i - 1].orbit.orbitRadius);
        expect(Math.abs(moons[i].orbit.orbitPeriod)).toBeGreaterThan(Math.abs(moons[i - 1].orbit.orbitPeriod));
      }
    }
  });
  it("locks every moon to its planet, so one face always points home", () => {
    for (const id of MOON_IDS) {
      expect(BODIES[id].tidalLock).toBe(BODIES[id].parent);
      expect(BODIES[id].rotationPeriod).toBe(BODIES[id].orbit.orbitPeriod);
    }
  });
  it("spells out a backwards spin once, either in the tilt or in the period", () => {
    // A world tipped past upright already turns the other way, so pairing that
    // with a negative period would quietly cancel it back to forwards.
    for (const body of Object.values(BODIES)) {
      if (body.axialTilt > 90) expect(body.rotationPeriod).toBeGreaterThan(0);
    }
  });
  it("keeps the moons of a planet in its equatorial plane, apart from our own", () => {
    for (const id of MOON_IDS) {
      if (id === "moon") continue;
      expect(BODIES[id].orbit.tiltZ).toBe(BODIES[BODIES[id].parent!].axialTilt);
    }
  });
  it("runs Triton backwards and makes Pluto's day Charon's month", () => {
    expect(BODIES.triton.orbit.orbitPeriod).toBeLessThan(0);
    expect(BODIES.charon.orbit.orbitPeriod).toBe(BODIES.pluto.rotationPeriod);
    expect(BODIES.pluto.tidalLock).toBe("charon");
  });
  it("gives the moonless planets no moons", () => {
    expect(moonsOf("mercury")).toEqual([]);
    expect(moonsOf("venus")).toEqual([]);
    expect(moonsOf("europa")).toEqual([]);
  });
  it("groups the Galilean moons under Jupiter, ordered outward", () => {
    expect(moonsOf("jupiter").map((b) => b.id)).toEqual(["io", "europa", "ganymede", "callisto"]);
  });
  it("keeps moons out of the tour and out of the primary order", () => {
    for (const id of MOON_IDS) {
      expect(TOUR_SECTIONS).not.toContain(id);
      expect(PRIMARY_ORDER).not.toContain(id);
    }
    expect([...PRIMARY_ORDER, ...MOON_IDS].sort()).toEqual([...BODY_ORDER].sort());
  });
  it("looks bodies up by id", () => {
    expect(bodyFor("jupiter").name).toBe("Jupiter");
  });
});
