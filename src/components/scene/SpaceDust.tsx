"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { createRandom } from "@/lib/random";
import { DUST_FRAG, DUST_VERT } from "@/shaders/particles";

/** Sparse motes across the whole system that streak past during camera flights. */
export function SpaceDust({ count }: { count: number }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const phase = new Float32Array(count);
    const random = createRandom(7331);
    for (let i = 0; i < count; i++) {
      const r = 8 + Math.pow(random(), 0.7) * 165;
      const a = random() * Math.PI * 2;
      pos.set([Math.cos(a) * r, (random() - 0.5) * 12, Math.sin(a) * r], i * 3);
      size[i] = 1 + random() * 1.6;
      phase[i] = random() * 100;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
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
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uPixelRatio.value = dpr;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
