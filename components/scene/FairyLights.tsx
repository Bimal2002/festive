"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type V3 = [number, number, number];

/** Scalloped strings of bulbs (jhalar) traced along the haveli, with a chase twinkle. */
export default function FairyLights({ colors }: { colors: string[] }) {
  const ref = useRef<THREE.Points>(null);

  const { geometry, texture, base, phase } = useMemo(() => {
    const pos: number[] = [];
    const ph: number[] = [];
    let idx = 0;

    const swag = (a: V3, b: V3, n: number, sag: number, swags = 1) => {
      for (let s = 0; s < swags; s++) {
        for (let i = 0; i < n; i++) {
          const t = (s + i / n) / swags;
          const local = i / n;
          pos.push(
            a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t - Math.sin(local * Math.PI) * sag,
            a[2] + (b[2] - a[2]) * t
          );
          ph.push(idx++ * 0.45);
        }
      }
    };

    // parapet & pediment (straight)
    swag([-3.95, 4.62, -3.08], [3.95, 4.62, -3.08], 40, 0);
    swag([-1.3, 4.98, -3.25], [1.3, 4.98, -3.25], 14, 0);
    // top cornice, scalloped
    swag([-3.95, 4.08, -2.98], [3.95, 4.08, -2.98], 10, 0.22, 4);
    // mid cornice, scalloped
    swag([-3.95, 1.92, -2.82], [3.95, 1.92, -2.82], 10, 0.2, 4);
    // balcony rail
    swag([-1.15, 2.8, -2.52], [1.15, 2.8, -2.52], 9, 0.12, 2);
    // vertical drops at the corners
    swag([-3.97, 4.1, -3.0], [-3.97, 0.8, -3.0], 16, 0);
    swag([3.97, 4.1, -3.0], [3.97, 0.8, -3.0], 16, 0);
    // long swags from the gate pillars to the roof
    swag([-2.6, 1.78, 3.4], [-3.9, 4.1, -2.95], 34, 0.7);
    swag([2.6, 1.78, 3.4], [3.9, 4.1, -2.95], 34, 0.7);

    const n = pos.length / 3;
    const baseCol = new Float32Array(n * 3);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      c.set(colors[i % colors.length]).multiplyScalar(2.3);
      baseCol[i * 3] = c.r; baseCol[i * 3 + 1] = c.g; baseCol[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(baseCol.slice(), 3));

    const cv = document.createElement("canvas");
    cv.width = cv.height = 64;
    const ctx = cv.getContext("2d")!;
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.85)");
    g.addColorStop(0.5, "rgba(255,255,255,0.18)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return { geometry: geo, texture: new THREE.CanvasTexture(cv), base: baseCol, phase: ph };
  }, [colors]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const col = geometry.attributes.color as THREE.BufferAttribute;
    const a = col.array as Float32Array;
    for (let i = 0; i < phase.length; i++) {
      // chase: a bright wave travels along each string
      const k = 0.55 + 0.45 * Math.max(0, Math.sin(t * 3.2 - phase[i]));
      a[i * 3] = base[i * 3] * k;
      a[i * 3 + 1] = base[i * 3 + 1] * k;
      a[i * 3 + 2] = base[i * 3 + 2] * k;
    }
    col.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={0.16}
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
