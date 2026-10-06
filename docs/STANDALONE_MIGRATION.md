# Standalone Migration Ledger

The future Standalone product should reproduce **behavior and sound**, not necessarily HTML, Canvas, or Web Audio APIs. No native framework or plug-in format has been selected. This ledger is a preservation plan, not permission to rewrite the current web app. The web version can continue to develop independently while decisions, test vectors, and listening outcomes accumulate here.

## Portable model and data

- Stable current parameter IDs: `basePitch`, `deviation`, `slope`, `fmIndex`, `amDepth`, `ringMix`, plus the named settings in `PARAMETER_SPEC.md`. UI labels may change, but changing meaning/range/normalization requires a versioned migration.
- Curve points are normalized `{x,y}`, independent of viewport size; `x` refers to sound duration and y follows each parameter's documented mapping. Smoothstep interpolation and protected endpoints are product behavior.
- Output Duration uses integer seconds from 1 to 600 (short 1-60 s, long 60-600 s), default 20 s. Changing it stops and resets transport without rewriting normalized curves; wet IR tail and limiter flush remain outside sound duration. These semantics are portable, while the web slider, Blob size and browser memory limits are not. A native renderer should separately budget final file bytes and peak working memory.
- A future state format is **proposed, not implemented**. Candidate fields: `schemaVersion`, `product`, `module`, `settings`, `curves`, and explicit treatment of IR references/availability. Do not assume local browser file bytes can simply be embedded in an automation preset.
- Preserve UI semantics: separate brand versus parameter colors, workbench hierarchy, current oscillator values versus FFT output observation, Pen/Eraser intent, focus/disabled feedback, and reduced-motion policy.

## Feature migration matrix

| Feature | Current web implementation | Portable requirement and reusable algorithm/data | Replacement needed / risk | Priority |
| --- | --- | --- | --- | --- |
| Curve editor | Canvas + Pointer Events in `app.js` | Normalized points, smoothstep interpolation, endpoint protection, curve-specific mapping | Native drawing/hit testing, high-DPI and accessibility; verify point order and gestures | High |
| Parameter state | DOM controls + in-memory JS objects | Stable IDs, units, defaults, mappings, mode-retained curves | Versioned preset/automation schema is absent; design before persistence | High |
| Oscillator stack | `oscillator-core.js` in JS | Waveform semantics, Unison/Harmonic/Odd/Multiplier, deviation, slope, voice normalization; Harmonic's index sweep plus two-voice-group offset, plain index pan elsewhere | Preserve the selected frequency-to-space progression, not merely numerical L/R balance; compare sample vectors, aliasing and CPU use | High |
| Static Resynthesis | Worker analysis plus shared oscillator core | Immutable original peak data, significance selection, 32/64 bank, neutral transformation semantics, approved C stereo placement (centered first peak plus 80/20 alternating/sweep), and the user-approved 0.42-to-0.48-rate high-partial fade with continuous phase while silent | Replace browser decode/Worker; compare real-file peaks, CPU, listening and output across engines; do not restore the crackling hard cutoff | High |
| FM/AM/Ring | Shared per-voice modulation code | Carrier-relative ratio, three amount mappings, high-frequency bounds | Native rate/phase/oversampling decisions could alter sound | High |
| Edge and safety | `edgeFade`, `softLimit`, safety-limiter Worklet/shared JS | 8/12 ms source fade, stack-specific count lift, -1 dBFS linked sample-peak ceiling, 5 ms lookahead, 1 ms attack, 100 ms release | Preserve equal L/R and dry/wet delay, final flush and transport offset at target/native rates; add true-peak evaluation if required; real Stop currently abrupt | High |
| Transport | AudioWorklet messages, AudioContext, Spacebar | Play/Stop/end timing, sound vs wet-tail duration, playhead semantics | Native audio engine scheduling; test device changes and underruns | High |
| Local IR convolution | Shared file decode, ConvolverNode, OfflineAudioContext | One import serves both Convolution IR and Resynthesis analysis; preserve optional oscillator/IR route, smooth Dry/Wet law, 3 s-to-full IR selection, bypass identity | Decoder formats, normalization and shared-file lifecycle may differ across engines | High |
| WAV export | Offline JS + Blob download | 48 kHz, 24-bit PCM, mono/stereo, optional wet tail plus 5 ms limiter flush | Native renderer/encoder and file-dialog behavior; binary/sample parity including leading delay | High |
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
- Deviation/FM/AM/Ring/Ratio sample-rate-aware slew and the final linked limiter are portable behavior; AudioWorklet routing is not. The high-FM stress case invokes limiting often, so a native port must not claim transparent safety without matched listening.
- The FFT panel is deliberately low-resolution and must retain its observation disclaimer.
- Windows modifier behavior, touch gestures, Reset cancellation in a real browser, and accessibility of a future native workspace need dedicated checks.

Migration order: freeze behavior and test vectors for the core instrument first; design state/preset compatibility next; then evaluate native engine and UI frameworks against those requirements. Do not select a framework by assumption.

## Identity assets

Hub v0.10 standard/micro/app SVGs and six-Lab sRGB palette are preserved in `assets/identity/`. Web uses standard in header, micro in favicon; app tile is a future native reference, not an installed app icon. DSP and native architecture remain independent.

## 2026-10-06 — WAV-only limiter latency compensation (local, unpublished)

WAV files remove the 5 ms leading lookahead latency after flushing the unchanged safety limiter. Dry files now have exactly the generated frame count; wet files retain the full convolution length N + IR.length - 1 at matched 48 kHz. No end trimming, gain, ceiling, attack/release, oscillator or partial changes. Realtime and internal samplesOnly/FFT reference retain their existing delayed timeline; comparisons align WAV by 240 frames. This is file-time correction, not listening-led tuning.

Verified: mono/stereo 1s and 60s output PCM equals the previous WAV after its 240-frame prefix; 17 limiter/convolution/resynthesis/file-duration tests pass; five Preview/WAV/FFT numerical comparisons pass after time alignment; six browser convolution cases (mono/stereo × wet 0/.5/1) preserve body/tail and match reference PCM within 24-bit quantization tolerance. Actual device listening and long/large IR limits remain unverified.

## 2026-10-06 scheduling boundary
Cooperative yields and OfflineAudioContext suspension/drain are Web implementation details. Preserve DSP order, WAV48k/24-bit, full IR tail and WAV-only latency compensation in a native port. Native cancellation must release processing resources before reporting completion; do not port the two-second browser checkpoint as a sonic parameter.
