"use client";

import { Billboard } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BODIES } from "@/data/bodies";
import { frame, positions } from "@/lib/frame";
import { smoothstep } from "@/lib/math";
import { orbitalPosition } from "@/lib/orbits";
import { createRandom } from "@/lib/random";
import { useApp } from "@/lib/store";
import {
  COMA_FRAG,
  COMA_VERT,
  DUST_TAIL_FRAG,
  DUST_TAIL_VERT,
  ION_TAIL_FRAG,
  ION_TAIL_VERT,
  NUCLEUS_FRAG,
  NUCLEUS_VERT,
  TRAIL_SAMPLES,
  TRAIL_SPACING,
  comaUniforms,
  dustTailUniforms,
  ionTailUniforms,
  nucleusUniforms,
} from "@/shaders/comet";

const comet = BODIES.comet;
const sample = new THREE.Vector3();

/** Per-particle data: position along the tail, two jitters, and point size. */
function tailGeometry(count: number, seed: number): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const data = new Float32Array(count * 4);
  const random = createRandom(seed);
  for (let i = 0; i < count; i++) {
    data.set([random(), random(), random(), 2 + random() * 6], i * 4);
  }
  // Positions come from the vertex shader; this attribute only sets the vertex count.
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute("aData", new THREE.BufferAttribute(data, 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
  return geo;
}

function pushSample(trail: Float32Array, p: THREE.Vector3) {
  trail.copyWithin(6, 3, (TRAIL_SAMPLES - 1) * 3);
  trail[3] = p.x;
  trail[4] = p.y;
  trail[5] = p.z;
}

/** Halley's Comet: nucleus, coma and two particle tails following the live orbit. */
export function Comet({ dustCount, ionCount }: { dustCount: number; ionCount: number }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const groupRef = useRef<THREE.Group>(null);
  const nucleusRef = useRef<THREE.Mesh>(null);
  const comaRef = useRef<THREE.Mesh>(null);
  const enterExplore = useApp((s) => s.enterExplore);
  const setHovered = useApp((s) => s.setHovered);
  const trailState = useRef({ lastSample: Number.NaN }).current;

  const res = useMemo(() => {
    const nucleus = new THREE.ShaderMaterial({ vertexShader: NUCLEUS_VERT, fragmentShader: NUCLEUS_FRAG, uniforms: nucleusUniforms(comet) });
    const coma = new THREE.ShaderMaterial({
      vertexShader: COMA_VERT,
      fragmentShader: COMA_FRAG,
      uniforms: comaUniforms(),
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const dust = new THREE.ShaderMaterial({
      vertexShader: DUST_TAIL_VERT,
      fragmentShader: DUST_TAIL_FRAG,
      uniforms: dustTailUniforms(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ion = new THREE.ShaderMaterial({
      vertexShader: ION_TAIL_VERT,
      fragmentShader: ION_TAIL_FRAG,
      uniforms: ionTailUniforms(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return {
      nucleus,
      coma,
      dust,
      ion,
      dustGeo: tailGeometry(dustCount, 811),
      ionGeo: tailGeometry(ionCount, 812),
      trail: dust.uniforms.uTrail.value as Float32Array,
    };
  }, [dustCount, ionCount]);

  useEffect(() => {
    return () => {
      res.nucleus.dispose();
      res.coma.dispose();
      res.dust.dispose();
      res.ion.dispose();
      res.dustGeo.dispose();
      res.ionGeo.dispose();
    };
  }, [res]);

  useFrame((state) => {
    const head = positions.comet;
    const group = groupRef.current;
    if (!group) return;
    group.position.copy(head);

    // Keep a history of where the nucleus has been, filled from the orbit itself
    // so the tail is complete on the first frame and stays exact at any time scale.
    const trail = res.trail;
    if (Number.isNaN(trailState.lastSample)) {
      trailState.lastSample = frame.sim;
      for (let k = TRAIL_SAMPLES - 1; k >= 1; k--) {
        orbitalPosition(comet.orbit, frame.sim - k * TRAIL_SPACING, sample);
        trail.set([sample.x, sample.y, sample.z], k * 3);
      }
    }
    let guard = 0;
    while (frame.sim - trailState.lastSample >= TRAIL_SPACING && guard++ < TRAIL_SAMPLES) {
      trailState.lastSample += TRAIL_SPACING;
      orbitalPosition(comet.orbit, trailState.lastSample, sample);
      pushSample(trail, sample);
    }
    trail[0] = head.x;
    trail[1] = head.y;
    trail[2] = head.z;

    // Activity rises as the comet nears the Sun: long tails inside Mars, a modest one
    // farther out. Real comets go quiet beyond Jupiter, but a tail-less comet would be
    // invisible on the dock, so the floor stays well above zero.
    const r = head.length();
    const activity = 0.28 + 0.72 * smoothstep((90 - r) / 71);
    const tailLength = 3 + 24 * activity;
    const t = state.clock.elapsedTime;
    const reduced = useApp.getState().reducedMotion;

    res.dust.uniforms.uActivity.value = activity;
    res.dust.uniforms.uTailLength.value = tailLength;
    res.dust.uniforms.uPixelRatio.value = dpr;
    res.ion.uniforms.uActivity.value = activity;
    res.ion.uniforms.uTailLength.value = tailLength;
    res.ion.uniforms.uPixelRatio.value = dpr;
    res.ion.uniforms.uTime.value = t;
    res.ion.uniforms.uFlutter.value = reduced ? 0 : 1;
    (res.ion.uniforms.uHead.value as THREE.Vector3).copy(head);
    res.coma.uniforms.uIntensity.value = 0.35 + 0.75 * activity;
    res.coma.uniforms.uTime.value = t;
    if (comaRef.current) comaRef.current.scale.setScalar(0.9 + 3.6 * activity);
    if (nucleusRef.current) nucleusRef.current.rotation.set(0.4, (frame.sim / comet.rotationPeriod) * Math.PI * 2, 0.2);
  });

  const visit = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    enterExplore("comet");
  };
  const hover = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setHovered("comet");
  };

  return (
    <>
      <group ref={groupRef}>
        <mesh ref={nucleusRef} material={res.nucleus} scale={comet.radius} onClick={visit} onPointerOver={hover} onPointerOut={() => setHovered(null)}>
          <icosahedronGeometry args={[1, 4]} />
        </mesh>
        <Billboard follow>
          <mesh ref={comaRef} material={res.coma} renderOrder={2}>
            <planeGeometry args={[1, 1]} />
          </mesh>
        </Billboard>
        <mesh visible={false} onClick={visit} onPointerOver={hover} onPointerOut={() => setHovered(null)}>
          <sphereGeometry args={[1.2, 12, 8]} />
        </mesh>
      </group>
      <points geometry={res.dustGeo} material={res.dust} frustumCulled={false} renderOrder={1} />
      <points geometry={res.ionGeo} material={res.ion} frustumCulled={false} renderOrder={1} />
    </>
  );
}
