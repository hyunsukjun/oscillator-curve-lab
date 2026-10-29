# Live synthesis transition and seek — 2026-10-29

Status: IMPLEMENTED / USER-APPROVED FOR COMMIT AND DEPLOYMENT on2026-10-29. Non-listening verification is limited to the stated environments; publication proof is recorded separately. Baseline673b0096155a94d030c711356422f19dbd47688d. Preserve unrelated AGENTS.md and the untracked IR audit files.

## Approved scope

Short crossfades for live Waveform, Oscillators and Frequency Layout selection; correct playing Return to start; retain musical values/mapping, sound-time curve basis, stereo placement, playback position on settings changes and convolution history. Space Pause is diagnosis only and its product files stay unchanged.

## Product and processing contract

- Live oscillator-bank changes use a10ms **linear crossfade before convolution**, reusing BOUNDARY_SECONDS. First sample is the old bank, final sample is the new bank. Linear weights sum to1; correlated equal-power gain uplift is avoided. Static waveform formulas, per-voice phases/frequencies/gains, modulation, pan and safety policy are unchanged.
- Both banks continue advancing during the fade. A settings change does not seek or reset the transport. New-bank phases start from the current phases. The old bank retains its own phase/smoothing snapshot; the same current sound time evaluates both banks' curves.
- Only two banks render simultaneously. Changes received during a fade coalesce into one latest pending settings value. They apply at the next fade boundary rather than abruptly replacing a partial fade. A pending seek similarly coalesces to the latest request, with at most the current10ms transition to finish first. This is a short control transition, not a rewrite of stored curves or a new visible parameter.
- Playing Return to start still selects sound time0. Other valid **playing source-body seeks share that same path**. Old and new source positions crossfade while the same native Convolver and linked limiter continue processing. Do not clear their histories or create a new graph for this operation.
- The source reports the actual applied seek time on the audio clock. A provisional output-envelope deadline prevents the former end deadline from silencing a rewind; the acknowledgment refines it using absolute audio time. The final gain recovers from its current value without a zero jump. A Pause already releasing to zero cannot be canceled by a late seek acknowledgment.
- Delayed seek acknowledgment accounts for elapsed audio time and may update the matching paused snapshot position. Stale tokens are ignored, and active pointer scrubbing owns its displayed selection.
- Paused/stopped Return to start, unsupported tail seeking, mode/file changes and explicit reset/error safety-stop rules retain their previous contracts. A paused Return to start can still invalidate retained tail history; this change specifically preserves history during a playing body seek.
- IR impulse preparation, normalization, Wet/Dry, IR node/buffer and tail-length definition are unchanged. The resulting wet waveform changes with the intended new excitation; preserved history is not a claim of identical sound during an intentional setting change.
- Natural-end countdown now follows the applied seek rather than the original pre-seek deadline. Source duration/tail/limiter-delay definitions, normalized curve time, channels and48kHz/24bit WAV length policy are unchanged.
- The crossfade applies to live control events; it is not baked into static WAV export as an editing history. Render uses the selected target settings and existing curves. File Resynthesis analysis and automatic32/64 partial refresh are not redesigned or newly certified as click-free. Playing source seeks work in its existing synthesis path as well.

## Verification

Evidence: `/Users/hyunsukjun/Documents/ChatGPT/4.프로그램.완료/work/CurveLabWebV1/qa/oscillator-live-crossfade-20261029`.

- `tests/live-transition.mjs`:24 rate/bank cases at44.1/48/96kHz; exact linear mixture against independently advanced old/new states, phase/time retention, full bank settling, bounded latest queue, seek continuity, limiter history, final-release rewind and Pause ownership.
- `tests/live-seek-clock.mjs`: delayed acknowledgment, paused snapshot position, pointer ownership and stale-token rejection.
- Same-input before/after numeric chain: unchanged playback is byte-identical. A997Hz rewind fixture's zero run240/241frames disappears; maximum adjacent step near rewind drops approximately0.558→0.0758. These are fixture-specific PCM results, not a universal listening verdict. Absolute end deadline remains aligned under0/2/6/24-quanta acknowledgment delays.
- Required `node --test tests/*.test.mjs`:37/37 pass. Worklet/PCM/WAV/FFT static parity also passes six Off/FM/AM/Ring/Harmonic16/stress fixtures. Input/pending Play/partial refresh/transport/channel and render regressions are recorded separately.
- The old pending-play-context fixture initially failed on missing `verticalDrag` before reaching an audio assertion, equally in baseline and candidate. Its current context mocks and previous-source error text were repaired **in the test only**. All five scenarios then pass against baseline and candidate. Historical failure remains in `known-harness-gap.json`; no product behavior was changed to make that test pass.
- Actual Chrome/Brave Chromium156.0.8078.48,44.1/48kHz, dry and real short-stereo-IR paths: live selections advance position; source/Convolver/limiter identities are retained; playing rewind has no limiter-reset gap; pending change/rewind/Pause settles; resume retains history; natural end and stereo48k24bit WAV save succeed. All captured output is finite and within the existing limiter ceiling.
- Chrome dry/IR and Brave dry WAV bytes match baseline. Brave IR bytes are not identical across contexts; near-uniform readback-related gain differences are reported separately rather than counted as byte parity. Rendering/core/convolution sources retain baseline bytes.

## Portable asset and limits

Carry forward: continuous old/new states, short source-stage transition, bounded coalescing, preserved effect histories, audio-clock end deadlines, cancel-safe acknowledgments and separate current/target states. Native implementation may choose a different engine boundary. No Native code or product acceptance is changed.

Two-bank synthesis briefly increases realtime work; prolonged rapid switching can sustain that work. Silent-browser tests do not certify low-end CPU headroom, audio-interface underruns, Safari/Firefox/Windows, physical output or listening quality. A short crossfade does not remove the intended sharp edges of Saw/Square or fix clipping/DC/recorded noise. No assertion that every Oscillator click is eliminated.
