"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Renders text as a cloud of glittering sparkler particles that assemble into
 * place and twinkle — the finale "Happy Diwali from Aman" moment.
 */
export default function SparklerText({
  lines,
  color = "#ffe6a0",
  y = 6.2,
  worldWidth = 9,
}: {
  lines: string[];
  color?: string;
  y?: number;
  worldWidth?: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const start = useRef<Float32Array>(new Float32Array(0));
  const target = useRef<Float32Array>(new Float32Array(0));
  const t0 = useRef<number>(-1);
  const hdr = useMemo(() => new THREE.Color(color).multiplyScalar(2.4), [color]);

  const { geometry, texture } = useMemo(() => {
    const W = 1024;
    const H = 320;
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const big = lines[0] || "";
    const small = lines[1] || "";
    const fontStack = "Georgia, 'Times New Roman', serif";
    // shrink a line until it fits (long names like "from Bimal Kumar Sharma")
    const fit = (text: string, size: number) => {
      let s = size;
      ctx.font = `bold ${s}px ${fontStack}`;
      while (ctx.measureText(text).width > W * 0.94 && s > 40) {
        s -= 4;
        ctx.font = `bold ${s}px ${fontStack}`;
      }
    };
    fit(big, 140);
    ctx.fillText(big, W / 2, small ? 120 : H / 2);
    if (small) {
      fit(small, 84);
      ctx.fillText(small, W / 2, 245);
    }

    const img = ctx.getImageData(0, 0, W, H).data;
    const pts: number[] = [];
    const step = 3; // denser sampling = crisper letters
    const sx = worldWidth / W;
    const sy = sx;
    for (let yy = 0; yy < H; yy += step) {
      for (let xx = 0; xx < W; xx += step) {
        const a = img[(yy * W + xx) * 4 + 3];
        if (a > 128) {
          const px = (xx - W / 2) * sx;
          const py = -(yy - H / 2) * sy;
          pts.push(px, py, (Math.random() - 0.5) * 0.2);
        }
      }
    }

    const tgt = new Float32Array(pts);
    const st = new Float32Array(pts.length);
    for (let i = 0; i < pts.length; i += 3) {
      st[i] = pts[i] + (Math.random() - 0.5) * 10;
      st[i + 1] = pts[i + 1] + (Math.random() - 0.5) * 8;
      st[i + 2] = pts[i + 2] + (Math.random() - 0.5) * 6;
    }
    target.current = tgt;
    start.current = st;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(st.slice(), 3));

    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const cx = c.getContext("2d")!;
    const g = cx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.5, "rgba(255,255,255,0.6)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    cx.fillStyle = g;
    cx.fillRect(0, 0, 32, 32);
    const tex = new THREE.CanvasTexture(c);

    return { geometry: geo, texture: tex };
  }, [lines, worldWidth]);

  useFrame((state) => {
    if (!ref.current) return;
    if (t0.current < 0) t0.current = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - t0.current;
    const p = Math.min(elapsed / 1.4, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const st = start.current;
    const tg = target.current;
    const tw = state.clock.elapsedTime;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] = st[i] + (tg[i] - st[i]) * ease;
      arr[i + 1] = st[i + 1] + (tg[i + 1] - st[i + 1]) * ease;
      arr[i + 2] = st[i + 2] + (tg[i + 2] - st[i + 2]) * ease + Math.sin(tw * 4 + i) * 0.015;
    }
    pos.needsUpdate = true;
    const mat = ref.current.material as THREE.PointsMaterial;
    mat.opacity = (0.6 + Math.abs(Math.sin(tw * 3)) * 0.4) * (0.3 + 0.7 * p);
  });

  return (
    <group position={[0, y, -2]}>
      <points ref={ref} geometry={geometry}>
        <pointsMaterial
          size={0.085}
          map={texture}
          color={hdr}
          toneMapped={false}
          fog={false}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  );
}
