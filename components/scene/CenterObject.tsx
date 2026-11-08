"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Flame from "./Flame";
import Diya from "./Diya";

/** The central tappable object in Act 1: a diya, a colour pot, or a brass lamp. */
export default function CenterObject({
  kind,
  lit,
  accent,
  onTap,
  tappable,
  striking = false,
}: {
  kind: "diya" | "colorPot" | "lamp";
  lit: boolean;
  accent: string;
  onTap: () => void;
  tappable: boolean;
  striking?: boolean;
}) {
  const grp = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!grp.current) return;
    // gentle hover + a nudge when tappable
    const t = state.clock.elapsedTime;
    grp.current.position.y = 0.0 + Math.sin(t * 1.5) * 0.03;
    const s = tappable ? 1 + Math.sin(t * 3) * 0.02 : 1;
    grp.current.scale.setScalar(s);
  });

  const handle = (e: any) => {
    e.stopPropagation();
    if (tappable) onTap();
  };

  return (
    <group
      ref={grp}
      position={[0, 0, 0.8]}
      onPointerDown={handle}
      onPointerOver={() => tappable && (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "default")}
    >
      {kind === "diya" && (
        <Diya scale={2.3} rotationY={2.5} lit={lit} withLight flameColor={accent} striking={striking} embers flare={1.3} />
      )}

      {kind === "lamp" && (
        <group scale={1.4}>
          {/* stand */}
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.05, 0.12, 0.7, 16]} />
            <meshStandardMaterial color="#d9a441" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.28, 0.32, 0.06, 20]} />
            <meshStandardMaterial color="#d9a441" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* bowl */}
          <mesh position={[0, 0.74, 0]}>
            <sphereGeometry args={[0.26, 20, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5]} />
            <meshStandardMaterial color="#e6b84d" metalness={0.6} roughness={0.35} />
          </mesh>
          {lit && <Flame position={[0, 0.9, 0]} scale={1.1} color={accent} />}
        </group>
      )}

      {kind === "colorPot" && (
        <group scale={1.6}>
          {/* clay pot body */}
          <mesh position={[0, 0.3, 0]}>
            <sphereGeometry args={[0.34, 24, 18]} />
            <meshStandardMaterial color="#9a5a3a" roughness={0.9} />
          </mesh>
          {/* neck */}
          <mesh position={[0, 0.62, 0]}>
            <cylinderGeometry args={[0.17, 0.22, 0.12, 20]} />
            <meshStandardMaterial color="#7d4530" roughness={0.9} />
          </mesh>
          {/* heap of colour on top */}
          <mesh position={[0, 0.69, 0]}>
            <coneGeometry args={[0.18, 0.14, 20]} />
            <meshStandardMaterial color={accent} roughness={0.7} emissive={accent} emissiveIntensity={0.25} />
          </mesh>
        </group>
      )}
    </group>
  );
}
