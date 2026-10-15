# Functional surfaces — local review candidate

Title, parameter buttons, settings and current values share #373b43, following the reviewed Audio design. Waveform-related surfaces use #252c32; curve canvas stays #191c20; transport #30343c. Preserve continuous edges, existing layout and functional distinctions. No separate tone per control row. Active parameter colors and button states remain unchanged.

Oscillator has a frequency/voice visualization rather than an audio waveform editor; its existing visualization receives the independent surface tone without adding waveform editing. Space retains its independent Spatial View and Timbre/Spectral their signal-chain structure. No DSP, timing, curve data or playback semantics changed. This is not yet committed or released.

Verification: browser checks at 1094 and 547 CSS px found no horizontal overflow. Parameter selection and Play/Pause/rewind exercised; Granular used a local WAV and reached 14.97 seconds. Details/disclosure checked at narrow width. No captured browser errors in desktop smoke. Syntax and diff checks passed. DSP and export code untouched; no new listening or exhaustive export certification claimed. Evidence: CurveLabWebV1/evidence/family-functional-surfaces-20261015.json.
