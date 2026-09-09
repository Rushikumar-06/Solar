"use client";

import { useFrame, useThree, type RootState } from "@react-three/fiber";
import CameraControls from "camera-controls";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { BODIES, TOUR_SECTIONS, type BodyId, type SectionId } from "@/data/bodies";
import { frameBody, type Pose } from "@/lib/camera";
import { frame, positions } from "@/lib/frame";
import { damp } from "@/lib/math";
import { sectionAt, tourParameter } from "@/lib/tour";
import { useApp, type Mode } from "@/lib/store";

CameraControls.install({ THREE });

const HERO_POSE = { position: new THREE.Vector3(-46, 21, 64), target: new THREE.Vector3(-15, -2, -13) };
const OUTRO_POSE = { position: new THREE.Vector3(40, 250, 210), target: new THREE.Vector3(0, 0, 42) };
const OVERVIEW_POSE = { position: new THREE.Vector3(70, 95, 175), target: new THREE.Vector3(0, 0, 0) };

const BELT_FRAMING = { distanceFactor: 3.2, side: 1 as const, elevation: 0.28, sunward: 0.3, lateral: 1.0, targetShift: 0 };

const makePose = () => ({ position: new THREE.Vector3(), target: new THREE.Vector3() });

function copyPose(out: Pose, from: Pose) {
  out.position.x = from.position.x;
  out.position.y = from.position.y;
  out.position.z = from.position.z;
  out.target.x = from.target.x;
  out.target.y = from.target.y;
  out.target.z = from.target.z;
}

function bodyPose(id: BodyId, explore: boolean, out: Pose): Pose {
  const body = BODIES[id];
  const pos = positions[id];
  if (id === "belt") {
    frameBody(pos, body.radius, BELT_FRAMING, out);
  } else {
    const side = explore || frame.narrow ? 0 : body.framing.side;
    frameBody(pos, body.radius, { distanceFactor: body.framing.distanceFactor * (explore ? 1.1 : 1), side }, out);
  }
  if (frame.narrow && !explore) {
    // Lift the body into the upper half of a portrait screen, above the story panel.
    out.target.y -= body.radius * body.framing.distanceFactor * 0.16;
  }
  return out;
}

/** Camera pose for a tour section, computed from the live body positions. */
function sectionPose(index: number, out: Pose): Pose {
  const id: SectionId = TOUR_SECTIONS[Math.max(0, Math.min(TOUR_SECTIONS.length - 1, index))];
  if (id === "hero") {
    copyPose(out, HERO_POSE);
    return out;
  }
  if (id === "outro") {
    copyPose(out, OUTRO_POSE);
    return out;
  }
  return bodyPose(id, false, out);
}

function focusPose(id: BodyId | null, out: Pose): Pose {
  if (!id) {
    copyPose(out, OVERVIEW_POSE);
    return out;
  }
  return bodyPose(id, true, out);
}

const FLIGHT_SECONDS = 1.7;
const dampVec = (v: THREE.Vector3, to: THREE.Vector3, lambda: number, dt: number) => {
  v.x = damp(v.x, to.x, lambda, dt);
  v.y = damp(v.y, to.y, lambda, dt);
  v.z = damp(v.z, to.z, lambda, dt);
};

/** A jump faster than this (world units per second) is a cut, not motion. */
const TELEPORT_SPEED = 1500;

/**
 * Damps the camera's displacement per second into `frame.cameraVelocity` and
 * refreshes `frame.cameraSpeed`. Called once per frame after the rig has moved
 * the camera, whichever branch moved it.
 */
function trackVelocity(rig: { prevPosition: THREE.Vector3; prevTracked: boolean }, cam: THREE.Camera, elapsed: number, dt: number) {
  const p = cam.position;
  const prev = rig.prevPosition;
  const v = frame.cameraVelocity;
  if (rig.prevTracked) {
    const inv = 1 / Math.max(elapsed, 1e-4);
    const vx = (p.x - prev.x) * inv;
    const vy = (p.y - prev.y) * inv;
    const vz = (p.z - prev.z) * inv;
    if (vx * vx + vy * vy + vz * vz < TELEPORT_SPEED * TELEPORT_SPEED) {
      v.x = damp(v.x, vx, 6, dt);
      v.y = damp(v.y, vy, 6, dt);
      v.z = damp(v.z, vz, 6, dt);
    } else {
      v.set(0, 0, 0);
    }
  }
  prev.copy(p);
  rig.prevTracked = true;
  frame.cameraSpeed = v.length();
}

