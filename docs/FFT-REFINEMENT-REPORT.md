# FFT Preview refinement — 2026-09-29

## Applied

- Realtime Worklet, offline WAV and dry FFT synthesis share `renderFrame`, including continuous carrier/modulator phases. The FFT no longer synthesizes independent approximate snapshots.
- FFT Preview is default OFF and lives below the curve editor, with an independent logarithmic 20 Hz–20 kHz axis and fixed −90…0 dBFS brightness. The upper Current Oscillator Values panel is preserved.
- Dry synthesis and FFT analysis run in a Worker. Edits mark the preview stale; Update preview recomputes it. Playback/export cancel pending analysis, and generation checks discard obsolete results.
- Base Freq editor ticks now use its actual 20–4000 Hz curve mapping. Other parameter ticks use the same coordinates as curve points. Edge labels are kept inside the canvas.
- A Worklet `started` acknowledgement lets the native offline browser test wait for settings/play messages before rendering; it does not change sample generation.
- Existing Convolution, safety processing and current visual design are preserved. Convolution preview prepares processed samples through the existing asynchronous offline renderer, then sends those samples to the FFT Worker.

## Verification

- 9 modulation/convolution regression tests passed.
- Four-mode sample comparison (Off/FM/AM/Ring): maximum WAV versus Worklet sample error 1.1920929e-7, within 24-bit quantisation precision.
- Native browser AudioWorklet versus FFT Worker: maximum dB difference 0.000144959 dB across the four modes. Test: `tests/browser-output-preview.html`. The test waits for the Worklet acknowledgement to avoid racing OfflineAudioContext rendering against asynchronous port messages.
- Browser UI: Play, natural end at 2 s, restart and Stop/reset passed. FFT is OFF initially; enabling it renders output; changing Stack shows Update needed; Update preview restores Current settings. Selecting Spectral Slope leaves the FFT frequency axis independent.
- Downloaded browser WAV inspected: 2 channels, 48 kHz, 24-bit, 96,000 frames / 2 seconds. Download event automation timed out, but the downloaded file and UI completion state were independently verified.
- Base Freq 110 Hz curve placement and independent FFT panel visually checked. Screenshot: `fft-refinement.png`.

## Limits

This is an overview, not a precision measurement instrument: 2048-sample Hann FFT, 512 time columns, 192 frequency rows, mean stereo power, before WAV quantisation. Short events can fall between sampled columns. Convolution preparation still uses the existing renderer and retains whole output buffers; only the FFT stage and dry synthesis are entirely Worker-based. The convolution regression tests cover its helpers and bypass, not a new real-IR browser listening session. Human listening, device underruns, long-duration responsiveness and native-rate fallback were not verified in this pass.
