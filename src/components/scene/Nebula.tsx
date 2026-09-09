"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { NEBULA_FRAG, NEBULA_VERT } from "@/shaders/particles";

export function Nebula({ octaves }: { octaves: number }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: NEBULA_VERT,
        fragmentShader: NEBULA_FRAG,
        uniforms: {
          uColA: { value: new THREE.Color("#0d1030") },
          uColB: { value: new THREE.Color("#1b3f52") },
          uColC: { value: new THREE.Color("#5a3f36") },
          uOctaves: { value: octaves },
        },
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [octaves],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh material={material} frustumCulled={false} renderOrder={-10}>
      <sphereGeometry args={[700, 48, 32]} />
    </mesh>
  );
}
