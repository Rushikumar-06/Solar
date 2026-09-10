import type { OrbitSpec } from "@/lib/orbits";

/** Moons, each one attached to the planet it circles. */
export type MoonId =
  | "moon"
  | "phobos"
  | "deimos"
  | "io"
  | "europa"
  | "ganymede"
  | "callisto"
  | "mimas"
  | "enceladus"
  | "titan"
  | "miranda"
  | "titania"
  | "triton"
  | "charon";

export type BodyId =
  | "sun"
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "belt"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "pluto"
  | "comet"
  | MoonId;

export type SectionId = "hero" | Exclude<BodyId, MoonId | "comet"> | "outro";

export type Family = "star" | "rocky" | "venus" | "earth" | "gas" | "ice" | "belt" | "comet" | "moon" | "io" | "titan";

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
  /**
   * Seconds per rotation at time scale 1. A body whose axis is tipped past
   * upright already turns backwards, so the period stays positive there: only
   * a world spinning the wrong way about an upright axis takes a negative one.
   */
  rotationPeriod: number;
  /**
   * Axial tilt in degrees: how far the spin axis leans from upright. A planet
   * is measured against the ecliptic, a moon against its own orbital plane,
   * which is the plane its axis otherwise stands square to.
   */
  axialTilt: number;
  /**
   * Body this one keeps a single face turned toward. Every moon here is locked
   * to its planet, and Pluto is locked right back to Charon.
   */
  tidalLock?: BodyId;
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
    params: { craters: 0.7, roughness: 0.9, rays: 0.2, bump: 0.06 },
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
    // Tipped past upright at 177 degrees, so it already turns backwards.
    rotationPeriod: EARTH_DAY * 243,
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
    family: "moon",
    radius: 0.32,
    orbit: { orbitRadius: 2.7, orbitPeriod: EARTH_YEAR * (27.3 / 365.25), phase: 0.8, inclination: 5 },
    // Tidally locked, like every moon here: one turn per orbit keeps the same face home.
    rotationPeriod: EARTH_YEAR * (27.3 / 365.25),
    axialTilt: 6.7,
    palette: ["#3c3c40", "#6b6b70", "#9a9a9e", "#c4c4c6"],
    parent: "earth",
    tidalLock: "earth",
    framing: { distanceFactor: 5, side: 0 },
    params: { craters: 0.85, albedo: 0.85, bump: 0.06 },
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
    framing: { distanceFactor: 5.2, side: 1 },
    params: { craters: 0.3, roughness: 0.7, polarCaps: 1, canyon: 1, atmoThickness: 0.6 },
  },
  phobos: {
    id: "phobos",
    name: "Phobos",
    epithet: "Mars's doomed inner moon",
    story:
      "Phobos laps Mars three times a day, so close and so fast that it rises in the west and sets in the east. Tides are dragging it inward by two metres a century, and one day it will break apart into a ring.",
    wonder: "Its great crater, Stickney, is nearly half the width of the moon itself.",
    stats: [
      { label: "Distance from Mars", value: "9,376 km" },
      { label: "Size", value: "27 by 22 by 18 km" },
      { label: "One orbit", value: "7 h 39 min" },
      { label: "Falling inward by", value: "2 m a century" },
    ],
    family: "moon",
    radius: 0.09,
    orbit: { orbitRadius: 2.05, orbitPeriod: 9, phase: 0.4, tiltZ: 25.2 },
    rotationPeriod: 9,
    axialTilt: 0,
    palette: ["#241f1c", "#463f39", "#6b625a", "#93887c"],
    parent: "mars",
    tidalLock: "mars",
    framing: { distanceFactor: 9, side: 0 },
    params: { irregular: 1, stretchX: 1.28, stretchY: 0.94, stretchZ: 0.84, craters: 1.5, basin: 1, basinSize: 0.46, grooves: 1, albedo: 0.5, bump: 0.13 },
  },
  deimos: {
    id: "deimos",
    name: "Deimos",
    epithet: "A smooth speck of rubble",
    story:
      "The smallest moon of any planet is a lump of rock and dust barely fifteen kilometres across. Landslides of fine grey soil have filled in most of its craters, leaving a surface far smoother than its inner neighbour.",
    wonder: "From the Martian ground it looks like a bright star, and takes 2.7 days to drift across the sky.",
    stats: [
      { label: "Distance from Mars", value: "23,463 km" },
      { label: "Size", value: "15 by 12 by 11 km" },
      { label: "One orbit", value: "30 h 18 min" },
      { label: "Discovered", value: "1877" },
    ],
    family: "moon",
    radius: 0.065,
    orbit: { orbitRadius: 2.75, orbitPeriod: 27, phase: 2.6, tiltZ: 25.2 },
    rotationPeriod: 27,
    axialTilt: 0,
    palette: ["#2b2521", "#544a42", "#7d7266", "#a3988a"],
    parent: "mars",
    tidalLock: "mars",
    framing: { distanceFactor: 10, side: 0 },
    params: { irregular: 1, stretchX: 1.18, stretchY: 0.96, stretchZ: 0.9, craters: 0.7, regolith: 1, albedo: 0.55, bump: 0.06 },
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
  io: {
    id: "io",
    name: "Io",
    epithet: "The most volcanic world we know",
    story:
      "Squeezed by Jupiter's gravity until its rock melts, Io runs four hundred volcanoes and lava fountains that climb hundreds of kilometres. Sulphur frost paints it yellow and orange, and fresh eruptions bury its craters as fast as they form.",
    wonder: "It sheds a tonne of its own material into space every second.",
    stats: [
      { label: "Distance from Jupiter", value: "421,700 km" },
      { label: "Diameter", value: "3,643 km" },
      { label: "One orbit", value: "1.77 Earth days" },
      { label: "Active volcanoes", value: "About 400" },
    ],
    family: "io",
    radius: 0.34,
    orbit: { orbitRadius: 5.4, orbitPeriod: 14, phase: 1.1, tiltZ: 3.1 },
    rotationPeriod: 14,
    axialTilt: 0,
    palette: ["#6b4a12", "#c99a2e", "#e9d275", "#f7f2dc"],
    parent: "jupiter",
    tidalLock: "jupiter",
    framing: { distanceFactor: 6, side: 0 },
    params: { plume: 1, plumeColor: 0 },
  },
  europa: {
    id: "europa",
    name: "Europa",
    epithet: "An ice shell over a hidden ocean",
    story:
      "Under a crust of ice a few kilometres thick, Europa holds twice as much liquid water as every ocean on Earth combined. The rust-coloured lines crossing it are cracks where that water has welled up and frozen again.",
    wonder: "It is the smoothest solid object in the solar system.",
    stats: [
      { label: "Distance from Jupiter", value: "671,000 km" },
      { label: "Diameter", value: "3,122 km" },
      { label: "One orbit", value: "3.55 Earth days" },
      { label: "Ice crust", value: "15 to 25 km thick" },
    ],
    family: "moon",
    radius: 0.3,
    orbit: { orbitRadius: 6.9, orbitPeriod: 28, phase: 4.2, tiltZ: 3.1 },
    rotationPeriod: 28,
    axialTilt: 0,
    palette: ["#7d6a54", "#cec2ab", "#eae6da", "#fbfaf7"],
    parent: "jupiter",
    tidalLock: "jupiter",
    framing: { distanceFactor: 6, side: 0 },
    params: { linea: 1, craters: 0.06, icy: 1, albedo: 1.15, bump: 0.02 },
  },
  ganymede: {
    id: "ganymede",
    name: "Ganymede",
    epithet: "The largest moon in the solar system",
    story:
      "Ganymede is wider than Mercury and the only moon with a magnetic field of its own. Dark ancient plains pitted with craters sit against younger pale ground, carved into long parallel grooves by shifting ice.",
    wonder: "It hides a salty ocean of its own, buried far deeper than Europa's.",
    stats: [
      { label: "Distance from Jupiter", value: "1.07 million km" },
      { label: "Diameter", value: "5,268 km" },
      { label: "One orbit", value: "7.15 Earth days" },
      { label: "Wider than Mercury by", value: "8 percent" },
    ],
    family: "moon",
    radius: 0.46,
    orbit: { orbitRadius: 8.8, orbitPeriod: 56, phase: 5.6, tiltZ: 3.1 },
    rotationPeriod: 56,
    axialTilt: 0,
    palette: ["#443c33", "#7b7163", "#a89e8f", "#ddd7cb"],
    parent: "jupiter",
    tidalLock: "jupiter",
    framing: { distanceFactor: 5.6, side: 0 },
    params: { grooves: 1, twoTone: 1, craters: 0.9, rays: 0.8, icy: 0.55, albedo: 0.8 },
  },
  callisto: {
    id: "callisto",
    name: "Callisto",
    epithet: "The most cratered world of all",
    story:
      "Callisto has been hit so often that new craters can only land on top of old ones. Nothing has resurfaced it in four billion years, which leaves it wearing the oldest landscape in the solar system.",
    wonder: "Valhalla, its largest scar, ripples outward in rings 3,800 kilometres across.",
    stats: [
      { label: "Distance from Jupiter", value: "1.88 million km" },
      { label: "Diameter", value: "4,821 km" },
      { label: "One orbit", value: "16.7 Earth days" },
      { label: "Age of its surface", value: "4 billion years" },
    ],
    family: "moon",
    radius: 0.43,
    orbit: { orbitRadius: 11.6, orbitPeriod: 118, phase: 0.3, tiltZ: 3.1 },
    rotationPeriod: 118,
    axialTilt: 0,
    palette: ["#221d1a", "#48403a", "#7a7167", "#cac4b8"],
    parent: "jupiter",
    tidalLock: "jupiter",
    framing: { distanceFactor: 5.6, side: 0 },
    params: { craters: 1.6, basin: 1, basinSize: 0.6, basinRings: 1, rays: 1, albedo: 0.45, icy: 0.35 },
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
  mimas: {
    id: "mimas",
    name: "Mimas",
    epithet: "The moon with the enormous crater",
    story:
      "One ancient impact left Mimas with a crater a third of its own width, central peak and all, and very nearly split it in two. The resemblance to a certain film's battle station was noticed the moment Voyager sent pictures home.",
    wonder: "Its pull carves the Cassini Division, the widest gap in Saturn's rings.",
    stats: [
      { label: "Distance from Saturn", value: "185,500 km" },
      { label: "Diameter", value: "396 km" },
      { label: "One orbit", value: "22 h 36 min" },
      { label: "Herschel crater", value: "130 km wide" },
    ],
    family: "moon",
    radius: 0.085,
    orbit: { orbitRadius: 8.6, orbitPeriod: 12, phase: 3.1, tiltZ: 26.7 },
    rotationPeriod: 12,
    axialTilt: 0,
    palette: ["#5b5a5c", "#8b8a8d", "#b5b5b8", "#e4e4e7"],
    parent: "saturn",
    tidalLock: "saturn",
    framing: { distanceFactor: 9, side: 0 },
    params: { craters: 1.7, basin: 1, basinSize: 0.33, basinPeak: 1, icy: 0.8, albedo: 0.95 },
  },
  enceladus: {
    id: "enceladus",
    name: "Enceladus",
    epithet: "The little moon that sprays the sky",
    story:
      "Enceladus is a ball of ice five hundred kilometres wide with an ocean underneath. Through four cracks at its south pole, nicknamed the tiger stripes, it fires jets of salt water into space that feed one of Saturn's rings.",
    wonder: "A constant dusting of fresh snow makes it the most reflective body in the solar system.",
    stats: [
      { label: "Distance from Saturn", value: "238,000 km" },
      { label: "Diameter", value: "504 km" },
      { label: "One orbit", value: "1.37 Earth days" },
      { label: "Sunlight reflected", value: "About 99 percent" },
    ],
    family: "moon",
    radius: 0.1,
    orbit: { orbitRadius: 10.2, orbitPeriod: 18, phase: 5.0, tiltZ: 26.7 },
    rotationPeriod: 18,
    axialTilt: 0,
    palette: ["#93a6b6", "#c6d4de", "#e9f0f5", "#ffffff"],
    parent: "saturn",
    tidalLock: "saturn",
    framing: { distanceFactor: 9, side: 0 },
    params: { stripes: 1, plume: 1, plumeColor: 1, craters: 0.55, icy: 1, albedo: 1.32, bump: 0.05 },
  },
  titan: {
    id: "titan",
    name: "Titan",
    epithet: "A world with rivers of methane",
    story:
      "Titan is the only moon with a thick atmosphere, an orange nitrogen haze heavier than our own air. Below it lie dunes of dark hydrocarbon sand and lakes and rivers of liquid methane, the only stable surface liquid known beyond Earth.",
    wonder: "Its air is so dense and its gravity so light that a person could fly by flapping wings.",
    stats: [
      { label: "Distance from Saturn", value: "1.22 million km" },
      { label: "Diameter", value: "5,150 km" },
      { label: "One orbit", value: "15.9 Earth days" },
      { label: "Surface temperature", value: "minus 179 °C" },
    ],
    family: "titan",
    radius: 0.42,
    orbit: { orbitRadius: 14, orbitPeriod: 110, phase: 1.7, tiltZ: 26.7 },
    rotationPeriod: 110,
    axialTilt: 0,
    palette: ["#6b3d0e", "#a9691d", "#d99a3f", "#f2d599"],
    atmosphere: { color: "#f0a94a", strength: 1.5 },
    parent: "saturn",
    tidalLock: "saturn",
    framing: { distanceFactor: 5.6, side: 0 },
    params: { atmoScale: 1.09, haze: 1, dunes: 1 },
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
    rotationPeriod: EARTH_DAY * 0.72,
    axialTilt: 97.8,
    palette: ["#3f8f9a", "#6fc3cf", "#a6e0e6", "#d7f2f4"],
    atmosphere: { color: "#a6e0e6", strength: 0.5 },
    rings: { inner: 2.6, outer: 3.1, color: "#9fb4b8" },
    framing: { distanceFactor: 4.0, side: -1 },
    params: { bands: 4, storm: 0, hood: 1, clouds: 1 },
  },
  miranda: {
    id: "miranda",
    name: "Miranda",
    epithet: "A world that looks assembled from spare parts",
    story:
      "Miranda is a patchwork of mismatched ground, as though it were broken apart and put back together badly. Grooved oval regions called coronae butt straight up against old cratered plains, and one cliff face drops twenty kilometres.",
    wonder: "A stone dropped off Verona Rupes would fall for a full ten minutes.",
    stats: [
      { label: "Distance from Uranus", value: "129,900 km" },
      { label: "Diameter", value: "471 km" },
      { label: "One orbit", value: "1.4 Earth days" },
      { label: "Verona Rupes", value: "20 km tall" },
    ],
    family: "moon",
    radius: 0.1,
    orbit: { orbitRadius: 4, orbitPeriod: 14, phase: 2.2, tiltZ: 97.8 },
    rotationPeriod: 14,
    axialTilt: 0,
    palette: ["#3a3a3e", "#68686e", "#94949b", "#c6c6cc"],
    parent: "uranus",
    tidalLock: "uranus",
    framing: { distanceFactor: 9, side: 0 },
    params: { coronae: 1, chasm: 0.8, craters: 1.1, icy: 0.5, albedo: 0.78 },
  },
  titania: {
    id: "titania",
    name: "Titania",
    epithet: "Uranus's largest moon",
    story:
      "Half ice and half rock, Titania is cut by enormous canyons, one of them a rift more than a thousand kilometres long, opened as its interior froze and swelled. Ages of radiation have stained the old ice a dull red.",
    wonder: "William Herschel found it in 1787, six years after he found Uranus itself.",
    stats: [
      { label: "Distance from Uranus", value: "436,300 km" },
      { label: "Diameter", value: "1,578 km" },
      { label: "One orbit", value: "8.7 Earth days" },
      { label: "Messina Chasmata", value: "1,500 km long" },
    ],
    family: "moon",
    radius: 0.2,
    orbit: { orbitRadius: 5.8, orbitPeriod: 62, phase: 0.6, tiltZ: 97.8 },
    rotationPeriod: 62,
    axialTilt: 0,
    palette: ["#3d3630", "#6c6157", "#96877a", "#c2b5a6"],
    parent: "uranus",
    tidalLock: "uranus",
    framing: { distanceFactor: 6.4, side: 0 },
    params: { craters: 1.1, chasm: 1, rays: 0.55, icy: 0.4, albedo: 0.62 },
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
  triton: {
    id: "triton",
    name: "Triton",
    epithet: "A captured world running backwards",
    story:
      "Triton circles Neptune the wrong way, which means it was caught rather than born there, most likely a dwarf planet dragged in from the Kuiper Belt. Nitrogen geysers erupt through its pink frost and lay dark streaks downwind.",
    wonder: "At minus 235 °C its surface is among the coldest ever measured anywhere.",
    stats: [
      { label: "Distance from Neptune", value: "354,800 km" },
      { label: "Diameter", value: "2,707 km" },
      { label: "One orbit", value: "5.9 days, backwards" },
      { label: "Surface temperature", value: "minus 235 °C" },
    ],
    family: "moon",
    radius: 0.28,
    orbit: { orbitRadius: 5.2, orbitPeriod: -55, phase: 3.7, inclination: 30, tiltZ: 28.3 },
    rotationPeriod: -55,
    axialTilt: 0,
    palette: ["#7a5850", "#b78f83", "#dcc4b6", "#f6efe8"],
    parent: "neptune",
    tidalLock: "neptune",
    framing: { distanceFactor: 6, side: 0 },
    params: { cantaloupe: 1, polarCaps: 1, plumeStreaks: 1, craters: 0.12, icy: 1, albedo: 1.2, bump: 0.03 },
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
    rotationPeriod: EARTH_DAY * 6.4,
    tidalLock: "charon",
    axialTilt: 122.5,
    palette: ["#5a3a2e", "#9a6d55", "#c9a689", "#efe3d5"],
    framing: { distanceFactor: 6.6, side: -1 },
    params: { craters: 0.35, roughness: 0.6, heart: 1, tholin: 1 },
  },
  charon: {
    id: "charon",
    name: "Charon",
    epithet: "Half of a double world",
    story:
      "Charon is so large beside Pluto that the pair swing around a point in the empty space between them, each holding the same face toward the other forever. A dark red cap of tholins stains its northern pole.",
    wonder: "Stand on the right side of Pluto and Charon hangs motionless in the sky, never rising or setting.",
    stats: [
      { label: "Distance from Pluto", value: "19,600 km" },
      { label: "Diameter", value: "1,212 km" },
      { label: "One orbit", value: "6.4 Earth days" },
      { label: "Size next to Pluto", value: "Half its width" },
    ],
    family: "moon",
    radius: 0.21,
    orbit: { orbitRadius: 1.7, orbitPeriod: EARTH_DAY * 6.4, phase: 2.9, tiltZ: 122.5 },
    rotationPeriod: EARTH_DAY * 6.4,
    axialTilt: 0,
    palette: ["#463d36", "#756c65", "#a1978e", "#cfc6bd"],
    parent: "pluto",
    tidalLock: "pluto",
    framing: { distanceFactor: 6.4, side: 0 },
    params: { craters: 1.0, chasm: 1, polarStain: 1, icy: 0.35, albedo: 0.7 },
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

/**
 * Every body, outward from the Sun, with each planet's moons listed straight
 * after it from the innermost out. Parents must come before their moons:
 * updatePositions walks this order and adds the parent position as it goes.
 */
export const BODY_ORDER: readonly BodyId[] = [
  "sun",
  "mercury",
  "venus",
  "earth",
  "moon",
  "mars",
  "phobos",
  "deimos",
  "belt",
  "jupiter",
  "io",
  "europa",
  "ganymede",
  "callisto",
  "saturn",
  "mimas",
  "enceladus",
  "titan",
  "uranus",
  "miranda",
  "titania",
  "neptune",
  "triton",
  "pluto",
  "charon",
  "comet",
];

export const isMoon = (id: BodyId): id is MoonId => BODIES[id].parent !== undefined;

export const MOON_IDS: readonly MoonId[] = BODY_ORDER.filter(isMoon);

/** The Sun, the planets, the belt and the comet: everything the dock and the arrow keys step through. */
export const PRIMARY_ORDER: readonly Exclude<BodyId, MoonId>[] = BODY_ORDER.filter(
  (id) => !isMoon(id),
) as Exclude<BodyId, MoonId>[];

/** A body's moons, innermost first. Empty for moons and for the worlds that have none. */
export function moonsOf(id: BodyId): Body[] {
  return MOON_IDS.filter((m) => BODIES[m].parent === id)
    .map((m) => BODIES[m])
    .sort((a, b) => a.orbit.orbitRadius - b.orbit.orbitRadius);
}

export const TOUR_SECTIONS: readonly SectionId[] = [
  "hero",
  ...(PRIMARY_ORDER.filter((id) => id !== "comet") as Exclude<BodyId, MoonId | "comet">[]),
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
