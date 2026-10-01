# Decisions and Fine-Tuning History

This is a concise record of consequential choices, not a transcript. Dates below are **recorded/observed dates** when an original decision timestamp is unavailable. `Implemented` means the current web code follows the choice; it does not assert human listening approval. Keep alternatives and prior values when later tuning occurs.

## D-001: Preserve an Oscillator-first Curve Lab

- RECORDED: 2026-09-29. STATUS: Implemented; earlier scoped v1 decisions later expanded by explicit user requests.
- DECISION: Waveform, base frequency, stack structure, deviation, spectral slope, and frequency visualization remain the instrument's center. FM/AM/Ring and convolution are optional extensions, not a replacement for oscillator synthesis.
- REASON: A small, musically legible curve instrument is preferable to an unbounded synthesis matrix. The user later approved specific modulation, Odd Harmonics, and convolution additions.
- ALTERNATIVES: Waveshape drawing, individual voice editing, 32/64 manually stacked oscillator voices, complex modulation matrix, multi-operator FM, resonance/filter. These are not current OSCILLATOR-mode features; the later Resynthesis mode has a separate analyzed 32/64-partial bank (D-008).
- AFFECTS: Registry, UI hierarchy, tests, Standalone feature selection.

## D-002: Separate brand identity from parameter meaning

- RECORDED: 2026-09-29. STATUS: Implemented in Design System v1.0.
- DECISION: Audio Curve Lab supplies the shared deep-navy workbench language; Oscillator's identity accent is Green `#53c78c`. Base, Deviation, Slope, FM, AM, and Ring retain distinct semantic colors.
- REASON: Product-family coherence without making different controls visually indistinguishable.
- ALTERNATIVE: Recolor every active parameter green; rejected because brand and parameter roles differ.
- AFFECTS: `CURVE_LAB_DESIGN_SYSTEM.md`, CSS and Canvas paint. This does not authorize edits to sibling labs.

## D-003: Automatic rather than optional safety

- RECORDED: 2026-09-29. STATUS: Implemented; musical adequacy not fully approved.
- DECISION: Voice gain compensation and limiting run automatically. The UI reports Safety instead of exposing an On/Off choice.
- REASON: Stable basic operation across 1-16 voices without requiring a user to manage overload controls during composition.
- LIMIT: Automatic safety controls peaks, not IR-dependent timbre or consistent perceived loudness.
- AFFECTS: `stackFrequencies`, `softLimit`, output safety routing, parameter specification.

## D-004: Keep FFT separate and observational

- RECORDED: 2026-09-29. STATUS: Implemented.
- DECISION: The upper panel shows current oscillator values; a separate optional output FFT panel sits below the curve editor, is off by default, and is marked stale after edits.
- REASON: Preserve the curve as the primary editing surface while showing an overview of output energy.
- ALTERNATIVE: Treat spectrogram as the curve editor or a high-resolution analyzer; not current scope.
- LIMIT: 2048-point FFT overview misses some brief events and does not provide precision pitch measurement.
- AFFECTS: `fft-preview.js`, `spectrogram-core.js`, workbench hierarchy.

## D-005: Import audio as an optional IR

- RECORDED: 2026-09-29. STATUS: Implemented; perceptual tuning under review.
- DECISION: Open Audio supplies a local convolution impulse response. Convolution Off preserves oscillator-only behavior; On reveals Dry/Wet and IR Length. IR Length spans 3 s minimum to full source where available.
- REASON: Extend timbral possibilities while preserving Oscillator Curve Lab's source identity and a clear bypass.
- ALTERNATIVE: Rename as Synth Curve Lab or replace the oscillator with the imported audio; not selected.
- LIMIT: Arbitrary IRs can make very different or harsh spectra. A smooth Dry/Wet taper addresses endpoint discontinuity but is not a loudness match.
- AFFECTS: `convolution.js`, transport length, FFT and WAV paths.

## D-006: Match displayed Base Freq axis to its mapping

- RECORDED: 2026-09-29. STATUS: Implemented and visually checked.
- DECISION: The editable Base Freq axis uses the same logarithmic 20-4000 Hz domain as points and tooltips. The FFT observation axis independently covers 20 Hz-20 kHz.
- REASON: A previous served preview showed a `10k` axis mark beside a point whose tooltip read about 2116 Hz. That was a display/source-revision mismatch, not evidence that the oscillator base range reached 10 kHz.
- ALTERNATIVE: Extend the base synthesis range to 20 kHz; not adopted without DSP/perceptual review.
- AFFECTS: Curve trust, pitch readout, future native axis mapping.

## D-007: Add short source-edge fade without changing sound design

- RECORDED: 2026-09-29. STATUS: Implemented and numerically tested; listening result not yet documented.
- DECISION: Apply a linear 8 ms beginning and 12 ms ending fade to the oscillator source in realtime, WAV, and dry FFT synthesis. Existing 3 ms output startup ramp remains. Immediate Stop behavior remains unchanged.
- REASON: User heard a click-like onset and requested a minimal boundary treatment before investigating larger timbral variance.
- ALTERNATIVES: A full musical amplitude envelope or broader spectral correction; deferred.
- AFFECTS: Core fade function, Worklet, offline renderer, FFT worker. Earlier no-tail oscillator output had no end fade; before this change a short end fade applied only when a convolution tail existed.

## D-008: Add static peak-to-oscillator Resynthesis as a separate mode

- RECORDED: 2026-09-30. STATUS: Implemented in web code; synthetic-file and numerical checks, no musician-approved listening result.
- DECISION: Keep Oscillator as the default, move existing oscillator-plus-IR routing under Convolution, and add a mutually exclusive Resynthesis mode. Analyze a centered static source segment into up to 32/64 unquantized peaks; retain AnalysisResult and transform it through the shared curve editor into sine oscillator voices.
- REASON: Preserve the established instrument while making sound-file-derived oscillator synthesis distinct from convolution or direct source playback. A bounded static analysis establishes a transferable model before any time-varying tracking.
- ALTERNATIVES: Directly replay or spectrally process the file, convert every FFT bin to a voice, force missing harmonics into a 32/64 bank, or implement partial tracking now. None is current scope.
- AFFECTS: `RESYNTHESIS_SPEC.md`, mode UI, analysis Worker, shared render core, WAV/FFT paths, future Standalone data model.
- OPEN: Peak thresholds, channel/window choices, fundamental estimate, CPU and perceived resemblance need real-file measurements and listening. Exact current values are implementation choices, not approved sonic tuning.

## Open decision: IR-dependent tonal variance

User observation: some source/parameter combinations sound attractive while others sound harsh; high versus low imported source material can reverse which base-frequency region feels useful. No automated EQ, spectral matching, revised Convolver normalization, or new parameter has been approved. Next investigation should use named audio files, identical output level, matched settings, rendered audio and listening notes, distinguishing clipping, aliasing, convolution coloration and intended timbre. Record any chosen adjustment's old/new values and listening setup in `PARAMETER_SPEC.md` and `DSP_BEHAVIOR.md` before calling it approved.
