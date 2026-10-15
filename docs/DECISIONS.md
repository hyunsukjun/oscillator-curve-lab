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

## D-009: Stack-aware count compensation and final measured safety

- RECORDED: 2026-10-01. STATUS: Implemented and numerically tested; listening approval pending.
- DECISION: Replace uniform L1-only stack gain with a `sqrt(activeCount)` lift for Unison, a gentler fourth-root lift for Multiplier, and unchanged L1 gain for Harmonic/Odd/Resynthesis. Slew Deviation (8 ms), FM strength (5 ms), AM/Ring amount (8 ms), and log Ratio (10 ms). Replace the old output WaveShaper with a linked -1 dBFS sample-peak limiter after optional convolution in realtime, WAV, and FFT paths.
- REASON: The previous 16-voice default Unison Sine peak/RMS was about 0.154/0.109 versus 0.580/0.410 at one voice. The new 16-voice result is about 0.614/0.434. Applying `sqrt(N)` indiscriminately to Harmonic/Odd would raise their stronger existing peaks excessively; Multiplier needs a smaller lift. Slew targets isolated sudden transitions without changing the drawn gestures. The final limiter must observe wet output as well as oscillator output.
- LIMIT: A strong 16-voice Unison Saw/FM stress case reaches the limiter for much of its duration; no perceptual transparency claim is made there. This is sample-peak, not true-peak protection. Human matched-level A/B, browser/device stress, and IR-dependent listening are still required before musical approval.
- ALTERNATIVE: A uniform `1/sqrt(N)` across all stacks, or a compressor as a default sound effect, was rejected for this pass. Preserve the old L1-only result as a comparison, not a target.

## D-010: Reject fully alternating partial pan

- RECORDED: 2026-10-01. STATUS: Alternating-pan candidate rejected after user A/B; the original progression was restored before D-011.
- DECISION: Do not center the first voice and alternate every later Harmonic voice at pan -0.7/+0.7. Keep production Spectral Slope at -9 dB/oct pending a separate brightness decision.
- REASON: A 16-voice Saw/Harmonic A/B at -9 and -6 dB/oct showed about 18.5 and 12.4 dB left/right RMS imbalance with the original low-to-high pan. Centering the first voice and alternating later voices at -0.7/+0.7 reduced this to about 1.3 and 1.8 dB, but the user heard the result as more uniform, thicker and closer, and less musically interesting. The original frequency-to-space progression matters more here than numerical L/R equality.
- LIMIT: A numerical L/R balance target alone cannot decide spatial musicality. The fine high-frequency "furry" texture in Saw/Harmonic has not been isolated as aliasing versus dense overtones; no filter, waveform, or high-shelf was changed.
- AFFECTS: Oscillator partial-stack spatial behavior in realtime, WAV, FFT, and future standalone. See `KNOWLEDGE_PRESERVATION.md`.

## D-011: Adopt the approved two-voice Harmonic pan candidate

- RECORDED: 2026-10-01. STATUS: User selected B after matched-level glissando A/B; implemented for Harmonic only and numerically verified.
- DECISION: Preserve the original low-to-high pan sweep, then add a small alternating side offset for successive two-voice groups. For active voice index `i` and count `N>1`, use `sweep=2*i/(N-1)-1`, `side=-1` for even two-voice groups and `+1` for odd groups, and `pan=clamp(0.8*sweep+0.45+0.38*side,-1,1)`. A single active voice stays centered. Unison, Odd, Multiplier, and Resynthesis pan remain unchanged.
- REASON: In the 4 s Saw/Harmonic/16-voice 2900-to-110 Hz matched-RMS glissando, original A measured about 19.4 dB L/R RMS difference; B measured about 9.8 dB. Unlike D-010's uniform alternating pan, B retained the broad frequency-to-space progression. The user preferred B and asked to use it.
- LIMIT: The measured L/R difference is reduced, not eliminated. This approval covers the compared Harmonic example, not every waveform, count, modulation, IR, headphone, or speaker setup. Pan changes when active voice count changes near the high-frequency cutoff; long-glissando listening and cross-browser/device checks remain useful.
- AFFECTS: `voicePan` in realtime, WAV, and FFT; future standalone pan rule. See `KNOWLEDGE_PRESERVATION.md`.

## D-012: Resynthesis stereo placement listening comparison

