# Parameter Specification

Snapshot: 2026-09-29. These are **current web processing IDs**, not a newly adopted preset schema. Preserve their meanings when evolving the web app or designing Standalone automation. Source of truth for the observed formulas is `src/oscillator-core.js`, `src/app.js`, `src/convolution.js`, and `index.html`; discrepancies should be investigated, not silently resolved in favor of this document.

## Shared curve data model

`curves` contains `basePitch`, `deviation`, `slope`, `fmIndex`, `amDepth`, and `ringMix`. Each is an ordered list of `{x, y}` with normalized time `x in [0,1]` across **sound duration**, and stored vertical coordinate `y in [0,1]` (`0` is top). Every default curve has points at `x=0` and `x=1`. Between points, `valueAt` applies smoothstep `u*u*(3-2*u)` to normalized segment time, then interpolates y. Values beyond endpoints hold endpoint values. This is temporal smoothstep interpolation, not a separate control-rate smoother.

The end-to-end curve meaning is independent of canvas size. The optional convolution tail extends output time but does not extend curve x. There is no saved preset/state format yet. Future serialization must version both IDs and mapping semantics.

Sound mode is one of `oscillator` (default), `resynthesis`, or `convolution`. OSCILLATOR and CONVOLUTION share the existing oscillator curves; RESYNTHESIS retains a separate in-memory set of the same curve IDs. Its neutral Slope default is 0 dB/oct rather than the oscillator's -9 dB/oct, so analyzed relative amplitudes are not pre-tilted. Its Base Freq default is the estimated fundamental clamped into the 20-4000 Hz editor domain. A new source resets these transformations; changing partial count on the same source preserves them. The analysis result is original data, not a mutable curve. See `RESYNTHESIS_SPEC.md`.

## Curved parameters

| Parameter ID / display | Type, unit, range, default | Normalized mapping and behavior | Current web control / notes |
| --- | --- | --- | --- |
| `basePitch` / Base Freq | continuous Hz; 20-4000; default 110 Hz | `f(y)=4000*(20/4000)^clamp(y)`; logarithmic, higher on screen means higher frequency | Curve and tooltip show Hz; tooltip also shows nearest equal-tempered pitch and cents relative to A4=440. The base value is a synthesis reference, not a guaranteed perceived fundamental. |
| `deviation` / Deviation | continuous; mode-dependent; default zero at `y=1` | `amount=1-y`; Unison gives `0..50` cents (rounded) across the selected voice span; Harmonic/Odd/Multiplier use `0..0.38` partial/multiplier displacement before per-index bend | Same curve ID across stack modes, but displayed unit changes with mode. This is not an individual-voice velocity control. |
| `slope` / Spectral Slope | continuous dB/oct; -24..+12; default -9 | `dB=-24+36*y`; per-voice gain `10^(dB*log2(voiceHz/baseHz)/20)`, then clamp `0.03..1.8` before normalization | Affects relative voice levels, not an audio filter. A single Unison voice at the base has no slope-induced level change. |
| `fmIndex` / FM Strength | continuous index; 0..4; default 1 | `index=(1-y)*4`; default `y=0.75` | Active only for FM; retained when other modes are selected. High-frequency safety may lower effective index. |
| `amDepth` / AM Depth | continuous normalized depth; 0..1; default 0.5 | `depth=1-y`; default `y=0.5` | Active only for AM; retained across mode switches. High-frequency safety may lower effective depth. |
| `ringMix` / Ring Blend | continuous blend; 0..1; default 0.5 | `blend=1-y`; default `y=0.5` | Active only for Ring; 0 keeps carrier and 1 is ring product, subject to high-frequency safety. |

Curve points use floating-point normalized coordinates; display values can be rounded (`basePitch` to whole Hz, Unison spread to whole cents, slope to 0.1 dB/oct, FM to 0.01 index). Do not store the rounded label as the source value. The curve values themselves are not quantized to the display step.

## Discrete and numeric settings

