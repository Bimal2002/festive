"use client";

import { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface P {
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  life: number; max: number; r: number; g: number; b: number;
}

/** Gulaal (colour powder) clouds for Holi. Emits a burst when `burstSignal` changes. */
export default function ColorBurst({
  colors,
  burstSignal = 0,
  continuous = false,
  origin = [0, 1, 0.5],
  pool = 900,
}: {
  colors: string[];
  burstSignal?: number;
  continuous?: boolean;
  origin?: [number, number, number];
  pool?: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const particles = useRef<P[]>([]);
  const last = useRef(0);
  const autoTimer = useRef(0);

  const { geometry, texture, palette } = useMemo(() => {
    const positions = new Float32Array(pool * 3);
    const cols = new Float32Array(pool * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    const cv = document.createElement("canvas");
    cv.width = cv.height = 48;
    const ctx = cv.getContext("2d")!;
    const g = ctx.createRadialGradient(24, 24, 0, 24, 24, 24);
    g.addColorStop(0, "rgba(255,255,255,0.9)");
    g.addColorStop(0.6, "rgba(255,255,255,0.4)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 48, 48);
    const tex = new THREE.CanvasTexture(cv);
    const pal = colors.map((c) => new THREE.Color(c));
    particles.current = Array.from({ length: pool }, () => ({
      x: 0, y: -100, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, r: 0, g: 0, b: 0,
    }));
    return { geometry: geo, texture: tex, palette: pal };
  }, [pool, colors]);

  const emit = () => {
    let n = 0;
    for (const p of particles.current) {
      if (p.life > 0) continue;
      const col = palette[Math.floor(Math.random() * palette.length)];
      const ang = Math.random() * Math.PI * 2;
      const el = Math.random() * Math.PI;
      const v = 1.5 + Math.random() * 3.5;
      p.x = origin[0]; p.y = origin[1]; p.z = origin[2];
      p.vx = Math.cos(ang) * Math.sin(el) * v;
      p.vy = Math.abs(Math.cos(el)) * v * 1.2;
      p.vz = Math.sin(ang) * Math.sin(el) * v;
      p.max = p.life = 1.6 + Math.random() * 1.2;
      p.r = col.r; p.g = col.g; p.b = col.b;
      if (++n > 260) break;
    }
  };

  useEffect(() => {
    if (burstSignal !== last.current) {
      last.current = burstSignal;
      if (burstSignal > 0) emit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burstSignal]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const d = Math.min(delta, 0.05);
    if (continuous) {
      autoTimer.current -= d;
      if (autoTimer.current <= 0) {
        autoTimer.current = 0.45 + Math.random() * 0.4;
        emit();
      }
    }
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    const col = ref.current.geometry.attributes.color as THREE.BufferAttribute;
    const pa = pos.array as Float32Array;
    const ca = col.array as Float32Array;
    particles.current.forEach((p, i) => {
      if (p.life > 0) {
        p.life -= d;
        p.vy -= 0.9 * d;
        p.vx *= 0.97; p.vz *= 0.97;
        p.x += p.vx * d; p.y += p.vy * d; p.z += p.vz * d;
        const k = Math.max(p.life / p.max, 0);
        pa[i * 3] = p.x; pa[i * 3 + 1] = p.y; pa[i * 3 + 2] = p.z;
        ca[i * 3] = p.r * k; ca[i * 3 + 1] = p.g * k; ca[i * 3 + 2] = p.b * k;
      } else {
        ca[i * 3] = ca[i * 3 + 1] = ca[i * 3 + 2] = 0;
      }
    });
    pos.needsUpdate = true;
    col.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        size={0.4}
        map={texture}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
        opacity={0.95}
        sizeAttenuation
      />
    </points>
  );
}
