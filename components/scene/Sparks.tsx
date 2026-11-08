"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * One-shot spark spray (plays once on mount).
 *  - match strike: fast white-gold sparks flying outward
 *  - embers: slow orange motes drifting up from a freshly caught flame
 */
export default function Sparks({
  position = [0, 0, 0],
  count = 40,
  speed = 1.6,
  up = 1.2,
  spread = 1,
  gravity = 2.5,
  life = 0.6,
  size = 0.04,
  hot = [1.6, 1.25, 0.7],
}: {
  position?: [number, number, number];
  count?: number;
  speed?: number;
  up?: number;
  spread?: number;
  gravity?: number;
  life?: number;
  size?: number;
  hot?: [number, number, number];
}) {
  const ref = useRef<THREE.Points>(null);
  const age = useRef(0);

  const { geometry, vel, lives, texture } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const v = new Float32Array(count * 3);
    const l = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.35 + Math.random() * 0.65);
      v[i * 3] = Math.cos(a) * s * spread;
      v[i * 3 + 1] = up * (0.4 + Math.random() * 0.8);
      v[i * 3 + 2] = Math.sin(a) * s * spread;
      l[i] = life * (0.5 + Math.random() * 0.5);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const cv = document.createElement("canvas");
    cv.width = cv.height = 32;
    const c = cv.getContext("2d")!;
    const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.6)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 32, 32);
    return { geometry: geo, vel: v, lives: l, texture: new THREE.CanvasTexture(cv) };
  }, [count, speed, up, spread, life]);

  useFrame((_, delta) => {
    if (!ref.current || age.current > life + 0.1) return;
    const d = Math.min(delta, 0.05);
    age.current += d;
    const p = geometry.attributes.position.array as Float32Array;
    const c = geometry.attributes.color.array as Float32Array;
    for (let i = 0; i < count; i++) {
      vel[i * 3 + 1] -= gravity * d;
      vel[i * 3] *= 0.97;
      vel[i * 3 + 2] *= 0.97;
      p[i * 3] += vel[i * 3] * d;
      p[i * 3 + 1] += vel[i * 3 + 1] * d;
      p[i * 3 + 2] += vel[i * 3 + 2] * d;
      const k = Math.max(0, 1 - age.current / lives[i]);
      const tw = 0.6 + Math.random() * 0.4;
      c[i * 3] = hot[0] * k * tw;
      c[i * 3 + 1] = hot[1] * k * k * tw;
      c[i * 3 + 2] = hot[2] * k * k * k * tw;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geometry} position={position} frustumCulled={false}>
      <pointsMaterial
        size={size}
        map={texture}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  );
}
