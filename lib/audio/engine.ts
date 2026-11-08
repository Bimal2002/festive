/**
 * AUDIO ENGINE CORE
 * ---------------------------------------------------------------------------
 *   sources ─► [music | amb | sfx] bus ─► master ─► compressor ─► speakers
 *                      └──── send ────► reverb ──┘
 *
 * - Three buses so music, ambience and effects can be balanced independently.
 * - A generated convolution reverb gives bells, music and booms real space.
 * - Optional real recordings: /sounds/diwali/<key>.mp3 replaces any synthesized
 *   sound with the same key (decoded once, cached; missing files are remembered).
 * - Pauses itself when the tab is hidden and resumes when it comes back.
 */

export type Bus = "music" | "amb" | "sfx";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let buses: Record<Bus, GainNode> | null = null;
let reverbIn: GainNode | null = null;
let white: AudioBuffer | null = null;
let brown: AudioBuffer | null = null;
let muted = false;
let started = false;
const files: Record<string, AudioBuffer | null | undefined> = {};

const MASTER_LEVEL = 0.8;
const BUS_LEVEL: Record<Bus, number> = { music: 0.5, amb: 0.55, sfx: 1 };

function makeIR(c: AudioContext, seconds = 2.8, decay = 3.2): AudioBuffer {
  const len = Math.floor(c.sampleRate * seconds);
  const ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const n = Math.random() * 2 - 1;
      lp += (n - lp) * (0.55 - t * 0.4); // tail gets darker over time
      d[i] = lp * Math.pow(1 - t, decay);
    }
    // a couple of early reflections (courtyard walls)
    [0.011, 0.023, 0.037].forEach((s, k) => {
      const i = Math.floor(s * c.sampleRate) + ch * 17;
      if (i < len) d[i] += 0.5 / (k + 1);
    });
  }
  return ir;
}

function init(): AudioContext {
  if (ctx) return ctx;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  ctx = new AC({ latencyHint: "interactive" });

  // glue compressor → brick-wall-ish limiter → soft clipper (never clips)
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 10;
  comp.ratio.value = 3.5;
  comp.attack.value = 0.008;
  comp.release.value = 0.25;
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -4;
  lim.knee.value = 0;
  lim.ratio.value = 20;
  lim.attack.value = 0.001;
  lim.release.value = 0.12;
  const clip = ctx.createWaveShaper();
  const curve = new Float32Array(2048);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = (0.89 * Math.tanh(1.4 * x)) / Math.tanh(1.4); // ceiling ≈ -1 dBFS
  }
  clip.curve = curve;
  clip.oversample = "2x";
  comp.connect(lim);
  lim.connect(clip);
  clip.connect(ctx.destination);

  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(comp);

  const rv = ctx.createConvolver();
  rv.buffer = makeIR(ctx);
  const rvOut = ctx.createGain();
  rvOut.gain.value = 0.42;
  rv.connect(rvOut);
  rvOut.connect(master);
  reverbIn = ctx.createGain();
  reverbIn.connect(rv);

  buses = {} as Record<Bus, GainNode>;
  (["music", "amb", "sfx"] as Bus[]).forEach((b) => {
    const g = ctx!.createGain();
    g.gain.value = BUS_LEVEL[b];
    g.connect(master!);
    buses![b] = g;
  });

  // shared noise buffers
  const len = ctx.sampleRate * 3;
  white = ctx.createBuffer(1, len, ctx.sampleRate);
  brown = ctx.createBuffer(1, len, ctx.sampleRate);
  const w = white.getChannelData(0);
  const b = brown.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    w[i] = Math.random() * 2 - 1;
    last = (last + 0.02 * w[i]) / 1.02;
    b[i] = last * 3.5;
  }

  // debug/QA hook (used by automated audio checks; harmless in production)
  (window as any).__festiveAudio = { ctx, master, buses };

  // be a good citizen in background tabs
  document.addEventListener("visibilitychange", () => {
    if (!ctx || !started) return;
    if (document.hidden) ctx.suspend();
    else if (!muted) ctx.resume();
  });
  return ctx;
}

/** Must be called from inside a user gesture (tap). Safe to call repeatedly. */
export function unlock(): AudioContext {
  const c = init();
  // iOS: play through the silent switch like a media app
  try {
    const nav = navigator as any;
    if (nav.audioSession) nav.audioSession.type = "playback";
  } catch {}
  if (c.state !== "running") c.resume();
  if (!started) {
    started = true;
    master!.gain.setTargetAtTime(muted ? 0 : MASTER_LEVEL, c.currentTime, 0.4);
  }
  return c;
}

