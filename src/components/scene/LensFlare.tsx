"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BODIES, BODY_ORDER } from "@/data/bodies";
import { DEG, smoothstep } from "@/lib/math";
import { positions } from "@/lib/frame";
import { FLARE_GHOST_FRAG, FLARE_GHOST_VERT, flareGhostUniforms } from "@/shaders/effects";

/** Ghosts along the line from the Sun through the screen centre; t = 0 is the Sun, 1 the centre. */
const GHOSTS = [
  { t: 0, w: 1.0, h: 0.04, color: "#ffd2a0", shape: 2, weight: 0.35 },
  { t: -0.35, w: 0.06, h: 0.06, color: "#ffb36b", shape: 0, weight: 0.3 },
  { t: 0.15, w: 0.035, h: 0.035, color: "#ffd9a0", shape: 0, weight: 0.4 },
  { t: 0.35, w: 0.1, h: 0.1, color: "#7fd6ff", shape: 1, weight: 0.18 },
  { t: 0.55, w: 0.05, h: 0.05, color: "#ff9f5a", shape: 0, weight: 0.3 },
  { t: 0.8, w: 0.15, h: 0.15, color: "#ffc98a", shape: 1, weight: 0.14 },
  { t: 1.2, w: 0.06, h: 0.06, color: "#ff8a5a", shape: 0, weight: 0.28 },
];

const OCCLUDERS = BODY_ORDER.filter((id) => id !== "sun" && id !== "belt" && id !== "comet").map((id) => BODIES[id]);
const ndc = new THREE.Vector3();
const toSun = new THREE.Vector3();
const toBody = new THREE.Vector3();

/** True when any planet sits between the camera and the Sun. */
function sunOccluded(camera: THREE.Camera): boolean {
  toSun.copy(camera.position).negate();
  const dist = toSun.length();
  if (dist < 1e-3) return false;
  toSun.divideScalar(dist);
  for (const body of OCCLUDERS) {
    toBody.copy(positions[body.id]).sub(camera.position);
    const along = toBody.dot(toSun);
    if (along <= 0 || along >= dist) continue;
    const off = Math.sqrt(Math.max(toBody.lengthSq() - along * along, 0));
    if (off < body.radius) return true;
  }
  return false;
}

/** Subtle lens ghosts and an anamorphic streak whenever the Sun is in frame and unhidden. */
export function LensFlare() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  const materials = useMemo(
    () =>
      GHOSTS.map(
        (g) =>
          new THREE.ShaderMaterial({
            vertexShader: FLARE_GHOST_VERT,
            fragmentShader: FLARE_GHOST_FRAG,
            uniforms: flareGhostUniforms(g.color, g.shape),
            transparent: true,
            depthTest: false,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
      ),
    [],
  );
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    ndc.set(0, 0, 0).project(camera);
    const inFront = ndc.z < 1;
    const edge = Math.max(Math.abs(ndc.x), Math.abs(ndc.y));
    const dist = camera.position.length();
    let intensity = 0;
    if (inFront && edge < 1.2 && !sunOccluded(camera)) {
      intensity = (1 - smoothstep((edge - 0.55) / 0.65)) * smoothstep((dist - 8) / 12) * (1 - smoothstep((dist - 180) / 120)) * 0.28;
    }
    group.visible = intensity > 0.002;
    if (!group.visible) return;
    const halfH = Math.tan((camera.fov / 2) * DEG);
    const halfW = halfH * camera.aspect;
    for (let i = 0; i < GHOSTS.length; i++) {
      const g = GHOSTS[i];
      const mesh = meshRefs.current[i];
      if (!mesh) continue;
      const k = 1 - g.t;
      mesh.position.set(ndc.x * k * halfW, ndc.y * k * halfH, -1);
      mesh.scale.set(g.w * halfH, g.h * halfH, 1);
      materials[i].uniforms.uIntensity.value = intensity * g.weight;
    }
  });

  return (
    <primitive object={camera}>
      <group ref={groupRef} renderOrder={1000}>
        {GHOSTS.map((g, i) => (
          <mesh
            key={i}
            ref={(el) => {
              meshRefs.current[i] = el;
            }}
            material={materials[i]}
            renderOrder={1000}
            frustumCulled={false}
          >
            <planeGeometry args={[1, 1]} />
          </mesh>
        ))}
      </group>
    </primitive>
  );
}
