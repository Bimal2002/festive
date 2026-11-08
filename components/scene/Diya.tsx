"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Flame from "./Flame";
import Sparks from "./Sparks";

/**
 * Terracotta diya: lathe-turned bowl with a pinched spout, cotton wick,
 * oil surface and a ring of painted dots. The flame sits on the spout.
 */

const bowlGeo = (() => {
  // profile of the bowl (radius, height) — lathe around Y
  const pts = [
    [0.0, 0.0], [0.09, 0.0], [0.1, 0.012], [0.16, 0.03], [0.205, 0.07], [0.232, 0.12],
    [0.24, 0.155], [0.232, 0.162], [0.215, 0.135], [0.17, 0.085], [0.1, 0.058], [0.0, 0.052],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(pts, 36);
  // pinch a spout on +X
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ang = Math.atan2(z, x);
    const k = Math.pow(Math.max(0, Math.cos(ang)), 8); // only near +X
    const r = Math.hypot(x, z);
    if (r > 0.12 && y > 0.04) {
      const h = Math.min(1, (y - 0.04) / 0.12); // more pinch toward the rim
      const stretch = 1 + k * 0.62 * h;
      const narrow = 1 - k * 0.7 * h;
      pos.setXYZ(i, x * stretch, y + k * h * 0.025, z * narrow);
    }
  }
  g.computeVertexNormals();
  return g;
})();

const dotGeo = new THREE.SphereGeometry(0.007, 6, 4);

export default function Diya({
  position = [0, 0, 0],
  rotationY = 0,
  lit = false,
  withLight = false,
  flameColor = "#ffb347",
  scale = 1,
  striking = false,
  embers = false,
  flare = 0.6,
}: {
  position?: [number, number, number];
  rotationY?: number;
  lit?: boolean;
  withLight?: boolean;
  flameColor?: string;
  scale?: number;
  /** match being struck at the wick (spark spray, before the flame catches) */
  striking?: boolean;
  /** drift of embers right after catching (hero diya) */
  embers?: boolean;
  flare?: number;
}) {
  const heroLight = useRef<THREE.PointLight>(null);
  const strikeT0 = useRef(-1);
  useFrame((state) => {
    const L = heroLight.current;
    if (!L || lit) return; // once lit, the Flame drives this light
    if (striking) {
      if (strikeT0.current < 0) strikeT0.current = state.clock.elapsedTime;
      const ramp = Math.min(1, (state.clock.elapsedTime - strikeT0.current) / 0.15);
      L.intensity = (2.5 + Math.random() * 3.5) * ramp; // sputtering match head
      L.color.set("#ffb070");
    } else {
      strikeT0.current = -1;
      L.intensity = 0;
      L.color.set(flameColor);
    }
  });

  const dots = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      if (Math.cos(a) > 0.8) continue; // skip the spout
      out.push([Math.cos(a) * 0.218, 0.055, Math.sin(a) * 0.218]);
    }
    return out;
  }, []);

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <mesh geometry={bowlGeo} castShadow receiveShadow>
        <meshStandardMaterial color="#8c4a2b" roughness={0.88} side={THREE.DoubleSide} />
      </mesh>
      {/* painted dots */}
      {dots.map((p, i) => (
        <mesh key={i} position={p} geometry={dotGeo}>
          <meshStandardMaterial color="#d9c29a" roughness={0.7} />
        </mesh>
      ))}
      {/* oil surface */}
      <mesh position={[0, 0.098, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.17, 28]} />
        <meshStandardMaterial
          color={lit ? "#7a4a12" : "#2a1a0c"}
          roughness={0.12}
          metalness={0.3}
          emissive={lit ? flameColor : "#000000"}
          emissiveIntensity={lit ? 0.18 : 0}
        />
      </mesh>
      {/* wick on the spout */}
      <mesh position={[0.31, 0.165, 0]} rotation={[0, 0, -0.75]}>
        <cylinderGeometry args={[0.01, 0.014, 0.1, 6]} />
        <meshStandardMaterial color={lit ? "#2a1a10" : "#e9dcc4"} roughness={0.9} />
      </mesh>
      {striking && !lit && (
        <>
          <Sparks position={[0.33, 0.2, 0]} count={80} speed={1.4} up={1.1} gravity={2.4} life={0.5} size={0.034} hot={[2.4, 2.0, 1.3]} />
        </>
      )}
      {withLight && (
        <pointLight
          ref={heroLight}
          position={[0.34, 0.42, 0]}
          color={flameColor}
          intensity={0}
          distance={9}
          decay={2}
          castShadow
          shadow-mapSize={[512, 512]}
          shadow-bias={-0.002}
        />
      )}
      {lit && (
        <Flame
          position={[0.335, 0.31, 0]}
          scale={0.27}
          color={flameColor}
          light={false}
          externalLight={withLight ? heroLight : undefined}
          flare={flare}
        />
      )}
      {lit && embers && (
        <Sparks position={[0.335, 0.3, 0]} count={30} speed={0.18} up={0.55} spread={0.8} gravity={-0.1} life={1.6} size={0.016} hot={[1.7, 0.9, 0.35]} />
      )}
    </group>
  );
}
