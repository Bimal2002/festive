/**
 * NIGHT AMBIENCE — runs continuously under the score.
 *   crickets      — several individual insects, each with its own pitch,
 *                   chirp rhythm and position in the stereo field
 *   night air     — slow-breathing filtered brown noise
 *   festival hum  — a far-off murmur of the neighbourhood celebrating
 *   distant crackers — booms, ladis and crackle around the town; how often
 *                   depends on the scene (quiet at first, busy in the finale)
 *
 * Override: /sounds/diwali/ambience.mp3 (looped) replaces crickets/air/hum.
 */

import { getCtx, isStarted, out, noise, fileBuffer, loadFile } from "./engine";
import { playBoom, playLadi, playCrackle } from "./sfx";

let running = false;
let layerGain: GainNode | null = null;
let fileSrc: AudioBufferSourceNode | null = null;
let crackerRate = 0; // average crackers per 10 s
const timers: ReturnType<typeof setTimeout>[] = [];
let loops: { stop: () => void }[] = [];

function later(fn: () => void, ms: number) {
  const id = setTimeout(() => {
    if (running && isStarted()) fn();
  }, ms);
  timers.push(id);
}

function cricket(pitch: number, pan: number, vol: number) {
  const c = getCtx()!;
  const dest = out("amb", { pan, vol, wet: 0.15 });
  const loop = () => {
    const t = c.currentTime + 0.05;
    const pulses = 3 + Math.floor(Math.random() * 2);
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = pitch * (0.995 + Math.random() * 0.01);
    const g = c.createGain();
    g.gain.value = 0;
    for (let k = 0; k < pulses; k++) {
      const s = t + k * 0.042;
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(1, s + 0.006);
      g.gain.linearRampToValueAtTime(0, s + 0.026);
    }
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + pulses * 0.042 + 0.05);
    // crickets chirp in bursts, with pauses
    const pause = Math.random() < 0.12 ? 2500 + Math.random() * 4000 : 520 + Math.random() * 260;
    later(loop, pause);
  };
  later(loop, Math.random() * 1500);
}

function startSynthBed() {
  const c = getCtx()!;
  layerGain = c.createGain();
  layerGain.gain.value = 0;
  layerGain.connect(out("amb", { vol: 1 }));

  // night air
  const air = noise(c.currentTime, undefined, "brown");
  const airLp = c.createBiquadFilter();
  airLp.type = "lowpass";
  airLp.frequency.value = 320;
  const airG = c.createGain();
  airG.gain.value = 0.06;
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.09;
  const lfoG = c.createGain();
  lfoG.gain.value = 0.03;
  lfo.connect(lfoG);
  lfoG.connect(airG.gain);
  air.connect(airLp);
  airLp.connect(airG);
  airG.connect(layerGain);
  lfo.start();

  // distant festival murmur
  const hum = noise(c.currentTime, undefined, "white");
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 520;
  bp.Q.value = 0.8;
  const humLp = c.createBiquadFilter();
  humLp.type = "lowpass";
  humLp.frequency.value = 900;
  const humG = c.createGain();
  humG.gain.value = 0.007;
  const lfo2 = c.createOscillator();
  lfo2.frequency.value = 0.05;
  const lfo2G = c.createGain();
  lfo2G.gain.value = 0.003;
  lfo2.connect(lfo2G);
  lfo2G.connect(humG.gain);
  hum.connect(bp);
  bp.connect(humLp);
  humLp.connect(humG);
  humG.connect(layerGain);
  lfo2.start();

  loops = [{ stop: () => { air.stop(); hum.stop(); lfo.stop(); lfo2.stop(); } }];
  layerGain.gain.setTargetAtTime(1, c.currentTime, 1.2);

  // crickets: a small chorus spread across the stereo field
  cricket(4650, -0.75, 0.03);
  cricket(4420, 0.6, 0.024);
  cricket(4880, 0.15, 0.016);
  cricket(4300, -0.3, 0.012);
}

function crackerLoop() {
  if (crackerRate > 0) {
    const pan = Math.random() * 2 - 1;
    const v = 0.14 + Math.random() * 0.2;
    const r = Math.random();
    if (r < 0.5) playBoom(pan * 0.9, 0.3 + Math.random() * 0.35, 0, v, true);
    else if (r < 0.8) playLadi(pan, 8 + Math.floor(Math.random() * 16), v, true);
    else playCrackle(pan, 0, 20, 0.8, v, true);
  }
  const mean = crackerRate > 0 ? 10000 / crackerRate : 3000;
  later(crackerLoop, mean * (0.4 + Math.random() * 1.2));
}

export function startAmbience() {
  const c = getCtx();
  if (!c || running) return;
  running = true;
  loadFile("ambience").then(() => {
    if (!running) return;
    const buf = fileBuffer("ambience");
    if (buf) {
      fileSrc = c.createBufferSource();
      fileSrc.buffer = buf;
      fileSrc.loop = true;
      const g = c.createGain();
      g.gain.value = 0;
      g.gain.setTargetAtTime(0.9, c.currentTime, 1);
      fileSrc.connect(g);
      g.connect(out("amb", { vol: 1 }));
      fileSrc.start();
    } else {
      startSynthBed();
    }
  });
  later(crackerLoop, 2500);
}

/** Crackers per ~10 seconds around the neighbourhood. */
export function setCrackerRate(perTenSeconds: number) {
  crackerRate = perTenSeconds;
}

export function stopAmbience() {
  running = false;
  timers.forEach(clearTimeout);
  timers.length = 0;
  const c = getCtx();
  if (layerGain && c) layerGain.gain.setTargetAtTime(0, c.currentTime, 0.2);
  const ls = loops;
  loops = [];
  setTimeout(() => ls.forEach((l) => l.stop()), 1200);
  if (fileSrc) {
    try { fileSrc.stop(); } catch {}
    fileSrc = null;
  }
}
