import { create } from "zustand";
import { BODIES, BODY_ORDER, TOUR_SECTIONS, type BodyId, type SectionId } from "@/data/bodies";
import type { QualityTier } from "./quality";
import { SPEED_DEFAULT, clampSpeed } from "./autoplay";
import { frame } from "./frame";

export type Mode = "tour" | "explore";

export interface AppState {
  mode: Mode;
  /** Body the explore camera is parked on; null means the system overview. */
  focus: BodyId | null;
  /** Index into TOUR_SECTIONS of the section the tour camera is nearest. */
  activeSection: number;
  /** True while the tour camera is between sections. */
  flying: boolean;
  timeScale: number;
  quality: QualityTier;
  ready: boolean;
  webgl: boolean | null;
  reducedMotion: boolean;
  hovered: BodyId | null;
  hintDismissed: boolean;
  /** True while the tour scrolls itself. Only meaningful in tour mode. */
  autoplay: boolean;
  /** Autoplay speed multiplier, 0.5..3 in 0.25 steps. */
  autoplaySpeed: number;

  enterExplore: (focus?: BodyId | null) => void;
  exitExplore: () => void;
  setFocus: (focus: BodyId | null) => void;
  stepFocus: (direction: 1 | -1) => void;
  setTimeScale: (scale: number) => void;
  setQuality: (quality: QualityTier) => void;
  setReady: (ready: boolean) => void;
  setWebgl: (webgl: boolean) => void;
  setReducedMotion: (reduced: boolean) => void;
  setHovered: (id: BodyId | null) => void;
  setTourPosition: (activeSection: number, flying: boolean) => void;
  dismissHint: () => void;
  setAutoplay: (on: boolean) => void;
  toggleAutoplay: () => void;
  setAutoplaySpeed: (speed: number) => void;
}

export const sectionForBody = (id: BodyId): number => {
  const section = (BODIES[id].parent ?? id) as SectionId;
  return Math.max(0, TOUR_SECTIONS.indexOf(section));
};

export const useApp = create<AppState>((set, get) => ({
  mode: "tour",
  focus: null,
  activeSection: 0,
  flying: false,
  timeScale: 1,
  quality: 1,
  ready: false,
  webgl: null,
  reducedMotion: false,
  hovered: null,
  hintDismissed: false,
  autoplay: false,
  autoplaySpeed: SPEED_DEFAULT,

  enterExplore: (focus) => {
    const current = get();
    const next = focus === undefined ? current.focus : focus;
    set({ mode: "explore", focus: next, hovered: null, autoplay: false });
  },
  exitExplore: () => set({ mode: "tour", hovered: null, autoplay: false }),
  setFocus: (focus) => set({ focus }),
  stepFocus: (direction) => {
    const { focus } = get();
    const i = focus ? BODY_ORDER.indexOf(focus) : -1;
    const n = BODY_ORDER.length;
    const nextIndex = i < 0 ? (direction > 0 ? 0 : n - 1) : (i + direction + n) % n;
    set({ focus: BODY_ORDER[nextIndex] });
  },
  setTimeScale: (timeScale) => {
    frame.timeScale = timeScale;
    set({ timeScale });
  },
  setQuality: (quality) => set({ quality }),
  setReady: (ready) => set({ ready }),
  setWebgl: (webgl) => set({ webgl }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setHovered: (hovered) => {
    if (get().hovered !== hovered) set({ hovered });
  },
  setTourPosition: (activeSection, flying) => {
    const s = get();
    if (s.activeSection !== activeSection || s.flying !== flying) set({ activeSection, flying });
  },
  dismissHint: () => set({ hintDismissed: true }),
  // Autoplay only runs in tour mode, so it can only be switched on there.
  setAutoplay: (on) => set({ autoplay: on && get().mode === "tour" }),
  toggleAutoplay: () => {
    const { autoplay, mode } = get();
    set({ autoplay: !autoplay && mode === "tour" });
  },
  setAutoplaySpeed: (speed) => set({ autoplaySpeed: clampSpeed(speed) }),
}));
