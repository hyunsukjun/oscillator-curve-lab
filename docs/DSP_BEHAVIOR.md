# DSP Behavior

Snapshot: 2026-09-29. Describes code-defined behavior and audible intent separately from subjective approval. Consult `PARAMETER_SPEC.md` for parameter IDs, ranges, defaults, and mappings. All frequencies and time-based constants here are current implemented values; preserve history in `DECISIONS.md` when tuning them.

## Signal flow

`Normalized curves -> base frequency / stack voices -> per-voice waveform + optional FM/AM/Ring -> amplitude weighting + stereo pan -> oscillator soft limit -> source edge fade -> optional dry/wet convolution -> output safety shaper -> device`.

In RESYNTHESIS, local decoded audio -> static spectral peak selection -> retained AnalysisResult -> Base Freq / Deviation / Spectral Slope transformations -> sine partial oscillator bank -> the shared safety and output path. CONVOLUTION keeps the earlier oscillator-plus-IR route; modes are exclusive. Details and analysis caveats are in `RESYNTHESIS_SPEC.md`.

Realtime uses an AudioWorklet and a native-rate AudioContext (48 kHz requested, native fallback). WAV uses the shared core renderer at 48 kHz, an OfflineAudioContext for convolution when enabled, and signed 24-bit PCM encoding. Dry FFT synthesis shares the core/fade; wet FFT analyzes offline-rendered processed samples. This shared design is aimed at parity, but native Web Audio convolution behavior and device output still require cross-browser/device checks.

## Time and interpolation

Curve time `x` is sound time divided by sound duration, clamped to `[0,1]`. Between adjacent points, segment progress `u` is transformed by smoothstep `u^2(3-2u)` before interpolating stored `y`. This eases into and out of each point; there is no additional curve-slew processor. Curves hold their first/last values outside their point span. The wet IR tail extends transport/output time but no new oscillator sound is generated after sound duration.

## Oscillator stack

- Base frequency is logarithmic 20-4000 Hz. Unison voice offsets span `-50..+50` cents at maximum Deviation, distributed by selected count; with one voice the offset is zero.
- Harmonic voice n uses multiplier n (1-indexed); Odd Harmonics uses `2n-1`. Multiplier cycles the fixed `[1,1.5,2,2.5]` list. For non-Unison modes Deviation adds a bounded signed per-index bend up to 0.38 times the deterministic bend shape. It changes partial positions rather than individual voice velocity.
- Current bend shapes are `sin((index+1)*1.618)*0.5` for Harmonic/Odd and `cos((index+1)*2.137)*0.45` for Multiplier. They make per-voice displacements nonuniform and reproducible; the origin of these exact constants and their listening advantage are not documented. Preserve the current result for comparison, not as an approved native tuning target.
- Voices at/above `0.48*sampleRate` are omitted. Spectral Slope is dB per octave relative to base and weights each voice by `10^(slopeDb*log2(voiceHz/baseHz)/20)`, clamped `0.03..1.8`; retained amplitudes are then scaled by `0.82/max(1,sum(abs(amplitude)))`.
- Voice phases start from `index/count`; carrier and modulator phases advance continuously per sample. Stereo pan is voice-index distributed (one voice centered). The current-value panel depicts the voice frequencies; it is not a spectral analysis of final convolved sound.

The waveform source is Sine, Triangle, Saw, or Square. Saw/Square use band-limited edge correction. Triangle blends toward a band-limited odd-harmonic series above approximately 1 kHz; the blend depends on sample-normalized phase increment. These measures reduce, but cannot categorically remove, aliasing under every FM or high-frequency setting.

## Modulation

Each voice has a sine modulator at `carrierHz * modulationRatio` (0.25-8). One mode is selected at a time:

- FM: curve strength is index 0-4. The core bounds effective index against a `0.46*sampleRate` high-frequency limit, then phase-modulates the carrier waveform with a corresponding instantaneous increment for anti-alias sampling.
- AM: `carrier * (1 + depth*modulator)/(1+depth)` after high-frequency depth reduction. This normalizes the envelope's maximum relative to the unmodulated carrier.
- Ring: `carrier * ((1-blend) + blend*modulator)` after high-frequency blend reduction.

At zero strength/depth/blend, each mode returns unmodulated carrier behavior. High-ratio/high-carrier combinations may still sound rough; perceived harshness is not itself proof of clipping or aliasing. Future tuning requires controlled audio examples and listening evidence.

## Automatic gain, limiting, and boundaries

Stack normalization occurs before per-channel summing. The oscillator sample limiter is identity through magnitude 0.9, then smoothly approaches about 0.99. The realtime signal also passes an output safety WaveShaper with no oversampling. An 8 ms linear source attack and 12 ms linear source release reach zero at the first/last sound sample in realtime, WAV, and dry FFT. Realtime output gain additionally ramps 0->1 over 3 ms at Play. Stop currently zeros the gain immediately and discards the existing convolution tail; it is not yet a separately tuned Stop-release envelope.

These controls manage peaks and boundary clicks; they do not equalize loudness, remove all aliasing, or guarantee a pleasant spectrum. The user has reported significant tonal differences with low/high imported source material and some harsh combinations. Treat that as an open listening investigation, not as a solved DSP defect.

## Convolution from local audio

The imported file is an **impulse response**, not a carrier or oscillator replacement. It must be at most 16 MiB and decode locally. Used IR length runs from min(3 s, whole file) to the full file as IR Length goes 0->100%; a truncated IR receives a 10 ms final taper. Native ConvolverNode has `normalize=true`. Its output mixes with dry audio using a smoothstep-tapered equal-power angle: `e=p^2(3-2p)`, dry=`cos(pi*e/2)`, wet=`sin(pi*e/2)`. Web routing gains use `setTargetAtTime(..., 0.006)` when changed. Convolution Off or Wet=0 uses the oscillator bypass path. Active wet output includes the IR tail (`IR samples - 1` divided by rate). A normalizing Convolver can still produce large perceived spectral/loudness differences across arbitrary source files.

## FFT observation and limitations

The optional spectrogram is 20 Hz-20 kHz logarithmic, fixed -90..0 dBFS, 2048-sample Hann windows, no more than 512 time columns and 192 frequency rows, mean stereo power, before WAV quantization. Each logarithmic display row takes the maximum power among its covered FFT bins, which favors visibility of narrow peaks over a row-average display; this is a visual rule, not extra audio energy. The exact display choice has no recorded user validation. It is an overview; low-frequency precision is bounded by FFT bin size, and short events may be missed between columns. It must be marked stale after changes. It does not modify the sound.

## Evidence and gaps

`tests/modulation.test.mjs`, `tests/convolution.test.mjs`, and `tests/output-preview.mjs` cover 10 unit tests plus four-mode sample/FFT parity as of 2026-09-29. Earlier browser checks verified actual WAV format, transport, local file decode, and FFT completion. `docs/FFT-REFINEMENT-REPORT.md` documents the earlier nine-test revision; its figures are historical, not automatically current after the 8/12 ms fade. Human listening, device underruns, long IR stress, high-frequency aliasing measurements across modes, and native-rate fallback parity remain open.
