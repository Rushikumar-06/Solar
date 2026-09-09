"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { createRandom } from "@/lib/random";
import { useApp } from "@/lib/store";
import { STARS_FRAG, STARS_VERT } from "@/shaders/particles";

const RADIUS = 650;
const BAND_NORMAL = new THREE.Vector3(0.35, 1.0, 0.2).normalize();

export function Starfield({ count }: { count: number }) {
  const dpr = useThree((s) => s.viewport.dpr);

  const { geometry, material } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const temp = new Float32Array(count);
    const phase = new Float32Array(count);
    const v = new THREE.Vector3();
    const random = createRandom(1201);
    for (let i = 0; i < count; i++) {
      v.set(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1).normalize();
      // A third of the stars crowd toward the galactic band.
      if (i % 3 === 0) {
        const along = v.dot(BAND_NORMAL);
        v.addScaledVector(BAND_NORMAL, -along * 0.85).normalize();
      }
      const r = RADIUS * (0.92 + random() * 0.08);
      pos.set([v.x * r, v.y * r, v.z * r], i * 3);
      const u = random();
      size[i] = u < 0.8 ? 0.8 + random() * 1.0 : u < 0.98 ? 1.8 + random() * 1.2 : 3 + random() * 2.2;
      temp[i] = random();
      phase[i] = random();
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    geo.setAttribute("aTemp", new THREE.BufferAttribute(temp, 1));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), RADIUS);
    const mat = new THREE.ShaderMaterial({
      vertexShader: STARS_VERT,
      fragmentShader: STARS_FRAG,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uTwinkle: { value: 1 } },
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
    material.uniforms.uTwinkle.value = useApp.getState().reducedMotion ? 0 : 1;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={-9} />;
}
