"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Diya from "./Diya";
import { igniteTick } from "@/lib/sound";

/**
 * Diyas around the courtyard: a ring around the rangoli, lining the steps,
 * along the haveli's plinth and on top of the side walls.
 *
 * When `spread` turns on, they catch one after another in a wave rippling
 * outward from the hero diya — each with its own little ignition sound,
 * panned to where it is.
 *
 * Individual diyas carry no light (perf); a few shared flickering fill lights
 * swell as the wave reaches them.
 */

const ORIGIN = new THREE.Vector2(0, 0.8); // hero diya (x, z)
const WAVE_SPEED = 2.6; // metres per second
export const SPREAD_DURATION = 2.7; // seconds for the wave to reach the walls

const FILL: [number, number, number][] = [
  [0, 0.6, 2.6],
  [-3.0, 0.8, 0.2],
  [3.0, 0.8, 0.2],
  [0, 0.9, -2.2],
];

export default function DiyaField({
  count,
  spread,
  flameColor,
}: {
  count: number;
  spread: boolean;
  flameColor: string;
}) {
  const items = useMemo(() => {
    const out: { p: [number, number, number]; r: number; s: number; delay: number }[] = [];
    const push = (p: [number, number, number], r: number, s: number) => {
      const dist = new THREE.Vector2(p[0], p[2]).distanceTo(ORIGIN);
      out.push({ p, r, s, delay: dist / WAVE_SPEED + Math.random() * 0.12 });
    };
    const ring = 14;
    for (let i = 0; i < ring; i++) {
      const a = (i / ring) * Math.PI * 2 + 0.11;
      push([Math.cos(a) * 2.35, 0, 0.4 + Math.sin(a) * 2.35], -a, 0.9);
    }
    [[0.95, 0.2, -2.25], [0.78, 0.4, -2.53], [0.6, 0.6, -2.81]].forEach(([x, y, z]) => {
      push([-x, y, z], -1.3, 0.75);
      push([x, y, z], -1.85, 0.75);
    });
    [-3.5, -2.2, -1.1, 1.1, 2.2, 3.5].forEach((x) => push([x, 0.75, -3.1], -1.57, 0.6));
    [-3.0, -1.8, -0.6, 0.6, 1.8].forEach((z) => {
      push([-4.6, 0.86, z], 0, 0.7);
      push([4.6, 0.86, z], Math.PI, 0.7);
    });
    return out.sort((a, b) => a.delay - b.delay).slice(0, Math.max(count, out.length));
  }, [count]);

  const [litCount, setLitCount] = useState(0);
  const startAt = useRef<number | null>(null);
  const litRef = useRef(0);
  const lastTick = useRef(0);
  const lights = useRef<(THREE.PointLight | null)[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (!spread) {
      if (litRef.current !== 0) {
        litRef.current = 0;
        startAt.current = null;
        setLitCount(0);
      }
    } else {
      if (startAt.current === null) startAt.current = t;
      const e = t - startAt.current;
      let n = litRef.current;
      while (n < items.length && items[n].delay <= e) {
        const it = items[n];
        // one sound per ~45 ms so a cluster doesn't turn into noise
        if (t - lastTick.current > 0.045) {
          const dist = Math.hypot(it.p[0], it.p[2] - 0.8);
          igniteTick(THREE.MathUtils.clamp(it.p[0] / 5, -1, 1), 0.5 / (1 + dist * 0.18));
          lastTick.current = t;
        }
        n++;
      }
      if (n !== litRef.current) {
        litRef.current = n;
        setLitCount(n);
      }
    }

    const frac = items.length ? litRef.current / items.length : 0;
    lights.current.forEach((l, i) => {
      if (l) l.intensity = frac * (3.2 + Math.sin(t * 13 + i * 2) * 0.3 + Math.sin(t * 7.3 + i) * 0.25);
    });
  });

  return (
    <group>
      {FILL.map((p, i) => (
        <pointLight
          key={`l${i}`}
          ref={(el) => {
            lights.current[i] = el;
          }}
          position={p}
          color={flameColor}
          intensity={0}
          distance={5.5}
          decay={1.7}
        />
      ))}
      {items.map((d, i) => (
        <Diya
          key={i}
          position={d.p}
          rotationY={d.r}
          lit={i < litCount}
          flameColor={flameColor}
          scale={d.s}
          flare={0.7}
        />
      ))}
    </group>
  );
}
