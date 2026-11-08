/**
 * SOUND EFFECTS — all synthesized; any matching /sounds/diwali/<key>.mp3
 * replaces the synthesized version (keys noted on each function).
 */

import { getCtx, ready, out, noise, playFile, loadFile, duck } from "./engine";
import { bell, musicFreq, YAMAN } from "./music";

const FILE_KEYS = [
  "begin-bell", "match-strike", "flame-catch", "ignite", "lights-on",
  "rangoli-sweep", "lantern-riser", "lantern-release", "tap",
  "whistle", "boom", "crackle", "hiss",
];
export function preloadSfx() {
  FILE_KEYS.forEach(loadFile);
}

// ============ DIYA IGNITION ============

/** key: match-strike — scrape of match head, sputter, then sulphur fizz. */
export function matchStrike(pan = -0.15) {
  if (!ready()) return;
  duck(-9, 1.6); // clear space: the whole world holds its breath for the match
  const c = getCtx()!;
  const t = c.currentTime + 0.01;
  if (playFile("match-strike", "sfx", t, { pan, vol: 0.9, wet: 0.12 })) return;
  const dest = out("sfx", { pan, wet: 0.12 });

  // 1. scrape: grainy band-passed noise sweeping up
  const s = noise(t, 0.24);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 1.4;
  bp.frequency.setValueAtTime(1700, t);
  bp.frequency.exponentialRampToValueAtTime(4200, t + 0.2);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  for (let k = 0; k < 24; k++) {
    // irregular grain = the rough striker strip
    g.gain.setValueAtTime(0.15 + Math.random() * 0.55, t + k * 0.009);
  }
  g.gain.linearRampToValueAtTime(0, t + 0.23);
  s.connect(bp);
  bp.connect(g);
  g.connect(dest);

  // 2. ignition pop + fizz
  const t2 = t + 0.19;
  const p = noise(t2, 0.7);
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2400;
  const pg = c.createGain();
  pg.gain.setValueAtTime(0.75, t2);
  pg.gain.exponentialRampToValueAtTime(0.18, t2 + 0.12);
  pg.gain.exponentialRampToValueAtTime(0.001, t2 + 0.7);
  p.connect(hp);
  hp.connect(pg);
  pg.connect(dest);

  // 3. sputter crackles
  for (let i = 0; i < 9; i++) {
    const tt = t2 + 0.05 + Math.random() * 0.5;
    const n = noise(tt, 0.02);
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 3000 + Math.random() * 4000;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.35 * Math.random() + 0.1, tt);
    ng.gain.exponentialRampToValueAtTime(0.001, tt + 0.018);
    n.connect(f);
    f.connect(ng);
    ng.connect(dest);
  }
}

/** key: flame-catch — the wick catches with a soft "fwoomp" and settles to a breathing flame. */
export function flameCatch(pan = -0.1) {
  if (!ready()) return;
  const c = getCtx()!;
  const t = c.currentTime + 0.01;
  if (playFile("flame-catch", "sfx", t, { pan, vol: 1, wet: 0.3 })) return;
  const dest = out("sfx", { pan, wet: 0.3 });

  // fwoomp: low-passed noise that opens up then closes
  const n = noise(t, 1.6);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.Q.value = 2.2;
  lp.frequency.setValueAtTime(180, t);
  lp.frequency.exponentialRampToValueAtTime(2600, t + 0.16);
  lp.frequency.exponentialRampToValueAtTime(380, t + 1.2);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.95, t + 0.07);
  g.gain.exponentialRampToValueAtTime(0.06, t + 1.1);
  g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
  n.connect(lp);
  lp.connect(g);
  g.connect(dest);

  // body thump
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(95, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.35);
  const og = c.createGain();
  og.gain.setValueAtTime(0, t);
  og.gain.linearRampToValueAtTime(0.5, t + 0.02);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  o.connect(og);
  og.connect(dest);
  o.start(t);
  o.stop(t + 0.5);

  // the flame then "breathes" with a few soft wick crackles
  for (let i = 0; i < 6; i++) {
    const tt = t + 0.5 + Math.random() * 1.8;
    const p = noise(tt, 0.03);
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 1800 + Math.random() * 2500;
    const pg = c.createGain();
    pg.gain.setValueAtTime(0.12 + Math.random() * 0.12, tt);
    pg.gain.exponentialRampToValueAtTime(0.001, tt + 0.03);
    p.connect(f);
    f.connect(pg);
    pg.connect(dest);
  }

  // a warm bell bloom under it — the moment the festival "begins"
  bell(t + 0.12, 560, 0.16, 0);
}

