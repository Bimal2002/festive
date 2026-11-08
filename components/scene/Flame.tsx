"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Billboard } from "@react-three/drei";

/** A soft, flickering billboard flame made from an additive radial-gradient sprite. */
export default function Flame({
  position = [0, 0, 0],
  scale = 1,
  color = "#ffd27a",
  light = true,
  flare = 1,
  externalLight,
}: {
  position?: [number, number, number];
  scale?: number;
  color?: string;
  light?: boolean;
  /** how dramatic the "catch" is when the flame first appears (0 = none) */
  flare?: number;
  /** drive this persistent light instead of mounting a new one (avoids shader recompiles) */
  externalLight?: React.RefObject<THREE.PointLight | null>;
}) {
  const born = useRef(-1);
  const haloRef = useRef<THREE.Mesh>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const hdr = useMemo(() => new THREE.Color(color).multiplyScalar(2.6), [color]);
  const halo = useMemo(() => new THREE.Color(color).multiplyScalar(0.55), [color]);
  const lightRef = useRef<THREE.PointLight>(null);

  const { texture, haloTex } = useMemo(() => {
    const W = 128, H = 256;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d")!;
    // teardrop path: round bottom, pointed top
    const drop = (cx: number, base: number, w: number, h: number) => {
      ctx.beginPath();
      ctx.moveTo(cx, base - h);
      ctx.bezierCurveTo(cx + w * 0.55, base - h * 0.55, cx + w, base - h * 0.18, cx, base);
      ctx.bezierCurveTo(cx - w, base - h * 0.18, cx - w * 0.55, base - h * 0.55, cx, base - h);
      ctx.closePath();
    };
    ctx.filter = "blur(6px)";
    drop(64, 236, 46, 220); // outer orange glow
    ctx.fillStyle = "rgba(255,110,20,0.55)";
    ctx.fill();
    ctx.filter = "blur(3px)";
    drop(64, 230, 34, 196); // yellow body
    ctx.fillStyle = "rgba(255,196,70,0.95)";
    ctx.fill();
    ctx.filter = "blur(4px)";
    drop(64, 222, 20, 130); // white-hot core
    ctx.fillStyle = "rgba(255,250,235,1)";
    ctx.fill();
    ctx.filter = "blur(5px)";
    ctx.beginPath(); // blue base
    ctx.ellipse(64, 226, 16, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(90,140,255,0.55)";
    ctx.fill();
    const tex = new THREE.CanvasTexture(c);

    const hc = document.createElement("canvas");
    hc.width = hc.height = 128;
    const h = hc.getContext("2d")!;
    const g = h.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,200,120,0.6)");
    g.addColorStop(0.35, "rgba(255,140,50,0.18)");
    g.addColorStop(1, "rgba(255,120,40,0)");
    h.fillStyle = g;
    h.fillRect(0, 0, 128, 128);
    return { texture: tex, haloTex: new THREE.CanvasTexture(hc) };
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (born.current < 0) born.current = t;
    const e = t - born.current;

    // ignition: a spark grows into a tall flare, overshoots, then springs back
    let ign = 1;
    let glow = 1;
    if (flare > 0) {
      if (e < 0.14) {
        const k = e / 0.14;
        ign = 0.15 + k * k * (1 + 1.1 * flare);
      } else {
        const u = e - 0.14;
        ign = 1 + 1.1 * flare * Math.exp(-4.2 * u) * Math.cos(11 * u);
      }
      glow = 1 + 1.7 * flare * Math.exp(-3 * e); // bright flash, not a white-out
    }

    const flick = 1 + Math.sin(t * 22) * 0.06 + Math.sin(t * 7) * 0.04;
    if (mesh.current) {
      const w = Math.max(0.05, ign) ** 0.6; // flares mostly upward, a little wider
      mesh.current.scale.set(scale * w * (1 + Math.sin(t * 17) * 0.04), scale * ign * flick, scale);
      mesh.current.rotation.z = Math.sin(t * 3.1) * 0.05 + Math.sin(t * 11) * 0.02;
      mesh.current.position.y = Math.sin(t * 9) * 0.01 * scale + (ign - 1) * 0.25 * scale;
    }
    if (haloRef.current) haloRef.current.scale.setScalar(scale * 2.4 * Math.min(glow, 2.6));
    const L = externalLight?.current ?? lightRef.current;
    if (L) L.intensity = 6 * flick * glow;
  });

  return (
    <group position={position}>
      <Billboard>
      <mesh ref={mesh}>
        <planeGeometry args={[0.5, 1.0]} />
        <meshBasicMaterial
          map={texture}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          color={hdr}
          toneMapped={false}
        />
      </mesh>
      {/* soft halo */}
      <mesh ref={haloRef} position={[0, -0.12 * scale, -0.01]} scale={scale * 2.4}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={haloTex}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          color={halo}
          opacity={0.5}
          toneMapped={false}
        />
      </mesh>
      </Billboard>
      {light && !externalLight && <pointLight ref={lightRef} color={color} intensity={6} distance={9} decay={2} castShadow shadow-mapSize={[512, 512]} shadow-bias={-0.002} />}
    </group>
  );
}
