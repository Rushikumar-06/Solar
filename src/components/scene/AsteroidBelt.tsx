"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { BODIES } from "@/data/bodies";
import { frame } from "@/lib/frame";
import { createRandom } from "@/lib/random";
import { BELT_FRAG, BELT_VERT, DUST_FRAG, DUST_VERT } from "@/shaders/particles";

const belt = BODIES.belt;
const INNER = belt.params?.inner ?? 41;
const OUTER = belt.params?.outer ?? 53;
const THICKNESS = belt.params?.thickness ?? 2.2;

/** Angular speed for a circular orbit at radius r, matched to the belt's mid-radius period. */
const angularSpeed = (r: number) => ((Math.PI * 2) / belt.orbit.orbitPeriod) * Math.pow(belt.orbit.orbitRadius / r, 1.5);

function randomRadius(random: () => number): number {
  // Denser toward the middle of the belt.
  const u = random();
  const v = random();
  const mid = (INNER + OUTER) / 2;
  const half = (OUTER - INNER) / 2;
  return mid + (u - v) * half;
}

export function AsteroidBelt({ count }: { count: number }) {
  const dpr = useThree((s) => s.viewport.dpr);

  const { rocks, shimmer } = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const orbit = new Float32Array(count * 4);
    const spin = new Float32Array(count * 4);
    const shape = new Float32Array(count * 2);
    const axis = new THREE.Vector3();
    const random = createRandom(4242);
    for (let i = 0; i < count; i++) {
      const r = randomRadius(random);
      orbit.set([r, random() * Math.PI * 2, angularSpeed(r), (random() - 0.5) * THICKNESS * (0.4 + random())], i * 4);
      axis.set(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
      spin.set([axis.x, axis.y, axis.z, (random() - 0.5) * 1.2], i * 4);
      const big = random() < 0.03;
      shape.set([big ? 0.18 + random() * 0.22 : 0.025 + random() * 0.09, random() * 100], i * 2);
    }
    geo.setAttribute("aOrbit", new THREE.InstancedBufferAttribute(orbit, 4));
    geo.setAttribute("aSpin", new THREE.InstancedBufferAttribute(spin, 4));
    geo.setAttribute("aShape", new THREE.InstancedBufferAttribute(shape, 2));
    const mat = new THREE.ShaderMaterial({
      vertexShader: BELT_VERT,
      fragmentShader: BELT_FRAG,
      uniforms: { uSim: { value: 0 }, uPal: { value: belt.palette.map((c) => new THREE.Color(c)) } },
    });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.frustumCulled = false;

    // Fine dust between the rocks, so the belt shimmers from a distance.
    const dustCount = Math.floor(count * 1.5);
    const dgeo = new THREE.BufferGeometry();
    const pos = new Float32Array(dustCount * 3);
    const size = new Float32Array(dustCount);
    const phase = new Float32Array(dustCount);
    for (let i = 0; i < dustCount; i++) {
      const r = randomRadius(random);
      const a = random() * Math.PI * 2;
      pos.set([Math.cos(a) * r, (random() - 0.5) * THICKNESS * 1.4, Math.sin(a) * r], i * 3);
      size[i] = 0.35 + random() * 0.9;
      phase[i] = random() * 100;
    }
    dgeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    dgeo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    dgeo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    const dmat = new THREE.ShaderMaterial({
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(dgeo, dmat);
    points.frustumCulled = false;
    return { rocks: mesh, shimmer: points };
  }, [count]);

  useEffect(() => {
    return () => {
      rocks.geometry.dispose();
      (rocks.material as THREE.Material).dispose();
      shimmer.geometry.dispose();
      (shimmer.material as THREE.Material).dispose();
    };
  }, [rocks, shimmer]);

  useFrame((state) => {
    (rocks.material as THREE.ShaderMaterial).uniforms.uSim.value = frame.sim;
    const dm = shimmer.material as THREE.ShaderMaterial;
    dm.uniforms.uTime.value = state.clock.elapsedTime;
    dm.uniforms.uPixelRatio.value = dpr;
    shimmer.rotation.y = (frame.sim / belt.orbit.orbitPeriod) * Math.PI * 2;
  });

  return (
    <group>
      <primitive object={rocks} />
      <primitive object={shimmer} />
    </group>
  );
}
