import { frame } from "./frame";

export function lockScroll(lock: boolean): void {
  document.documentElement.style.overflow = lock ? "hidden" : "";
}

export function scrollToSection(index: number, instant = false): void {
  const top = frame.tops[index] ?? 0;
  window.scrollTo({ top, behavior: instant ? "instant" : "smooth" });
}
