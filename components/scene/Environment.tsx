"use client";

import { useMemo } from "react";
import * as THREE from "three";

/** Gradient night sky as a backside sphere (ignores fog so the gradient survives). */
export function GradientSky({ top, bottom }: { top: string; bottom: string }) {
  const texture = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = 8;
    cv.height = 256;
    const ctx = cv.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, top);
    g.addColorStop(0.55, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 8, 256);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [top, bottom]);

  return (
    <mesh>
      <sphereGeometry args={[45, 32, 16]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} fog={false} depthWrite={false} />
    </mesh>
  );
}

/** Stone-tiled courtyard floor (procedural texture with per-tile variation). */
export function Ground({ color }: { color: string }) {
  const { map, rough } = useMemo(() => {
    const S = 512;
    const tiles = 4;
    const cv = document.createElement("canvas");
    cv.width = cv.height = S;
    const c = cv.getContext("2d")!;
    const base = new THREE.Color(color);
    const t = S / tiles;
    for (let y = 0; y < tiles; y++) {
      for (let x = 0; x < tiles; x++) {
        const v = 0.86 + Math.random() * 0.16;
        const col = base.clone().multiplyScalar(v);
        c.fillStyle = `#${col.getHexString()}`;
        c.fillRect(x * t, y * t, t, t);
        // speckle
        for (let k = 0; k < 220; k++) {
          c.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
          c.fillRect(x * t + Math.random() * t, y * t + Math.random() * t, 2, 2);
        }
      }
    }
    // grout
    c.strokeStyle = "rgba(40,28,20,0.55)";
    c.lineWidth = 4;
    for (let i = 0; i <= tiles; i++) {
      c.beginPath(); c.moveTo(i * t, 0); c.lineTo(i * t, S); c.stroke();
      c.beginPath(); c.moveTo(0, i * t); c.lineTo(S, i * t); c.stroke();
    }
    const map = new THREE.CanvasTexture(cv);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(14, 14);
    map.anisotropy = 8;

    // roughness: tiles a bit polished (catch the diya reflections), grout rough
    const rc = document.createElement("canvas");
    rc.width = rc.height = S;
    const r = rc.getContext("2d")!;
    r.fillStyle = "#8a8a8a";
    r.fillRect(0, 0, S, S);
    r.strokeStyle = "#ffffff";
    r.lineWidth = 6;
    for (let i = 0; i <= tiles; i++) {
      r.beginPath(); r.moveTo(i * t, 0); r.lineTo(i * t, S); r.stroke();
      r.beginPath(); r.moveTo(0, i * t); r.lineTo(S, i * t); r.stroke();
    }
    const rough = new THREE.CanvasTexture(rc);
    rough.wrapS = rough.wrapT = THREE.RepeatWrapping;
    rough.repeat.set(14, 14);
    return { map, rough };
  }, [color]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[56, 56]} />
      <meshStandardMaterial map={map} roughnessMap={rough} roughness={1} metalness={0.05} />
    </mesh>
  );
}

/** Low courtyard walls, gate pillars with urns, and side trees. */
export function Courtyard() {
  const wall = "#ddd0ba";
  const trim = "#c4b293";
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          {/* side wall running from the house toward the camera */}
          <mesh position={[side * 4.6, 0.4, -0.6]} castShadow receiveShadow>
            <boxGeometry args={[0.35, 0.8, 5.6]} />
            <meshStandardMaterial color={wall} roughness={0.92} />
          </mesh>
          <mesh position={[side * 4.6, 0.83, -0.6]}>
            <boxGeometry args={[0.45, 0.06, 5.7]} />
            <meshStandardMaterial color={trim} roughness={0.9} />
          </mesh>
          {/* gate pillar + urn */}
          <mesh position={[side * 2.6, 0.6, 3.4]} castShadow receiveShadow>
            <boxGeometry args={[0.55, 1.2, 0.55]} />
            <meshStandardMaterial color={wall} roughness={0.92} />
          </mesh>
          <mesh position={[side * 2.6, 1.23, 3.4]}>
            <boxGeometry args={[0.65, 0.07, 0.65]} />
            <meshStandardMaterial color={trim} roughness={0.9} />
          </mesh>
          <mesh position={[side * 2.6, 1.45, 3.4]} castShadow>
            <sphereGeometry args={[0.2, 16, 12]} />
            <meshStandardMaterial color={wall} roughness={0.85} />
          </mesh>
          <mesh position={[side * 2.6, 1.7, 3.4]}>
            <coneGeometry args={[0.09, 0.2, 12]} />
            <meshStandardMaterial color={wall} roughness={0.85} />
          </mesh>
          {/* tree silhouette */}
          <group position={[side * 6.2, 0, -3.2]}>
            <mesh position={[0, 0.9, 0]}>
              <cylinderGeometry args={[0.1, 0.16, 1.8, 8]} />
              <meshStandardMaterial color="#2a1c14" roughness={1} />
            </mesh>
            {[[0, 2.3, 0, 1.1], [0.5, 2.0, 0.2, 0.8], [-0.5, 2.1, -0.1, 0.85], [0.1, 2.9, 0, 0.7]].map(([x, y, z, r], i) => (
              <mesh key={i} position={[x, y, z]}>
                <icosahedronGeometry args={[r, 1]} />
                <meshStandardMaterial color="#14251a" roughness={1} flatShading />
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </group>
  );
}

/** Distant city skyline with lit windows and string lights (depth + atmosphere). */
export function Skyline() {
  const { boxes, windows, winTex } = useMemo(() => {
    const boxes: { x: number; z: number; w: number; h: number; d: number }[] = [];
    const win: number[] = [];
    const cols: number[] = [];
    const c = new THREE.Color();
    let x = -26;
    while (x < 26) {
      const w = 1.5 + Math.random() * 2.5;
      const h = 2 + Math.random() * 5;
      const z = -18 - Math.random() * 6;
      if (Math.abs(x + w / 2) > 4.5 || h < 5) {
        boxes.push({ x: x + w / 2, z, w, h, d: 2 });
        // lit windows
        for (let wy = 0.6; wy < h - 0.3; wy += 0.55) {
          for (let wx = 0.3; wx < w - 0.2; wx += 0.45) {
            if (Math.random() < 0.35) {
              win.push(x + wx, wy, z + 1.02);
              c.setHSL(0.09 + Math.random() * 0.04, 0.9, 0.55).multiplyScalar(1.6);
              cols.push(c.r, c.g, c.b);
            }
          }
        }
        // a string of lights on the roofline
        for (let k = 0; k < w; k += 0.22) {
          win.push(x + k, h + 0.05, z + 1.02);
          c.set(["#ffd27a", "#ff8a5b", "#9ad0ff", "#ff9ad0"][Math.floor(Math.random() * 4)]).multiplyScalar(2);
          cols.push(c.r, c.g, c.b);
        }
      }
      x += w + 0.2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(win, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
    const cv = document.createElement("canvas");
    cv.width = cv.height = 16;
    const g = cv.getContext("2d")!;
    const gr = g.createRadialGradient(8, 8, 0, 8, 8, 8);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 16, 16);
    return { boxes, windows: geo, winTex: new THREE.CanvasTexture(cv) };
  }, []);

  return (
    <group>
      {boxes.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]}>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color="#121426" roughness={1} />
        </mesh>
      ))}
      <points geometry={windows}>
        <pointsMaterial size={0.16} map={winTex} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} sizeAttenuation />
      </points>
    </group>
  );
}