/** key: ignite — one of the surrounding diyas catching (short "fft"). */
export function igniteTick(pan = 0, vol = 0.45) {
  if (!ready()) return;
  const c = getCtx()!;
  const t = c.currentTime + Math.random() * 0.02;
  if (playFile("ignite", "sfx", t, { pan, vol, wet: 0.25, rate: 0.85 + Math.random() * 0.3 })) return;
  const dest = out("sfx", { pan, vol, wet: 0.25 });
  const n = noise(t, 0.35);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 1.6;
  const fc = 900 + Math.random() * 900;
  bp.frequency.setValueAtTime(fc * 0.6, t);
  bp.frequency.exponentialRampToValueAtTime(fc * 1.8, t + 0.08);
  bp.frequency.exponentialRampToValueAtTime(fc * 0.7, t + 0.33);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.6, t + 0.025);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.33);
  n.connect(bp);
  bp.connect(g);
  g.connect(dest);
  // tiny pitched glint so the wave of diyas feels musical
  const deg = YAMAN[Math.floor(Math.random() * YAMAN.length)];
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.value = musicFreq(24 + deg);
  const og = c.createGain();
  og.gain.setValueAtTime(0, t);
  og.gain.linearRampToValueAtTime(0.05, t + 0.01);
  og.gain.exponentialRampToValueAtTime(0.0005, t + 0.5);
  o.connect(og);
  og.connect(dest);
  o.start(t);
  o.stop(t + 0.55);
}

/** key: lights-on — windows and jhalar switch on: a rising santoor-like shimmer. */
export function lightsOn() {
  if (!ready()) return;
  const c = getCtx()!;
  const t = c.currentTime + 0.02;
  if (playFile("lights-on", "sfx", t, { vol: 0.8, wet: 0.5 })) return;
  const dest = out("sfx", { wet: 0.6, vol: 0.9 });
  const notes = [12, 14, 16, 18, 19, 21, 23, 24, 26, 28, 30, 31];
  notes.forEach((semi, i) => {
    const tt = t + i * 0.055;
    const o = c.createOscillator();
    o.type = "triangle";
    o.frequency.value = musicFreq(semi + 12);
    const g = c.createGain();
    g.gain.setValueAtTime(0, tt);
    g.gain.linearRampToValueAtTime(0.06, tt + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0005, tt + 1.4);
    const p = c.createStereoPanner();
    p.pan.value = -0.7 + (i / notes.length) * 1.4;
    o.connect(g);
    g.connect(p);
    p.connect(dest);
    o.start(tt);
    o.stop(tt + 1.5);
  });
}

/** key: rangoli-sweep — airy shimmer as the camera glides over the rangoli. */
export function rangoliSweep() {
  if (!ready()) return;
  const c = getCtx()!;
  const t = c.currentTime + 0.02;
  if (playFile("rangoli-sweep", "sfx", t, { vol: 0.7, wet: 0.4 })) return;
  const dest = out("sfx", { wet: 0.55, vol: 0.8 });
  const n = noise(t, 3.2);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 3;
  bp.frequency.setValueAtTime(500, t);
  bp.frequency.exponentialRampToValueAtTime(5500, t + 2.2);
  bp.frequency.exponentialRampToValueAtTime(2500, t + 3.2);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.16, t + 1.2);
  g.gain.linearRampToValueAtTime(0, t + 3.2);
  n.connect(bp);
  bp.connect(g);
  g.connect(dest);
  [0, 2, 4, 7, 9].forEach((d, i) => bell(t + 0.4 + i * 0.32, musicFreq(24 + d) / 2.32, 0.05, -0.5 + i * 0.25));
}

