import type { OrbitSpec } from "@/lib/orbits";

export type BodyId =
  | "sun"
  | "mercury"
  | "venus"
  | "earth"
  | "moon"
  | "mars"
  | "belt"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "pluto"
  | "comet";

export type SectionId = "hero" | Exclude<BodyId, "moon" | "comet"> | "outro";

export type Family = "star" | "rocky" | "venus" | "earth" | "gas" | "ice" | "belt" | "comet";

export interface Stat {
  label: string;
  value: string;
}

export interface Body {
  id: BodyId;
  name: string;
  epithet: string;
  story: string;
  wonder: string;
  stats: Stat[];
  family: Family;
  /** Visual radius in scene units (compressed, not to scale). */
  radius: number;
  orbit: OrbitSpec;
  /** Seconds per rotation at time scale 1; negative spins backwards. */
  rotationPeriod: number;
  /** Axial tilt in degrees. */
  axialTilt: number;
  /** Four surface colours, dark to light. */
  palette: [string, string, string, string];
  atmosphere?: { color: string; strength: number };
  rings?: { inner: number; outer: number; color: string };
  /** Body this one orbits, if not the Sun. */
  parent?: BodyId;
  framing: { distanceFactor: number; side: -1 | 0 | 1 };
  /** Free-form shader parameters used by the body's material. */
  params?: Record<string, number>;
}

/** Seconds for Earth to complete one orbit at time scale 1. */
const EARTH_YEAR = 240;
/** Seconds for one Earth rotation at time scale 1. */
const EARTH_DAY = 40;

