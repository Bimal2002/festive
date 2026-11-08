/**
 * SOUND — public API used by the app.
 * ---------------------------------------------------------------------------
 * Layered like a film mix (see lib/audio/*):
 *   ambience  — crickets, night air, festival murmur, distant crackers
 *   music     — generative Raag Yaman score that evolves per act
 *   sfx       — ignition, lanterns, rangoli, fireworks, UI
 *
 * Everything is synthesized; drop recordings into /public/sounds/diwali/ to
 * replace any layer (see public/sounds/README.md for the file names).
 */

import { unlock, setMuted as engineMute, fadeOutAll, isStarted } from "./audio/engine";
import { startMusic, setScene, stopMusic, type Scene } from "./audio/music";
import { startAmbience, stopAmbience, setCrackerRate } from "./audio/ambience";
import { preloadSfx } from "./audio/sfx";

export * from "./audio/sfx";
export type { Scene };

/** Call from the first tap. Starts ambience + score (idempotent). */
export function startExperienceAudio() {
  const already = isStarted();
  unlock();
  if (already) return;
  preloadSfx();
  startAmbience();
  startMusic("intro");
  setCrackerRate(0.6);
}

const CRACKERS: Record<Scene, number> = { intro: 0.6, spread: 1.4, rangoli: 1.8, fireworks: 3.2, wish: 2.4 };

/** Move the score + neighbourhood activity to a story scene. */
export function setStoryScene(s: Scene) {
  setScene(s);
  setCrackerRate(CRACKERS[s]);
}

/** Leaving the page / replaying: fade everything out and stop schedulers. */
export function stopExperienceAudio() {
  stopMusic();
  stopAmbience();
  fadeOutAll(0.6);
}

export function setMuted(m: boolean) {
  engineMute(m);
}

/** Back-compat for older call sites. */
export const unlockAudio = startExperienceAudio;
