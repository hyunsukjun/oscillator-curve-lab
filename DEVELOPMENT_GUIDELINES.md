# Development Guidelines

## Purpose and boundaries

Oscillator Curve Lab's web app is a usable product and a reference implementation, not a prototype to discard or a mandated native architecture. Preserve a reproducible product specification while developing the web version independently. A future Standalone app may replace DOM, Canvas, and Web Audio without changing the musical meanings defined in `docs/`.

Use three layers when proposing or reviewing work:

| Layer | Owns | Current evidence |
| --- | --- | --- |
| Product behavior | What a user hears, sees, and intends | `docs/FEATURE_REGISTRY.md`, `docs/INTERACTION_SPEC.md` |
| Processing/data model | IDs, normalized curves, mappings, DSP, state | `docs/PARAMETER_SPEC.md`, `docs/DSP_BEHAVIOR.md`, `src/oscillator-core.js` |
| Platform implementation | HTML/CSS/Canvas, Pointer Events, Web Audio, Worker, download | `index.html`, `src/app.js`, Worklet, Worker, offline renderer |

Dependency flows from behavior to model to implementation, not the reverse. A CSS pixel, DOM ID, browser event, or AudioNode is not a portable parameter definition.

## Current architecture

- `index.html` defines controls and two main canvases. `src/styles.css` holds shared visual tokens plus Oscillator-specific colors.
- `src/app.js` owns web UI state, pointer editing, rendering of curve/current-value canvases, transport, file loading, and AudioNode routing. It is presently coupled to the DOM; do not claim otherwise.
- `src/oscillator-core.js` owns normalized curve interpolation, frequency/voice mapping, oscillator sampling, modulation, gain normalization, limiter, edge fade, and WAV encoding.
- `src/oscillator-worklet.js` processes realtime oscillator frames. `src/offline-render.js` produces 48 kHz PCM data and WAV. Both use the core render function and the same edge fade.
- `src/convolution.js` prepares local audio as an impulse response and provides Dry/Wet, native Convolver and offline convolution helpers.
- `src/resynthesis-analysis.js` and its Worker extract a static, structured peak bank from a decoded local sound. `src/oscillator-core.js` applies non-destructive curve transformations to those peaks and renders sine voices through the shared realtime/offline paths; see `docs/RESYNTHESIS_SPEC.md`.
- `src/fft-preview.js`, `src/fft-worker.js`, `src/spectrogram-core.js`, and `src/fft.js` provide an observational output overview, not another editing surface.

## State and parameters

The current curves are arrays of `{x, y}` points with normalized time and value. `x=0..1` spans **sound duration**, not the convolution tail. Each curve has protected endpoints. The code currently keeps state in memory; there is no saved preset or versioned state schema. Preserve the existing curve IDs when adding persistence. A future schema should carry `schemaVersion`, product/module, settings, curves, and any file-reference policy; do not silently serialize local file bytes as a portable preset.

Parameter definitions and current defaults live in `docs/PARAMETER_SPEC.md`. Change the spec and tests with any change to range, mapping, default, unit, interpolation, smoothing, or parameter identity. UI display names may evolve independently of IDs. Fixed multiplier pattern and modulator ratio are distinct concepts.

## Rendering and interaction

Keep musical coordinates normalized and independent of Canvas size, device pixel ratio, browser zoom, or responsive layout. Canvas uses CSS dimensions with a high-DPI backing store. The 1800 px minimum canvas is a web presentation choice; narrower screens horizontally scroll the workspace. Maintain alignment between points, axis labels, grid, tooltips, and playhead. For pointer edits, verify adding, dragging, erasing, empty eraser clicks, and endpoint protection after changing layout or hit testing.

## Audio and parity

Realtime targets 48 kHz and falls back to the native audio-device rate; offline WAV is 48 kHz/24-bit. Shared synthesis should keep realtime, WAV, and dry FFT preview numerically aligned. Convolution preview uses rendered processed samples. Whenever DSP changes, test Off/FM/AM/Ring, edge behavior, convolution Off/On, native-rate fallback where possible, natural end, immediate Stop, and rendered file format. Do not equate a numerical comparison with human listening or device underrun testing.

Local audio loading uses browser decode and stays local. Enforce file-size and decode-failure handling. WAV export is a generated download; it does not imply a saved project. Worker analysis must cancel or mark stale on settings/curve changes and not present old output as current.

## Quality gates

- Run `node --test tests/*.test.mjs` and `node tests/output-preview.mjs` with the available Node runtime. Check changed JS files with `node --check`.
- For user-facing changes, verify initialization, default oscillator, Play/Stop/Spacebar, mode switching, curve tools, Clear/Reset, FFT update/stale state, audio import, and WAV render/download in a browser. Check console errors.
- For responsive changes, inspect narrow notebook and wide monitor widths, coordinate mapping after resize, focus/hover/disabled states, and reduced-motion behavior.
- Record exact test command, scope, result, and limitations. Keep subjective listening and multi-device claims separate from automated results.

No external UI/font dependency is currently required. Add a dependency only with a documented reason and impact. The current implementation may be improved incrementally; this document does not authorize a large platform-oriented rewrite.
