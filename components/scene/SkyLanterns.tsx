"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Rising sky lanterns (kandils). `active` starts them drifting upward. */
export default function SkyLanterns({
  color = "#ffb74d",
  active = false,
  count = 45,
}: {
  color?: string;
  active?: boolean;
  count?: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const hdr = useMemo(() => new THREE.Color(color).multiplyScalar(1.8), [color]);
  const speeds = useRef<Float32Array>(new Float32Array(0));
  const delays = useRef<Float32Array>(new Float32Array(0));
  const clock = useRef(0);

  const { geometry, texture } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sp = new Float32Array(count);
    const dl = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] = -50; // parked until released
      sp[i] = 0.55 + Math.random() * 0.6;
      dl[i] = i < 6 ? i * 0.5 : 2 + Math.random() * 10;
    }
    speeds.current = sp;
    delays.current = dl;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    // lantern-shaped sprite (rounded warm rectangle)
    const cv = document.createElement("canvas");
    cv.width = cv.height = 64;
    const ctx = cv.getContext("2d")!;
    const g = ctx.createRadialGradient(32, 36, 2, 32, 32, 30);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.5, "rgba(255,200,120,0.9)");
    g.addColorStop(1, "rgba(255,140,40,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(32, 34, 15, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    const tex = new THREE.CanvasTexture(cv);
    return { geometry: geo, texture: tex };
  }, [count]);

  useFrame((_, delta) => {
    if (!ref.current || !active) return;
    clock.current += delta;
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < count; i++) {
      if (arr[i * 3 + 1] < -40) {
        if (clock.current < delays.current[i]) continue;
        // first few lift off from the courtyard, the rest from around the neighbourhood
        const near = i < 6;
        arr[i * 3] = near ? (Math.random() - 0.5) * 2.5 : (Math.random() - 0.5) * 22;
        arr[i * 3 + 1] = near ? 0.9 : 0.5 + Math.random() * 3;
        arr[i * 3 + 2] = near ? 0.2 + Math.random() * 1.2 : -14 + Math.random() * 12;
      }
      arr[i * 3 + 1] += speeds.current[i] * delta;
      arr[i * 3] += Math.sin((arr[i * 3 + 1] + i) * 0.5) * delta * 0.25;
      if (arr[i * 3 + 1] > 16) arr[i * 3 + 1] = -50; // recycle
    }
    pos.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={0.8}
        map={texture}
        color={hdr}
        toneMapped={false}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}
