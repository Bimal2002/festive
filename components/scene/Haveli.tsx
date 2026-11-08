"use client";

import { useMemo } from "react";
import * as THREE from "three";

/**
 * Procedural two-storey Indian haveli: arched doors & windows with bars,
 * a jharokha balcony, cornices, crenellated parapet, corner chhatris,
 * a marigold toran over the door and front steps.
 * Windows and door glow warmly only once the diyas are lit.
 *
 * Optional upgrade: replace with a sculpted GLB via useGLTF (see README).
 */

const WALL = "#e6d8c2";
const TRIM = "#cbb89c";
const MAROON = "#6e2a26";
const WOOD = "#3b2316";

function Arch({
  w, h, glow, lit, depth = 0.06, bars = 0,
}: { w: number; h: number; glow: THREE.Color; lit: boolean; depth?: number; bars?: number }) {
  const r = w / 2;
  const dark = "#140d09";
  return (
    <group>
      {/* frame */}
      <mesh position={[0, h / 2, -0.01]}>
        <boxGeometry args={[w + 0.14, h + 0.08, depth]} />
        <meshStandardMaterial color={TRIM} roughness={0.9} />
      </mesh>
      <mesh position={[0, h + 0.02, -0.01]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[r + 0.07, r + 0.07, depth, 24, 1, false, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color={TRIM} roughness={0.9} />
      </mesh>
      {/* opening */}
      <mesh position={[0, h / 2, depth / 2]}>
        <planeGeometry args={[w, h]} />
        {lit ? <meshBasicMaterial color={glow} toneMapped={false} /> : <meshStandardMaterial color={dark} roughness={1} />}
      </mesh>
      <mesh position={[0, h, depth / 2]} rotation={[0, 0, 0]}>
        <circleGeometry args={[r, 24, 0, Math.PI]} />
        {lit ? <meshBasicMaterial color={glow} toneMapped={false} /> : <meshStandardMaterial color={dark} roughness={1} />}
      </mesh>
      {/* bars */}
      {Array.from({ length: bars }).map((_, i) => (
        <mesh key={i} position={[-w / 2 + ((i + 1) * w) / (bars + 1), h / 2 + 0.05, depth / 2 + 0.02]}>
          <boxGeometry args={[0.025, h + 0.1, 0.025]} />
          <meshStandardMaterial color={WOOD} roughness={0.8} />
        </mesh>
      ))}
      {bars > 0 && (
        <mesh position={[0, h * 0.55, depth / 2 + 0.02]}>
          <boxGeometry args={[w, 0.025, 0.025]} />
          <meshStandardMaterial color={WOOD} roughness={0.8} />
        </mesh>
      )}
    </group>
  );
}

function Toran({ width = 1.5 }: { width?: number }) {
  const flowers = useMemo(() => {
    const out: { p: [number, number, number]; c: string }[] = [];
    const n = 22;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      out.push({ p: [-width / 2 + t * width, -Math.sin(t * Math.PI) * 0.16, 0], c: i % 2 ? "#ff9f1c" : "#ffcc33" });
    }
    // hanging strands
    [-0.6, -0.2, 0.2, 0.6].forEach((x) => {
      for (let k = 1; k <= 4; k++) out.push({ p: [x * (width / 1.5), -Math.sin(((x * (width / 1.5)) / width + 0.5) * Math.PI) * 0.16 - k * 0.07, 0], c: k % 2 ? "#ffcc33" : "#ff7b00" });
    });
    return out;
  }, [width]);
  return (
    <group>
      {flowers.map((f, i) => (
        <mesh key={i} position={f.p}>
          <sphereGeometry args={[0.035, 8, 6]} />
          <meshStandardMaterial color={f.c} roughness={0.7} emissive={f.c} emissiveIntensity={0.15} />
        </mesh>
      ))}
      {/* mango leaves */}
      {Array.from({ length: 7 }).map((_, i) => {
        const x = -width / 2 + 0.12 + (i * (width - 0.24)) / 6;
        return (
          <mesh key={`l${i}`} position={[x, -0.12 - Math.sin(((x + width / 2) / width) * Math.PI) * 0.12, 0.02]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.04, 0.16, 4]} />
            <meshStandardMaterial color="#2f7a2f" roughness={0.8} />
          </mesh>
        );
      })}
    </group>
  );
}

