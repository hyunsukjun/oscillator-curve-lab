# Feature Registry

Snapshot: 2026-09-29, current web implementation. `IMPLEMENTED` means code exists; `VERIFIED` means the named automated or browser evidence was run for a stated revision, not that every listening context was approved. `APPROVED` is a product decision without a completed implementation. IDs are documentation identities; they are not a claim that the web app already has persisted feature IDs.

## Common Curve Lab behavior

### OCL-C01: Curve editor and transport

- CATEGORY: COMMON. STATUS: IMPLEMENTED; core editing and lifecycle previously browser-checked.
- PURPOSE/USER BEHAVIOR: Select a parameter trajectory; play it across sound duration; Stop immediately; Spacebar toggles Play/Stop when focus is not in a text/number/select control.
- INPUT/OUTPUT: Normalized curve points and sound duration drive audio and a playhead. Output time includes the convolution tail when active; curve editing time does not.
- DATA MODEL/INTERACTION: Independent `{x,y}` arrays per parameter, `x` in `[0,1]`, protected endpoints. See `INTERACTION_SPEC.md`.
- EDGE CASES: Resize must not change normalized values; natural end and Stop reset differ from the remaining wet tail. A current browser dialog test for Reset All cancellation was not completed in the earlier design-system pass.
- CURRENT WEB IMPLEMENTATION: `src/app.js`, `index.html`, `src/styles.css`.
- PLATFORM-INDEPENDENT REQUIREMENTS / STANDALONE NOTES: Reproduce gesture meaning and playback timing, not browser event names or Canvas pixels.
- TESTS/HISTORY: Browser point add/move/delete, empty eraser click, endpoints, Clear, Play/Stop/Spacebar checked during 2026-09-28 design work. See `INTERACTION_SPEC.md` for the unverified Reset dialog branch.

### OCL-C02: Pen, Eraser, Clear, Reset

- CATEGORY: COMMON. STATUS: IMPLEMENTED.
- PURPOSE/USER BEHAVIOR: Pen adds or moves; Eraser removes an existing interior point only; Clear Current restores the active curve's defaults; Reset All asks for confirmation then restores every curve.
- INPUT/OUTPUT: Tool choice plus pointer/keyboard gesture modifies curve state and invalidates WAV/FFT results.
- EDGE CASES: Empty eraser click must not create a point; endpoints cannot be deleted but can move vertically. Command-click (Mac) or Ctrl-click (PC) temporarily erases. Confirmation cancellation must leave all curves unchanged.
- CURRENT WEB IMPLEMENTATION: `src/app.js` `setTool`, `findPoint`, pointer handlers, `clearCurrentCurve`, `resetAll`.
- PLATFORM-INDEPENDENT REQUIREMENTS: Protect endpoint identity and curve order. Use an equivalent native confirmation rather than depending on `window.confirm`.
- TESTS/HISTORY: Manual browser checks cover most point operations; automated coverage for Reset cancellation and Windows Ctrl-click remains open.

### OCL-C03: WAV export

- CATEGORY: COMMON. STATUS: VERIFIED for generated 48 kHz/24-bit PCM format and tested paths.
- PURPOSE/USER BEHAVIOR: Download rendered mono or stereo audio without uploading a source file.
- INPUT/OUTPUT: Current settings and curves, optional local IR; 48 kHz, signed 24-bit PCM WAV. Sound duration is 1-180 s; an active wet IR adds its tail, then the final limiter adds 5 ms of leading delay and final flush.
- PROCESSING: Shared core frame renderer, selected parameter slew, edge fade, optional offline convolution, linked final safety limiter, 24-bit encoder.
- EDGE CASES: An edit marks prior download stale. The renderer accepts an abort signal internally, but the current UI has no user-facing render-cancel button. Browser file-download behavior depends on platform.
- CURRENT WEB IMPLEMENTATION: `src/offline-render.js`, `src/oscillator-core.js`, `src/convolution.js`, `src/app.js`.
- TESTS/HISTORY: `tests/modulation.test.mjs`, `tests/convolution.test.mjs`, `tests/output-preview.mjs`; a 3 s stereo file was checked with `ffprobe` at 48 kHz/24-bit on 2026-09-28, and convolution export completed in browser on 2026-09-29.

### OCL-C04: FFT output observation

