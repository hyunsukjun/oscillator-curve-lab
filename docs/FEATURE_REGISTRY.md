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
- INPUT/OUTPUT: Current settings and curves, optional local IR; 48 kHz, signed 24-bit PCM WAV. Sound duration is 1-600 s; an active wet IR adds its tail, then the final limiter adds 5 ms of leading delay and final flush.
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

### OCL-C05: Output Duration control

- CATEGORY: COMMON interaction. STATUS: IMPLEMENTED; 600 s dry mono WAV numerically checked, 600 s dry FFT completed in the local browser, and short dry/wet browser exports downloaded. Long wet render and device stress remain open.
- PURPOSE/USER BEHAVIOR: The Output Duration slider is always visible below the parameter toolbar; no extra toggle is needed and using it does not change the selected curve or editing tool. Short range is 1-60 s; long range is 60-600 s, both in 1 s steps. Switching ranges clamps an out-of-range value.
- INPUT/OUTPUT: Changing duration stops playback, returns position to zero, and stretches the same normalized curve over the new sound time. The panel shows an estimated 48 kHz/24-bit WAV file size for the selected channel count, including current wet IR tail and limiter flush; this is not an estimate of render memory.
- EDGE CASES: Controls lock during rendering. The output may exceed selected sound duration because of wet IR tail and the existing 5 ms limiter flush. A 10 min stereo dry file alone is about 172.8 MB; renderer buffers and FFT wet analysis require additional memory. Browser/device stability at this limit is not approved.
- CURRENT WEB IMPLEMENTATION: `index.html`, `src/app.js`, `src/styles.css`, `src/offline-render.js`, `src/fft-worker.js`.

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

## Hub identity pilot

IMPLEMENTED (2026-10-05): Hub v0.10 header symbol, micro favicon and Oscillator #28CDB0 identity. Publication authorized after local review on 2026-10-05. See `IDENTITY_PILOT.md`.

## 2026-10-06 — WAV-only limiter latency compensation (local, unpublished)

WAV files remove the 5 ms leading lookahead latency after flushing the unchanged safety limiter. Dry files now have exactly the generated frame count; wet files retain the full convolution length N + IR.length - 1 at matched 48 kHz. No end trimming, gain, ceiling, attack/release, oscillator or partial changes. Realtime and internal samplesOnly/FFT reference retain their existing delayed timeline; comparisons align WAV by 240 frames. This is file-time correction, not listening-led tuning.

Verified: mono/stereo 1s and 60s output PCM equals the previous WAV after its 240-frame prefix; 17 limiter/convolution/resynthesis/file-duration tests pass; five Preview/WAV/FFT numerical comparisons pass after time alignment; six browser convolution cases (mono/stereo × wet 0/.5/1) preserve body/tail and match reference PCM within 24-bit quantization tolerance. Actual device listening and long/large IR limits remain unverified.

## Transport keyboard guard (2026-10-07)

Spacebar invokes one Play/Stop action per press; repeated keydown is consumed without retriggering. Disabled Play and active WAV rendering block the shortcut. Inputs, selects, textareas and editable text retain native keyboard behavior. Synthesis, seek, Stop-to-zero and WAV data are unchanged. Verified by `tests/transport-keyboard.test.mjs` and a browser Play/Stop/Resynthesis-disabled smoke check.


## 2026-10-11 — Pending Play cancellation

Play now checks its captured playback token after both engine preparation and asynchronous Convolution installation. Stop during either wait prevents an obsolete request from opening output gain or starting playback. Multiple pending Play calls start only once; a subsequent explicit Play still works. DSP, IR preparation, safety limiter, curves, and export format are unchanged.

Actual-handler delayed-initialization regression failed before the fix and passes engine-wait cancellation, convolution-wait cancellation, duplicate Play and explicit retry after correction. Existing keyboard, render lifecycle, convolution and syntax checks pass. This is request cancellation evidence, not measured cold-start latency or listening approval. Mode switching/file-import cancellation during initialization remains a separate review item. Convolver installation itself is not aborted; this change prevents obsolete playback after its completion.


## 2026-10-11 — Pending Play across mode/import/analysis

Mode changes, analysis restarts with source samples, and accepted file reads now invalidate a pending Play even when isPlaying is still false. Previously these actions only stopped active playback and could allow engine preparation to complete into the new context. File chooser cancellation and over-limit files rejected before decoding preserve the current state. Failed accepted imports retain the existing usable IR but cancel the earlier Play request. Sound processing and analysis algorithms are unchanged.

Actual-handler regression tests/pending-play-context.mjs: old mode-switch case failed; corrected mode switch, analysis restart and corrupt-file cancellation pass, as do chooser cancellation and size rejection preservation. Existing pending setup tests pass. Controlled waits isolate the race; this is not an audible latency measurement. Standalone should invalidate asynchronous playback requests when the source or sound mode changes.


## AIFF input compatibility (2026-10-11)

