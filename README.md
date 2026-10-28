# Oscillator Curve Lab

Current default/example: [Bach Prelude No.1 · mallet ·72BPM ·15s MP3](docs/DEFAULT_SOURCE.md). File Resynthesis example only; initial oscillator and IR defaults stay unchanged.

Early v1 prototype for the EEAMS Curve Lab family.

## Product record and future Standalone

The web app continues as an independent, working instrument. Its behavior, fine-tuning values, interaction rules, design language, and verification evidence are recorded separately so a future Standalone version can reproduce the musical result without copying browser technology. Documentation describes the **current implementation** unless explicitly marked proposed or unverified; it is not a claim that a native framework or preset format has already been chosen.

- [Working rules](AGENTS.md) and [development guidelines](DEVELOPMENT_GUIDELINES.md)
- [Curve Lab Design System and Oscillator brand mapping](CURVE_LAB_DESIGN_SYSTEM.md)
- [Feature registry](docs/FEATURE_REGISTRY.md) and [parameter specification](docs/PARAMETER_SPEC.md)
- [Interaction specification](docs/INTERACTION_SPEC.md) and [DSP behavior](docs/DSP_BEHAVIOR.md)
- [Decisions and fine-tuning history](docs/DECISIONS.md) and [Standalone migration ledger](docs/STANDALONE_MIGRATION.md)
- [Knowledge preservation ledger](docs/KNOWLEDGE_PRESERVATION.md) for reference sounds, listening contrasts, tuning rationale and performance evidence
- [Static Resynthesis specification](docs/RESYNTHESIS_SPEC.md) for analysis, oscillator-bank transformation and current limits

New feature, parameter, DSP, interaction, or design changes should update their corresponding document with the code. Existing [FFT refinement evidence](docs/FFT-REFINEMENT-REPORT.md) describes its own earlier revision and is not automatically proof for later changes.

Oscillator Curve Lab draws how a small oscillator stack changes over time. The first path is intentionally narrow: source waveform, base frequency, stack structure, deviation, spectral slope, and current oscillator value visualization.

Set output time from the always-visible Output Duration row below the curve toolbar. It uses a single 0–10 minute slider in one-second steps with a mm:ss readout; zero disables playback/export. Duration stretches the same normalized curves; Convolution may add an IR tail beyond the selected time. WAV export compensates the limiter’s 5 ms latency while preserving that tail. Ten-minute renders can require substantially more working memory than the shown WAV size.

The sound selector has File Resynthesis and Oscillator + File IR (default) paths. Without an IR, the latter retains dry basic synthesis; with an IR, Dry/Wet=0 retains dry synthesis. The separate Basic Waveform button and Synthesis source heading are removed. One Open Audio import serves both file-based modes: Resynthesis analyzes it into up to 32/64 significant sine partials, while Convolution uses it as an IR with the oscillator. Neither mode directly plays the imported recording. Resynthesis uses the fixed, user-approved C stereo placement. See the dedicated specification for analysis limits and unverified sonic questions.

## v1 scope

- Waveform: Sine, Triangle, Saw, Square
- Base Frequency curve: 20 Hz-4000 Hz logarithmic range
- Oscillator Count: 1, 2, 4, 8, 16
- Stack Structure: Unison, Harmonic, Odd Harmonics, Multiplier
- Multiplier Mode: fixed base-frequency multiple pattern
- Deviation: bottom is zero; upward motion increases cents spread for Unison and partial deviation for Harmonic/Odd Harmonics/Multiplier
- Spectral Slope curve
- Single modulation path: Off, FM, AM, or Ring; a shared carrier-relative ratio (0.25-8)
- FM Index curve (0-4), AM Depth curve (0-1), and Ring Mix curve (0-1), each preserved when switching modes
- Optional Convolution mode: open a local audio file as an impulse response, then set Dry/Wet and IR Length. IR Length 0% uses the first 3 seconds (or the full file when shorter); 100% uses the full file. Imported files are limited to 16 MiB. Oscillator mode bypasses the IR. WAV export includes the selected IR tail when active.
- Dry/Wet uses a smooth endpoint taper. With an active wet IR, Pause preserves valid processing history; reset/seek or an accepted state change discards it.
- Saw and Square use band-limited edge correction, and high Triangle notes use band-limited harmonics; normal-level oscillator output remains unshaped by the safety limiter.
- Modulation is reduced near Nyquist; the existing auto gain and output limiter remain active
- Current oscillator value visualization
- Auto Gain Compensation
- Nyquist Protection
- Safety Limiter
- 48 kHz WAV export at 24-bit PCM
- 8 ms start and 12 ms end source fades in realtime playback and WAV; internal FFT reference checks are documented separately