- CATEGORY: COMMON observation, Oscillator-specific output. STATUS: IMPLEMENTED; numerical dry-path parity tested.
- PURPOSE/USER BEHAVIOR: Inspect an output spectrogram on demand, never edit audio through it. Disabled by default; edits make a previous result stale; Update recomputes.
- INPUT/OUTPUT: Current settings or processed convolved samples -> logarithmic 20 Hz-20 kHz, fixed -90..0 dBFS overview with time axis.
- PROCESSING: 2048-sample Hann FFT, at most 512 time columns, 192 frequency rows, mean stereo power before WAV quantization.
- EDGE CASES: Cancel on playback/export/change, ignore stale Worker generations; brief events may fall between columns. Convolved analysis renders output samples first and can be memory-intensive.
- CURRENT WEB IMPLEMENTATION: `src/fft-preview.js`, `src/fft-worker.js`, `src/spectrogram-core.js`, `src/fft.js`.
- PLATFORM-INDEPENDENT REQUIREMENTS: Label it as an observation with resolution limits; do not imply it is a precision analyzer.
- TESTS/HISTORY: `tests/output-preview.mjs` and `docs/FFT-REFINEMENT-REPORT.md`. Browser FFT update and error-free completion were observed on 2026-09-29.

## Oscillator-specific behavior

### OCL-O00: Mutually exclusive sound modes and static Resynthesis

- CATEGORY: MODULE-SPECIFIC. STATUS: IMPLEMENTED; focused numerical and synthetic-file browser checks completed, perceptual approval pending.
- PURPOSE/USER BEHAVIOR: Oscillator is the default; one opened local file is shared by Resynthesis (partial bank) and Convolution (oscillator plus IR). Only one processing mode is active, and switching between them needs no re-import. Resynthesis uses the user-approved C stereo placement without a placement selector.
- DATA MODEL/PROCESSING: AnalysisResult stores untouched source peaks and metadata. Base Freq, Deviation, and Spectral Slope curves transform the bank during playback/export. The imported recording is not replayed. See `RESYNTHESIS_SPEC.md`.
- EDGE CASES: Sparse sources can yield fewer than 32/64 peaks. Resynthesis partials fade near the high-frequency cutoff and keep phase while silent; the user confirmed that this removed the reported crackle near 2 kHz Base Freq. Mode switching stops playback, retains separate in-memory curves, and does not recreate the audio engine. No time-varying tracking or preset persistence is implemented.
- TESTS: `tests/resynthesis.test.mjs`; synthetic 3- and 64-partial browser import/Play checks. Real-material listening, device underruns and browser download capture remain open.

### OCL-O01: Waveform source

- CATEGORY: MODULE-SPECIFIC. STATUS: IMPLEMENTED.
- PURPOSE/USER BEHAVIOR: Choose Sine, Triangle, Saw, or Square before stacking voices.
- DATA MODEL/PROCESSING: Stable values `sine`, `triangle`, `saw`, `square`; high-frequency Triangle uses band-limited odd harmonics, Saw/Square use polyBLEP-like edge correction.
- EDGE CASES: High-frequency and FM combinations still need listening/device testing; Nyquist mitigation is not a guarantee of zero aliasing.
- CURRENT WEB IMPLEMENTATION: Waveform buttons in `index.html`; `oscillatorSample` in `src/oscillator-core.js`.
- TESTS: Band-limited waveform numerical test in `tests/modulation.test.mjs`.

### OCL-O02: Frequency stack and current values

- CATEGORY: MODULE-SPECIFIC. STATUS: IMPLEMENTED.
- PURPOSE/USER BEHAVIOR: Build 1/2/4/8/16 voices as Unison, Harmonic, Odd Harmonics, or Multiplier and see current voice frequencies.
- DATA MODEL/PROCESSING: Base curve 20-4000 Hz; Harmonic uses `index+1`, Odd uses `2*index+1`, Multiplier cycles the current fixed `[1,1.5,2,2.5]` pattern. Deviation bends Unison in cents and the others by partial/multiplier offset. Slope weights voice amplitude. Unison gets square-root active-count lift, Multiplier fourth-root lift, Harmonic/Odd no count lift. Harmonic uses the user-approved broad index sweep with alternating two-voice-group offset; other Oscillator stacks retain plain index pan. See D-011.
- EDGE CASES: Voices at or above 0.48 * sample rate are omitted; the number sounding can be less than selected count. The Multipliers are not a user-editable Ratio text field in this revision.
- CURRENT WEB IMPLEMENTATION: `stackFrequencies` and `drawFrequency`.
- PLATFORM-INDEPENDENT REQUIREMENTS: Preserve each mode's musical relationship and distinguish a displayed frequency from a perceived fundamental.
- TESTS: Odd Harmonics, modulation, and WAV tests; no subjective tuning approval for all combinations.

