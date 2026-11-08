"use client";

import { Stars } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { GradientSky, Ground, Courtyard, Skyline } from "./scene/Environment";
import CameraRig, { CamKey } from "./scene/CameraRig";
import CenterObject from "./scene/CenterObject";
import DiyaField from "./scene/DiyaField";
import Haveli from "./scene/Haveli";
import FairyLights from "./scene/FairyLights";
import Rangoli from "./scene/Rangoli";
import SkyLanterns from "./scene/SkyLanterns";
import Fireworks from "./scene/Fireworks";
import Anar from "./scene/Anar";
import SparklerText from "./scene/SparklerText";
import type { Festival } from "@/lib/festivals";

const CAMERA_KEYS: CamKey[] = [
  { pos: [0.1, 1.55, 2.75], look: [0, 0.3, 0.75] }, // ignite — close on the diya
  { pos: [0, 2.2, 10.5], look: [0, 2.1, -3] }, // reveal — the lit haveli
  { pos: [0, 3.6, 5.4], look: [0, 0.3, 0.3] }, // interact — over the rangoli
  { pos: [0, 2.2, 13], look: [0, 4.0, -5] }, // finale — sky full of fireworks
];

export default function Experience({
  festival,
  greeting,
  fromLine,
  act,
  lit,
  striking,
  spread,
  houseLit,
  interactSignal,
  onTapCenter,
  quality = "high",
}: {
  festival: Festival;
  greeting: string;
  fromLine: string;
  act: number;
  lit: boolean;
  striking: boolean;
  spread: boolean;
  houseLit: boolean;
  interactSignal: number;
  onTapCenter: () => void;
  quality?: "high" | "low";
}) {
  const t = festival.theme;
  const s = festival.scene;
  const finale = act >= 3;

  return (
    <>
      <GradientSky top={t.skyTop} bottom={t.skyBottom} />
      <Stars radius={30} depth={8} count={2200} factor={2.2} saturation={0} fade speed={0.6} />
      <fog attach="fog" args={[t.skyBottom, 16, 50]} />
      <CameraRig act={act} keys={CAMERA_KEYS} />

      {/* lighting: cool moonlight + warm festive sources */}
      <ambientLight intensity={houseLit ? 0.16 : 0.08} color="#6f7fb0" />
      <hemisphereLight args={["#2a3560", "#3a2418", houseLit ? 0.35 : spread ? 0.24 : 0.16]} />
      <directionalLight position={[-6, 10, 4]} intensity={0.35} color="#9fb4ff" />

      <Ground color={t.ground} />
      <Skyline />
      <Courtyard />
      <Haveli lit={houseLit} />
      {houseLit && <FairyLights colors={s.fairyLightColors} />}
      {s.diyaCount > 0 && <DiyaField count={s.diyaCount} spread={spread} flameColor={t.accent} />}
      <Rangoli palette={s.rangoliPalette} visible={act >= 2} />

      <CenterObject
        kind={s.igniteObject}
        lit={lit}
        accent={t.accent}
        onTap={onTapCenter}
        tappable={(act === 0 && !lit) || act === 2}
        striking={striking}
      />

      {/* sky lanterns after the first release */}
      <SkyLanterns color={s.lanternColor} active={interactSignal > 0 || finale} />

      {/* anar fountains in the finale */}
      <Anar position={[-1.7, 0, 2.0]} active={finale} />
      <Anar position={[1.7, 0, 2.0]} active={finale} />

      {/* distant neighbourhood fireworks after reveal, full show in finale */}
      <Fireworks colors={s.fireworkColors} mode={finale ? 2 : houseLit ? 1 : 0} />

      {finale && <SparklerText lines={fromLine ? [greeting, fromLine] : [greeting]} color={t.accent} y={6.9} />}

      {/* proper light: bloom picks up everything brighter than 1.0 (HDR) */}
      <EffectComposer multisampling={quality === "high" ? 4 : 0}>
        <Bloom mipmapBlur intensity={1.35} luminanceThreshold={0.85} luminanceSmoothing={0.25} radius={0.78} />
        <Vignette eskil={false} offset={0.2} darkness={0.75} />
      </EffectComposer>
    </>
  );
}
