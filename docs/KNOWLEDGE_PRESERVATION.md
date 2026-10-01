# Development Knowledge Preservation

This is the evidence ledger for sonic decisions that cannot be recovered from parameter values alone. It does not change the web product or approve a Standalone implementation. The current state is **capture framework ready; reference recordings, controlled listening results, and performance measurements pending**. Do not fill a result from recollection or infer listening approval from a numerical test.

For every completed entry, record: **WHAT changed, WHY, HOW it affects the sound, and WHAT a Standalone version must preserve**. Keep old and new values, including rejected approaches. Link a reproducible setting/curve snapshot or describe all points and controls explicitly; a screenshot alone is insufficient.

## Reference Sound Set

No rights-cleared, named reference corpus is currently checked into this project. An imported audio file is an impulse response (IR), not the oscillator source. Before adding one, record its source, license/permission, immutable file hash, sample rate, channels, duration, and whether the file may be stored or must be acquired separately. Never use a private recording as a redistributable fixture without permission.

| Case ID | Purpose / target contrast | Required settings and material | Evidence status |
| --- | --- | --- | --- |
| RS-01 | Clean baseline and onset/end behavior | Sine, one voice, modulation Off, convolution Off; Base Freq low/mid/high; 1 s and 20 s duration | Planned; no listening result |
| RS-02 | Stack identity and level balance | Sine and Saw; Unison/Harmonic/Odd/Multiplier; 1 and 16 voices; Deviation zero/max; Slope low/default/high | Planned; no listening result |
| RS-03 | Smooth versus abrupt gestures | Base Freq and Deviation: flat, gradual ramp, and near-adjacent points; same duration and output level | Planned; no listening result |
| RS-04 | Modulation extremes and high-frequency roughness | Off/FM/AM/Ring; ratio 0.25/1/8; amount zero/default/max; low/high Base Freq | Planned; no listening result |
| RS-05 | IR-dependent color and Dry/Wet endpoints | Named, rights-cleared low/high-frequency IRs; short/full IR; Wet 0/1/20/50/99/100%; convolution bypass | Planned; user reported tonal variance, not yet isolated |
| RS-06 | Real-time versus rendered output | Same setting and curve snapshot at 48 kHz and available native fallback rate; 24-bit WAV | Planned; numerical parity is not listening approval |
| RS-07 | Static Resynthesis identity | Rights-cleared tonal/noisy/inharmonic files; 32/64 peak limits; neutral and modified Base/Deviation/Slope curves; matched source and generated levels | Planned; synthetic peaks checked numerically, real-file listening pending |

For each executed case append: date, app revision or asset hash, file ID/hash, waveform/count/stack/modulation/ratio/duration/format, all curve points, IR Length and Dry/Wet, browser/OS/device/sample rate, monitor or headphones and level-matching method, measured peak/RMS or LUFS if available, listening notes, reviewer, and status (`observed`, `candidate`, `approved`, or `rejected`). Store the rendered file location or hash. Note whether a perceived pitch is a base-frequency readout or an auditory judgment.

## Tuning Decision Log

The values below are **implemented**, not approved sweet spots. `Why this exact value` and `Listening result` remain unknown unless a linked comparison exists. See `PARAMETER_SPEC.md` and `DSP_BEHAVIOR.md` for formulas.

