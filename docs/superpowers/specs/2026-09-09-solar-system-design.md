# Orrery: an interactive 3D tour of the solar system

Date: 2026-09-09. Status: approved in conversation (approach A), sections 2-4 recorded here.

## Goal

A single-page Next.js site that explains the solar system to a general, awe-first
audience. The whole site is one live 3D scene. Scrolling flies the camera from the
Sun outward, planet by planet, with a short story panel beside each world. At any
moment the visitor can switch to Explore mode and orbit, zoom and click freely.

## Decisions taken with the user

- Experience: scroll-driven cinematic journey plus free-explore mode, in one scene.
- Visual style: stylized and procedural. Every surface is a GLSL shader; no textures.
- Scope: Sun, the eight planets, Earth's Moon, an asteroid belt, Pluto as an epilogue.
- Audience: general public, awe-first. Short vivid copy, four key stats per body.
- Stack: Next.js 16 (App Router), React 19, React Three Fiber 9, drei, postprocessing,
  Tailwind 4, Zustand, Phosphor icons, Vitest for pure logic.

## Section 1: architecture and page structure

One route. A client-only `SolarScene` renders a full-screen fixed canvas behind a normal
scrolling document. Thirteen sections: Hero, Sun, Mercury, Venus, Earth (with Moon),
Mars, Asteroid belt, Jupiter, Saturn, Uranus, Neptune, Pluto, Outro.

State (Zustand): `mode` (tour | explore), `focus` (body id or null), `timeScale`,
`quality` tier, `ready`. Per-frame values (scroll progress, tour parameter, camera pose)
never touch React state; they live in refs and the 3D loop.

Units: `data/bodies.ts` (content + orbital + visual parameters), `lib/orbits.ts`
(positions), `lib/tour.ts` (scroll to tour parameter), `lib/camera.ts` (framing),
`lib/quality.ts` (tier detection), `scene/*` (one file per 3D element), `shaders/*`
(GLSL strings), `ui/*` (Nav, Hero, TourSections, StoryPanel, ProgressRail, ExploreHud,
Loader, Outro).

## Section 2: the 3D scene

Scale is compressed and labelled as such in the Outro. Orbit radii run from 14 units
(Mercury) to 132 (Pluto); planet radii from 0.4 (Pluto) to 3.6 (Jupiter); the Sun is 6.
Planets orbit on a shared plane (Pluto inclined 17 degrees) and spin on tilted axes.

Materials, all custom ShaderMaterials sharing one simplex-noise chunk:

- Star: animated FBM granulation, limb darkening, emissive above 1.0 for bloom, a
  fresnel corona shell, and a points system of rising flare motes.
- Rocky (Mercury, Moon, Mars, Pluto): FBM height mapped to a four-colour palette,
  cellular-noise craters, normals from height derivatives, optional polar caps.
- Earth: noise-threshold continents, ocean specular, latitude ice, a separate cloud
  shell, city lights on the night side, a blue fresnel atmosphere.
- Venus: thick swirling cloud bands, pale yellow atmosphere shell.
- Gas giants (Jupiter, Saturn): domain-warped latitude bands, a storm oval, and for
  Saturn a procedural ring disc with gaps and a planet shadow.
- Ice giants (Uranus, Neptune): smooth gradient with faint bands and a dark storm
  (Neptune), Uranus tilted 98 degrees with a faint ring.

Lighting is computed in the fragment shaders from the Sun at the origin: Lambert with
wrap, specular where useful, rim light from the atmosphere colour.

Particles: a star dome of 10k-30k shader points with twinkle and colour temperature;
a nebula background dome (FBM Milky Way band); an instanced asteroid belt of 2k-6k
rocks whose orbit and tumble run in the vertex shader; a sparse world-space dust cloud
that streaks past during flights; Sun flare motes.

Post-processing (tier dependent): Bloom, Vignette, subtle Noise. Tier 0 gets no
composer and a sprite glow for the Sun instead.

## Section 3: interaction and state

Tour mode. Each section is 150vh tall with a sticky full-height wrapper. The camera
rig reads `window.scrollY` each frame, converts it to a tour parameter `t` (integer
= parked at section i, fractional = flying; the first 40% of a section holds, the
remaining 60% flies to the next) and damps toward the framed pose for `t`. Panels get a
`data-active` attribute from the same `t`, and CSS transitions do the fade. The
active panel alternates left and right; the planet is framed on the opposite side.