See [AIFF import contract](AIFF_IMPORT.md): local PCM AIFF 16/24-bit mono/stereo
normalization into PCM WAV before the established decoder. Existing DSP,
resampling and Lab-specific channel policies are preserved. Browser and memory
verification limits are recorded there.


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


## 2026-10-14 UI scope update
Output Duration now uses one 0–600s slider (zero disables playback/export); FFT Preview UI and runtime wiring are removed. Resynthesis FFT analysis remains. Canvas heights follow the actual viewport budget. Earlier FFT descriptions are historical. See [implementation, verification and review](UI_REVIEW_2026-10-14.md). No sound-algorithm tuning or deployment in this change.


## 2026-10-14 — Synthesis hierarchy (local review)

Current Oscillator Values / Current Analyzed Partials and secondary readouts are retained in a default-closed Synthesis detail disclosure. No synthesis capability removed or added.


## 2026-10-14 — Family file information

Approved circular dotted-i disclosure immediately left of Open Audio. Default format guidance moves into this optional panel; privacy and actual error/status notices remain. Space operates disclosure without audio transport; Escape/outside click dismiss. Output guidance: 1–600 sec synthesis, plus file IR tail when used · Mono / stereo · 48 kHz / 24-bit WAV. Input limits reflect current implementation, not a device-memory guarantee. No DSP, admission, export, IDs or defaults changed.


## 2026-10-14 — Family parameter help

Static parameter descriptions are available on the relevant buttons using the Audio help design; current values, axes and activation feedback remain visible. See `docs/PARAMETER_HELP.md` (or `PARAMETER_HELP.md` in this directory). No DSP or curve mapping changes.


## 2026-10-14 — Disclosure keyboard ownership
Synthesis detail 등 summary에 포커스한 Space는 기본 패널 열기/닫기에 맡기고 transport가 가로채지 않는다. Enter·Tab과 나머지 Space 재생 정책은 유지한다. 음향 엔진 변경 없음.

## 2026-10-15 — Reachable export cancellation

Download WAV becomes Cancel during rendering. A second click aborts the existing job and returns without starting another render. Cancelling is disabled until cleanup; completion restores Download WAV and controls. Abort reports cancelled. Previously an AbortController existed but the download control was disabled, making cancellation unreachable. Settings, curves, synthesis, IR, resynthesis, WAV format and DSP are unchanged. Future standalone should likewise expose cancellation and allow a clean retry. Verification: actual-handler regression and Safari lifecycle; listening and Windows remain separate.

## 2026-10-15 — Imported-source tone overview (local review)

Oscillator previously had only frequency/partial and curve canvases, not a source waveform. A 96px source-time overview now appears after a successful file import, before Synthesis detail; it is hidden without a file. It shows the full imported recording, not the IR crop, center analysis excerpt, generated output or output-time seek position. There is no seek/playhead on this static reference. Original-file meaning is retained in the canvas accessible label/title and wide-screen caption; compact screens retain Source time and Source tone.

Shared family palette maps original spectral centroid blue→teal→gold→peach. Up to16k signed min/max buckets and HiDPI envelope retain transients; shared display gain preserves channel-relative level without altering samples. Bounded worker analysis copies at most8MiB /2,048 FFT windows; previous job terminates on replacement. Colors fall back to blue if analysis fails. Static drawing runs on load/color completion/resize, not per audio frame. Failure hides this optional panel without rejecting audio.

Verified: source-color/immutability tests, syntax and diff checks; actual stereo file import, File Resynthesis selection,32→64 partial selection, Play/Pause, File IR mode playback and rewind; narrow approximately600px view and console without errors. No-file state hides overview. Follow-up: actual Brave125%/150% zoom verified at a900×700 viewport (600CSS px at150%). Both modes retain readable source waveform/legend; no horizontal document overflow. Transport reachable by vertical scrolling; Play/Pause checked. User musical listening, Windows and DSP regressions are separate. User approved commit/deployment after zoom verification (2026-10-15).

## Web partial monitor visibility — 2026-10-18
Current Oscillator Values canvas and Synthesis detail heading are hidden, with monitor drawing skipped. DOM, renderer, and synthesis model are retained for later Standalone evaluation. Current parameter readouts remain visible. Freed monitor height is available to the curve editor; short windows retain scrolling. No DSP change.

## IR retained-history control — 2026-10-25

- BEHAVIOR: active wet-IR Pause/Resume retains valid processing history; the slider selects sound duration, and the clock separately includes tail/flush. Invalidating changes discard history; same-mode no-op and pre-admission rejection preserve it. No arbitrary tail seek.
- IMPLEMENTATION: local src/app.js control/state/meter change; core DSP, safety algorithms, WAV engine and shared transport are unchanged. No O3 B placement change.
- EVIDENCE: prior isolated retained-node, late-cancel, meter, dry and two-boundary checks, user IR listening and actual nonplaying navigation are linked in KNOWLEDGE_PRESERVATION.md. Product integration checks are recorded separately. Implementation and publication are separate from final scoped acceptance.


