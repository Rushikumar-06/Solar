"use client";

import { useFrame } from "@react-three/fiber";
import { frame, updatePositions } from "@/lib/frame";

/** Advances simulated time and refreshes every body position before anything else renders. */
export function Simulation() {
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    frame.sim += dt * frame.timeScale;
    updatePositions(frame.sim);
  }, -10);
  return null;
}