- RECORDED: 2026-10-02. STATUS: A/B/C audition completed by the user; C approved as the Resynthesis default.
- DECISION: Keep A as the existing low-to-high partial pan. Offer B in Resynthesis only: the first detected peak is centered with equal-power gain in L/R, and subsequent detected peaks alternate hard left/right. The same selection reaches realtime, FFT, and WAV output.
- REASON: The user hears a left-heavy Resynthesis result and wants to judge whether a central pitch root with spatial branches is more musical. This test must not alter the approved Harmonic-stack pairing in D-011.
- LIMIT: The first detected peak is only the lowest selected spectral peak, not a verified musical fundamental. Alternating by index does not guarantee equal channel energy when partial amplitudes differ. Audition with the same source and levels before deciding on a permanent layout.
- FOLLOW-UP 2026-10-02: The user heard B as substantially more stable and tonally tidy than A, but less vivid. C keeps the first detected partial centered and uses `0.8 * B pan + 0.2 * A sweep pan` on later partials. After listening, the user selected C as the default; A and B remain comparison choices. Approval is for the heard material, not a claim of universal stereo balance.
- FINAL 2026-10-02: The user confirmed C as the sole Resynthesis placement. Remove the A/B/C control and runtime branches; preserve A/B descriptions here as decision history, not product options.

## D-013: One imported audio source for Convolution and Resynthesis

- RECORDED: 2026-10-02. STATUS: Implemented; browser verified in both import directions with a local stereo WAV, including Resynthesis and Convolution playback. Real-material listening remains open.
- DECISION: Open Audio decodes one local file and prepares both its Convolution IR and its static Resynthesis analysis input. Switching between these modes retains the file; no second import is required. The common file limit is 16 MiB.
- REASON: The user wants to compare the two transformations of the same sound without maintaining separate imported files. Separate mode processing and Resynthesis curve state remain unchanged.
- LIMIT: Convolution still treats the file as an IR driven by the oscillator, while Resynthesis makes a sine-partial bank from a centered segment and a single selected channel. Neither mode directly plays the source recording. Static analysis can fail for unsuitable or silent material even when the IR is valid.

## D-014: Smooth Resynthesis partials at the high-frequency cutoff

- RECORDED: 2026-10-02. STATUS: Implemented and accepted by the user after listening; the reported high-Base-Freq crackle disappeared. Automated tests passed, but the source file itself was not available for independent analysis.
- DECISION: Replace Resynthesis-only hard partial omission with smoothstep amplitude taper from `0.42 * sampleRate` to the existing silent boundary `0.48 * sampleRate`. Advance every analyzed partial's phase even while it is inaudible. Include tapered amplitudes in the existing sum normalization.
- REASON: With a screenshot showing an approximately 84 Hz detected root, a 1003 Hz source partial crosses the 48 kHz engine's 23,040 Hz cutoff near 1.93 kHz Base Freq, close to the user's report of crackle near 2 kHz. Hard removal/reentry and changing normalization are a stronger hypothesis than peak clipping, but the original file has not been measured.
- LIMIT: The user approved this behavior for the reported listening case, not the exact 42% margin as a universally optimal value. This is not a general anti-aliasing guarantee, a global filter, or a change to Oscillator stack behavior. Preserve the old hard-cutoff behavior in history as the rejected approach.

## D-015: Preserve stereo input through the offline convolution tail

- RECORDED: 2026-10-02. STATUS: Implemented for offline convolution; browser numerical verification completed, user listening pending.
- DECISION: Zero-pad each offline oscillator input channel to the full oscillator-plus-IR output length before the native ConvolverNode. Do not change the audio samples during the oscillator interval, the Convolver normalization, or the limiter.
- REASON: In the confirmed 1 s A/B render, the stereo BufferSource ended exactly at 1.00 s; the remaining Convolver tail became identical in L/R. The right channel made an audible-sized step and suddenly matched the louder left channel. Keeping two silent source channels alive prevented that topology change.
- AFFECTS: Offline WAV and processed FFT rendering. The realtime Worklet already emits two channels through its tail; its device behavior needs separate listening verification. B lookahead remains an unapproved comparison candidate.

## D-016: Trial B lookahead as the shared final limiter

- RECORDED: 2026-10-02. STATUS: Implemented locally for realtime, WAV, and FFT; automated and browser lifecycle checks passed; final user listening remains pending.
- DECISION: Use the user's preferred B envelope (5 ms future-peak window, 1 ms attack, 100 ms release, -1 dBFS sample ceiling) after dry/wet summing. Realtime delays the entire mixed signal by 5 ms. WAV and FFT include the same leading delay and final flush; transport compensates its displayed position and natural end.
- REASON: After D-015 removed the 1 s stereo-tail click, the user heard B as much better than A and approved proceeding with realtime/latency validation. A was transparent below its ceiling but its zero-lookahead gain jumps contributed to crackly chopping in the tested full-IR condition.
- LIMIT: This is not true-peak limiting and does not address the IR's low-mid buildup. The 5 ms latency changes output duration and needs further listening across devices and source files before calling the sound final.

## Open decision: IR-dependent tonal variance

