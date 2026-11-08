"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export interface CamKey {
  pos: [number, number, number];
  look: [number, number, number];
}

/**
 * Eases the camera between per-act keyframes.
 * Responsive: on portrait screens the camera pulls back along its view
 * direction and widens the FOV so the composition still fits a phone.
 * Adds a gentle handheld drift so the shot never feels static.
 */
export default function CameraRig({ act, keys }: { act: number; keys: CamKey[] }) {
  const { camera, size } = useThree();
  const target = useRef(new THREE.Vector3(...keys[0].look));
  const tmpPos = useRef(new THREE.Vector3());
  const tmpLook = useRef(new THREE.Vector3());
  const first = useRef(true);

  const aspect = size.width / size.height;
  const pull = aspect < 1 ? THREE.MathUtils.clamp(0.66 / aspect, 1, 1.85) : 1;

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = aspect < 1 ? 58 : 48;
    cam.updateProjectionMatrix();
  }, [camera, aspect]);

  useFrame((state, delta) => {
    const k = keys[Math.min(act, keys.length - 1)];
    tmpLook.current.set(...k.look);
    tmpPos.current.set(...k.pos).sub(tmpLook.current).multiplyScalar(pull).add(tmpLook.current);

    const t = state.clock.elapsedTime;
    tmpPos.current.x += Math.sin(t * 0.31) * 0.06;
    tmpPos.current.y += Math.sin(t * 0.23) * 0.04;

    const damp = first.current ? 1 : 1 - Math.pow(0.12, delta); // slow, cinematic
    first.current = false;
    camera.position.lerp(tmpPos.current, damp);
    target.current.lerp(tmpLook.current, damp);
    camera.lookAt(target.current);
  });

  return null;
}