## 10 ms playback boundary candidate — 2026-10-25

The current local candidate supersedes earlier automatic transport-boundary durations with the [10 ms playback/WAV contract](PLAYBACK_BOUNDARY.md). Source/effect envelopes are separate. See that contract for pause-state retention, existing tail-length limits and verification status. Uncommitted; listening acceptance pending.


## 2026-10-26 — Harmonic low-partial center / alternating upper partials

User explicitly authorized implementation, commit and deployment: fundamental/harmonics 1–8 use equal-power center in Harmonic; 9 onward alternate L/R, starting 9=L and 10=R. Current maximum Harmonic count is 16; no count range was added. The original harmonic index is stable when Nyquist culls voices. Unison/Odd/Multiplier and File Resynthesis retain their existing mapping. Frequency, slope, phase, modulation, normalization, convolution, limiter and 10 ms boundary policies are preserved; the changed synthesis input also reaches convolution. Preview and offline share this core. This is a deliberate change to channel allocation, not global mono summing or a new gain compensation.

The prior isolated eight-harmonic B listening was preferred by the user (steadier center, less unnatural panning, narrower width acceptable). That observation does not certify the new 9–16 placement or all musical material; numerical verification and publication are separate from new personal listening. See `HARMONIC_STEREO_2026-10-26.md` for the exact contract, verification and rollback scope.

## Readout context family release — 2026-10-27

Existing current-value captions now identify their basis. Stack/Base/Deviation/Slope/Voices captions identify output-playhead synthesis/derived values before modulation/IR/output processing. Static source overview and hidden partial canvas retained. See `READOUT_CONTEXT_CONTRACT.md` for basis, source-range rules, verification boundary and portability.


## Common output transport presentation — 2026-10-27

Single output `mm:ss.cc / mm:ss.cc` clock and common English control/state descriptions replace the dual Korean output/synthesis diagnostics. The existing common transport now follows full output time, including active IR tail/limiter flush. Range input uses that same output scale; valid sound-time seeks retain their old path, while unsupported tail seeks restore the actual bar position without discarding paused IR history. Dry flush endpoint uses the existing synthesis endpoint.

This supersedes only the source-scaled slider/dual-clock presentation in the 2026-10-25 notes. Retained graph Pause/Resume, natural end, source/curve meaning, render/fade/safety and CLIP rules remain. See [transport display contract](TRANSPORT_DISPLAY_CONTRACT.md). User authorized tests, commit and deployment; technical/browser evidence is separate from listening/Native acceptance.

## Shift group / Option erase — 2026-10-27

IMPLEMENTED / UI checks verified as stated in the contract. Add Shift suffix Y-only group movement and replace Mac temporary Command erase with Option erase. Existing musical values and normal editing are retained. The user individually reviewed the five-Lab interaction and reported no major issue, then authorized commit/deployment. Publication evidence remains separate. See [gesture contract](CURVE_GESTURE_CONTRACT.md).


## Readout hierarchy and shortcut reference — 2026-10-28

IMPLEMENTED / USER-APPROVED WEB UI. Existing fields/IDs/labels/units/value origins retained; edit target and point count lead musical values, followed by input/engine/safety references. All values stay visible. An optional Shortcuts guide exposes only current per-Lab bindings; no source-volume/Undo feature is copied from Audio. Curve values are before modulation and file IR. Output progress includes the existing tail; it does not imply arbitrary tail seeking.

## Toolbar and information visibility — 2026-10-28

IMPLEMENTED / USER-APPROVED WEB UI. Move existing Clear Current/Reset All nodes to the first source-path row immediately below Open Audio/Download WAV. Keep IDs/listeners and source-path order. Shortcuts and Safety stay in their existing roles; there is no Engine readout to remove. No new controls, shortcuts, processing or value model. The user approved commit/deployment after visual review on 2026-10-28; publication success is verified separately.


## 2026-10-29 — Shared musical default source

Use the approved shared Bach mallet MP3 in the role documented in [default source](DEFAULT_SOURCE.md). Existing chosen-energy-channel analysis,32/64 partial selection, separate mode curves, output duration, native synthesis, modulation, IR and safety algorithms are unchanged. DSP and musical mappings are unchanged.

## Safe decoded input admission (2026-10-29)

IMPLEMENTED, USER-AUTHORIZED RELEASE. Reject empty/invalid decoded audio and nonfinite PCM before source adoption. A failed import retains the previous valid source and its editing/IR/analysis state; a later valid file recovers. Finite PCM and existing DSP/limits remain unchanged. See [input contract](INPUT_VALIDATION.md).


## Local live transition / seek correction — 2026-10-29

Live Waveform/Count/Frequency Layout now transition over10ms before the existing IR path. Playing Return to start/source-body seek crossfades positions and preserves Convolver/limiter history. Latest settings remain the Render target. No new visible control or parameter. See [contract and verification limits](LIVE_TRANSITION_2026-10-29.md). User approved commit/deployment on2026-10-29; publication proof is separate.
