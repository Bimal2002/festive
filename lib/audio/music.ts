/**
 * GENERATIVE DIWALI SCORE — Raag Yaman (the classic evening raag)
 * ---------------------------------------------------------------------------
 * Layers (each with its own gain, crossfaded per scene):
 *   tanpura  — Pa · Sa · Sa · low-Sa drone cycle (Karplus-Strong strings)
 *   santoor  — melodic phrases on the Yaman scale, double-strung shimmer,
 *              occasional tremolo runs
 *   tabla    — keherwa theka (8 matras): Dha Ge Na Ti | Na Ka Dhi Na
 *   pad      — warm Sa/Pa swell for the fireworks
 *   bells    — temple-bell accents
 *
 * Scenes mirror the story: intro → spread → rangoli → fireworks → wish.
 * Drop-in override: /sounds/diwali/m-<scene>.mp3 (looped) replaces the
 * synthesized music for that scene.
 *
 * Timing uses a look-ahead scheduler on the audio clock, so it stays in time
 * even when the 3D scene is busy.
 */

import { getCtx, isStarted, out, noise, bus, fileBuffer, loadFile } from "./engine";

export type Scene = "intro" | "spread" | "rangoli" | "fireworks" | "wish";

const SA = 146.83; // D3
const YAMAN = [0, 2, 4, 6, 7, 9, 11]; // S R G M# P D N
const BPM = 76;
const SLOT = 60 / BPM / 2; // one matra = an eighth note ≈ 0.395 s

const MIX: Record<Scene, { tanpura: number; santoor: number; tabla: number; pad: number; density: number }> = {
  intro: { tanpura: 0.65, santoor: 0.0, tabla: 0.0, pad: 0.0, density: 0 },
  spread: { tanpura: 0.85, santoor: 0.7, tabla: 0.0, pad: 0.0, density: 0.32 },
  rangoli: { tanpura: 0.8, santoor: 0.8, tabla: 0.55, pad: 0.0, density: 0.45 },
  fireworks: { tanpura: 0.7, santoor: 0.85, tabla: 0.85, pad: 0.55, density: 0.62 },
  wish: { tanpura: 0.9, santoor: 0.75, tabla: 0.0, pad: 0.45, density: 0.22 },
};

let layers: { tanpura: GainNode; santoor: GainNode; tabla: GainNode; pad: GainNode; stem: GainNode } | null = null;
let scene: Scene = "intro";
let timer: ReturnType<typeof setInterval> | null = null;
let nextTime = 0;
let slot = 0;
let degree = 7; // melody position in scale degrees (7 = upper Sa)
let padNodes: { stop: () => void } | null = null;
let stemSrc: AudioBufferSourceNode | null = null;
const ksCache = new Map<string, AudioBuffer>();

const f = (semi: number) => SA * Math.pow(2, semi / 12);
const degToSemi = (d: number) => Math.floor(d / 7) * 12 + YAMAN[((d % 7) + 7) % 7];

// ---------- Karplus-Strong plucked string ----------
function ks(freq: number, seconds: number, decay: number, bright: number, seed = 0): AudioBuffer {
  const key = `${freq.toFixed(2)}|${seconds}|${decay}|${bright}|${seed}`;
  const hit = ksCache.get(key);
  if (hit) return hit;
  const c = getCtx()!;
  const sr = c.sampleRate;
  const N = Math.max(2, Math.round(sr / freq));
  const len = Math.floor(sr * seconds);
  const buf = c.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  let prev = 0;
  for (let i = 0; i < N; i++) {
    const n = Math.random() * 2 - 1;
    prev = prev + bright * (n - prev); // excitation brightness
    d[i] = prev;
  }
  // 3-tap loss filter: highs die much faster than lows, like a real string
  for (let i = N; i < len; i++) {
    const a = d[i - N];
    const b = d[i - N - 1 < 0 ? 0 : i - N - 1];
    const c = d[i - N - 2 < 0 ? 0 : i - N - 2];
    d[i] = decay * (0.25 * a + 0.5 * b + 0.25 * c);
  }
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(d[i]));
  const fadeFrom = len - Math.floor(sr * 0.08);
  for (let i = 0; i < len; i++) {
    d[i] /= peak || 1;
    if (i > fadeFrom) d[i] *= (len - i) / (len - fadeFrom);
  }
  ksCache.set(key, buf);
  return buf;
}

