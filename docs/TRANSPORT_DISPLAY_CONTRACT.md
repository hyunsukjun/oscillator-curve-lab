# Common output transport display — 2026-10-27

User-approved Oscillator-only footer alignment: implement, test, commit and deploy. This supersedes only the earlier dual-clock/source-scaled slider presentation. Synthesis, IR processing, latency compensation, fades, curve time and retained-history control remain unchanged.

## Display and mapping

The common footer shows one `mm:ss.cc / mm:ss.cc` output clock. Its existing total includes the active IR tail and limiter flush; it is not redefined as synthesis length or exact encoded WAV duration. The shared transport component uses the same output duration and current output seconds for its progress. It continues advancing during the tail rather than reaching the right edge at the synthesis boundary. Keep the existing common CSS, icons, focus, keyboard, meter algorithm and CLIP latch.

Pointer and native range-key input map the fraction to that same output duration. Requests within synthesis duration use the existing `seekSourceSeconds` path. Arbitrary IR-tail seeking is still unsupported: a request beyond synthesis duration is rejected, the bar returns to the actual position, and paused history/playing state are preserved. This is not a clamp into a different audible position or a new tail reconstruction engine. For dry/Wet0 output, selecting the final limiter-flush endpoint maps to the existing sound endpoint; the next explicit Play retains the existing restart-from-zero behavior.

Play/Pause/Return to start remain the common controls, with English accessible names. The visible footer no longer repeats synthesis time or appends normal Korean diagnostic notes. Titles/accessible descriptions carry playback phase and the synthesis-only seek limit. Actual pause/resume failures or an invalid retained state also keep a short visible English failure notice; it can wrap on a narrow screen. The shared module still exposes the numeric clock as the range value text. Paused/stopped meters keep no live reading (`—`) and English state descriptions; stale analyzer values are not treated as live.

## Protected behavior

Valid Pause/Resume reuses the current AudioContext, source Worklet, Convolver and limiter. The existing 10ms pause boundary and resulting resumed position remain. Valid direct sound seek/reset retains its previous history invalidation rules; rejected tail seek does not invalidate history. Natural end returns the clock and bar to zero. Zero duration, missing resynthesis analysis, transition and active-render guards remain. Curve editing/readout time still divides by synthesis duration, independently of the output bar. Imported source overview remains static and is not output navigation.

## Verification and portable asset

Focused actual-function tests cover full-output clock/progress, valid input mapping, tail rejection without stop/seek, endpoint behavior and disabled states. Silent browser observations check dry/IR/resynthesis body/tail, retained graph identity, natural end, pointer/keyboard and equal-size before/after layouts. Processing/core/Worklet/convolution/limiter/render files must remain byte-identical. These checks are not listening or platform-wide acceptance.

For Standalone, share the output clock and progress basis but expose engine-specific seek capability honestly. Full-output progress does not imply arbitrary access to history-dependent effect tails. Do not stretch curves, trim output or reset effects to make the bar appear uniform. Native gestures/typography and tail reconstruction remain separate design/implementation work.
