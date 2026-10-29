# IR body release and AC analysis guard — 2026-10-30

Status: local pre-commit candidate. No commit, deployment, listening acceptance or Native implementation. The previous startup-default candidate remains included. Existing frozen UI acceptance is not enlarged.

## Confirmed problems

- With an enabled wet IR whose retained tail extends beyond the generated body, the source stopped abruptly at Output Duration. The existing final 10 ms envelope acted at the end of the complete output, so it could not remove this internal body/tail boundary. A padded delta IR isolates this from musical transients.
- The analyzer checked raw window energy and normalized peaks relative to the strongest bin. A constant DC offset could pass energy admission and promote tiny FFT residue into an audible bank. This is an analysis problem, not invalid PCM or evidence of a source-routing buffer failure.

## Implemented behavior

`ir-source-boundary.js` supplies a source **release only**, shared by the source Worklet and offline renderer. It is active only for an enabled IR with Wet > 0 and a positive retained tail. The generated body tapers over its final 10 ms to zero before the convolver. No second source attack is added. Dry synthesis, disabled IR, Wet=0, and a one-frame IR bypass it. If the tail is shorter than 10 ms, the source envelope compensates for the overlapping existing final envelope on the undelayed branch. This is not a guarantee of one envelope for every delayed IR tap or of limiter-linear behavior.

The complete-output 10 ms attack/release, 5 ms lookahead limiter and leading-file-latency compensation remain. The declared source duration, IR/tail frame count, wet law, channels, parameter maps, phases, playing seek clock and retained pause/resume graph are unchanged. The last 10 ms of source excitation deliberately changes, so its later contribution to the IR tail changes; the full tail is retained, not byte-identical. No convolution/limiter history is cleared by this correction.

Analysis computes a stable mean and AC energy for the available samples of each existing FFT window. It subtracts that mean only in the temporary analysis window, excluding zero padding from the mean. The existing energy floor 1e-8 now applies to AC power divided by FFT size. A new coherent-Hann-bin amplitude floor 1e-6 prevents numerical/out-of-band residue from becoming the strongest normalized peak. This floor is not a calibrated source-level/noise-floor meter. Nonfinite sampled analysis data is rejected defensively; whole-source input validation remains the admission gate.

FFT size8192, up to9 windows, static analysis, -50dB relative significance, peak separation, 32/64 maximum, AnalysisResult schema, pitch/partial transformations, stereo placement and source/IR ownership remain. No source PCM, IR samples or playback signal is DC filtered. Silent/DC-only material may be a valid IR yet have no usable Resynthesis spectrum. An initial analysis failure disables Resynthesis Play; a failed32/64 refresh retains the previous bank, playback and curves. Normal finite short/noisy/clipped/hot analysis inputs remain usable within the existing policy. Short-window spectral leakage and fundamental estimation limits remain.

## Verification

Evidence folder: `work/CurveLabWebV1/qa/oscillator-ir-analysis-20261030` in the Interface workspace.

- `analysis-matrix.json`:123 recorded constant/DC+AC/ordinary/noise/short-input rows plus an explicit out-of-band rejection assertion. Ordinary peak maps match prior results within tight numeric tolerances; arrays are not mutated.
- `default-analysis-benchmark.json`:same decoded15s Bach MP3,32/64 choices. Partial counts unchanged32/40; maximum peak-frequency delta1.14e-13Hz. Six sequential desktop Chrome runs: candidate warm analysis about1.9–2.7ms; this is not CPU-headroom or physical-device acceptance.
- `native-ir.json`:72 before/after pairs, Chrome156.0.8078.48 and Brave156.0.8078.74;1/1.001s, Wet0/.5/1, one-tap/3ms/10ms/padded-delta/delay/room IRs. Finite bounded output and lengths retained. Dry/Wet0/one-tap output is exactly unchanged within each comparison. Padded-delta source-end adjacent step fell from about.0135–.0719 to zero for these fixtures; delayed/room tail energy remains.
- `native-parity.json`:native source Worklet + Convolver + limiter versus render reference at48kHz. Chrome5 candidate cases pass raw tolerance(max error1.49e-8). Brave dry/room raw matches do not meet the2e-5 tolerance, also in the unchanged baseline. The single-read control separates a small scalar/readback-dependent difference from timing; room still does not pass strict fitted residual. Do not call Brave exact PCM parity proven or attribute its mechanism without further evidence.
- `lifecycle.json`:8 actual browser runs at44.1/48kHz, dry/IR: live waveform/count/layout switches, playing rewind, retained pause/resume, natural end/restart state and4 real WAV downloads. Node/convolver/limiter identities retained across the relevant actions.
- `analysis-ui.json`:16 recorded actual UI/Worker scenarios across Chrome/Brave: automatic default without autoplay/implicit IR, DC/weak rejection, tone/DC+tone/short-tone recovery, injected failed refresh retaining playing bank/curves, actual WAV cancel and retry.
- Existing focused regression suites:16 pass. `render-cancel-ui.mjs` fails in both unchanged baseline and candidate because its isolated VM omits `transportFailure`; actual browser Cancel/retry passes. This is not a claimed all-tests-green run. New source-release and DC regression suites pass. Changed-module syntax checked separately.

Harness failures are retained: initial OfflineAudioContext graph rendered before control-message setup and produced silence;50ms setup settling restored Chrome correspondence. An early envelope test incorrectly distinguished negative zero from zero; corrected its numeric-zero assertion. Multi-read Brave experiments remain diagnostic only. No product DSP was adjusted to force these harness results.

## Remaining and transfer

No newly certified listening, audio-interface devices, Safari/Firefox/Windows, browser UI zoom, long maximum-duration CPU/memory headroom, intersample/true-peak guarantee or all possible IRs. Existing HRTF transition detail, high/extreme-pitch aliasing and potentially abrupt live partial-bank replacement remain separate follow-ups. These two corrections do not close all extreme-input/DSP findings.

Native asset: preserve the three separate boundaries (source excitation, retained effect tail, final transport envelope), AC-only analysis gate and immutable source samples. Revalidate decoder/FFT/convolver/limiter rate behavior and listening on Native; do not adopt browser thresholds as an automatically accepted musical specification.


## User release authorization — 2026-10-30

The user approved commit and public deployment of this reviewed candidate on2026-10-30. Include the pending File Resynthesis startup default. The known Brave baseline raw-parity gap and all listening/device/Native limits remain. Release proof is recorded separately in Interface QA `oscillator-ir-analysis-release-20261030`; this approval is not a claim that publication has already succeeded.