function pluck(dest: AudioNode, freq: number, when: number, opts: { secs: number; decay: number; bright: number; vol: number; pan?: number; detune?: number; wet?: number }) {
  const c = getCtx()!;
  const src = c.createBufferSource();
  src.buffer = ks(freq, opts.secs, opts.decay, opts.bright, Math.floor(Math.random() * 3));
  if (opts.detune) src.detune.value = opts.detune;
  const g = c.createGain();
  g.gain.value = opts.vol;
  const p = c.createStereoPanner();
  p.pan.value = opts.pan ?? 0;
  src.connect(g);
  g.connect(p);
  p.connect(dest);
  src.start(when);
}

// ---------- instruments ----------
function tanpura(when: number, step: number) {
  // Pa(low) · Sa · Sa · Sa(low)
  const notes = [-5, 0, 0, -12];
  const semi = notes[step % 4];
  const dest = layers!.tanpura;
  // the jawari buzz is approximated by a bright excitation + a slightly detuned twin
  pluck(dest, f(semi), when, { secs: 5.5, decay: 0.9996, bright: 0.38, vol: 0.34, pan: -0.25 + (step % 4) * 0.15 });
  pluck(dest, f(semi), when + 0.012, { secs: 5.5, decay: 0.9996, bright: 0.3, vol: 0.17, pan: 0.2, detune: 4 });
}

function santoorNote(when: number, semi: number, vol = 0.22) {
  const dest = layers!.santoor;
  const fr = f(semi);
  const pan = Math.max(-0.7, Math.min(0.7, (semi - 18) / 14));
  // santoor: each note is 2–4 strings, slightly out of tune → shimmer
  pluck(dest, fr, when, { secs: 2.4, decay: 0.9985, bright: 0.72, vol, pan });
  pluck(dest, fr, when + 0.004, { secs: 2.4, decay: 0.9985, bright: 0.6, vol: vol * 0.7, pan: pan * 0.6, detune: 6 });
}

function santoor(when: number, density: number) {
  if (Math.random() > density) return;
  // stepwise random walk on Yaman, gently pulled toward Sa/Pa
  const r = Math.random();
  const stepSize = r < 0.45 ? 1 : r < 0.8 ? -1 : r < 0.9 ? 2 : -2;
  degree += stepSize;
  if (degree > 12) degree -= 2;
  if (degree < 4) degree += 2;
  const semi = 12 + degToSemi(degree);
  // tremolo run (santoor signature) now and then
  if (Math.random() < 0.18) {
    const reps = 3 + Math.floor(Math.random() * 3);
    for (let k = 0; k < reps; k++) santoorNote(when + k * (SLOT / 4), semi, 0.15 + k * 0.01);
  } else {
    santoorNote(when, semi);
  }
  // occasional lower harmony on Sa or Pa
  if (Math.random() < 0.12) santoorNote(when, Math.random() < 0.5 ? 12 : 7, 0.12);
}

function bayan(dest: AudioNode, when: number, vol: number) {
  const c = getCtx()!;
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(78, when);
  o.frequency.linearRampToValueAtTime(96, when + 0.18); // the bayan "ghe" glide
  o.frequency.exponentialRampToValueAtTime(70, when + 0.6);
  const g = c.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0008, when + 0.65);
  o.connect(g);
  g.connect(dest);
  o.start(when);
  o.stop(when + 0.7);
}