| ID / control | Type, unit, allowed values, default | Processing/display mapping and limits |
| --- | --- | --- |
| `waveform` / Waveform | enum `sine`, `triangle`, `saw`, `square`; default `sine` | Synthesis source for all voices. There is no pulse-width parameter in the current UI. |
| `count` / Oscillators | enum 1, 2, 4, 8, 16; default 4 | Invalid values fall back to 4 in the core. Voices at/above `0.48 * sampleRate` are omitted; audible count may be lower. |
| `partialCountSelect` / Partials | enum 32, 64; default 32 in RESYNTHESIS | Maximum selected significant peaks, not a promise to fabricate that many voices in sparse files. It triggers a new analysis of the retained decoded segment. |
| `stack` / Stack | enum `unison`, `harmonic`, `odd`, `multiplier`; default `unison` | Unison clusters around base; Harmonic is 1,2,3...; Odd is 1,3,5...; Multiplier cycles a fixed pattern. UI label differs from processing ID for Odd Harmonics and Multiplier. |
| `multiplierText` | fixed web setting `1:1.5:2:2.5` | Parsed positive values up to 16; current UI **does not expose direct editing**. Do not describe it as a user-entered Ratio mode. |
| `modulationMode` / Modulation | enum `off`, `fm`, `am`, `ring`; default `off` | Exactly one mode selected. Switching keeps each mode's curve state. |
| `modulationRatio` / Mod Freq x | continuous ratio 0.25..8; default 1; UI step 0.25 | Modulator Hz = each voice's carrier Hz times this ratio. UI is shown only when modulation is not Off. Processing clamps to range. No curve automation for ratio currently. |
| `durationSeconds` / Sound Duration | numeric seconds 1..180; default 20; UI step 0.5 | Curve x spans this sound duration. Export/runtime clamp to range; if wet convolution is active, final output includes the IR tail. |
| `format` / output format | enum `stereo`, `mono`; default `stereo` | Export channel count 2 or 1. Realtime output is two-channel. |
| `convolutionEnabled` / Convolution routing | Derived from `soundMode=convolution` and a valid local IR | OSCILLATOR and RESYNTHESIS never route through the IR. CONVOLUTION without a file remains dry until a valid file is loaded. |
| `convolutionWet` / Dry/Wet | percent 0..100; default 50 | `p=percent/100`, `e=p*p*(3-2*p)`, dry=`cos(e*pi/2)`, wet=`sin(e*pi/2)` when On. Endpoint taper is intentional; it is not a linear amplitude mix. Routing gains approach changes with a 6 ms Web Audio target time. |
| `impulseLength` / IR Length | percent 0..100; default 0 | Used length interpolates from min(3 s, source length) to full source duration, rounded to samples. A truncated IR receives a 10 ms end taper. The file itself must be at most 16 MiB. |
| `sonogramToggle` / FFT Preview | Boolean; default false | Observation only. It does not alter audio and has no saved curve. A change makes a shown result stale until Update. |

## Internal processing values, not user controls

- Realtime targets 48 kHz; device-native fallback is allowed. Offline render/export is 48 kHz, 24-bit PCM.
- Oscillator voice inclusion threshold remains `frequency < sampleRate * 0.48`; modulation safety limit is `sampleRate * 0.46`. Resynthesis partials now fade by smoothstep from full gain at `0.42 * sampleRate` to zero at `0.48 * sampleRate`, and keep phase while inaudible. These are implementation/fine-tuning values, not claims of alias-free output in all conditions.
- Voice amplitude is slope-weighted, then retained voices are scaled by `0.82 * lift / max(1, sum(abs(amplitude)))`. Lift is `sqrt(activeCount)` for Unison, `activeCount^0.25` for Multiplier, and 1 for Harmonic/Odd/Resynthesis. This makes equal Unison voice scaling `1/sqrt(N)` while preserving more headroom for correlated/strong partial structures. Harmonic pan uses an index-ordered sweep plus alternating two-voice-group offset: `clamp(0.8*(2*i/(N-1)-1)+0.45+0.38*side,-1,1)` for active count `N>1`, with `side=-1,+1` alternating by `floor(i/2)`; `N=1` is centered. Unison/Odd/Multiplier retain plain index pan. Resynthesis fixes the first detected partial at center and later partials at `0.8 * alternating pan + 0.2 * index sweep pan`; there is no placement parameter or control. Phase offsets are `index/count`. No automatic per-channel loudness matching is applied.
- After curve mapping, Deviation slews over 8 ms, FM Index 5 ms, AM/Ring amount 8 ms, and numeric Ratio 10 ms in log space. This does not alter stored curve coordinates or tooltip values. There is no Feedback parameter to smooth.
- Source edge gain is linear: 8 ms attack from zero and 12 ms end fade to zero. Realtime output also has a 3 ms output-gain startup ramp; Stop currently zeros it immediately. This source fade is a click-reduction rule, not a musical envelope editor.
- `softLimit` passes magnitudes through 0.9 unchanged, then compresses toward approximately 0.99. The final stereo-linked sample-peak limiter ceiling is -1 dBFS with immediate attenuation and 60 ms gain release; it is downstream of optional convolution, with no lookahead or true-peak guarantee. It prevents peak overrun, not harsh timbre or equal loudness between arbitrary IR files.
- The FFT panel's 20 Hz-20 kHz logarithmic axis is independent of the editable Base Freq 20-4000 Hz axis. It uses a 2048-point Hann window, 512 or fewer columns, 192 rows and a fixed -90..0 dBFS display.

## Fine-tuning record and open listening work

The current numeric choices above are **implemented values**. Automated tests cover mapping bounds, 48 kHz WAV, four modulation modes, limiter identity below 0.9, band-limited high notes, and edge-fade sample positions. They do not prove a musician-approved sweet spot. The user reported large timbral variation between low/high imported source material and occasional harsh results with convolution; no compensating filter or automatic timbre equalizer has been approved. Preserve this observation for controlled listening tests with named files, curve settings, Dry/Wet, platform, and output level before changing mappings.

When a value changes, append its old/new value, reason, comparison setup, listening result, date, and approval state to this section or `DECISIONS.md`. Do not erase the prior value or present an untested adjustment as approved. Parameter schema version: **documentation snapshot 1**, not a persisted preset version.
