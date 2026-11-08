"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { playBoom, playCrackle, playWhistle } from "@/lib/sound";

/**
 * Rocket fireworks.
 *  - rockets launch from behind the house with a gold spark trail (+ whistle)
 *  - burst types: peony, gold willow, ring, crackling, two-tone
 *  - every burst flashes a real point light, so the house and courtyard light up
 *  - HDR colours (> 1.0) feed the bloom pass for genuine glow
 *
 * mode: 0 = off, 1 = ambient (occasional, distant), 2 = finale (full show)
 */

type BurstKind = "peony" | "willow" | "ring" | "crackle" | "twoTone";

interface Spark {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number; max: number;
  r: number; g: number; b: number;
  drag: number; grav: number;
  flicker: number; // 0 = steady, >0 = twinkle strength
  crackle: boolean; // pops into white sparkles when it dies
}

interface Rocket {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  fuse: number; // seconds until burst
  color: THREE.Color;
  color2: THREE.Color;
  kind: BurstKind;
  size: number;
  vol: number;
}

const GOLD = new THREE.Color("#ffb347");
const WHITE = new THREE.Color("#ffffff");
const HDR = 4.2; // brightness multiplier fed to bloom

export default function Fireworks({
  colors,
  mode = 0,
  pool = 3200,
}: {
  colors: string[];
  mode?: 0 | 1 | 2;
  pool?: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const flashRef = useRef<THREE.PointLight>(null);
  const flash2Ref = useRef<THREE.PointLight>(null);
  const sparks = useRef<Spark[]>([]);
  const smokeGeo = useRef<THREE.BufferGeometry | null>(null);
  const smokeTex = useRef<THREE.Texture | null>(null);
  const rockets = useRef<Rocket[]>([]);
  const timer = useRef(0.6);
  const flashFlip = useRef(false);
  const smoke = useRef<{ x: number; y: number; z: number; vx: number; vy: number; life: number; max: number; r: number; g: number; b: number }[]>([]);
  const lastMode = useRef(0);

  const { geometry, texture, palette } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pool * 3), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(pool * 3), 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 6, -8), 60);

    const cv = document.createElement("canvas");
    cv.width = cv.height = 64;
    const c = cv.getContext("2d")!;
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.18, "rgba(255,255,255,0.9)");
    g.addColorStop(0.45, "rgba(255,255,255,0.25)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);

    sparks.current = [];

    // smoke uses RGBA vertex colours so each puff fades on its own
    const sgeo = new THREE.BufferGeometry();
    sgeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(240 * 3), 3));
    sgeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(240 * 4), 4));
    const sc = document.createElement("canvas");
    sc.width = sc.height = 64;
    const sx = sc.getContext("2d")!;
    const sg = sx.createRadialGradient(32, 32, 0, 32, 32, 32);
    sg.addColorStop(0, "rgba(255,255,255,0.9)");
    sg.addColorStop(0.5, "rgba(255,255,255,0.35)");
    sg.addColorStop(1, "rgba(255,255,255,0)");
    sx.fillStyle = sg;
    sx.fillRect(0, 0, 64, 64);
    smokeGeo.current = sgeo;
    smokeTex.current = new THREE.CanvasTexture(sc);

    return {
      geometry: geo,
      texture: new THREE.CanvasTexture(cv),
      palette: colors.map((h) => new THREE.Color(h)),
    };
  }, [pool, colors]);

  const pick = () => palette[Math.floor(Math.random() * palette.length)];

  const add = (s: Spark) => {
    if (sparks.current.length < pool) sparks.current.push(s);
  };

  const launch = (finale: boolean) => {
    const kinds: BurstKind[] = ["peony", "willow", "ring", "crackle", "twoTone"];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const far = !finale;
    const z = far ? -16 - Math.random() * 8 : -7 - Math.random() * 6;
    const x = (Math.random() - 0.5) * (far ? 26 : 16);
    const size = far ? 0.45 + Math.random() * 0.3 : 0.75 + Math.random() * 0.45;
    const r: Rocket = {
      x, y: 0, z,
      vx: (Math.random() - 0.5) * 0.8,
      vy: far ? 9 + Math.random() * 3 : 12.5 + Math.random() * 3,
      vz: (Math.random() - 0.5) * 0.4,
      fuse: 0.95 + Math.random() * 0.45,
      color: pick(),
      color2: pick(),
      kind,
      size,
      vol: far ? 0.45 : 1,
    };
    rockets.current.push(r);
    if (Math.random() < (finale ? 0.55 : 0.3)) playWhistle(x / 10, r.fuse);
  };

  const burst = (r: Rocket) => {
    const n = Math.floor((r.kind === "willow" ? 150 : 190) * (0.6 + r.size * 0.6));
    const speed = 6.8 * (0.7 + r.size * 0.5);

    // ring orientation
    const axis = new THREE.Vector3((Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.9, 1).normalize(); // face the viewer
    const u = new THREE.Vector3(1, 0, 0).cross(axis).normalize();
    const w = axis.clone().cross(u).normalize();

    for (let i = 0; i < n; i++) {
      let dx: number, dy: number, dz: number;
      if (r.kind === "ring") {
        const a = (i / n) * Math.PI * 2;
        const v = u.clone().multiplyScalar(Math.cos(a)).add(w.clone().multiplyScalar(Math.sin(a)));
        dx = v.x; dy = v.y; dz = v.z;
      } else {
        // uniform sphere
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        dx = Math.sin(ph) * Math.cos(th);
        dy = Math.cos(ph);
        dz = Math.sin(ph) * Math.sin(th);
      }
      const sp = speed * (r.kind === "ring" ? 1 : 0.75 + Math.random() * 0.35);
      let col = r.color;
      if (r.kind === "willow") col = GOLD;
      if (r.kind === "twoTone") col = i % 2 ? r.color : r.color2;
      if (r.kind === "crackle") col = Math.random() < 0.5 ? GOLD : WHITE;

      const willow = r.kind === "willow";
      const life = willow ? 2.6 + Math.random() * 0.8 : 1.3 + Math.random() * 0.6;
      add({
        x: r.x, y: r.y, z: r.z,
        vx: dx * sp, vy: dy * sp, vz: dz * sp,
        life, max: life,
        r: col.r, g: col.g, b: col.b,
        drag: willow ? 0.955 : 0.972,
        grav: willow ? 1.5 : 2.1,
        flicker: willow ? 0.5 : r.kind === "crackle" ? 0.8 : 0.15,
        crackle: r.kind === "crackle",
      });
    }
    // hot white core
    for (let i = 0; i < 28; i++) {
      add({
        x: r.x, y: r.y, z: r.z,
        vx: (Math.random() - 0.5) * 2.5, vy: (Math.random() - 0.5) * 2.5, vz: (Math.random() - 0.5) * 2.5,
        life: 0.3, max: 0.3, r: 1.6, g: 1.45, b: 1.2, drag: 0.9, grav: 0, flicker: 0, crackle: false,
      });
    }

    // leave a drifting smoke puff, tinted by the burst
    for (let i = 0; i < 6 && smoke.current.length < 240; i++) {
      const life = 6 + Math.random() * 4;
      const tint = r.kind === "willow" || r.kind === "crackle" ? GOLD : r.color;
      smoke.current.push({
        x: r.x + (Math.random() - 0.5) * 2.5, y: r.y + (Math.random() - 0.5) * 2, z: r.z + (Math.random() - 0.5) * 2,
        vx: 0.15 + Math.random() * 0.2, vy: -0.05 + Math.random() * 0.1,
        life, max: life,
        r: 0.25 + tint.r * 0.25, g: 0.25 + tint.g * 0.25, b: 0.3 + tint.b * 0.25,
      });
    }

    // light flash — alternate two lights so overlapping bursts both glow
    const L = (flashFlip.current = !flashFlip.current) ? flashRef.current : flash2Ref.current;
    if (L) {
      L.position.set(r.x, r.y, r.z);
      L.color.copy(r.kind === "willow" || r.kind === "crackle" ? GOLD : r.color);
      L.intensity = (r.vol < 1 ? 60 : 260) * r.size;
    }

    // sound — light arrives first, the bang a moment later
    const pan = r.x / 10;
    const dist = Math.hypot(r.x, r.y - 2, r.z - 10);
    const delay = Math.min(0.35, dist / 343 * 3);
    playBoom(pan, r.size, delay, r.vol, r.vol < 1);
    if (r.kind === "crackle") playCrackle(pan, delay + 1.0, 45, 0.9, r.vol, r.vol < 1);
    if (r.kind === "willow") playCrackle(pan, delay + 0.8, 18, 1.8, r.vol * 0.5, r.vol < 1);
  };

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.05);

    // big opening volley the moment the finale starts
    if (mode === 2 && lastMode.current !== 2) {
      for (let i = 0; i < 5; i++) setTimeout(() => launch(true), i * 160);
      timer.current = 1.4;
    }
    lastMode.current = mode;

    // schedule launches
    if (mode > 0) {
      timer.current -= d;
      if (timer.current <= 0) {
        if (mode === 2) {
          const volley = Math.random() < 0.25 ? 3 + Math.floor(Math.random() * 3) : 1;
          for (let i = 0; i < volley; i++) launch(true);
          timer.current = 0.28 + Math.random() * 0.5;
        } else {
          launch(false);
          timer.current = 2.2 + Math.random() * 2.8;
        }
      }
    }

    // rockets
    for (let i = rockets.current.length - 1; i >= 0; i--) {
      const r = rockets.current[i];
      r.fuse -= d;
      r.vy -= 3.2 * d;
      r.x += r.vx * d; r.y += r.vy * d; r.z += r.vz * d;
      // trail
      for (let k = 0; k < 2; k++) {
        add({
          x: r.x + (Math.random() - 0.5) * 0.05, y: r.y, z: r.z,
          vx: (Math.random() - 0.5) * 0.4, vy: -0.6 - Math.random(), vz: (Math.random() - 0.5) * 0.4,
          life: 0.35 + Math.random() * 0.3, max: 0.65,
          r: GOLD.r * 1.1, g: GOLD.g * 0.9, b: GOLD.b * 0.6,
          drag: 0.9, grav: 0.6, flicker: 0.6, crackle: false,
        });
      }
      if (r.fuse <= 0) {
        burst(r);
        rockets.current.splice(i, 1);
      }
    }

    // flash decay
    [flashRef.current, flash2Ref.current].forEach((L) => {
      if (L) L.intensity *= Math.pow(0.004, d);
    });

    // sparks
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const col = geometry.attributes.color as THREE.BufferAttribute;
    const pa = pos.array as Float32Array;
    const ca = col.array as Float32Array;
    const list = sparks.current;
    let w = 0;
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      s.life -= d;
      if (s.life <= 0) {
        if (s.crackle) {
          // die in a pop of white glitter
          for (let k = 0; k < 3; k++) {
            add({
              x: s.x, y: s.y, z: s.z,
              vx: (Math.random() - 0.5) * 1.6, vy: (Math.random() - 0.5) * 1.6, vz: (Math.random() - 0.5) * 1.6,
              life: 0.12 + Math.random() * 0.15, max: 0.27,
              r: 1.5, g: 1.5, b: 1.4, drag: 0.85, grav: 0, flicker: 1, crackle: false,
            });
          }
        }
        continue;
      }
      const drag = Math.pow(s.drag, d * 60);
      s.vx *= drag; s.vy *= drag; s.vz *= drag;
      s.vy -= s.grav * d;
      s.x += s.vx * d; s.y += s.vy * d; s.z += s.vz * d;
      list[w++] = s;
    }
    list.length = w;

    const n = Math.min(list.length, pool);
    for (let i = 0; i < n; i++) {
      const s = list[i];
      const k = s.life / s.max;
      const fade = k < 0.3 ? k / 0.3 : 1;
      const tw = s.flicker > 0 ? 1 - s.flicker * Math.random() : 1;
      const b = HDR * fade * tw;
      pa[i * 3] = s.x; pa[i * 3 + 1] = s.y; pa[i * 3 + 2] = s.z;
      ca[i * 3] = s.r * b; ca[i * 3 + 1] = s.g * b; ca[i * 3 + 2] = s.b * b;
    }
    geometry.setDrawRange(0, n);
    pos.needsUpdate = true;
    col.needsUpdate = true;

    // smoke
    const sg = smokeGeo.current;
    if (sg) {
      const sp = sg.attributes.position.array as Float32Array;
      const scol = sg.attributes.color.array as Float32Array;
      let m = 0;
      for (const p of smoke.current) {
        p.life -= d;
        if (p.life <= 0) continue;
        p.x += p.vx * d; p.y += p.vy * d;
        smoke.current[m] = p;
        const k = p.life / p.max;
        const a = 0.16 * Math.min(1, (1 - k) * 6) * k; // fade in fast, out slow
        sp[m * 3] = p.x; sp[m * 3 + 1] = p.y; sp[m * 3 + 2] = p.z;
        scol[m * 4] = p.r; scol[m * 4 + 1] = p.g; scol[m * 4 + 2] = p.b; scol[m * 4 + 3] = a;
        m++;
      }
      smoke.current.length = m;
      sg.setDrawRange(0, m);
      sg.attributes.position.needsUpdate = true;
      sg.attributes.color.needsUpdate = true;
    }
  });

  return (
    <group>
      <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
        <pointsMaterial
          size={0.3}
          map={texture}
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
          toneMapped={false}
          fog={false}
        />
      </points>
      {smokeGeo.current && (
        <points geometry={smokeGeo.current} frustumCulled={false} renderOrder={-1}>
          <pointsMaterial
            size={5}
            map={smokeTex.current}
            vertexColors
            transparent
            depthWrite={false}
            sizeAttenuation
            fog={false}
          />
        </points>
      )}
      <pointLight ref={flashRef} intensity={0} distance={40} decay={1.6} />
      <pointLight ref={flash2Ref} intensity={0} distance={40} decay={1.6} />
    </group>
  );
}