function dayan(dest: AudioNode, when: number, vol: number, ring: number) {
  const c = getCtx()!;
  const base = f(12); // tuned to Sa
  [1, 2.02, 3.01, 4.1].forEach((h, i) => {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = base * h;
    const g = c.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol / (i + 1.4), when + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0005, when + ring / (1 + i * 0.6));
    o.connect(g);
    g.connect(dest);
    o.start(when);
    o.stop(when + ring + 0.05);
  });
  // finger slap
  const n = noise(when, 0.03);
  const hp = c.createBiquadFilter();
  hp.type = "bandpass";
  hp.frequency.value = 3200;
  const ng = c.createGain();
  ng.gain.setValueAtTime(vol * 0.6, when);
  ng.gain.exponentialRampToValueAtTime(0.001, when + 0.03);
  n.connect(hp);
  hp.connect(ng);
  ng.connect(dest);
}

function ka(dest: AudioNode, when: number, vol: number) {
  const c = getCtx()!;
  const n = noise(when, 0.05);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.05);
  n.connect(lp);
  lp.connect(g);
  g.connect(dest);
}

// keherwa: Dha Ge Na Ti | Na Ka Dhi Na
function tabla(when: number, matra: number) {
  const dest = layers!.tabla;
  const v = 0.42 * (matra === 0 ? 1.2 : 1) * (0.9 + Math.random() * 0.2);
  const swing = matra % 2 ? 0.012 : 0;
  const t = when + swing;
  switch (matra) {
    case 0: bayan(dest, t, v); dayan(dest, t, v * 0.8, 0.5); break; // Dha
    case 1: bayan(dest, t, v * 0.7); break; // Ge
    case 2: dayan(dest, t, v * 0.7, 0.35); break; // Na
    case 3: dayan(dest, t, v * 0.45, 0.12); break; // Ti
    case 4: dayan(dest, t, v * 0.65, 0.35); break; // Na
    case 5: ka(dest, t, v * 0.7); break; // Ka
    case 6: bayan(dest, t, v * 0.8); dayan(dest, t, v * 0.6, 0.6); break; // Dhi
    case 7: dayan(dest, t, v * 0.6, 0.3); break; // Na
  }
  // fill on the last matra of every 4th cycle
  if (matra === 7 && Math.floor(slot / 8) % 4 === 3) {
    dayan(dest, t + SLOT / 2, v * 0.5, 0.15);
    dayan(dest, t + (SLOT * 3) / 4, v * 0.55, 0.15);
  }
}

function startPad() {
  const c = getCtx()!;
  const dest = layers!.pad;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  lp.Q.value = 0.7;
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoG = c.createGain();
  lfoG.gain.value = 500;
  lfo.connect(lfoG);
  lfoG.connect(lp.frequency);
  lp.connect(dest);
  const oscs: OscillatorNode[] = [];
  [0, 7, 12, 19].forEach((semi, i) => {
    [-7, 7].forEach((det) => {
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f(semi);
      o.detune.value = det + i;
      const g = c.createGain();
      g.gain.value = 0.035;
      o.connect(g);
      g.connect(lp);
      o.start();
      oscs.push(o);
    });
  });
  lfo.start();
  return { stop: () => { oscs.forEach((o) => o.stop()); lfo.stop(); } };
}

export function bell(when: number, base = 620, vol = 0.22, pan = 0, dest?: AudioNode) {
  const c = getCtx()!;
  const o2 = dest ?? out("music", { pan, wet: 0.5 });
  [1, 2.32, 3.86, 5.4, 6.8].forEach((ratio, i) => {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = base * ratio;
    const g = c.createGain();
    const v = vol / (i + 1);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(v, when + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 3.2 / (1 + i * 0.4));
    o.connect(g);
    g.connect(o2);
    o.start(when);
    o.stop(when + 3.4);
  });
}

