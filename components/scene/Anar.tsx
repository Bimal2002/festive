"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { startHiss } from "@/lib/sound";

/** Anar (flower-pot) fountain: a clay cone spraying gold sparks, lighting the ground. */
export default function Anar({
  position,
  active,
  pool = 700,
}: {
  position: [number, number, number];
  active: boolean;
  pool?: number;
}) {
  const geoRef = useRef<THREE.BufferGeometry>(null);
  const light = useRef<THREE.PointLight>(null);
  const parts = useRef<{ x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number }[]>([]);
  const age = useRef(0);

  const { geometry, texture } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pool * 3), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(pool * 3), 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.5, 0), 6);
    const cv = document.createElement("canvas");
    cv.width = cv.height = 32;
    const c = cv.getContext("2d")!;
    const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.3, "rgba(255,255,255,0.6)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 32, 32);
    return { geometry: geo, texture: new THREE.CanvasTexture(cv) };
  }, [pool]);

  // hiss while running
  useEffect(() => {
    if (!active) return;
    age.current = 0;
    const stop = startHiss(position[0] / 6);
    return () => stop();
  }, [active, position]);

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.05);
    if (active) {
      age.current += d;
      // swell, then hold
      const strength = Math.min(1, age.current / 1.2);
      const emit = Math.floor(18 * strength);
      for (let i = 0; i < emit && parts.current.length < pool; i++) {
        const a = Math.random() * Math.PI * 2;
        const spread = 0.35 + Math.random() * 0.45;
        const v = (4.5 + Math.random() * 2.5) * (0.6 + 0.4 * strength);
        const life = 0.7 + Math.random() * 0.6;
        parts.current.push({
          x: 0, y: 0.32, z: 0,
          vx: Math.cos(a) * spread * v * 0.35,
          vy: v,
          vz: Math.sin(a) * spread * v * 0.35,
          life, max: life,
        });
      }
      if (light.current) light.current.intensity = (14 + Math.random() * 10) * strength;
    } else if (light.current) {
      light.current.intensity *= 0.9;
    }

    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const col = geometry.attributes.color as THREE.BufferAttribute;
    const pa = pos.array as Float32Array;
    const ca = col.array as Float32Array;
    let w = 0;
    for (const p of parts.current) {
      p.life -= d;
      if (p.life <= 0) continue;
      p.vy -= 6.5 * d;
      p.x += p.vx * d; p.y += p.vy * d; p.z += p.vz * d;
      if (p.y < 0.02) { p.y = 0.02; p.vy *= -0.25; p.vx *= 0.6; p.vz *= 0.6; }
      parts.current[w++] = p;
    }
    parts.current.length = w;
    for (let i = 0; i < w; i++) {
      const p = parts.current[i];
      const k = p.life / p.max;
      const hot = 2.6 * (0.5 + Math.random() * 0.5);
      pa[i * 3] = p.x; pa[i * 3 + 1] = p.y; pa[i * 3 + 2] = p.z;
      // white-hot when young, cooling to orange
      ca[i * 3] = 1.0 * hot;
      ca[i * 3 + 1] = (0.55 + 0.4 * k) * hot;
      ca[i * 3 + 2] = (0.15 + 0.5 * k * k) * hot;
    }
    geometry.setDrawRange(0, w);
    pos.needsUpdate = true;
    col.needsUpdate = true;
  });

  return (
    <group position={position}>
      {/* clay pot */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.17, 0.32, 16]} />
        <meshStandardMaterial color="#8a4a2f" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <torusGeometry args={[0.1, 0.02, 6, 16]} />
        <meshStandardMaterial color="#d9a441" metalness={0.4} roughness={0.5} />
      </mesh>
      <points ref={undefined} geometry={geometry} frustumCulled={false}>
        <pointsMaterial
          size={0.09}
          map={texture}
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
          toneMapped={false}
        />
      </points>
      <pointLight ref={light} position={[0, 1.0, 0]} color="#ffb347" intensity={0} distance={9} decay={1.8} castShadow={false} />
    </group>
  );
}