User observation: some source/parameter combinations sound attractive while others sound harsh; high versus low imported source material can reverse which base-frequency region feels useful. No automated EQ, spectral matching, revised Convolver normalization, or new parameter has been approved. Next investigation should use named audio files, identical output level, matched settings, rendered audio and listening notes, distinguishing clipping, aliasing, convolution coloration and intended timbre. Record any chosen adjustment's old/new values and listening setup in `PARAMETER_SPEC.md` and `DSP_BEHAVIOR.md` before calling it approved.

## D-017: Hub v0.10 identity pilot

2026-10-05: Replace temporary green identity and generic mark with Hub Oscillator #28CDB0 and original oscillator symbols. Preserve synthesis, interactions and semantic parameter colors. Local review completed; user authorized commit and publication on 2026-10-05. See `IDENTITY_PILOT.md`.

## D-018: Expose Output Duration as a curve-workbench control

- RECORDED: 2026-10-05. STATUS: Implemented locally; long browser/device stress remains unverified.
- DECISION: Replace the top numeric Sound Duration field with a toolbar Duration button and collapsible 1-60 s / 60-600 s slider. Use integer seconds; retain normalized curve points and stop/reset playback on value changes. Preserve the existing convolution tail and 5 ms limiter flush rather than redefining duration as final file length.
- REASON: Duration determines how quickly every curve gesture unfolds and belongs beside curve selection. A compact short range supports ordinary editing while a separate long range allows ten-minute output without sacrificing slider precision. The file-size estimate makes the long-output cost visible.
- TRADEOFF: The previous 0.5 s step and 180 s ceiling are replaced. Stereo 48 kHz/24-bit PCM is about 172.8 MB at 600 s before IR tail; temporary JS arrays, offline convolution and processed FFT can use much more memory. A successful Node dry render is not proof of stable long wet rendering on every browser.
- FOLLOW-UP 2026-10-05: After reviewing a visual mockup, the user chose an always-visible compact Duration row directly below the parameter toolbar. Remove the toggle button, but retain the same ranges, mapping, stop/reset behavior, and output estimate. On low or narrow screens, preserve the editor's minimum height and allow vertical scrolling.

## D-019: Fit the complete curve time axis within the workspace

- RECORDED: 2026-10-05. STATUS: Implemented locally; laptop and narrow-browser resize, point-addition, backing-size, and no-horizontal-overflow checks passed. Touch precision remains unverified.
- DECISION: Remove the 1800 px minimum from the frequency/curve Canvas stack. Both Canvas display widths follow the available workspace; backing resolution and point hit testing continue to use their measured CSS dimensions.
- REASON: The former minimum made a 1288 px laptop viewport show only about 1256 px of an 1800 px time axis. A user could not see the full curve or its end point without horizontal scrolling.
- AFFECTS: Display geometry only. Normalized point x/y, interpolation, DSP timing, and WAV output remain unchanged. On very narrow screens, the same complete time axis is compressed and pointer precision deserves separate touch testing.

## 2026-10-06 — WAV-only limiter latency compensation (local, unpublished)

WAV files remove the 5 ms leading lookahead latency after flushing the unchanged safety limiter. Dry files now have exactly the generated frame count; wet files retain the full convolution length N + IR.length - 1 at matched 48 kHz. No end trimming, gain, ceiling, attack/release, oscillator or partial changes. Realtime and internal samplesOnly/FFT reference retain their existing delayed timeline; comparisons align WAV by 240 frames. This is file-time correction, not listening-led tuning.

Verified: mono/stereo 1s and 60s output PCM equals the previous WAV after its 240-frame prefix; 17 limiter/convolution/resynthesis/file-duration tests pass; five Preview/WAV/FFT numerical comparisons pass after time alignment; six browser convolution cases (mono/stereo × wet 0/.5/1) preserve body/tail and match reference PCM within 24-bit quantization tolerance. Actual device listening and long/large IR limits remain unverified.

## 2026-10-06 — Cooperative offline render and native cancellation (local candidate)

The synthesis, limiter, peak scan and 24-bit encoding now yield between bounded chunks. The synchronous reference and asynchronous export share generator implementations for the unchanged limiter and encoder. Settings are snapshotted at render start. The native convolution retains normalization, routing and full stereo IR tail; when a signal is supplied, two-second audio-time suspension boundaries check abort. On cancellation the graph is cleared and native rendering is allowed to finish before AbortError, preventing a detached job from outliving its promise. Suspension is scheduling only; it is not an audio envelope or wall-clock two-second wait.

Evidence: 24 existing unit tests plus two lifecycle tests pass; eight mode/format cases preserve WAV bytes and FFT PCM exactly against the previous HEAD implementation. Five Worklet/WAV/FFT comparisons pass. Four native wet cases compared with HEAD: maximum absolute PCM error 7.45e-9 (one mono mix case), others zero; repeat HEAD reference error zero. Thus wet output is numerically equivalent within a much smaller error than 24-bit quantization, not bit-identical. Three native cancel/recovery cycles with 60s source /3s IR: about40ms after abort; separate6s IR trial about96ms versus previous3058ms. Actual app Play/Stop/export returns to enabled controls and shows2ch48k/24, no console warnings/errors; saved-file reopening not repeated.