## Out of scope for v1

- Waveshape Drawing
- Per-oscillator editing
- 32/64 manually stacked OSCILLATOR-mode voices (Resynthesis separately uses up to 32/64 analyzed partials)
- Complex modulation matrix
- High-resolution FFT analyzer
- Multiple FM operators
- Resonance/filter features

## Run locally

Use a local web server so AudioWorklet can load. Run this from the OscillatorCurveLab directory:

```sh
python3 -m http.server 8080
```

Then open `http://localhost:8080/`.

Run the focused modulation and convolution checks with `node --test tests/modulation.test.mjs tests/convolution.test.mjs`.

## Historical FFT verification

The output FFT preview is no longer exposed in the current web UI. Resynthesis analysis remains available. The FFT report and internal comparison tools are retained as historical and technical evidence; they are not current user controls.

See [FFT refinement and verification](docs/FFT-REFINEMENT-REPORT.md). Run `node tests/output-preview.mjs` for WAV/Worklet/FFT parity, or open `tests/browser-output-preview.html` through the local server for native browser Worklet checks.


### Portable AIFF input

AIFF (.aif/.aiff), mono/stereo 16/24-bit PCM, is converted locally on import.
AIFF-C is not supported by this importer; use PCM WAV instead. Original files
are unchanged. See [support scope and limits](docs/AIFF_IMPORT.md).


### Current transport
Bottom controls are Return to start / Play / Pause. Space toggles Play/Pause outside editable controls. With an active wet IR, Pause retains processing history; Play resumes the remaining sound and tail while that history is valid.

The footer uses one **current output time / total output time** clock and matching output progress, including the IR tail and limiter flush. Click/drag or native range keys seek within the synthesis portion. Arbitrary tail seeking is unsupported: a tail request restores the actual bar position without discarding paused history. English control help explains that limit. At the sound endpoint, without a retained paused history, the next explicit Play starts from the beginning. See [transport display contract](docs/TRANSPORT_DISPLAY_CONTRACT.md).

Return to start selects zero and discards retained tail history; it does not start playback from a stopped or paused state. Actual mode, admitted file, curve or setting changes invalidate that history. Reselecting the same mode is a no-op, and a file rejected before admission preserves the paused history. An accepted import that later fails decoding still cancels the previous playback request; the prior usable file can remain available.

Stopped or paused meters show no live reading (`—`); the previous CLIP warning remains until explicitly reset. Synthesis, IR preparation and WAV output rules are unchanged. Final scoped acceptance is tracked separately from this control update.


## UI revision history — 2026-10-14–15

These entries describe the state at the time of the original review; the interface changes are present in the current checkout.

Single 0–10 min Output Duration; zero disables Play/Download. FFT Preview removed from web UI; Resynthesis analysis remains. Responsive canvas budget keeps verified laptop viewports within one screen. [Review and validation](docs/UI_REVIEW_2026-10-14.md).

Partial-count changes automatically refresh analysis while retaining current playback until results are ready. The separate Reanalyze button is no longer shown. Pending/errors remain visible; the monitor retains actual partial counts.

2026-10-15 local review: remove the header Mono/Stereo selector; application settings always use stereo for both synthesis paths. Export help states Stereo 2ch /48kHz/24-bit. Input mono/stereo support unchanged. Browser playback and a saved1s WAV confirmed2ch48kHz24-bit.

Imported files also appear in a static source-time waveform overview. Colors describe source frequency character, not generated sound; this is not a seek control.


## 2026-10-26 — Harmonic stereo placement
Harmonic centers harmonics 1–8 equally in L/R; harmonics 9–16 alternate left/right (9 left, 10 right, and so on). Preview and WAV use the same placement. Other stack layouts and File Resynthesis are unchanged. See [contract and verification](docs/HARMONIC_STEREO_2026-10-26.md).

## Shift group / Option erase — 2026-10-27

Shift-drag a point and following points vertically with X fixed; Mac Option-click erases an interior point (PC Ctrl-click unchanged). Original editing, mappings and DSP remain. User-reviewed UI checks are recorded in the gesture contract; commit/deployment was explicitly authorized on 2026-10-27. See [gesture contract](docs/CURVE_GESTURE_CONTRACT.md).
