"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import Experience from "./Experience";
import { SPREAD_DURATION } from "./scene/DiyaField";
import type { Festival } from "@/lib/festivals";
import type { WishData } from "@/lib/token";
import {
  startExperienceAudio,
  stopExperienceAudio,
  setStoryScene,
  setMuted as setEngineMuted,
  matchStrike,
  flameCatch,
  lightsOn,
  rangoliSweep,
  lanternRelease,
  lanternRiser,
  playLadi,
  uiTap,
} from "@/lib/sound";

/*
 * STORY TIMELINE (seconds after the first tap)
 *   0.00  match strike — sparks at the wick
 *   0.38  flame catches — flare, embers, light bloom        (music: intro)
 *   1.25  wave of diyas spreads out across the courtyard   (music: spread)
 *   2.30  camera pulls back to the haveli
 *   ~4.2  windows + jhalar lights switch on
 *   then  "Tap here" → rangoli (music: rangoli) → lanterns → finale
 *         (music: fireworks) → message card (music: wish)
 */
const T_CATCH = 380;
const T_SPREAD = 1250;
const T_PULLBACK = 2300;
const T_HOUSE = T_SPREAD + SPREAD_DURATION * 1000 + 200;

function useViewport() {
  const [vp, setVp] = useState({ w: 400, h: 800 });
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    on();
    window.addEventListener("resize", on);
    window.addEventListener("orientationchange", on);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("orientationchange", on);
    };
  }, []);
  return vp;
}

function isLowPower() {
  if (typeof navigator === "undefined") return false;
  const cores = navigator.hardwareConcurrency ?? 8;
  const mem = (navigator as any).deviceMemory ?? 8;
  return cores <= 4 || mem <= 3;
}

