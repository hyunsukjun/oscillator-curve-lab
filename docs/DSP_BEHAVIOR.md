# DSP Behavior

Snapshot: 2026-09-29. Describes code-defined behavior and audible intent separately from subjective approval. Consult `PARAMETER_SPEC.md` for parameter IDs, ranges, defaults, and mappings. All frequencies and time-based constants here are current implemented values; preserve history in `DECISIONS.md` when tuning them.

## Signal flow

`Normalized curves -> selected parameter slew -> base frequency / stack voices -> per-voice waveform + optional FM/AM/Ring -> amplitude weighting + stereo pan -> oscillator soft limit -> source edge fade -> optional dry/wet convolution -> stereo-linked final safety limiter -> device`.

One imported local file feeds two exclusive processing interpretations. In RESYNTHESIS, its selected analysis channel -> static spectral peak selection -> retained AnalysisResult -> Base Freq / Deviation / Spectral Slope transformations -> sine partial oscillator bank -> the shared safety and output path. CONVOLUTION uses the same decoded file as an IR for the oscillator-plus-IR route. Details and analysis caveats are in `RESYNTHESIS_SPEC.md`.

For the 2026-10-02 Resynthesis correction, each partial's amplitude smoothly tapers over `0.42..0.48 * sampleRate`; the existing normalization uses those tapered amplitudes. Its phase advances even while the partial is silent above the boundary. The user reported that the crackle near 2 kHz Base Freq disappeared after this change and approved keeping it. This does not change Oscillator stacks or guarantee alias-free output in other conditions. The user's source file was not independently measured.

Realtime uses an AudioWorklet and a native-rate AudioContext (48 kHz requested, native fallback). WAV uses the shared core renderer at 48 kHz, an OfflineAudioContext for convolution when enabled, and signed 24-bit PCM encoding. Dry FFT synthesis shares the core/fade; wet FFT analyzes offline-rendered processed samples. This shared design is aimed at parity, but native Web Audio convolution behavior and device output still require cross-browser/device checks.

## Time and interpolation

Curve time `x` is sound time divided by sound duration, clamped to `[0,1]`. Between adjacent points, segment progress `u` is transformed by smoothstep `u^2(3-2u)` before interpolating stored `y`. Curves hold their first/last values outside their point span. After mapping, Deviation has an 8 ms one-pole slew; FM strength has 5 ms, AM/Ring amount 8 ms; numeric modulation ratio has a 10 ms log-domain slew. A new playback starts from its initial target; a live modulation-mode switch ramps its amount in from zero. These are sample-rate-aware click controls, not edits to stored points or visual curves. Feedback is not a parameter in this module. The wet IR tail extends transport/output time but no new oscillator sound is generated after sound duration.

## Oscillator stack

- Base frequency is logarithmic 20-4000 Hz. Unison voice offsets span `-50..+50` cents at maximum Deviation, distributed by selected count; with one voice the offset is zero.
- Harmonic voice n uses multiplier n (1-indexed); Odd Harmonics uses `2n-1`. Multiplier cycles the fixed `[1,1.5,2,2.5]` list. For non-Unison modes Deviation adds a bounded signed per-index bend up to 0.38 times the deterministic bend shape. It changes partial positions rather than individual voice velocity.
- Current bend shapes are `sin((index+1)*1.618)*0.5` for Harmonic/Odd and `cos((index+1)*2.137)*0.45` for Multiplier. They make per-voice displacements nonuniform and reproducible; the origin of these exact constants and their listening advantage are not documented. Preserve the current result for comparison, not as an approved native tuning target.
- Voices at/above `0.48*sampleRate` are omitted. Spectral Slope is dB per octave relative to base and weights each voice by `10^(slopeDb*log2(voiceHz/baseHz)/20)`, clamped `0.03..1.8`. Retained amplitudes use `0.82*lift/max(1,sum(abs(amplitude)))`: Unison `lift=sqrt(active voices)`, Multiplier `lift=active voices^0.25`, Harmonic/Odd `lift=1`. For equal Unison amplitudes this gives per-voice `1/sqrt(N)` scaling. The weaker Multiplier lift limits coherent peaks; Harmonic/Odd keep their prior headroom. Normalization uses active, not selected, voices.
- Voice phase offsets are `index/count`; carrier and modulator phases advance continuously per sample. Harmonic retains the broad index-ordered left-to-right sweep but adds a small alternating offset to successive two-voice groups: `clamp(0.8*sweep+0.45+0.38*side,-1,1)`, where `side` alternates every two indexes; one active voice is centered. This is the user-selected B candidate from D-011. Unison, Odd, and Multiplier keep the original index-ordered pan. Resynthesis uses only the user-selected C: first detected peak centered; later peaks at `0.8*alternating+0.2*sweep`. Historical A/B candidates are documented but not selectable. Active-voice count affects the Oscillator sweep denominator, so very high Base Freq can alter voice positions as voices leave/re-enter under the Nyquist guard. The current-value panel depicts voice frequencies, not a spectral analysis of final convolved sound.

