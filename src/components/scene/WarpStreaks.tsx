"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { frame } from "@/lib/frame";
import { smoothstep } from "@/lib/math";
import { createRandom } from "@/lib/random";
import { useApp } from "@/lib/store";
import { STREAKS_FRAG, STREAKS_VERT, streaksUniforms } from "@/shaders/effects";

/** Outer radius of the streak volume, in world units. */
const RADIUS = 220;
/** Longest trail (before per-particle jitter) at any speed, in world units. */
const MAX_TRAIL = 1.5;
/** Trail length per unit of speed, in seconds; 60 units/s gives a 1.5 unit trail. */
const MAX_STRETCH = 0.025;
/** Speed range (world units per second) over which the streaks fade in. */
const SPEED_LOW = 3;
const SPEED_HIGH = 14;

/**
 * Faint blue-white streaks that trail the camera's motion during flights and
 * vanish when it parks. Every streak is one line segment whose tail vertex is
 * displaced against the camera velocity in the vertex shader.
 */
export function WarpStreaks({ count }: { count: number }) {
  const linesRef = useRef<THREE.LineSegments>(null);

  const { geometry, material } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 6);
    const end = new Float32Array(count * 2);
    const data = new Float32Array(count * 4);
    const random = createRandom(2718);
    for (let i = 0; i < count; i++) {
      // Denser toward the inner system; a thin sheet around the ecliptic with a sparse halo.
      const r = 4 + Math.pow(random(), 1.7) * (RADIUS - 4);
      const a = random() * Math.PI * 2;
      const spread = random() < 0.82 ? 12 : 40;
      const y = (random() + random() - 1) * spread;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const jitter = 0.5 + random() * 0.7;
      const bright = 0.4 + random() * 0.6;
      pos.set([x, y, z, x, y, z], i * 6);
      end.set([0, 1], i * 2);
      data.set([jitter, bright, jitter, bright], i * 4);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aEnd", new THREE.BufferAttribute(end, 1));
    geo.setAttribute("aData", new THREE.BufferAttribute(data, 2));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), RADIUS + 10);
    const mat = new THREE.ShaderMaterial({
      vertexShader: STREAKS_VERT,
      fragmentShader: STREAKS_FRAG,
      uniforms: streaksUniforms(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry: geo, material: mat };
  }, [count]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((state) => {
    const speed = frame.cameraSpeed;
    const reduced = useApp.getState().reducedMotion;
    const ramp = reduced ? 0 : smoothstep((speed - SPEED_LOW) / (SPEED_HIGH - SPEED_LOW));
    const stretch = ramp * Math.min(MAX_STRETCH, MAX_TRAIL / Math.max(speed, 1e-3));
    const u = material.uniforms;
    u.uStretch.value = stretch;
    (u.uVelocity.value as THREE.Vector3).copy(frame.cameraVelocity);
    u.uTime.value = state.clock.elapsedTime;
    // Nothing to see while parked: skip the draw entirely.
    if (linesRef.current) linesRef.current.visible = stretch > 1e-5;
  });

  if (count <= 0) return null;
  return <lineSegments ref={linesRef} geometry={geometry} material={material} frustumCulled={false} renderOrder={1} />;
}
