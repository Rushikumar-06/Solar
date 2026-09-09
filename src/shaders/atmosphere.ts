import * as THREE from "three";
import type { Body } from "@/data/bodies";
import { BODY_VARYINGS, OUTPUT_GLSL } from "./common";
import type { Uniforms } from "./uniforms";

/**
 * Additive shell around a body: a sharp bright rim plus a wider soft halo,
 * blue where lit face-on, warm along the terminator, brighter when looking
 * toward the Sun through the limb.
 */
export const ATMOSPHERE_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uTwilight;
uniform float uStrength;
uniform float uThickness;
${BODY_VARYINGS}
void main() {
  vec3 n = normalize(vNormalW);
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 s = normalize(-vWorld);
  float mu = max(dot(n, v), 0.0);
  float thin = pow(1.0 - mu, 5.0 / uThickness);
  float wide = pow(1.0 - mu, 1.6) * 0.35;
  float ndl = dot(n, s);
  float day = smoothstep(-0.35, 0.35, ndl);
  float twilight = exp(-pow(ndl / 0.25, 2.0));
  float forward = pow(max(dot(-v, s), 0.0), 6.0) * 0.5;
  vec3 col = mix(uColor, uTwilight, twilight * 0.85);
  float a = (thin + wide) * (0.12 + 0.88 * day + forward * 0.6) * uStrength * uThickness;
  gl_FragColor = vec4(col * a * 1.25, a);
  ${OUTPUT_GLSL}
}
`;

export function atmosphereUniforms(body: Body): Uniforms {
  const color = new THREE.Color(body.atmosphere?.color ?? "#000000");
  const twilight = color.clone().lerp(new THREE.Color("#ff7a30"), 0.75);
  return {
    uColor: { value: color },
    uTwilight: { value: twilight },
    uStrength: { value: body.atmosphere?.strength ?? 0 },
    uThickness: { value: body.params?.atmoThickness ?? 1 },
  };
}