export const BODIES: Record<BodyId, Body> = {
  sun: {
    id: "sun",
    name: "The Sun",
    epithet: "Our star, a middle-aged yellow dwarf",
    story:
      "Everything in this system orbits a ball of plasma that holds 99.8 percent of all its mass. Light leaving its surface takes eight minutes to reach Earth and four hours to reach Neptune.",
    wonder: "About a million Earths would fit inside it.",
    stats: [
      { label: "Diameter", value: "1.39 million km" },
      { label: "Surface temperature", value: "5,500 °C" },
      { label: "Age", value: "4.6 billion years" },
      { label: "Rotation at the equator", value: "25 days" },
    ],
    family: "star",
    radius: 6,
    orbit: { orbitRadius: 0, orbitPeriod: 0, phase: 0 },
    rotationPeriod: EARTH_DAY * 25,
    axialTilt: 7,
    palette: ["#8a2e05", "#e0621c", "#ffb03a", "#ffe08a"],
    framing: { distanceFactor: 4.6, side: 1 },
  },
  mercury: {
    id: "mercury",
    name: "Mercury",
    epithet: "The scorched messenger",
    story:
      "The smallest planet races around the Sun in 88 days but turns so slowly that a single day lasts two of its years. With almost no air, its surface swings from 430 °C in sunlight to minus 180 °C at night.",
    wonder: "It keeps ice in craters that never see the Sun.",
    stats: [
      { label: "Distance from the Sun", value: "58 million km" },
      { label: "Diameter", value: "4,879 km" },
      { label: "Length of a day", value: "176 Earth days" },
      { label: "Length of a year", value: "88 Earth days" },
    ],
    family: "rocky",
    radius: 0.6,
    orbit: { orbitRadius: 14, orbitPeriod: EARTH_YEAR * 0.241, phase: 0.3 },
    rotationPeriod: EARTH_DAY * 58.6,
    axialTilt: 0.03,
    palette: ["#35312f", "#69635f", "#98928c", "#c9c3bb"],
    framing: { distanceFactor: 4.8, side: -1 },
    params: { craters: 1.0, roughness: 0.9, rays: 0.6 },
  },
  venus: {
    id: "venus",
    name: "Venus",
    epithet: "Earth's twin, wrapped in acid clouds",
    story:
      "Almost the same size as Earth, Venus hides under clouds of sulphuric acid. Its thick carbon-dioxide air traps heat until the surface reaches 465 °C, hot enough to melt lead, and presses down like the deep sea.",
    wonder: "It spins backwards, so the Sun rises in the west.",
    stats: [
      { label: "Distance from the Sun", value: "108 million km" },
      { label: "Diameter", value: "12,104 km" },
      { label: "Length of a day", value: "243 Earth days" },
      { label: "Length of a year", value: "225 Earth days" },
    ],
    family: "venus",
    radius: 1.15,
    orbit: { orbitRadius: 20, orbitPeriod: EARTH_YEAR * 0.615, phase: 1.9 },
    rotationPeriod: -EARTH_DAY * 243,
    axialTilt: 177,
    palette: ["#8a5a1d", "#c98a3a", "#e6b567", "#f5dfa8"],
    atmosphere: { color: "#f3d59a", strength: 0.9 },
    framing: { distanceFactor: 4.8, side: 1 },
    params: { atmoThickness: 1.6 },
  },
  earth: {
    id: "earth",
    name: "Earth",
    epithet: "The only world known to hold life",
    story:
      "Seven tenths of its surface is liquid water, kept that way by a thin atmosphere and a distance from the Sun that is neither too near nor too far. It is the one place we know where oceans, weather and life meet.",
    wonder: "The Moon slows Earth's spin by about two milliseconds every century.",
    stats: [
      { label: "Distance from the Sun", value: "150 million km" },
      { label: "Diameter", value: "12,742 km" },
      { label: "Length of a day", value: "24 hours" },
      { label: "Length of a year", value: "365.25 days" },
    ],
    family: "earth",
    radius: 1.2,
    orbit: { orbitRadius: 27, orbitPeriod: EARTH_YEAR, phase: 3.4 },
    rotationPeriod: EARTH_DAY,
    axialTilt: 23.4,
    palette: ["#0b2a5c", "#1f6fb5", "#3d8a3c", "#c9c7a1"],
    atmosphere: { color: "#5aa9ff", strength: 1.0 },
    framing: { distanceFactor: 4.2, side: -1 },
    params: { aurora: 1, cloudCover: 0.6 },
  },
  moon: {
    id: "moon",
    name: "The Moon",
    epithet: "Earth's constant companion",
    story:
      "Born from a giant impact more than four billion years ago, the Moon keeps one face turned toward Earth. Its pull raises our tides and steadies the tilt that gives us seasons.",
    wonder: "It drifts away from Earth by about 3.8 centimetres a year.",
    stats: [
      { label: "Distance from Earth", value: "384,400 km" },
      { label: "Diameter", value: "3,474 km" },
      { label: "Length of a day", value: "29.5 Earth days" },
      { label: "One orbit of Earth", value: "27.3 days" },
    ],
    family: "rocky",
    radius: 0.32,
    orbit: { orbitRadius: 2.7, orbitPeriod: EARTH_YEAR * (27.3 / 365.25), phase: 0.8, inclination: 5 },
    rotationPeriod: EARTH_DAY * 27.3,
    axialTilt: 6.7,
    palette: ["#3c3c40", "#6b6b70", "#9a9a9e", "#c4c4c6"],
    parent: "earth",
    framing: { distanceFactor: 5, side: 0 },
    params: { craters: 1.2, roughness: 1.0, maria: 1, rays: 1 },
  },
  mars: {
    id: "mars",
    name: "Mars",
    epithet: "The cold red desert",
    story:
      "Rust in the soil paints Mars red. It has polar ice caps, dust storms that can swallow the whole planet, and the tallest volcano in the solar system, Olympus Mons, nearly three times the height of Everest.",
    wonder: "A day on Mars is only 37 minutes longer than ours.",
    stats: [
      { label: "Distance from the Sun", value: "228 million km" },
      { label: "Diameter", value: "6,779 km" },
      { label: "Length of a day", value: "24 h 37 min" },
      { label: "Length of a year", value: "687 Earth days" },
    ],
    family: "rocky",
    radius: 0.8,
    orbit: { orbitRadius: 35, orbitPeriod: EARTH_YEAR * 1.88, phase: 5.1 },
    rotationPeriod: EARTH_DAY * 1.03,
    axialTilt: 25.2,
    palette: ["#4a1e0f", "#8f3a1e", "#c8673a", "#e2a37a"],
    atmosphere: { color: "#e2a37a", strength: 0.35 },
    framing: { distanceFactor: 4.4, side: 1 },
    params: { craters: 0.3, roughness: 0.7, polarCaps: 1, canyon: 1, atmoThickness: 0.6 },
  },
  belt: {
    id: "belt",
    name: "The asteroid belt",
    epithet: "Rubble left over from the birth of the planets",
    story:
      "Between Mars and Jupiter drift millions of rocks that never gathered into a planet, held apart by Jupiter's gravity. Their combined mass is under four percent of the Moon's, and they are so spread out that probes pass through untouched.",
    wonder: "Ceres, the largest member, holds a third of the belt's entire mass.",
    stats: [
      { label: "Distance from the Sun", value: "330 to 480 million km" },
      { label: "Known asteroids", value: "More than a million" },
      { label: "Largest member", value: "Ceres, 940 km wide" },
      { label: "Typical gap between rocks", value: "About a million km" },
    ],
    family: "belt",
    radius: 4,
    orbit: { orbitRadius: 47, orbitPeriod: EARTH_YEAR * 4.5, phase: 0.9 },
    rotationPeriod: 0,
    axialTilt: 0,
    palette: ["#4b4440", "#6f655e", "#8c8177", "#a89d91"],
    framing: { distanceFactor: 3.2, side: 0 },
    params: { inner: 41, outer: 54, thickness: 3.2 },
  },
  jupiter: {
    id: "jupiter",
    name: "Jupiter",
    epithet: "The king of the planets",
    story:
      "Jupiter holds more than twice the mass of every other planet combined. Its stripes are bands of ammonia cloud racing in opposite directions, and the Great Red Spot is a storm wider than Earth that has raged for centuries.",
    wonder: "Its day is the shortest of any planet, under ten hours long.",
    stats: [
      { label: "Distance from the Sun", value: "778 million km" },
      { label: "Diameter", value: "139,820 km" },
      { label: "Length of a day", value: "9 h 56 min" },
      { label: "Length of a year", value: "11.9 Earth years" },
    ],
    family: "gas",
    radius: 3.8,
    orbit: { orbitRadius: 66, orbitPeriod: EARTH_YEAR * 11.86, phase: 2.6 },
    rotationPeriod: EARTH_DAY * 0.41,
    axialTilt: 3.1,
    palette: ["#7a4a2b", "#b07a4a", "#d9b08a", "#efdcc0"],
    atmosphere: { color: "#e8c9a4", strength: 0.35 },
    framing: { distanceFactor: 4.3, side: -1 },
    params: { bands: 9, warp: 0.9, storm: 1, stormLat: -0.32, stormLon: 1.1, stormSize: 0.22 },
  },
  saturn: {
    id: "saturn",
    name: "Saturn",
    epithet: "The ringed giant",
    story:
      "Saturn's rings stretch 280,000 kilometres across yet are mostly only ten metres thick, made of ice from dust grains to house-sized boulders. The planet is so light that it would float in a large enough bathtub.",
    wonder: "It has 274 known moons, more than any other planet.",
    stats: [
      { label: "Distance from the Sun", value: "1.43 billion km" },
      { label: "Diameter", value: "116,460 km" },
      { label: "Length of a day", value: "10 h 33 min" },
      { label: "Length of a year", value: "29.4 Earth years" },
    ],
    family: "gas",
    radius: 3.2,
    orbit: { orbitRadius: 86, orbitPeriod: EARTH_YEAR * 29.4, phase: 4.4 },
    rotationPeriod: EARTH_DAY * 0.44,
    axialTilt: 26.7,
    palette: ["#8a6a3a", "#c2a06a", "#dcc596", "#efe1bd"],
    atmosphere: { color: "#efe1bd", strength: 0.3 },
    rings: { inner: 4.1, outer: 7.4, color: "#d9c7a3" },
    framing: { distanceFactor: 6.6, side: 1 },
    params: { bands: 7, warp: 0.5, storm: 0, stormLat: 0, stormLon: 0, stormSize: 0, contrast: 0.55, hexagon: 1 },
  },
  uranus: {
    id: "uranus",
    name: "Uranus",
    epithet: "The sideways ice giant",
    story:
      "Knocked over long ago, Uranus spins on its side, so each pole gets 42 years of sunlight followed by 42 years of dark. Methane in its cold atmosphere soaks up red light and leaves the planet a pale blue-green.",
    wonder: "Its cloud tops are the coldest of any planet, near minus 224 °C.",
    stats: [
      { label: "Distance from the Sun", value: "2.87 billion km" },
      { label: "Diameter", value: "50,724 km" },
      { label: "Length of a day", value: "17 h 14 min" },
      { label: "Length of a year", value: "84 Earth years" },
    ],
    family: "ice",
    radius: 1.9,
    orbit: { orbitRadius: 104, orbitPeriod: EARTH_YEAR * 84, phase: 1.3 },
    rotationPeriod: -EARTH_DAY * 0.72,
    axialTilt: 97.8,
    palette: ["#3f8f9a", "#6fc3cf", "#a6e0e6", "#d7f2f4"],
    atmosphere: { color: "#a6e0e6", strength: 0.5 },
    rings: { inner: 2.6, outer: 3.1, color: "#9fb4b8" },
    framing: { distanceFactor: 4.0, side: -1 },
    params: { bands: 4, storm: 0, hood: 1, clouds: 1 },
  },
  neptune: {
    id: "neptune",
    name: "Neptune",
    epithet: "The far blue storm world",
    story:
      "Neptune was found by mathematics before anyone saw it, predicted from wobbles in the orbit of Uranus. Its winds are the fastest in the solar system, tearing through the clouds at more than 2,000 kilometres an hour.",
    wonder: "Since its discovery in 1846 it has completed just one orbit.",
    stats: [
      { label: "Distance from the Sun", value: "4.5 billion km" },
      { label: "Diameter", value: "49,244 km" },
      { label: "Length of a day", value: "16 h 6 min" },
      { label: "Length of a year", value: "165 Earth years" },
    ],
    family: "ice",
    radius: 1.85,
    orbit: { orbitRadius: 120, orbitPeriod: EARTH_YEAR * 164.8, phase: 3.9 },
    rotationPeriod: EARTH_DAY * 0.67,
    axialTilt: 28.3,
    palette: ["#1a2d8a", "#2f56c9", "#4f7fe0", "#a6bff0"],
    atmosphere: { color: "#6f95f0", strength: 0.6 },
    framing: { distanceFactor: 4.0, side: 1 },
    params: { bands: 5, storm: 1, streaks: 1 },
  },
  pluto: {
    id: "pluto",
    name: "Pluto",
    epithet: "The dwarf planet at the edge",
    story:
      "Smaller than our Moon, Pluto crosses inside Neptune's orbit for twenty years of every trip around the Sun. When New Horizons flew past in 2015 it found mountains of water ice and a vast heart-shaped plain of frozen nitrogen.",
    wonder: "Sunlight there is a thousand times dimmer than on Earth, yet still brighter than a full moon.",
    stats: [
      { label: "Distance from the Sun", value: "5.9 billion km" },
      { label: "Diameter", value: "2,377 km" },
      { label: "Length of a day", value: "6.4 Earth days" },
      { label: "Length of a year", value: "248 Earth years" },
    ],
    family: "rocky",
    radius: 0.42,
    orbit: { orbitRadius: 134, orbitPeriod: EARTH_YEAR * 248, phase: 5.7, inclination: 17 },
    rotationPeriod: -EARTH_DAY * 6.4,
    axialTilt: 122.5,
    palette: ["#5a3a2e", "#9a6d55", "#c9a689", "#efe3d5"],
    framing: { distanceFactor: 4.8, side: -1 },
    params: { craters: 0.35, roughness: 0.6, heart: 1, tholin: 1 },
  },
  comet: {
    id: "comet",
    name: "Halley's Comet",
    epithet: "A visitor from the edge of the system",
    story:
      "Halley swings in from beyond Neptune once every 76 years, last passing Earth in 1986 and due back in 2061. Near the Sun its ices boil off into tails that can stretch 100 million kilometres.",
    wonder: "Dust it sheds lights up our skies twice a year, as the Eta Aquariid and Orionid meteor showers.",
    stats: [
      { label: "Closest to the Sun", value: "88 million km" },
      { label: "Farthest from the Sun", value: "5.2 billion km" },
      { label: "One orbit", value: "76 years" },
      { label: "Nucleus", value: "15 by 8 km" },
    ],
    family: "comet",
    radius: 0.28,
    // Unlike the planets, the period is compressed to a few minutes so the comet
    // visibly sweeps through the inner system. The negative period makes the orbit
    // retrograde, as Halley's really is; perihelion sits between Mercury and Venus.
    orbit: { orbitRadius: 76, orbitPeriod: -420, phase: 0.9, inclination: 18, eccentricity: 0.75 },
    rotationPeriod: EARTH_DAY * 2.2,
    axialTilt: 0,
    palette: ["#3a3f48", "#6c737f", "#a9b3c2", "#e3ecf7"],
    framing: { distanceFactor: 16, side: 0 },
  },
};

export const BODY_ORDER: readonly BodyId[] = [
  "sun",
  "mercury",
  "venus",
  "earth",
  "moon",
  "mars",
  "belt",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "comet",
];

export const TOUR_SECTIONS: readonly SectionId[] = [
  "hero",
  ...(BODY_ORDER.filter((id) => id !== "moon" && id !== "comet") as Exclude<BodyId, "moon" | "comet">[]),
  "outro",
];

export const bodyFor = (id: BodyId): Body => BODIES[id];

export const isBodyId = (id: string): id is BodyId => id in BODIES;

/** CSS background used for a body's swatch in the dock and rail. */
export function swatchFor(body: Body): string {
  const [dark, mid, light, lightest] = body.palette;
  if (body.family === "star") {
    return `radial-gradient(circle at 50% 50%, ${lightest} 0%, ${light} 35%, ${mid} 70%, ${dark} 100%)`;
  }
  if (body.family === "comet") {
    return `linear-gradient(100deg, ${lightest} 0%, ${light} 30%, ${mid} 60%, ${dark} 100%)`;
  }
  return `radial-gradient(circle at 32% 30%, ${lightest} 0%, ${light} 28%, ${mid} 58%, ${dark} 100%)`;
}
