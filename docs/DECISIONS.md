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