Explore mode. Entered from the nav, hero, outro, a panel button, or clicking a body.
Scroll is locked, tour DOM becomes inert and fades, the rig flies to the focused body,
then hands the camera to a camera-controls instance it owns (the drei wrapper is not
used: it updates the camera every frame and would fight the rig) whose target follows
the focused body each frame. A dock lists all bodies; clicking one
flies to it. Time speed: pause, 1x, 10x, 50x. "Overview" frames the whole system.
"Back to the tour" scrolls to the focused body's section and re-enables the rig.

Inputs: drag to orbit, wheel or pinch to zoom, click a body to visit. Keyboard: left
and right arrows step bodies in Explore mode; Escape returns to the tour.

Quality tiers: 0 (coarse pointer, low cores or memory), 1, 2. Tier drives post passes,
DPR (1-1.5-2), particle counts and belt instance counts. Geometry detail stays fixed.

Reduced motion: camera snaps to the nearest section pose instead of damping, twinkle
and flare motes stop, panel transitions become instant.

No WebGL: the loader shows a message and the page still renders every panel over a
static gradient, so the content stays readable.

## Section 4: content, visual design, testing

Copy: name, epithet, a two-sentence story under 45 words, one "wonder" line and four
stats (distance from the Sun, diameter, day length, year length). Moon counts and
temperatures live in the prose where they matter. Figures are real values.

Design tokens. Background #05070e, text #e7ebf5, muted #8c95ab, single accent solar
amber #e6b563, hairline rgba(231,235,245,0.10). One typeface, Bricolage Grotesque,
variable weight and width, light and wide for display. Radii: pills for controls,
20px for panels. Theme locked to dark. Nav floats, never a full-width bar.

Testing. Vitest covers `orbits`, `tour`, `camera`, `quality`, `random` (seeded), and
body-data validity.
Browser verification: no console errors, sustained frame rate and draw-call count
recorded from the running app at desktop and mobile viewports.

## Round two (2026-09-09, approved in conversation)

Requested: better planet visuals, an automatic tour with adjustable speed, and more
3D animation (comet with a particle tail, warp streaks, aurora, plus realistic extras).

- Autoplay (tour only). A play control with a 0.5x to 3x slider scrolls the page through
  the tour by itself. Any wheel, touch, navigation key, or rail click pauses it. Entering
  Explore switches it off. Reduced motion steps section by section on a timer instead.
  Pure scroll maths in `lib/autoplay.ts`, unit-tested.
- Visual pass. Each shader family is its own module with a uniform factory. Planet.tsx
  writes `uDetail` (viewport coverage) so shaders drop octaves and bump mapping for
  distant bodies. Rocky worlds get multi-scale craters, maria, canyons, frost; Earth gets
  coastlines, mountains, cloud shadows, terminator glow, city lights and an aurora shell;
  gas giants get shaped zonal bands, turbulence, a proper Great Red Spot and structured
  rings; ice giants and Venus get their characteristic features; the atmosphere shell
  gets a two-term scattering approximation.
- Comet. Halley's Comet on a Keplerian ellipse (eccentricity 0.75, inclination 22,
  compressed period) with a nucleus, a coma that swells near the Sun, a curved dust tail
  driven by a trail buffer of past positions, and a straight anti-sunward ion tail. It is
  in the Explore dock but not a tour section.
- Effects. Warp streaks stretch along the camera velocity during flights; a faint
  zodiacal light disc sits in the ecliptic; a lens flare appears when the Sun is in frame
  and unoccluded. All three are gated by the quality tier.
- Tooling. `npm run check:shaders` compiles every registered program headlessly;
  `npm run test:e2e` runs Playwright smoke tests; both are part of the verification bar.

## Round three (2026-09-09, approved in conversation)

Requested: moons for the planets, a few famous ones rather than all of them, at no drop
in quality and looking like the real thing.

- Roster. Thirteen new moons beside our own: Phobos and Deimos; Io, Europa, Ganymede and
  Callisto; Mimas, Enceladus and Titan; Miranda and Titania; Triton; Charon. Mercury and
  Venus genuinely have none and their panel says so rather than inventing any.
- Orbits. `OrbitSpec` gains `tiltZ`, a roll of the orbital plane about the z axis applied
  after the inclination. Every moon takes its planet's axial tilt there, so each system
  sits in its planet's equatorial plane: Saturn's moons run with the rings, and Uranus's
  circle it like a bullseye. Our own Moon keeps its 5 degree ecliptic inclination instead.
  Triton runs retrograde; Charon's period equals Pluto's day, so the pair are locked.
  Every moon is tidally locked, rotation period equal to orbital period.
