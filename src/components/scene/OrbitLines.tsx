"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { BODIES, BODY_ORDER, TOUR_SECTIONS, type BodyId } from "@/data/bodies";
import { positions } from "@/lib/frame";
import { damp } from "@/lib/math";
import { orbitalPosition } from "@/lib/orbits";
import { useApp } from "@/lib/store";

const ORBITING = BODY_ORDER.filter((id) => id !== "sun" && id !== "belt");
const QUIET = 0.075;
const ACTIVE = 0.3;

export function OrbitLines() {
  const lines = useMemo(() => {
    return ORBITING.map((id) => {
      const body = BODIES[id];
      const pts: THREE.Vector3[] = [];
      const steps = 256;
      for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const v = orbitalPosition({ ...body.orbit, phase: angle, orbitPeriod: 0 }, 0, new THREE.Vector3());
        pts.push(v);
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color("#e7ebf5"),
        transparent: true,
        opacity: QUIET,
        depthWrite: false,
      });
      const line = new THREE.LineLoop(geo, mat);
      line.frustumCulled = false;
      line.renderOrder = -5;
      return { id, line, mat };
    });
  }, []);

  useEffect(() => {
    return () => {
      for (const { line, mat } of lines) {
        line.geometry.dispose();
        mat.dispose();
      }
    };
  }, [lines]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const app = useApp.getState();
    const highlighted: BodyId | null =
      app.mode === "explore" ? app.focus : (TOUR_SECTIONS[app.activeSection] as BodyId | undefined) ?? null;
    for (const { id, line, mat } of lines) {
      const body = BODIES[id];
      if (body.parent) line.position.copy(positions[body.parent]);
      const target = id === highlighted ? ACTIVE : QUIET;
      mat.opacity = damp(mat.opacity, target, 4, dt);
    }
  });

  return (
    <group>
      {lines.map(({ id, line }) => (
        <primitive key={id} object={line} />
      ))}
    </group>
  );
}