// ---------- scheduler ----------
function tick() {
  const c = getCtx();
  if (!c || !layers || !isStarted()) return;
  const m = MIX[scene];
  while (nextTime < c.currentTime + 0.3) {
    const when = nextTime;
    const usingStem = !!stemSrc;
    if (!usingStem) {
      if (slot % 3 === 0) tanpura(when, slot / 3);
      if (m.santoor > 0) santoor(when, m.density * (slot % 2 === 0 ? 1.15 : 0.8));
      if (m.tabla > 0) tabla(when, slot % 8);
      if (scene === "wish" && slot % 16 === 0) bell(when, f(36) / 2.32 * 1.0, 0.08, Math.random() - 0.5);
    }
    nextTime += SLOT;
    slot++;
  }
}

function applyMix(s: Scene, fade = 2.2) {
  const c = getCtx();
  if (!c || !layers) return;
  const m = MIX[s];
  const t = c.currentTime;
  const tc = fade / 3;
  const stemBuf = fileBuffer(`m-${s}`);
  const synth = stemBuf ? 0 : 1;
  layers.tanpura.gain.setTargetAtTime(m.tanpura * synth, t, tc);
  layers.santoor.gain.setTargetAtTime(m.santoor * synth, t, tc);
  layers.tabla.gain.setTargetAtTime(m.tabla * synth, t, tc);
  layers.pad.gain.setTargetAtTime(m.pad * synth, t, tc * 1.5);

  // recorded stem override, crossfaded
  if (stemSrc) {
    const old = stemSrc;
    layers.stem.gain.setTargetAtTime(0, t, tc);
    setTimeout(() => { try { old.stop(); } catch {} }, fade * 1000 + 400);
    stemSrc = null;
  }
  if (stemBuf) {
    const src = c.createBufferSource();
    src.buffer = stemBuf;
    src.loop = s !== "intro";
    src.connect(layers.stem);
    src.start(t + 0.05);
    layers.stem.gain.setTargetAtTime(1, t, tc);
    stemSrc = src;
  }
}

/** Start the score. Call after audio is unlocked. */
export function startMusic(initial: Scene = "intro") {
  const c = getCtx();
  if (!c) return;
  ["m-intro", "m-spread", "m-rangoli", "m-fireworks", "m-wish"].forEach(loadFile);
  if (!layers) {
    const mk = () => {
      const g = c.createGain();
      g.gain.value = 0;
      return g;
    };
    layers = { tanpura: mk(), santoor: mk(), tabla: mk(), pad: mk(), stem: mk() };
    // tone shaping per instrument, then a generous reverb send for the courtyard
    const rvSend = out("music", { wet: 0.5, vol: 1 });
    const tone = (hz: number) => {
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = hz;
      lp.Q.value = 0.5;
      lp.connect(rvSend);
      return lp;
    };
    layers.tanpura.connect(tone(2600)); // warm drone, keep the buzz but no hiss
    layers.santoor.connect(tone(6500));
    layers.pad.connect(rvSend);
    layers.tabla.connect(out("music", { wet: 0.25, vol: 1 }));
    layers.stem.connect(bus("music"));
    padNodes = startPad();
  }
  scene = initial;
  slot = 0;
  degree = 7;
  nextTime = c.currentTime + 0.1;
  applyMix(initial, 1.5);
  if (timer) clearInterval(timer);
  timer = setInterval(tick, 50);
}

export function setScene(s: Scene) {
  if (s === scene) return;
  scene = s;
  applyMix(s);
}

export function stopMusic() {
  if (timer) clearInterval(timer);
  timer = null;
  if (layers) {
    const c = getCtx()!;
    Object.values(layers).forEach((g) => g.gain.setTargetAtTime(0, c.currentTime, 0.2));
  }
  if (stemSrc) {
    try { stemSrc.stop(getCtx()!.currentTime + 1); } catch {}
    stemSrc = null;
  }
}

export function musicFreq(semi: number) {
  return f(semi);
}
export { YAMAN };
