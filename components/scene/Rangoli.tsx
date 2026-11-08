"use client";

import { useMemo } from "react";
import * as THREE from "three";

/** A colourful floor rangoli drawn procedurally onto a canvas texture. */
export default function Rangoli({
  palette,
  visible = true,
}: {
  palette: string[];
  visible?: boolean;
}) {
  const texture = useMemo(() => {
    const S = 512;
    const cv = document.createElement("canvas");
    cv.width = cv.height = S;
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, S, S);
    const cx = S / 2;
    const cy = S / 2;

    // concentric petal rings
    const rings = [
      { r: 230, petals: 24, len: 38 },
      { r: 175, petals: 20, len: 34 },
      { r: 120, petals: 16, len: 30 },
      { r: 70, petals: 12, len: 24 },
    ];
    rings.forEach((ring, ri) => {
      const color = palette[ri % palette.length];
      for (let i = 0; i < ring.petals; i++) {
        const a = (i / ring.petals) * Math.PI * 2;
        const x = cx + Math.cos(a) * ring.r;
        const y = cy + Math.sin(a) * ring.r;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 0, ring.len, ring.len * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    });
    // center
    ctx.fillStyle = palette[palette.length - 1];
    ctx.beginPath();
    ctx.arc(cx, cy, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();

    // dotted outer ring
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * 255, cy + Math.sin(a) * 255, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    return tex;
  }, [palette]);

  return (
    <mesh position={[0, 0.02, 0.4]} rotation={[-Math.PI / 2, 0, 0]} visible={visible}>
      <planeGeometry args={[4.2, 4.2]} />
      <meshStandardMaterial
        map={texture}
        transparent
        emissive="#ffffff"
        emissiveMap={texture}
        emissiveIntensity={0.35}
        roughness={0.8}
      />
    </mesh>
  );
}