/** key: lantern-riser — a swelling tone as the lantern lifts. */
export function lanternRiser() {
  if (!ready()) return;
  const c = getCtx()!;
  const t = c.currentTime + 0.02;
  if (playFile("lantern-riser", "sfx", t, { vol: 0.7, wet: 0.5 })) return;
  const dest = out("sfx", { wet: 0.6, vol: 0.7 });
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(300, t);
  lp.frequency.exponentialRampToValueAtTime(3200, t + 3.2);
  lp.connect(dest);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.14, t + 2.8);
  g.gain.linearRampToValueAtTime(0, t + 4.2);
  g.connect(lp);
  [12, 19, 24].forEach((semi, i) => {
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(musicFreq(semi) * 0.985, t);
    o.frequency.linearRampToValueAtTime(musicFreq(semi), t + 3);
    o.detune.value = i * 4 - 4;
    o.connect(g);
    o.start(t);
    o.stop(t + 4.3);
  });
}

/** key: lantern-release — soft whoosh of warm air + a chime. */
export function lanternRelease(pan = 0) {
  if (!ready()) return;
  const c = getCtx()!;
  const t = c.currentTime + 0.01;
  if (playFile("lantern-release", "sfx", t, { pan, vol: 0.8, wet: 0.4 })) return;
  const dest = out("sfx", { pan, wet: 0.35 });
  const n = noise(t, 1.4);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(350, t);
  bp.frequency.exponentialRampToValueAtTime(1500, t + 0.6);
  bp.frequency.exponentialRampToValueAtTime(500, t + 1.4);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.22, t + 0.4);
  g.gain.linearRampToValueAtTime(0, t + 1.4);
  n.connect(bp);
  bp.connect(g);
  g.connect(dest);
  bell(t + 0.25, musicFreq(24 + [0, 4, 7][Math.floor(Math.random() * 3)]) / 2.32, 0.09, pan);
}

/** key: tap — soft wooden UI click. */
export function uiTap() {
  if (!ready()) return;
  const c = getCtx()!;
  const t = c.currentTime;
  if (playFile("tap", "sfx", t, { vol: 0.5 })) return;
  const dest = out("sfx", { vol: 0.5, wet: 0.1 });
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(1100, t);
  o.frequency.exponentialRampToValueAtTime(520, t + 0.05);
  const g = c.createGain();
  g.gain.setValueAtTime(0.25, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  o.connect(g);
  g.connect(dest);
  o.start(t);
  o.stop(t + 0.08);
}

/** key: begin-bell */
export function beginBell() {
  if (!ready()) return;
  const c = getCtx()!;
  if (playFile("begin-bell", "sfx", c.currentTime, { vol: 0.8, wet: 0.5 })) return;
  bell(c.currentTime + 0.02, 620, 0.2, 0, out("sfx", { wet: 0.55 }));
}

// ============ FIRECRACKERS ============

/** key: whistle — rocket launch. */
export function playWhistle(pan = 0, duration = 1.1) {
  if (!ready()) return;
  const c = getCtx()!;
  const t = c.currentTime;
  if (playFile("whistle", "sfx", t, { pan, vol: 0.6, wet: 0.2 })) return;
  const dest = out("sfx", { pan, wet: 0.2 });
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(700 + Math.random() * 200, t);
  o.frequency.exponentialRampToValueAtTime(2200 + Math.random() * 600, t + duration);
  const vib = c.createOscillator();
  vib.frequency.value = 18;
  const vibG = c.createGain();
  vibG.gain.value = 25;
  vib.connect(vibG);
  vibG.connect(o.frequency);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.06, t + 0.08);
  g.gain.setValueAtTime(0.06, t + duration * 0.8);
  g.gain.linearRampToValueAtTime(0, t + duration);
  o.connect(g);
  g.connect(dest);
  o.start(t);
  vib.start(t);
  o.stop(t + duration + 0.05);
  vib.stop(t + duration + 0.05);
  const n = noise(t, duration);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(1500, t);
  bp.frequency.exponentialRampToValueAtTime(5000, t + duration);
  bp.Q.value = 1.2;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0, t);
  ng.gain.linearRampToValueAtTime(0.05, t + 0.1);
  ng.gain.linearRampToValueAtTime(0, t + duration);
  n.connect(bp);
  bp.connect(ng);
  ng.connect(dest);
}

