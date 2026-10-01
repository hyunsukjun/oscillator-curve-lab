# Standalone Migration Ledger

The future Standalone product should reproduce **behavior and sound**, not necessarily HTML, Canvas, or Web Audio APIs. No native framework or plug-in format has been selected. This ledger is a preservation plan, not permission to rewrite the current web app. The web version can continue to develop independently while decisions, test vectors, and listening outcomes accumulate here.

## Portable model and data

- Stable current parameter IDs: `basePitch`, `deviation`, `slope`, `fmIndex`, `amDepth`, `ringMix`, plus the named settings in `PARAMETER_SPEC.md`. UI labels may change, but changing meaning/range/normalization requires a versioned migration.
- Curve points are normalized `{x,y}`, independent of viewport size; `x` refers to sound duration and y follows each parameter's documented mapping. Smoothstep interpolation and protected endpoints are product behavior.
- A future state format is **proposed, not implemented**. Candidate fields: `schemaVersion`, `product`, `module`, `settings`, `curves`, and explicit treatment of IR references/availability. Do not assume local browser file bytes can simply be embedded in an automation preset.
- Preserve UI semantics: separate brand versus parameter colors, workbench hierarchy, current oscillator values versus FFT output observation, Pen/Eraser intent, focus/disabled feedback, and reduced-motion policy.

## Feature migration matrix

| Feature | Current web implementation | Portable requirement and reusable algorithm/data | Replacement needed / risk | Priority |
| --- | --- | --- | --- | --- |
| Curve editor | Canvas + Pointer Events in `app.js` | Normalized points, smoothstep interpolation, endpoint protection, curve-specific mapping | Native drawing/hit testing, high-DPI and accessibility; verify point order and gestures | High |
| Parameter state | DOM controls + in-memory JS objects | Stable IDs, units, defaults, mappings, mode-retained curves | Versioned preset/automation schema is absent; design before persistence | High |
| Oscillator stack | `oscillator-core.js` in JS | Waveform semantics, Unison/Harmonic/Odd/Multiplier, deviation, slope, voice normalization | Port sample algorithms precisely; compare sample vectors, aliasing and CPU use | High |
| Static Resynthesis | Worker analysis plus shared oscillator core | Immutable original peak data, significance selection, 32/64 bank, neutral transformation semantics | Replace browser decode/Worker; compare real-file peaks, CPU, listening and output across engines | High |
| FM/AM/Ring | Shared per-voice modulation code | Carrier-relative ratio, three amount mappings, high-frequency bounds | Native rate/phase/oversampling decisions could alter sound | High |
| Edge and safety | `edgeFade`, `softLimit`, WaveShaper | 8/12 ms source fade, gain normalization and limiter response | Match at target/native sample rates; real Stop currently abrupt | High |
| Transport | AudioWorklet messages, AudioContext, Spacebar | Play/Stop/end timing, sound vs wet-tail duration, playhead semantics | Native audio engine scheduling; test device changes and underruns | High |
| Local IR convolution | Browser decode, ConvolverNode, OfflineAudioContext | Optional oscillator/IR route, smooth Dry/Wet law, 3 s-to-full IR selection, bypass identity | Decoder formats, normalization and IR lifecycle may differ across engines | High |
| WAV export | Offline JS + Blob download | 48 kHz, 24-bit PCM, mono/stereo, optional wet tail | Native renderer/encoder and file-dialog behavior; binary/sample parity | High |
| FFT output overview | Worker + `SpectrogramAnalysis` + Canvas | Observation-only, fixed scale/resolution semantics, stale/update state | Native background job/cancellation and drawing; do not rebrand as precision analyzer | Medium |
| Visual system | CSS custom properties and Canvas paint | Token meanings, brand/parameter separation, hierarchy, accessible states | Map to native theme/layout; do not blindly copy CSS pixel measurements | Medium |

## Web-specific dependencies to replace, not define product with

HTML IDs, CSS pixels, browser focus, `window.confirm`, `navigator.platform`, Pointer Events, Canvas backing resolution, AudioWorklet, ConvolverNode, OfflineAudioContext, Worker, Blob URL downloads, and browser audio decoders are current platform mechanisms. Each must be mapped to an equivalent native behavior or deliberately revised with a documented migration. Browser-specific cache version strings are not product version numbers.

## Reproducibility package for a future port

1. Keep source-defined numerical tests for mappings, voice frequencies, modulation zero cases, limiting, fades, convolution bypass, and WAV headers. Expand them into small fixed-vector fixtures before any native port.
2. Maintain a named, rights-cleared listening corpus: low/high carriers, Sine/Triangle/Saw/Square, all stacks, FM/AM/Ring, extreme curves, short/full IR, Dry/Wet endpoints, and hard-to-hear versus harsh examples. Record level matching, device, sample rate, result, reviewer and approval date. This corpus is not yet present.
3. Compare rendered 48 kHz WAV samples or toleranced spectral measurements, plus actual listening. Sample parity does not prove perceptual equivalence; listening does not replace format/edge tests.
4. Preserve decision history when tuning values. Record previous/new mapping, rationale, test setup and outcome. Do not silently replace existing sweet-spot information.

Use `KNOWLEDGE_PRESERVATION.md` as the capture ledger for the reference corpus, matched listening comparisons, tuning rationale, and performance/cross-engine evidence. Its pending cases are not test results or approved sonic targets.

## Current risks and open work

- No persisted project/preset schema or parameter automation contract exists.
- Native-rate realtime fallback, device underruns, long IR memory/performance and cross-engine Convolver normalization have not been fully characterized.
- The user-reported IR-dependent tonal variance is open; no automatic timbral correction has been approved.
- The FFT panel is deliberately low-resolution and must retain its observation disclaimer.
- Windows modifier behavior, touch gestures, Reset cancellation in a real browser, and accessibility of a future native workspace need dedicated checks.

Migration order: freeze behavior and test vectors for the core instrument first; design state/preset compatibility next; then evaluate native engine and UI frameworks against those requirements. Do not select a framework by assumption.