- Looks. `shaders/moons.ts` holds four new programs. `MOON_FRAG` is one cratered rock and
  ice shader whose named features are switched on per body: great impact basins with rims,
  central peaks and outer rings (Herschel, Valhalla, Stickney), grooved provinces and
  two-tone terrain (Ganymede), Europa's linea drawn where a noise field crosses zero,
  Enceladus's tiger stripes, Miranda's coronae, rift canyons (Titania, Charon), Triton's
  cantaloupe terrain, polar frost and geyser streaks, and Charon's stained pole.
  `IRREGULAR_VERT` stretches and knocks the sphere out of shape for Phobos and Deimos,
  taking the normal from the displaced surface while the fragment shader still lays its
  craters out on the undisplaced direction. `IO_FRAG` is sulphur, frost and volcanic
  paterae that glow through the night side. `TITAN_FRAG` is haze: a wrapped terminator,
  limb scattering and a thicker atmosphere shell set by `params.atmoScale`.
  `PLUME_VERT/FRAG` draws Enceladus's south polar jets and Io's fountains as ballistic
  points, faded out until the moon is large enough on screen to see them.
- Budget. A moon is not drawn at all below a pixel or so across (three pixels on the
  lowest tier), and moon orbit rings fade in only around the world the camera is on, so
  the system overview costs close to what it did before and only a visit pays for a moon.
  A flight is budgeted in damped seconds rather than wall time and damps in the target's
  own moving frame, so the camera arrives at the intended framing even on a slow device
  and even when the moon it is chasing is quick.
- Navigation. The dock stays a list of primaries; the story panel grows a row of moon
  chips (and, on a moon, a chip back to its planet) in both tour and explore. Arrow keys
  step through planets, carrying on from a moon's planet.

## Round four (2026-09-10, approved in conversation)

Requested: rotation axes as they are in the real world, Mercury and the Moon are not
right, and Earth should show the real map.

- Direction. `orbitalPosition` now runs every orbit counterclockwise seen from the north,
  which is the way a positive spin about +y turns a body. Before this the two ran opposite
  ways, so a tidally locked moon turned twice a month relative to its planet instead of
  standing still. Bodies tipped past upright (Venus at 177 degrees, Uranus at 98, Pluto at
  123) spell their backwards spin out in the tilt alone: pairing that with a negative
  period, as the NASA fact sheets do, quietly cancelled it back to forwards.
- Axes. `lib/spin.ts` gives each body the lean of its spin axis and how far it has turned.
  A planet leans by its axial tilt, in a direction fixed in space, which is what gives it
  seasons. A moon spins about the normal of its own orbit, so Saturn's moons stand square
  to the rings and Uranus's lie on their sides with the planet, and its axial tilt is
  measured from that plane. Our Moon's 6.7 degrees from its orbit and 5 of inclination
  leave it 1.7 degrees off the ecliptic, as the real one is.
- Locking. `tidalLock` names the body a world holds one face toward. A locked body's spin
  is read straight off its orbit angle rather than counted out separately, so object-space
  +x, the middle of its map, stays on its partner forever. Pluto is locked back to Charon,
  which its copy already promised. The near side wanders by the moon's own tilt and no
  further, which is the libration that lets us see a little past the edge of ours.
- Real maps. Earth, the Moon and Mercury are the three worlds a visitor can check by eye,
  so they take their geography from small public-domain maps in `public/maps` fetched and
  shrunk by `scripts/build-maps.py`: Blue Marble and its land mask for Earth, the LRO
  albedo for the Moon, the MESSENGER mosaic for Mercury. 145 kB in total, no extra draw
  calls, and the rest of the system stays entirely procedural.
- What the maps do and do not carry. `MAP_GLSL` samples them equirectangularly from the
  object-space direction, taking its gradients from a shifted copy of the coordinate so
  the meridian behind the body does not throw mip selection off. Earth's mask is pulled
  back to a crisp coastline over a little noise, and a coarse mip of the same mask gives
  the depth of the sea and gathers the city lights onto the coasts. On the Moon and
  Mercury the map's albedo stands in for the invented height field the colour was ramped
  from, while the procedural craters go on supplying the relief, and a mapped moon's dark
  plains flatten out because flood basalt is smooth.
