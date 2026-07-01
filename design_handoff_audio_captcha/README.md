# Handoff: Audio CAPTCHA (p5.js + p5.sound + p5.speech)

## Overview
An accessible, bot-resistant **audio CAPTCHA**. The user plays a short spoken
clip of `word number` pairs and types the number that follows each on-screen
**target word**, in order. Example:

- **Audio:** "apple nine, blue three, table five, river eight, chair one"
- **Target words (shown):** blue, river, chair
- **Correct answer:** `3 8 1`

Only the target words are on screen; the full pair list exists only in the
(scrambled) audio — so a bot must actually transcribe degraded speech to solve
it. The UI is the "Ferric" system: a dark brushed-graphite instrument plate
with an LCD oscilloscope, transport controls, and a volume knob.

## About the Design Files
The files in this bundle are **design references**, not production code:

- **`audio-captcha-p5.html`** — a **runnable, heavily-annotated p5.js scaffold**.
  It opens in any browser and works today as a visual mockup (the oscilloscope
  draws a synthetic "scrambled" wave). Every place that needs real audio is
  marked `TODO (Claude Code)`. **This is your starting point** — build the real
  audio pipeline directly on top of it, or port it into your app's framework.
- **`Audio Captcha Ferric.dc.html`** — the original interactive mockup for
  visual reference only (it depends on a proprietary preview runtime and will
  not run standalone). Use it to check pixel details; do not ship it.