### OCL-O03: FM, AM, and Ring

- CATEGORY: MODULE-SPECIFIC. STATUS: IMPLEMENTED.
- PURPOSE/USER BEHAVIOR: Choose Off/FM/AM/Ring; set one carrier-relative modulation ratio; draw the selected mode's strength/depth/blend curve. Curves are retained when changing modes.
- DATA MODEL/PROCESSING: Per-voice sine modulator follows each carrier. Ratio is 0.25-8 (default 1); FM index 0-4; AM depth and Ring blend 0-1. Amount is reduced near the high-frequency limit.
- EDGE CASES: Only one selected modulation mode at a time; no multiple-operator FM or complex matrix. High ratios and high carriers need listening checks.
- CURRENT WEB IMPLEMENTATION: `modulatedOscillatorSample`, `modulationAmountAt`, web mode controls.
- TESTS: Distinct output, zero-modulation parity, ratio response, and high-frequency bounds in `tests/modulation.test.mjs`.

### OCL-O04: Optional local-audio convolution

- CATEGORY: MODULE-SPECIFIC. STATUS: IMPLEMENTED; helper and browser-file workflows tested, perceptual result still under review.
- PURPOSE/USER BEHAVIOR: Open Audio once for both CONVOLUTION (file as an impulse response) and RESYNTHESIS (file-derived partial analysis); adjust Dry/Wet and used IR length in CONVOLUTION. Choose OSCILLATOR to bypass convolution. The loaded audio does not replace the oscillator source.
- INPUT/OUTPUT: Files at most 16 MiB, decoded locally; IR Length 0% starts at min(3 s, file length), 100% uses the full file; Convolution Off keeps the oscillator path.
- PROCESSING: Native Web Audio ConvolverNode with normalization; equal-power-like Dry/Wet after a smoothstep taper; truncated IR gets a 10 ms end taper; linked safety limiter after routing.
- EDGE CASES: Source material can strongly color output, including harsh results; Convolver normalization and limiter do not imply constant perceived loudness. Decode failure retains prior valid IR.
- CURRENT WEB IMPLEMENTATION: `src/convolution.js`, `src/app.js`, `src/offline-render.js`.
- TESTS/HISTORY: Convolution helper tests and bypass identity; actual 4 s test WAV loaded and convolved WAV exported in browser on 2026-09-29. Broader listening and long-IR performance remain open.

### OCL-O05: Automatic safety and edge fade

- CATEGORY: MODULE-SPECIFIC processing. STATUS: IMPLEMENTED; numerical tests cover key bounds.
- PURPOSE/USER BEHAVIOR: Avoid obvious overload and hard sound-duration edges without adding user controls.
- DATA MODEL/PROCESSING: Stack-specific count lift after sum-normalized amplitudes; sample-level soft limit is unchanged through +/-0.9 and asymptotically approaches +/-0.99. Deviation/FM/AM/Ring/Ratio targets have 5-10 ms one-pole slew; Feedback is absent. A final stereo-linked -1 dBFS sample-peak limiter with 5 ms lookahead follows routing in realtime, WAV, and FFT. Voice/FM bounds are separately applied. Oscillator source has an 8 ms start and 12 ms end linear fade in Worklet, WAV, and dry FFT synthesis.
- EDGE CASES: Immediate Stop zeros output without a dedicated Stop-release ramp. Safety limits peaks, not harsh timbre, aliasing in every condition, or stable loudness across arbitrary IRs.
- CURRENT WEB IMPLEMENTATION: `src/oscillator-core.js`, `src/oscillator-worklet.js`, `src/offline-render.js`, `src/fft-worker.js`, `src/convolution.js`.
- TESTS/HISTORY: `tests/modulation.test.mjs` and `tests/safety-dsp.test.mjs` bounds and fade tests; five-case Worklet/WAV/FFT numerical comparison including limiter-active FM stress. Fade introduced 2026-09-29; count lift and final limiter 2026-10-01. No documented human listening approval yet.

## Not implemented / held

Per-oscillator editing, 32/64 manually stacked OSCILLATOR-mode voices, waveshape drawing, a user-editable multiplier/Ratio pattern, multiple FM operators, complex modulation matrix, resonance/filter controls, time-varying partial tracking, and a high-resolution precision FFT analyzer are **not current features**. Resynthesis separately supports up to 32/64 analyzed peaks. A proposed preset/state format is not implemented. Keep proposals distinct from the current registry until a bounded implementation and tests exist.