export function getCtx(): AudioContext | null {
  return ctx;
}
export function isStarted() {
  return started && !!ctx;
}
export function ready(): boolean {
  if (typeof window === "undefined" || !ctx || !started) return false;
  if (ctx.state === "suspended" && !document.hidden && !muted) ctx.resume();
  return ctx.state !== "closed";
}
export function now() {
  return ctx ? ctx.currentTime : 0;
}

export function setMuted(m: boolean) {
  muted = m;
  if (!ctx || !master) return;
  master.gain.setTargetAtTime(m ? 0 : MASTER_LEVEL, ctx.currentTime, 0.12);
  if (!m && started) ctx.resume();
}
export function isMuted() {
  return muted;
}

/** Fade everything out (e.g. leaving the wish page). Schedulers check isStarted(). */
export function fadeOutAll(seconds = 0.6) {
  if (!ctx || !master) return;
  master.gain.setTargetAtTime(0, ctx.currentTime, seconds / 3);
  started = false;
  setTimeout(() => {
    if (!started) ctx?.suspend(); // unless something restarted it meanwhile
  }, seconds * 1000 + 200);
}

/**
 * Duck music + ambience (film-mix style) so a key moment cuts through.
 * amount in dB (negative), hold in seconds.
 */
export function duck(amountDb = -7, hold = 1.2) {
  if (!ctx || !buses) return;
  const t = ctx.currentTime;
  const k = Math.pow(10, amountDb / 20);
  (["music", "amb"] as Bus[]).forEach((b) => {
    const g = buses![b].gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(BUS_LEVEL[b] * k, t + 0.06);
    g.setValueAtTime(BUS_LEVEL[b] * k, t + hold);
    g.linearRampToValueAtTime(BUS_LEVEL[b], t + hold + 1.4);
  });
}

export function bus(b: Bus): GainNode {
  return buses![b];
}

/**
 * Output chain for one sound: returns the node to connect the source into.
 * pan -1..1, vol 0..1, wet = reverb send amount, far = muffled & distant.
 */
export function out(b: Bus, opts: { pan?: number; vol?: number; wet?: number; far?: boolean } = {}): AudioNode {
  const c = ctx!;
  const g = c.createGain();
  g.gain.value = opts.vol ?? 1;
  const p = c.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, opts.pan ?? 0));
  let head: AudioNode = g;
  if (opts.far) {
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 850;
    lp.connect(g);
    head = lp;
  }
  g.connect(p);
  p.connect(buses![b]);
  if (opts.wet && reverbIn) {
    const s = c.createGain();
    s.gain.value = opts.wet;
    p.connect(s);
    s.connect(reverbIn);
  }
  return head;
}

/** A looping noise source started at `when`, stopped after `dur` (if given). */
export function noise(when: number, dur?: number, kind: "white" | "brown" = "white"): AudioBufferSourceNode {
  const c = ctx!;
  const s = c.createBufferSource();
  s.buffer = kind === "white" ? white! : brown!;
  s.loop = true;
  s.start(when, Math.random() * 2);
  if (dur !== undefined) s.stop(when + dur);
  return s;
}

// ---------- optional real recordings ----------

// which recordings exist (generated at build time by scripts/sound-manifest.mjs)
let manifest: Promise<Set<string>> | null = null;
function available(): Promise<Set<string>> {
  if (!manifest) {
    manifest = fetch("/sounds/diwali/manifest.json")
      .then((r) => (r.ok ? r.json() : { files: [] }))
      .then((m) => new Set<string>(m.files || []))
      .catch(() => new Set<string>());
  }
  return manifest;
}

export async function loadFile(key: string) {
  if (files[key] !== undefined || !ctx) return;
  files[key] = null;
  if (!(await available()).has(key)) return; // not recorded → synthesize, no 404
  try {
    const res = await fetch(`/sounds/diwali/${key}.mp3`);
    if (!res.ok) return;
    files[key] = await ctx.decodeAudioData(await res.arrayBuffer());
  } catch {
    files[key] = null;
  }
}
export function fileBuffer(key: string): AudioBuffer | null {
  return files[key] || null;
}

/** Play a recording if present. Returns false if not available (caller synthesizes). */
export function playFile(
  key: string,
  b: Bus,
  when: number,
  opts: { pan?: number; vol?: number; wet?: number; far?: boolean; rate?: number } = {}
): boolean {
  const buf = files[key];
  if (!buf || !ctx) return false;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = opts.rate ?? 0.94 + Math.random() * 0.12;
  src.connect(out(b, opts));
  src.start(when);
  return true;
}
