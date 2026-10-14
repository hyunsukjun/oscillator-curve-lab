# Curve Lab Design System v1.0: Oscillator mapping

Audio Curve Lab supplies the shared visual-language reference, not code ownership. Oscillator Curve Lab keeps its own controls, two-canvas frequency/curve workspace, modulation, convolution, and FFT observation panel. This document records portable token meanings; `src/styles.css` and Canvas paint are the current web mapping.

## Visual hierarchy

1. Brand/header: 48 px Curve Lab mark, product name with colored `Curve Lab`, compact supporting text.
2. Transport: time, Open Audio, Play/Stop, duration, channel format, WAV download.
3. Parameter/tool area: waveform, count, stack, modulation, optional convolution; curve-mode buttons and Pen/Eraser.
   The sound-generation row uses equal-weight Oscillator, Resynthesis, and Convolution buttons. Mode-specific controls appear beside them; the shared curve editor remains in place.
4. Thin status strip: current curve, points, voices, base, deviation, slope, safety, WAV.
5. Dark workspace: current oscillator values above the larger curve editor. FFT is a separate optional observation panel below; it never edits curves.

The canvas remains the primary work surface. Do not replace the module layout with an Audio Curve Lab screenshot or a decorative hero.

## Portable tokens and current web values

| Meaning | Current value | Web token / source |
| --- | --- | --- |
| Environment | deep navy `#07111c`, deeper `#050b12` | `--cl-bg`, `--cl-bg-deep` |
| Surface / raised surface | `#0d1b29` / `#122438` | `--cl-surface`, `--cl-surface-raised` |
| Border / strong border | `#203a52` / `#345672` | `--cl-border`, `--cl-border-strong` |
| Primary / secondary text | `#e8f0f6` / `#aabccc` | `--cl-text`, `--cl-text-secondary` |
| Oscillator identity | Teal `#28CDB0` | `--cl-accent`; mark, title, restrained focus/identity accents |
| Focus | `#98eadc`, 2 px outline with 2 px offset | `--cl-focus`, `:focus-visible` |
| Small/medium/large radius | 4/6/8 px | `--cl-radius-sm/md/lg` |
| Spacing scale | 4/8/12/16/24 px | `--cl-space-1/2/3/4/6` |
| Common control / toolbar height | 38/54 px | `--cl-control-height`, `--cl-toolbar-height` |
| Type | system UI font; compact workbench hierarchy | root font stack and component rules |
| Button motion | 140 ms color/border transition | button rules; disabled under reduced motion |

Brand color is **not** parameter meaning. Do not wash the whole app green. Current parameter identities are Base Freq `#6de0c0`, Deviation `#e34b4b`, Spectral Slope `#6fa8dc`, FM Strength `#b887f4`, AM Depth `#e1a058`, and Ring Blend `#ec809a` (`src/app.js`). The curve, points, active mode border/background, and tooltip border follow parameter identity. Tune only for contrast, preserving meaning.

## Workspace and states

Canvas uses a dark `#0c1f31` field, more visible major than minor grid, legible axis labels, and a restrained playhead. Base Freq's editor axis follows the actual 20-4000 Hz logarithmic mapping; the FFT panel has a separate 20 Hz-20 kHz observation axis. The current-value panel shows oscillator frequencies, not a second editable curve. Point and tooltip placement must remain coherent at both curve extremes.

Buttons expose hover, active, focus-visible, and disabled states. Pen/Eraser remain a paired icon toggle with named hover help. Modulation and convolution controls appear only when meaningful. The page has a subtle ambient background; `prefers-reduced-motion` removes its motion. Use system fonts and no external visual package by default.

For narrow screens the toolbar/status wrap and the fixed-format canvas scrolls horizontally instead of changing normalized curve data. In a Standalone UI, map these meanings to native controls and drawing primitives; copying CSS pixels verbatim is not required. Any token change that alters hierarchy or parameter identity needs a decision record and a regression check.

## Hub v0.10 identity pilot — 2026-10-05

Source of truth: CURVE LAB HUB for macOS v0.10. Header symbol and micro favicon are exact source SVGs. Shared six-Lab palette and source hashes live in `assets/identity/`. Oscillator uses #28CDB0, hover #60DBC5, focus #98EADC. Parameter, meter, FFT and canvas colors retain their musical meanings. See `docs/IDENTITY_PILOT.md`.


## Common bottom transport — 2026-10-13
COMMON CANDIDATE, implemented locally. Audio reference adopted: Return to start,
Play, Pause, output-position slider, time, continuous green/yellow/red stereo meter,
CLIP. Neutral 16px icons are centered inside 38x32px buttons; 34px slider hit area.
Return to start seeks to zero while preserving playing/paused state. Pause retains
position; Play resumes; Space toggles Play/Pause outside editable controls.
Internal reset stops for import/export/settings remain distinct and unchanged.
No DSP algorithm or output format changes. Resume uses this Lab's existing engine
initialization; continuous-sample-identical resumption is not promised.
The existing waveform guides remain in their existing locations.
OUT and numeric meter values are visually removed (values remain accessible).
Meter color fields are clipped at the level, not stretched; retain analysis,
ballistics, peak hold and CLIP semantics. Shared CSS/module are vendored locally,
with per-Lab adapters and no external runtime dependency.
Oscillator retains its existing source-duration seek cap for convolution tails.
Verification covers syntax, keyboard contracts and browser layout; file-based
Labs also exercised silent-WAV pause/resume. Audible listening, Safari/Windows,
long-file performance and Oscillator mode-specific listening remain separate QA.


## 2026-10-14 viewport budget
Canvas height follows measured controls and transport, including wrapped rows and mode changes. Single 0–10 min Duration row, no FFT Preview panel. See docs/UI_REVIEW_2026-10-14.md for verified viewport sizes.


## 2026-10-14 — Common Clear Current / Reset All appearance
Both actions follow Audio's neutral navy reference: background #122438, text #aabccc, 6px radius, 13px/620 type, 92px minimum width, 38px height (30px at >=900px viewport width). Clear border #3b5063; Reset border #203a52. Shared hover/pressed/focus/disabled styles live in src/curve-actions.css. Red action emphasis is removed; brand/parameter colors elsewhere stay independent. Existing IDs, handlers, reset scope, confirmation mechanism and keyboard behavior remain unchanged. This is a local visual update, separate from DSP verification.


## 2026-10-14 — Synthesis hierarchy (local review)

Source selection precedes settings; waveform/count/frequency-layout are grouped apart from modulation. Secondary numerical/voice detail is collapsed by default. The curve gets remaining viewport space; details open/close triggers canvas resize without changing normalized points.


## 2026-10-14 — Family file information

Approved circular dotted-i disclosure immediately left of Open Audio. Default format guidance moves into this optional panel; privacy and actual error/status notices remain. Space operates disclosure without audio transport; Escape/outside click dismiss. Output guidance: 1–600 sec synthesis, plus file IR tail when used · Mono / stereo · 48 kHz / 24-bit WAV. Input limits reflect current implementation, not a device-memory guarantee. No DSP, admission, export, IDs or defaults changed.