| Item | Current value / behavior | Known reason or intended effect | Why this exact value / listening result | Standalone preservation target |
| --- | --- | --- | --- | --- |
| Stack normalization | `0.82 / max(1, sum(abs(amplitude)))` | Automatic peak management across 1-16 voices | Exact 0.82 and perceived balance unverified | Preserve level behavior until controlled A/B justifies change |
| Voice and modulation bounds | Voice cutoff `0.48 * rate`; modulation limit `0.46 * rate` | Reduce extreme high-frequency output | Exact margins and residual aliasing unverified | Compare sample-rate-dependent behavior and high-note sound |
| Deviation and Slope | Unison 0-50 cents; other stacks 0-0.38 bend; Slope -24 to +12 dB/oct; gain clamp 0.03-1.8 | Spread, partial displacement, relative voice balance | Exact limits and musical sweet spots unverified | Keep mappings and resulting voice/level relations |
| Soft limit | Identity through magnitude 0.9, approaches 0.99; output shaper has no oversampling | Guard peaks without changing normal-level source | Threshold, headroom and harshness tradeoff unverified by listening | Compare nonlinear response and perceived loudness, not peak alone |
| Source edges | 8 ms attack, 12 ms end fade; 3 ms playback startup ramp | Address reported click-like onset/end; numerical edge tests passed | Click reduction not yet listening-approved; Stop is immediate | Preserve source boundary behavior; document any Stop-release change separately |
| Convolution mix and IR taper | Smoothstep equal-power Dry/Wet; 3 s-to-full IR selection; 10 ms truncated-IR taper | Smooth wet endpoints and truncated IR edge | IR-dependent loudness/timbre remains open | Compare bypass, wet endpoints and native Convolver normalization |
| Spectrogram overview | 2048 Hann, up to 512 columns, 192 rows, -90..0 dBFS | Responsive visual overview, not precision analysis | Display trust and transient visibility lack a reference set | Preserve observation meaning or explicitly version a revised display |

When tuning, append a dated row here or a linked decision with `old -> new`, competing approach, reason, matched-level comparison setup, audible difference, measured difference, decision owner, and approval state. An unknown reason should stay `unverified`, not be replaced by a plausible story.

## Curve and Gesture Listening Matrix

The code evaluates smoothstep between ordered normalized points at audio-frame time; it has no separate parameter slew. A short segment can therefore traverse a large mapped change rapidly even though its endpoints ease. The audible consequence is a **test question**, not a verified click or aliasing finding.

| Gesture | Parameters to compare | Listen / measure for | Status |
| --- | --- | --- | --- |
| Flat two-point curve | Base, Deviation, Slope, FM/AM/Ring | Steady-state timbre and level baseline | Pending |
| Gradual full-duration ramp | Base, Deviation, Slope, FM/AM/Ring | Perceived continuity, pitch/brightness movement, modulation balance | Pending |
| Near-adjacent points with a large vertical jump | Base, Deviation, Slope, FM/AM/Ring | Clicks, roughness, overshoot, spectral splatter, surprising level change | Pending |
| Dense alternating points | Base, Deviation, Slope, FM/AM/Ring | Temporal resolution, intelligibility, real-time CPU and render parity | Pending |

Use the same duration, output level and playback device for each contrast. Capture point coordinates and the corresponding mapped values in physical units. Separate effects of curve shape from waveform, stack, modulation and IR. For a future common Curve Lab interaction rule, retain normalized coordinates, protected endpoints and consistent hit/erase intent; adopt a new smoothing rule only after module-specific listening and an explicit mapping/version decision.

## Performance and Cross-Engine Measurements

No benchmark numbers or device underrun results have been recorded. The current browser export retains output buffers, and wet FFT preparation also renders processed samples. Capture peak memory as well as elapsed time; success on a short dry render does not establish long-IR stability.

| Scenario | Capture | Status |
| --- | --- | --- |
| 1/4/16 voices, four waveforms, Off/FM/AM/Ring at 48 kHz | Real-time CPU/load proxy, glitches/underruns, actual context rate, output peak, rendered time | Pending |
| High Base Freq and modulation ratio/amount extremes | Alias components or spectral evidence plus matched listening; compare 48 kHz and native fallback | Pending |
| 1/20/180 s sound, short/full permitted IR | Render elapsed time, peak memory, output duration, UI responsiveness, abort behavior | Pending |
| Convolution Off/On, Dry/Wet endpoints | Browser and future native normalization, loudness/peak change, tail handling | Pending |
| FFT Off/On and stale/update cycles | Analysis elapsed time, memory, cancellation and stale-result behavior | Pending |
| Resynthesis 32/64 peaks, sparse and rich files | Decode/Worker duration, realtime glitches, 48 kHz WAV render time, peak memory, output spectrum and listening | Synthetic 64-peak selection checked; device and real-file measurements pending |

Each measurement needs date, app revision, browser/OS, CPU/device, sample rate, channel count, material hash, complete settings, method/tool and raw result location. Keep numerical parity, perceptual listening, and performance as separate verdicts. A native implementation can choose different internals, but any audible or interaction difference should be an explicit product decision.