/** key: boom — firework burst. size 0..1; delay = seconds after the flash. */
export function playBoom(pan = 0, size = 0.7, delay = 0.08, vol = 1, far = false) {
  if (!ready()) return;
  const c = getCtx()!;
  const t = c.currentTime + delay;
  const wet = far ? 0.6 : 0.35; // booms echo off the town
  if (playFile("boom", "sfx", t, { pan, vol: (0.6 + size * 0.5) * vol, wet, far })) return;
  const dest = out("sfx", { pan, vol, wet, far });

  const cr = noise(t, 0.05);
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2000;
  const cg = c.createGain();
  cg.gain.setValueAtTime(0.9 * (0.6 + size * 0.4), t);
  cg.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  cr.connect(hp);
  hp.connect(cg);
  cg.connect(dest);

  const len = 0.9 + size * 1.6;
  const b = noise(t, len);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(1800, t);
  lp.frequency.exponentialRampToValueAtTime(160, t + len);
  const bg = c.createGain();
  bg.gain.setValueAtTime(0.85 * (0.5 + size * 0.5), t);
  bg.gain.exponentialRampToValueAtTime(0.001, t + len);
  b.connect(lp);
  lp.connect(bg);
  bg.connect(dest);

  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(110, t);
  o.frequency.exponentialRampToValueAtTime(38, t + 0.35);
  const og = c.createGain();
  og.gain.setValueAtTime(0.9 * size * (far ? 0.2 : 1), t); // distance eats the sub-bass
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  o.connect(og);
  og.connect(dest);
  o.start(t);
  o.stop(t + 0.55);
}

/** key: crackle — crackling stars. */
export function playCrackle(pan = 0, delay = 0.4, count = 40, spread = 1.2, vol = 1, far = false) {
  if (!ready()) return;
  const c = getCtx()!;
  const t0 = c.currentTime + delay;
  if (playFile("crackle", "sfx", t0, { pan, vol: 0.7 * vol, wet: 0.3, far })) return;
  const dest = out("sfx", { pan, vol, wet: 0.3, far });
  for (let i = 0; i < count; i++) {
    const t = t0 + Math.random() * spread;
    const s = noise(t, 0.025);
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2500 + Math.random() * 4500;
    bp.Q.value = 2;
    const g = c.createGain();
    g.gain.setValueAtTime(0.25 + Math.random() * 0.45, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.02 + Math.random() * 0.02);
    s.connect(bp);
    bp.connect(g);
    g.connect(dest);
  }
}

/** Ladi (string of crackers) — rapid machine-gun pops. */
export function playLadi(pan = 0, count = 30, vol = 1, far = false) {
  if (!ready()) return;
  const c = getCtx()!;
  const dest = out("sfx", { pan, vol, wet: far ? 0.5 : 0.25, far });
  let t = c.currentTime + 0.05;
  for (let i = 0; i < count; i++) {
    t += 0.04 + Math.random() * 0.07;
    const s = noise(t, 0.06);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 3000 + Math.random() * 2000;
    const g = c.createGain();
    g.gain.setValueAtTime(0.5 + Math.random() * 0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    s.connect(lp);
    lp.connect(g);
    g.connect(dest);
  }
}

/** key: hiss — anar fountain. Returns stop(). */
export function startHiss(pan = 0): () => void {
  if (!ready()) return () => {};
  const c = getCtx()!;
  const t = c.currentTime;
  const dest = out("sfx", { pan, wet: 0.15 });
  const s = noise(t);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 3200;
  bp.Q.value = 0.6;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.08, t + 0.4);
  const lfo = c.createOscillator();
  lfo.frequency.value = 7;
  const lg = c.createGain();
  lg.gain.value = 0.022;
  lfo.connect(lg);
  lg.connect(g.gain);
  s.connect(bp);
  bp.connect(g);
  g.connect(dest);
  lfo.start(t);
  return () => {
    const n = c.currentTime;
    g.gain.cancelScheduledValues(n);
    g.gain.setTargetAtTime(0, n, 0.2);
    s.stop(n + 1);
    lfo.stop(n + 1);
  };
}