function Chhatri({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.3, z]}>
          <cylinderGeometry args={[0.035, 0.035, 0.6, 8]} />
          <meshStandardMaterial color={WALL} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 0.63, 0]}>
        <boxGeometry args={[0.58, 0.06, 0.58]} />
        <meshStandardMaterial color={TRIM} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.66, 0]}>
        <sphereGeometry args={[0.28, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={WALL} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.98, 0]}>
        <coneGeometry args={[0.04, 0.12, 8]} />
        <meshStandardMaterial color="#c99a3a" metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
}

export default function Haveli({ lit = false }: { lit?: boolean }) {
  const glow = useMemo(() => new THREE.Color(1.15, 0.62, 0.2), []);
  const doorGlow = useMemo(() => new THREE.Color(1.35, 0.78, 0.28), []);
  const W = 7.6;
  const front = 0.8; // local z of the facade

  const xsWin = [-2.75, -1.65, 1.65, 2.75];

  return (
    <group position={[0, 0, -4]}>
      {/* body */}
      <mesh position={[0, 2.0, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, 4.0, 1.6]} />
        <meshStandardMaterial color={WALL} roughness={0.92} />
      </mesh>
      {/* maroon dado */}
      <mesh position={[0, 0.35, front + 0.01]} receiveShadow>
        <boxGeometry args={[W + 0.02, 0.7, 0.04]} />
        <meshStandardMaterial color={MAROON} roughness={0.85} />
      </mesh>
      {/* plinth ledge */}
      <mesh position={[0, 0.72, front + 0.06]}>
        <boxGeometry args={[W + 0.1, 0.06, 0.14]} />
        <meshStandardMaterial color={TRIM} roughness={0.9} />
      </mesh>
      {/* mid cornice + chajja eave */}
      <mesh position={[0, 2.05, front + 0.12]} castShadow>
        <boxGeometry args={[W + 0.3, 0.12, 0.26]} />
        <meshStandardMaterial color={TRIM} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.96, front + 0.3]} rotation={[0.45, 0, 0]} castShadow>
        <boxGeometry args={[W + 0.3, 0.04, 0.4]} />
        <meshStandardMaterial color={MAROON} roughness={0.85} />
      </mesh>
      {/* top cornice */}
      <mesh position={[0, 4.02, front + 0.1]} castShadow>
        <boxGeometry args={[W + 0.35, 0.14, 0.3]} />
        <meshStandardMaterial color={TRIM} roughness={0.9} />
      </mesh>
      {/* parapet with crenellations */}
      <mesh position={[0, 4.25, 0.1]}>
        <boxGeometry args={[W + 0.2, 0.32, 1.7]} />
        <meshStandardMaterial color={WALL} roughness={0.92} />
      </mesh>
      {Array.from({ length: 15 }).map((_, i) => (
        <mesh key={`c${i}`} position={[-W / 2 + 0.1 + i * ((W - 0.2) / 14), 4.5, front + 0.1]}>
          <boxGeometry args={[0.2, 0.18, 0.12]} />
          <meshStandardMaterial color={WALL} roughness={0.92} />
        </mesh>
      ))}
      {/* central raised pediment */}
      <mesh position={[0, 4.6, 0.3]}>
        <boxGeometry args={[2.4, 0.5, 1.0]} />
        <meshStandardMaterial color={WALL} roughness={0.92} />
      </mesh>
      <mesh position={[0, 4.88, 0.3]}>
        <boxGeometry args={[2.6, 0.08, 1.1]} />
        <meshStandardMaterial color={TRIM} roughness={0.9} />
      </mesh>
      <Chhatri position={[-W / 2 + 0.35, 4.41, 0.2]} />
      <Chhatri position={[W / 2 - 0.35, 4.41, 0.2]} />

      {/* pilasters */}
      {[-W / 2 + 0.08, -2.2, -0.95, 0.95, 2.2, W / 2 - 0.08].map((x, i) => (
        <mesh key={`p${i}`} position={[x, 2.2, front + 0.05]}>
          <boxGeometry args={[0.16, 3.6, 0.1]} />
          <meshStandardMaterial color={TRIM} roughness={0.9} />
        </mesh>
      ))}

      {/* ground floor: door + windows */}
      <group position={[0, 0.72, front]}>
        <Arch w={1.05} h={1.05} glow={doorGlow} lit={lit} depth={0.08} />
        {/* door leaves swung open */}
        <mesh position={[-0.62, 0.62, 0.22]} rotation={[0, 1.1, 0]}>
          <boxGeometry args={[0.52, 1.25, 0.05]} />
          <meshStandardMaterial color={WOOD} roughness={0.7} />
        </mesh>
        <mesh position={[0.62, 0.62, 0.22]} rotation={[0, -1.1, 0]}>
          <boxGeometry args={[0.52, 1.25, 0.05]} />
          <meshStandardMaterial color={WOOD} roughness={0.7} />
        </mesh>
        <group position={[0, 1.72, 0.12]}>
          <Toran width={1.45} />
        </group>
        {xsWin.map((x) => (
          <group key={x} position={[x, 0.15, 0]}>
            <Arch w={0.62} h={0.72} glow={glow} lit={lit} bars={4} />
          </group>
        ))}
      </group>

      {/* first floor: balcony + windows */}
      <group position={[0, 2.25, front]}>
        <Arch w={0.9} h={1.0} glow={glow} lit={lit} bars={0} />
        {xsWin.map((x) => (
          <group key={x} position={[x, 0.15, 0]}>
            <Arch w={0.62} h={0.78} glow={glow} lit={lit} bars={4} />
          </group>
        ))}
        {/* jharokha balcony */}
        <mesh position={[0, -0.05, 0.32]} castShadow>
          <boxGeometry args={[2.3, 0.1, 0.65]} />
          <meshStandardMaterial color={TRIM} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.5, 0.62]}>
          <boxGeometry args={[2.3, 0.05, 0.06]} />
          <meshStandardMaterial color={WOOD} roughness={0.7} />
        </mesh>
        {Array.from({ length: 17 }).map((_, i) => (
          <mesh key={`r${i}`} position={[-1.12 + i * 0.14, 0.23, 0.62]}>
            <boxGeometry args={[0.03, 0.5, 0.03]} />
            <meshStandardMaterial color={WOOD} roughness={0.7} />
          </mesh>
        ))}
        {[-1.12, 1.12].map((x) => (
          <mesh key={`s${x}`} position={[x, 0.25, 0.35]}>
            <boxGeometry args={[0.04, 0.55, 0.6]} />
            <meshStandardMaterial color={WOOD} roughness={0.7} />
          </mesh>
        ))}
      </group>

      {/* front steps */}
      {[0, 1, 2].map((i) => (
        <mesh key={`st${i}`} position={[0, 0.12 + i * 0.2 - 0.1, front + 0.95 - i * 0.28]} castShadow receiveShadow>
          <boxGeometry args={[2.4 - i * 0.3, 0.2, 0.3]} />
          <meshStandardMaterial color={i % 2 ? "#cdbda4" : "#d8c9b1"} roughness={0.9} />
        </mesh>
      ))}
      {/* interior bounce light when lit */}
      <pointLight position={[0, 1.4, front + 0.7]} color="#ffb060" intensity={lit ? 6 : 0} distance={5} decay={1.7} />
    </group>
  );
}