Ten-minute dry Node16-voice extremeFM: correct600s/172800044bytes/peak0.891250908; largest event gap34ms versus1636ms baseline, elapsed67s versus58s. FinalRSS~892MiB; this does not reduce memory cost. First browser60s trial overlaps a Node job: maxgap37ms, elapsed8.58s; do not treat as isolated speed comparison. Native cancellation remains bounded by reaching a render checkpoint and draining; not an immediate termination API. Safari, low-end hardware, large-IR memory and controlled listening remain open.

## Keyboard commands follow transport availability (2026-10-07)

The prior Space handler toggled for every key-repeat event and did not check disabled Play/export state. Replaying the actual handler with one initial event plus five repeats produced six transport calls; disabled Play still dispatched one call. Guard the existing handler rather than change the audio engine: consume repeats, protect editing controls, respect export and disabled Play, and consume keyup. This preserves normal Play/Stop semantics and prevents keyboard routing from bypassing the visible control contract. Browser hardware held-key testing remains separate from deterministic event replay.


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

UI hierarchy follows source path, synthesis configuration, then time-curve editing. This is a UI-only transition toward file-informed synthesis. Convolution remains an exclusive existing oscillator+IR route; Resynthesis+Convolution is not newly enabled. No parameter IDs, defaults, mappings, DSP, analysis or export changes.


## 2026-10-14 — Family parameter help

Static parameter descriptions are available on the relevant buttons using the Audio help design; current values, axes and activation feedback remain visible. See `docs/PARAMETER_HELP.md` (or `PARAMETER_HELP.md` in this directory). No DSP or curve mapping changes.


## 2026-10-14 — Disclosure keyboard ownership
Synthesis detail 등 summary에 포커스한 Space는 기본 패널 열기/닫기에 맡기고 transport가 가로채지 않는다. Enter·Tab과 나머지 Space 재생 정책은 유지한다. 음향 엔진 변경 없음.

## 2026-10-15 — Reachable export cancellation

Download WAV becomes Cancel during rendering. A second click aborts the existing job and returns without starting another render. Cancelling is disabled until cleanup; completion restores Download WAV and controls. Abort reports cancelled. Previously an AbortController existed but the download control was disabled, making cancellation unreachable. Settings, curves, synthesis, IR, resynthesis, WAV format and DSP are unchanged. Future standalone should likewise expose cancellation and allow a clean retry. Verification: actual-handler regression and Safari lifecycle; listening and Windows remain separate.

## 2026-10-15 — two visible synthesis paths (local review)
The top selector contains File Resynthesis and Oscillator + File IR; remove the redundant SYNTHESIS SOURCE label and standalone Basic Waveform button. Default to Oscillator + File IR with no IR, retaining the previous dry oscillator sound. The empty state reads “No IR loaded · dry oscillator”. Resynthesis shows file/Analyze/Partials; the oscillator path shows Waveform/Count/Layout/Modulation plus IR controls only when a file is available. Wet=0 preserves dry synthesis after import. Existing internal oscillator DSP branch and separate curve stores remain; no synthesis algorithm or parameter mapping change. Mode switching still stops playback and preserves each path's curves/settings.

Validation: pending-play-context, convolution (including bypass WAV identity), resynthesis tests pass. Actual browser dry/resynthesis/IR playback and four WAV saves passed (48kHz, 24-bit stereo; dry/resynthesis/Wet0=1s, Wet100=3s including 2s IR tail). FM choice restored after switching back. Both modes at900/390 CSS px had no horizontal overflow or curve/transport overlap; natural vertical scrolling remains. Listening and native confirmation keyboard deferred. No commit or deployment yet.

## 2026-10-15 — automatic partial refresh
Remove Reanalyze: importing a file and changing32/64 already trigger analysis. On a partial-count change with an existing result, keep the old result and transport running until the latest generation completes, then send updated settings without seek/restart. Preserve base curve, paused position, and paused state. Failure retains the old playable result and shows an error. Initial import retains its existing stop/invalidation contract. Remove the redundant Estimated base completion sentence; pending/error text remains and actual counts/base values stay in the monitor. This supersedes the earlier Reanalyze-label note.

Validation: live-partial-switch controlled race/failure tests and pending-play-context/resynthesis regressions pass. Browser32→64 at7.20s continued through7.36s with Play active and64/64; paused64→32 stayed paused at7.42s. This proves transport continuity, not artifact-free perceptual switching; comparison listening remains deferred.