Recreate this design in your target environment using its established patterns.
The requirement "everything in p5.js" is already honored by the scaffold:
p5.js for the canvas/loop, **p5.sound** for playback + FFT + DSP, **p5.speech**
for optional TTS challenge generation.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, and interactions are
final. Reproduce them exactly (all values in *Design Tokens* below and inline
in the scaffold's `:root`).

## Screen: Audio CAPTCHA card
One centered card (`max-width: 640px`), vertical stack, `padding: 28px 28px 26px`.

1. **Corner screws** ×4 — decorative, 13px radial-gradient circles at each corner (11px inset).
2. **Header row** — space-between.
   - Left: eyebrow "AUDIO CAPTCHA" (11px, 700, letter-spacing .24em, `#B3B9C1`) + subhead "Type the number that follows each target word, in order." (13px, `--ink-dim`).
   - Right: **NEW CHALLENGE** ghost button (mono 10px). Generates a fresh challenge + auto-plays.
3. **LCD oscilloscope** — dark green-black inset panel, radius 9px. Top strip: status pill (`READY` dim / `LIVE` teal + pulsing dot) on the left, "SCRAMBLED SIGNAL" tag on the right. Below: full-width `<canvas>` (height 116px) with a teal waveform + faint mid baseline.
4. **Transport row** — gap 16px.
   - **↺ Replay** round button (52px) — repeats the current clip.
   - **▶ / ❚❚ Play-Pause** big round button (66px, teal-tinted, glowing) — toggles playback; glyph swaps to two pause bars when live.
   - Spacer.
   - **Volume knob** (56px, knurled) — drag vertically to change; teal indicator sweeps −135°→+135°; `VOL nn%` label below. Louder = taller waveform.
5. **Target words strip** — inset row: label "TARGET WORDS" + teal chips, each `<b>n</b> word` (mono 13px).
6. **Answer** — label "The number after each — in order" + N digit boxes (`.box`, 62px tall, flex:1, mono 28px). Numeric only, auto-advance on entry, backspace steps back. Box count = answer length.
7. **Footer row** — status **badge** pill (dot + label) on the left, **Verify** button (teal) on the right.

## Interactions & Behavior
- **Play/pause:** toggles `playing`. First play must call `userStartAudio()` (p5) inside the click handler to satisfy the browser autoplay gate.
- **Replay:** resets animation phase + restarts the clip from 0.
- **New challenge:** regenerates pairs/targets/answer, re-renders chips + boxes, auto-plays.
- **Volume knob:** pointer drag; `Δvol = (startY − y) / 150`, clamped 0–1; calls `sound.setVolume(volume)`.
- **Digit entry:** one numeric char per box; typing advances focus; backspace on empty box retreats.
- **Verify → status states** (badge colors):
  - `idle` — grey, "Awaiting answer"
  - `incomplete` — amber `#E8B54D`, "Enter all N numbers"
  - `fail` — red `#E85D5D`, "Mismatch · Try again"
  - `pass` — teal `#2AD4C8`, "Verified · Human"
- **Oscilloscope:** p5 `draw()` loop. When `playing && fft` → `fft.waveform()` (real signal). Otherwise a synthesized scramble wave keeps the panel alive. Amplitude scales with volume.

## The audio pipeline (the actual work)
Detailed in the big comment block above `makeChallenge()` in the scaffold.
Choose one path:

- **(A) Pre-recorded WAV + DSP scramble** — *your stated plan.* `loadSound()` the
  recording, then degrade it with **p5.sound** (pitch/rate jitter, pink-noise
  bed via `p5.Noise`, band-pass `p5.Filter`, light `p5.Reverb`, time-jittered
  gaps) so ASR fails but humans still parse it. `p5.FFT.setInput(sound)` drives
  the scope. **This scramble is p5.sound DSP — not p5.speech.**
- **(B) p5.speech TTS + DSP scramble** — generate the spoken pairs with
  `p5.Speech.speak()`, capture, then scramble as in (A). Randomizes challenges
  with no server, but browser TTS is clean → scrambling is mandatory.
- **(C) Hybrid live graph** — route TTS through a Web Audio graph so scramble is
  applied before it reaches the speakers (no clean file ever exists). Best
  anti-bot posture.

**p5.speech role:** TTS to *generate* challenge speech (and optionally STT to let
users answer by voice). It does **not** process/scramble an existing file — that
is p5.sound.

## State Management
- `challenge` `{ targets:[{word,n}], answer:'381' }`
- `playing` (bool), `volume` (0–1), `phase` (scope animation)
- `sound` (p5.SoundFile), `fft` (p5.FFT)
- Keep on-screen `targets` in sync with the pairs the audio actually speaks.

## ⚠ Security
Client-side `verify()` is a **demo only**. In production, issue a signed
challenge token, keep the correct answer **server-side**, and validate the
submitted answer on the server. The answer must never reach the browser.
Add rate-limiting and a replay-token per challenge.

## Design Tokens
- **Colors:** bg `#0C0D10`; accent/teal `#2AD4C8` (+ tint `rgba(42,212,200,.12)`, line `.35`, glow `.40`); accent-text `#EAFFFB`; ink `#E7EAEE`; ink-dim `#8b919a`; edge/border `#14171B`; danger `#E85D5D`; warn `#E8B54D`; panel metal `#3A3F47→#2B2F35`; LCD `#08130F→#040B09`.
- **Type:** Hanken Grotesk (UI), Spline Sans Mono (readouts/inputs). Eyebrow 11px/700/.24em; subhead 13px; readouts 10px mono /.14em; digit box 28px mono.
- **Radius:** plate 16px; LCD 9px; buttons/boxes 8px; chips/badge 999px.
- **Sizes:** card 640px; scope canvas h116px; replay 52px; play 66px; knob 56px; digit box h62px.
- **Shadows:** plate `inset 0 1px 0 rgba(255,255,255,.14), inset 0 -3px 9px rgba(0,0,0,.45), 0 34px 70px -24px rgba(0,0,0,.75)`; inset fields `inset 0 2px 4px rgba(0,0,0,.8)`.

## Assets
None external. Fonts via Google Fonts; p5/p5.sound/p5.speech via CDN (pin these
versions in production). Icons are inline SVG/CSS. You provide the challenge
recordings (WAV) or generate them via p5.speech.

## Files
- `audio-captcha-p5.html` — runnable annotated p5.js scaffold (**start here**)
- `Audio Captcha Ferric.dc.html` — visual reference mockup (does not run standalone)
- `README.md` — this document