/**
 * Drives the camera. In tour mode it follows the scroll position; in explore
 * mode it flies to the focused body, then hands the camera to camera-controls
 * for orbiting and zooming until the focus changes again.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controlsRef = useRef<CameraControls | null>(null);

  const rig = useRef({
    initialised: false,
    mode: "tour" as Mode,
    focus: null as BodyId | null | undefined,
    flightEnds: 0,
    handedOver: false,
    fov: 0,
    pose: makePose(),
    poseA: makePose(),
    poseB: makePose(),
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
    parallax: new THREE.Vector2(),
    right: new THREE.Vector3(),
    up: new THREE.Vector3(),
    finalPos: new THREE.Vector3(),
    prevPosition: new THREE.Vector3(),
    prevTracked: false,
  }).current;

  useEffect(() => {
    const controls = new CameraControls(camera, gl.domElement);
    controls.enabled = false;
    controls.mouseButtons.right = CameraControls.ACTION.NONE;
    controls.mouseButtons.middle = CameraControls.ACTION.NONE;
    controls.touches.two = CameraControls.ACTION.TOUCH_DOLLY;
    controls.touches.three = CameraControls.ACTION.NONE;
    controls.smoothTime = 0.45;
    controls.dollySpeed = 0.6;
    controlsRef.current = controls;
    return () => {
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, gl]);

  const drive = (state: RootState, delta: number) => {
    const dt = Math.min(delta, 0.1);
    const app = useApp.getState();
    const controls = controlsRef.current;
    const cam = camera as THREE.PerspectiveCamera;

    const wantedFov = frame.narrow ? 54 : 38;
    if (rig.fov !== wantedFov) {
      rig.fov = wantedFov;
      cam.fov = wantedFov;
      cam.updateProjectionMatrix();
    }

    if (app.mode === "tour") {
      if (rig.mode !== "tour") {
        rig.mode = "tour";
        if (controls) controls.enabled = false;
        rig.handedOver = false;
      }

      const raw = tourParameter(window.scrollY, frame.tops, 0.4);
      const t = app.reducedMotion ? sectionAt(raw) : raw;
      frame.t = t;
      const i = Math.floor(t);
      const f = t - i;
      sectionPose(i, rig.poseA);
      if (f > 0) {
        sectionPose(i + 1, rig.poseB);
        rig.pose.position.lerpVectors(rig.poseA.position, rig.poseB.position, f);
        rig.pose.target.lerpVectors(rig.poseA.target, rig.poseB.target, f);
      } else {
        rig.pose.position.copy(rig.poseA.position);
        rig.pose.target.copy(rig.poseA.target);
      }

      const nearest = sectionAt(t);
      app.setTourPosition(nearest, Math.abs(t - nearest) > 0.28);

      if (!rig.initialised || app.reducedMotion) {
        rig.position.copy(rig.pose.position);
        rig.target.copy(rig.pose.target);
        rig.initialised = true;
      } else {
        dampVec(rig.position, rig.pose.position, 3.2, dt);
        dampVec(rig.target, rig.pose.target, 3.2, dt);
      }

      // Gentle pointer parallax and idle drift, scaled by the distance to the target.
      const dist = rig.position.distanceTo(rig.target);
      const px = app.reducedMotion ? 0 : state.pointer.x;
      const py = app.reducedMotion ? 0 : state.pointer.y;
      rig.parallax.x = damp(rig.parallax.x, px, 2, dt);
      rig.parallax.y = damp(rig.parallax.y, py, 2, dt);
      rig.right.set(1, 0, 0).applyQuaternion(cam.quaternion);
      rig.up.set(0, 1, 0).applyQuaternion(cam.quaternion);
      const bob = app.reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.35) * 0.004 * dist;
      rig.finalPos
        .copy(rig.position)
        .addScaledVector(rig.right, rig.parallax.x * 0.025 * dist)
        .addScaledVector(rig.up, rig.parallax.y * 0.018 * dist + bob);
      cam.position.copy(rig.finalPos);
      cam.lookAt(rig.target);
      return;
    }

    // Explore mode.
    if (rig.mode !== "explore" || rig.focus !== app.focus) {
      const entering = rig.mode !== "explore";
      rig.mode = "explore";
      rig.focus = app.focus;
      rig.flightEnds = state.clock.elapsedTime + FLIGHT_SECONDS;
      rig.handedOver = false;
      if (controls) controls.enabled = false;
      if (entering) {
        rig.position.copy(cam.position);
        if (rig.target.lengthSq() === 0) rig.target.copy(positions.sun);
      } else if (controls) {
        controls.getTarget(rig.target);
        rig.position.copy(cam.position);
      }
    }

    if (!rig.handedOver) {
      focusPose(app.focus, rig.pose);
      const snap = app.reducedMotion;
      if (snap) {
        rig.position.copy(rig.pose.position);
        rig.target.copy(rig.pose.target);
      } else {
        dampVec(rig.position, rig.pose.position, 3.4, dt);
        dampVec(rig.target, rig.pose.target, 3.4, dt);
      }
      cam.position.copy(rig.position);
      cam.lookAt(rig.target);
      const span = Math.max(1, rig.pose.position.distanceTo(rig.pose.target));
      const close = rig.position.distanceTo(rig.pose.position) < 0.02 * span;
      if (controls && (snap || close || state.clock.elapsedTime > rig.flightEnds)) {
        rig.handedOver = true;
        const focusBody = app.focus ? BODIES[app.focus] : null;
        controls.minDistance = focusBody ? focusBody.radius * 1.6 : 12;
        controls.maxDistance = 620;
        controls.setLookAt(cam.position.x, cam.position.y, cam.position.z, rig.target.x, rig.target.y, rig.target.z, false);
        controls.enabled = true;
      }
      return;
    }

    if (controls) {
      if (app.focus) {
        const p = positions[app.focus];
        controls.moveTo(p.x, p.y, p.z, false);
      }
      controls.update(dt);
    }
  };

  useFrame((state, delta) => {
    drive(state, delta);
    trackVelocity(rig, camera, delta, Math.min(delta, 0.1));
  }, -5);

  return null;
}
