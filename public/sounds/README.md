# Diwali sound design

Everything you hear is **synthesized live in the browser** — the app ships
with zero audio files and still has a full score, ambience and effects.
Any file you drop into `public/sounds/diwali/` replaces its synthesized
counterpart automatically (no code changes).

## How the mix is built

| Layer | What it is | When |
|---|---|---|
| **Ambience** | crickets (4 voices, panned), night air, distant festival murmur, neighbourhood crackers | continuous from the first tap; crackers get busier each act |
| **Music** | generative Raag Yaman score: tanpura drone, santoor phrases, tabla (keherwa), warm pad | changes every act: intro → spread → rangoli → fireworks → wish |
| **Effects** | match strike, flame catch, diya ignite wave, lights-on shimmer, rangoli sweep, lantern riser/release, rockets, booms, crackle, ladi, anar hiss, UI tap | on story events |

Mixing: separate music / ambience / effects buses, a generated courtyard
reverb, ducking (music dips when the match strikes), a glue compressor, a
limiter and a soft clipper with a −1 dBFS ceiling — it cannot clip.

## Drop-in file names (all optional, `.mp3`)

**Music** (looped, crossfaded per act — replaces the synthesized score for that act)
`m-intro` · `m-spread` · `m-rangoli` · `m-fireworks` · `m-wish`

**Ambience** (looped — replaces crickets/air/murmur; crackers still play)
`ambience`

**Effects**
`match-strike` · `flame-catch` · `ignite` · `lights-on` · `begin-bell` ·
`rangoli-sweep` · `lantern-riser` · `lantern-release` · `tap` ·
`whistle` · `boom` · `crackle` · `hiss`

Suggested lengths: music loops 24 s (or any multiple of a bar), ambience
30–60 s seamless loop, effects 0.5–3 s. Keep effects under ~150 KB.

## Free (CC0 / royalty-free) sources
- Pixabay — https://pixabay.com/sound-effects/ and https://pixabay.com/music/
- Freesound — https://freesound.org (filter licence: Creative Commons 0)
- Mixkit — https://mixkit.co/free-sound-effects/

Only add audio you have the right to use.

## Mobile notes
- Audio starts on the first tap (browsers require a user gesture); the tap
  is handled on touch *release*, which is what iOS/Android require.
- iPhone: the app requests the "playback" audio session where supported, so
  sound plays even with the ring/silent switch on silent.
- Audio pauses automatically when the tab goes to the background.
