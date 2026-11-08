# ✦ Festive — a 3D Diwali wish that opens like a gift

Send a Diwali wish as a link. When it opens, a cinematic 3D night plays out:
tap to light the diya, the camera pulls back to a haveli glowing with diyas and
jhalar lights, release sky lanterns over the rangoli, and the finale fills the
sky with fireworks while the greeting and name appear in sparkler text — with
real-sounding crackers, booms and whistles.

Built with **Next.js 14 + React Three Fiber + Three.js + postprocessing**,
deployable to **Vercel** with zero configuration.

## The experience
1. **Ignite** — tap anywhere to light the diya (temple bell); the camera holds on the flame.
2. **Reveal** — pull back to the haveli: arched windows glow, jhalar lights chase, diyas line the steps and walls; distant crackers start in the neighbourhood.
3. **Interact** — over the rangoli, tap to release sky lanterns.
4. **Finale** — a cracker ladi kicks off a full fireworks show (peony, gold willow, ring, crackling, two-tone), anar fountains, smoke haze, and the sparkler greeting.

## What makes it look and sound real
- **Bloom post-processing** + ACES tone mapping: flames, bulbs, windows and sparks are HDR, so they genuinely glow.
- **Every burst flashes a real light** that illuminates the house and courtyard in the firework's colour.
- **Shadows** cast by the hero diya's flame; glossy tiled floor reflects the diyas.
- **Synthesized cracker audio** (Web Audio): rocket whistles, chest-thump booms, crackle, ladi, anar hiss, temple bell — stereo-panned, distance-delayed, with neighbourhood ambience. Real recordings override it (see `public/sounds/README.md`).
- **Responsive camera**: on portrait phones it pulls back and widens so every shot frames properly.

## Routes

| Route                | What it is                                            |
|----------------------|-------------------------------------------------------|
| `/`                  | Festival picker                                       |
| `/create/[festival]` | Add recipient, sender, message → get a share link     |
| `/w/[token]`         | The 3D animated wish (token = the encoded wish)       |
| `/api/og/[token]`    | Dynamic share-preview image (WhatsApp/iMessage/X)     |

The whole wish is encoded in the URL token (festival, recipient, sender,
message) — the same idea as the original app's `/w/QW1hbg` ("Aman"), extended to
carry everything. No database needed.

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Deploy to Vercel

```bash
npm i -g vercel      # if you don't have it
vercel               # follow the prompts, or:
# push to GitHub and "Import Project" on vercel.com
```

No environment variables are required. The dynamic OG image route runs on the
Edge runtime, which Vercel handles automatically.

---

## Add a new festival (one file)

Open `lib/festivals.ts` and append one object to the `FESTIVALS` array:

```ts
{
  id: "ganesh",
  name: "Ganesh Chaturthi",
  emoji: "🪔",
  tag: "Vighnaharta",
  greeting: "Ganpati Bappa Morya",
  greetingAlt: "Ganpati Bappa Morya",
  wish: "May Bappa remove every obstacle...",
  acts: ["ignite", "reveal", "interact", "finale"],
  hints: { ignite: "Tap the lamp to begin", interact: "Tap to offer modak" },
  theme: { skyTop: "#...", skyBottom: "#...", ground: "#...",
           accent: "#...", accent2: "#...", text: "#fff" },
  scene: {
    diyaCount: 20,
    fairyLightColors: ["#...", "#..."],
    lanternColor: "#...",
    fireworkColors: ["#...", "#..."],
    rangoliPalette: ["#...", "#..."],
    igniteObject: "lamp",        // "diya" | "colorPot" | "lamp"
  },
}
```

That's it — it appears in the picker, create flow, 3D scene and share image.

## Add real recordings

See `public/sounds/README.md`. Everything is synthesized by default; drop
`bell / whistle / boom / crackle / hiss .mp3` into `public/sounds/diwali/` to
replace any of them.

## Upgrade the 3D models (optional, for max fidelity)

The haveli, diyas and lamp are built procedurally from primitives so the app
runs with zero assets. To match a studio-quality look, add GLB models:

1. Put a model at `public/models/haveli.glb`.
2. In `components/scene/Haveli.tsx`, replace the primitive body with:
   ```tsx
   import { useGLTF } from "@react-three/drei";
   useGLTF.preload("/models/haveli.glb");
   export default function Haveli() {
     const { scene } = useGLTF("/models/haveli.glb");
     return <primitive object={scene} position={[0, 0, -4]} />;
   }
   ```
   Do the same pattern for diyas / lamps if you commission custom models.

Free/affordable model sources: Sketchfab (filter "Downloadable" + CC licences),
Poly Pizza (CC0), Quaternius. Keep GLBs small (draco-compressed) for fast loads.

## Project structure

```
app/
  page.tsx                 picker
  create/[festival]/       create flow
  w/[token]/               wish page (+ metadata for share preview)
  api/og/[token]/          dynamic OG image (edge)
components/
  WishView / WishClient    client loader + overlay/state machine
  Experience.tsx           assembles the scene from festival config
  scene/                   Diya, Haveli, FairyLights, Rangoli, SkyLanterns,
                           Fireworks, ColorBurst, SparklerText, CameraRig, ...
lib/
  festivals.ts             ← the template registry (edit this to add festivals)
  token.ts                 URL encode/decode of the wish
  sound.ts                 audio layer (real files + synth fallback)
public/sounds/             drop audio here
```

## Performance notes

- Particle systems reuse fixed buffers; dead particles go transparent rather
  than reallocating.
- Point lights are limited (one on the central flame) to stay within WebGL
  limits; everything else uses emissive materials + additive glow.
- The scene loads client-side only (`ssr: false`) with a branded splash.