The waveform source is Sine, Triangle, Saw, or Square. Saw/Square use band-limited edge correction. Triangle blends toward a band-limited odd-harmonic series above approximately 1 kHz; the blend depends on sample-normalized phase increment. These measures reduce, but cannot categorically remove, aliasing under every FM or high-frequency setting.

## Modulation

Each voice has a sine modulator at `carrierHz * modulationRatio` (0.25-8). One mode is selected at a time:

- FM: curve strength is index 0-4. The core bounds effective index against a `0.46*sampleRate` high-frequency limit, then phase-modulates the carrier waveform with a corresponding instantaneous increment for anti-alias sampling.
- AM: `carrier * (1 + depth*modulator)/(1+depth)` after high-frequency depth reduction. This normalizes the envelope's maximum relative to the unmodulated carrier.
- Ring: `carrier * ((1-blend) + blend*modulator)` after high-frequency blend reduction.

At zero strength/depth/blend, each mode returns unmodulated carrier behavior. High-ratio/high-carrier combinations may still sound rough; perceived harshness is not itself proof of clipping or aliasing. Future tuning requires controlled audio examples and listening evidence.

## Automatic gain, limiting, and boundaries

Stack normalization occurs before per-channel summing. The oscillator sample soft limiter is identity through magnitude 0.9, then smoothly approaches about 0.99. A final stereo-linked safety limiter after dry/wet routing uses 5 ms lookahead, 1 ms gain attack, 100 ms release, a -1 dBFS sample ceiling, and a current-sample ceiling fallback. It delays the complete dry/wet mix equally in both channels; the WAV and FFT output gain the same 5 ms leading delay and final flush. Realtime transport subtracts this delay from the Worklet's generated position, and natural end waits for the delayed tail. It is the same algorithm in realtime Worklet, WAV, and dry FFT; it has no true-peak detection. It replaces the old output WaveShaper and is not a general compressor. An 8 ms linear source attack and 12 ms linear source release reach zero at the first/last sound sample in realtime, WAV, and dry FFT. Realtime output gain additionally ramps 0->1 over 3 ms at Play. Stop currently zeros the gain immediately and discards the existing convolution tail; it is not yet a separately tuned Stop-release envelope.

These controls manage peaks and boundary clicks; they do not equalize loudness, remove all aliasing, or guarantee a pleasant spectrum. The user has reported significant tonal differences with low/high imported source material and some harsh combinations. Treat that as an open listening investigation, not as a solved DSP defect.

## Convolution from local audio

In CONVOLUTION, the shared imported file is used as an **impulse response**, not a carrier or oscillator replacement. It must be at most 16 MiB and decode locally. Used IR length runs from min(3 s, whole file) to the full file as IR Length goes 0->100%; a truncated IR receives a 10 ms final taper. Native ConvolverNode has `normalize=true`. Its output mixes with dry audio using a smoothstep-tapered equal-power angle: `e=p^2(3-2p)`, dry=`cos(pi*e/2)`, wet=`sin(pi*e/2)`. Web routing gains use `setTargetAtTime(..., 0.006)` when changed. Convolution Off or Wet=0 uses the oscillator bypass path. Active wet output includes the IR tail (`IR samples - 1` divided by rate). Offline rendering keeps the input buffer at the full output duration, zero-filled after the oscillator ends, to preserve stereo channel topology across the Convolver tail. A normalizing Convolver can still produce large perceived spectral/loudness differences across arbitrary source files.

## FFT observation and limitations

The optional spectrogram is 20 Hz-20 kHz logarithmic, fixed -90..0 dBFS, 2048-sample Hann windows, no more than 512 time columns and 192 frequency rows, mean stereo power, before WAV quantization. Each logarithmic display row takes the maximum power among its covered FFT bins, which favors visibility of narrow peaks over a row-average display; this is a visual rule, not extra audio energy. The exact display choice has no recorded user validation. It is an overview; low-frequency precision is bounded by FFT bin size, and short events may be missed between columns. It must be marked stale after changes. It does not modify the sound.

## Evidence and gaps

On 2026-10-01, 18 unit tests passed, including count compensation, slew, linked-limiter bounds, and voice-index pan progression. `tests/output-preview.mjs` compared five dry cases (Off/FM/AM/Ring and limiter-active FM stress) across simulated Worklet, WAV, and FFT within quantization/FFT tolerance. Local browser checks covered dry and imported-IR playback, Stop, meter response, FFT completion, and dry/wet WAV render with no console errors. The alternating-pan candidate also passed numerical/browser checks but was rejected after user listening; those checks do not establish musical approval. Device underruns, long IR stress, high-frequency aliasing across modes, and native-rate fallback parity remain open. `docs/FFT-REFINEMENT-REPORT.md` remains historical evidence for an earlier revision.