export default function WishClient({ festival, data }: { festival: Festival; data: WishData }) {
  const router = useRouter();
  const [act, setAct] = useState(0);
  const [striking, setStriking] = useState(false);
  const [lit, setLit] = useState(false);
  const [spread, setSpread] = useState(false);
  const [houseLit, setHouseLit] = useState(false);
  const [canContinue, setCanContinue] = useState(false);
  const [interactSignal, setInteractSignal] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cardShown, setCardShown] = useState(false);
  const [dpr, setDpr] = useState(1.5);
  const [lowPower] = useState(isLowPower);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const vp = useViewport();
  const compact = vp.h < 520 && vp.w > vp.h; // phone in landscape

  // finale greeting: "Happy Diwali" + "from <sender>" when the sender gave their name
  const fromLine = data.s ? `from ${data.s}` : "";
  const accent = festival.theme.accent;

  const at = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // lock the page for an immersive, app-like feel on phones
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("immersive");
    return () => {
      html.classList.remove("immersive");
      clearTimers();
      stopExperienceAudio();
    };
  }, []);

  useEffect(() => setEngineMuted(muted), [muted]);

  // finale → message card → softer "wish" music
  useEffect(() => {
    if (act !== 3) {
      setCardShown(false);
      return;
    }
    const id = setTimeout(() => {
      setCardShown(true);
      setStoryScene("wish");
    }, 3200);
    return () => clearTimeout(id);
  }, [act]);

  const ignite = useCallback(() => {
    if (lit || striking) return;
    startExperienceAudio(); // inside the gesture: unlocks audio on iOS/Android
    matchStrike();
    setStriking(true);
    at(T_CATCH, () => {
      setLit(true);
      setStriking(false);
      flameCatch();
    });
    at(T_SPREAD, () => {
      setSpread(true);
      setStoryScene("spread");
    });
    at(T_PULLBACK, () => setAct(1));
    at(T_HOUSE, () => {
      setHouseLit(true);
      lightsOn();
    });
    at(T_HOUSE + 700, () => setCanContinue(true));
  }, [lit, striking]);

  const onTapLayer = useCallback(() => {
    if (act === 0) ignite();
    else if (act === 2) {
      startExperienceAudio();
      if (interactSignal === 0) lanternRiser();
      lanternRelease(Math.random() * 0.6 - 0.3);
      setInteractSignal((n) => n + 1);
    }
  }, [act, ignite, interactSignal]);

  const goRangoli = () => {
    uiTap();
    setAct(2);
    setStoryScene("rangoli");
    rangoliSweep();
  };

  const goFinale = () => {
    uiTap();
    setAct(3);
    setStoryScene("fireworks");
    at(200, () => playLadi(-0.6, 40));
    at(900, () => playLadi(0.6, 34));
  };

  const replay = () => {
    uiTap();
    clearTimers();
    setInteractSignal(0);
    setStriking(false);
    setLit(false);
    setSpread(false);
    setHouseLit(false);
    setCanContinue(false);
    setAct(0);
    setStoryScene("intro");
  };

  const hint =
    act === 0 && !lit && !striking ? festival.hints.ignite : act === 2 && interactSignal === 0 ? festival.hints.interact : "";

  const safeTop = "max(14px, env(safe-area-inset-top))";
  const safeBottom = (px: number) => `calc(env(safe-area-inset-bottom) + ${px}px)`;

  return (
    <div
      className="fixed inset-0 overflow-hidden select-none"
      style={{ background: festival.theme.skyTop, touchAction: "none", WebkitTouchCallout: "none" } as React.CSSProperties}
    >
      <Canvas
        shadows={!lowPower}
        dpr={[1, dpr]}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        camera={{ fov: 50, position: [0, 1.5, 3], near: 0.1, far: 120 }}
      >
        {/* drop resolution on struggling devices, raise it when there is headroom */}
        <PerformanceMonitor
          bounds={() => [40, 58]}
          onIncline={() => setDpr(lowPower ? 1.5 : 2)}
          onDecline={() => setDpr(1)}
          flipflops={3}
          onFallback={() => setDpr(1)}
        />
        <Suspense fallback={null}>
          <Experience
            festival={festival}
            greeting={festival.greeting}
            fromLine={fromLine}
            act={act}
            lit={lit}
            striking={striking}
            spread={spread}
            houseLit={houseLit}
            interactSignal={interactSignal}
            onTapCenter={onTapLayer}
            quality={lowPower ? "low" : "high"}
          />
        </Suspense>
      </Canvas>

      {/* tap-anywhere layer. pointer-UP: mobile browsers only unlock audio on touch release */}
      {((act === 0 && !lit && !striking) || act === 2) && (
        <div className="absolute inset-0" onPointerUp={onTapLayer} style={{ cursor: "pointer" }} />
      )}

      {/* top bar */}
      <div
        className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pointer-events-none"
        style={{ paddingTop: safeTop }}
      >
        <div className="text-sm font-semibold tracking-wide opacity-80" style={{ color: festival.theme.text }}>
          {festival.emoji} {festival.name}
        </div>
        <button
          onClick={() => {
            setMuted((m) => !m);
          }}
          className="pointer-events-auto w-11 h-11 rounded-full grid place-items-center text-lg backdrop-blur"
          style={{ background: "rgba(0,0,0,.35)", color: festival.theme.text }}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      {act === 0 && !lit && (
        <div className="absolute inset-x-0 text-center pointer-events-none px-6" style={{ top: `calc(${safeTop} + 52px)` }}>
          <p className="text-[13px] sm:text-sm opacity-75 leading-snug" style={{ color: festival.theme.text }}>
            {data.s ? `${data.s} sent you a Diwali gift` : "You have a Diwali gift"}
            <br />
            <span className="opacity-80">best with sound on 🔊</span>
          </p>
        </div>
      )}

      {hint && (
        <div
          className="absolute inset-x-0 flex justify-center pointer-events-none px-6"
          style={{ bottom: safeBottom(compact ? 18 : 96) }}
        >
          <div
            className="animate-pulse-soft rounded-full px-5 py-3 text-[15px] font-semibold shadow-lg text-center"
            style={{ background: accent, color: "#1a1206", boxShadow: `0 0 30px ${accent}88` }}
          >
            👆 {hint}
          </div>
        </div>
      )}

      {act === 1 && canContinue && (
        <BottomButton color={accent} onClick={goRangoli} bottom={safeBottom(compact ? 16 : 36)}>
          Tap here ✨
        </BottomButton>
      )}
      {act === 2 && interactSignal > 0 && (
        <BottomButton color={accent} onClick={goFinale} bottom={safeBottom(compact ? 16 : 36)}>
          Light up the sky 🎆
        </BottomButton>
      )}

      {act === 3 && (
        <div
          className={`absolute inset-x-0 bottom-0 px-4 flex pointer-events-none transition-all duration-1000 ${
            compact ? "flex-row items-end justify-center gap-3" : "flex-col items-center gap-3"
          }`}
          style={{
            paddingBottom: safeBottom(compact ? 12 : 24),
            opacity: cardShown ? 1 : 0,
            transform: cardShown ? "none" : "translateY(16px)",
          }}
        >
          {data.m && (
            <div
              className={`pointer-events-auto text-center rounded-2xl px-5 py-3 backdrop-blur-md ${compact ? "max-w-[46%]" : "w-full max-w-sm"}`}
              style={{ background: "rgba(10,6,4,.4)", color: festival.theme.text, border: "1px solid rgba(255,190,110,.18)" }}
            >
              {data.t && <p className="text-[11px] uppercase tracking-widest opacity-60 mb-1">for {data.t}</p>}
              <p className={`italic leading-relaxed ${compact ? "text-sm line-clamp-2" : "text-[15px]"}`}>“{data.m}”</p>
              {data.s && <p className="mt-1.5 text-sm opacity-80">— {data.s}</p>}
            </div>
          )}
          <div className={`flex flex-col items-center gap-2 ${compact ? "w-[46%] max-w-xs" : "w-full max-w-sm"}`}>
            <button
              onClick={() => {
                uiTap();
                router.push("/");
              }}
              className="pointer-events-auto w-full rounded-full py-4 font-bold text-[17px] shadow-lg active:scale-[0.98] transition"
              style={{ background: accent, color: "#1a1206", boxShadow: `0 0 40px ${accent}66` }}
            >
              ↗ Add your name & share
            </button>
            <button onClick={replay} className="pointer-events-auto text-sm opacity-80 py-2 px-4" style={{ color: festival.theme.text }}>
              Watch again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BottomButton({
  children,
  color,
  onClick,
  bottom,
}: {
  children: React.ReactNode;
  color: string;
  onClick: () => void;
  bottom: string;
}) {
  return (
    <div className="absolute inset-x-0 flex justify-center px-6" style={{ bottom }}>
      <button
        onClick={onClick}
        className="rounded-full px-10 py-4 font-bold text-lg shadow-lg active:scale-95 transition animate-[fadeUp_.6s_ease-out]"
        style={{ background: color, color: "#1a1206", boxShadow: `0 0 34px ${color}88` }}
      >
        {children}
      </button>
    </div>
  );
}
