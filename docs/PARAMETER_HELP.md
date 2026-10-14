# Parameter help — 2026-10-14

UI-only. Live values, axes, enable states, parameter mappings and DSP are preserved.
Hover after 500 ms, keyboard focus immediately, touch selection; Escape/outside press/blur/scroll/resize dismiss. Help can be hovered.
Legacy legend nodes remain available to existing writers but are hidden; no lifecycle reference is removed.

- `basePitchMode`: **Base Frequency · 20–4000 Hz** — Set the base for the oscillator stack, or transpose the analyzed partials in File Resynthesis.
- `deviationMode`: **Deviation · Depends on source and layout** — Unison spreads voices up to ±50 cents. Other layouts and File Resynthesis bend partial relationships with an amount of 0–0.38. Zero keeps the original layout.
- `slopeMode`: **Spectral Slope · −24 to +12 dB/oct** — Tilt voice or partial levels by frequency relative to the base. Negative values favor lower frequencies; positive values favor higher frequencies.
- `modulationCurveMode`: **Modulation Strength · FM / AM / Ring** — FM uses an index of 0–4. AM Depth and Ring Blend use 0–100%. The curve follows the selected modulation mode.

Source audit: current app mappings and DSP core modules, cross-checked against PARAMETER_SPEC.md. No parameter values were changed.

## Validation and boundaries

All visible parameter buttons were exercised in the local browser; Oscillator FM/AM/Ring were separately checked after a same-control reopen fix. Escape dismissal and viewport containment passed; all six Labs also passed 540×800 help containment. Play/Pause state passed with default content for Audio, Timbre, Space, Spectral and Oscillator; Granular remained correctly disabled without a file. Family keyboard regression: 27 passed; all source JavaScript syntax and diff whitespace checks passed. No console errors observed in the captured smoke session. No DSP changes, new listening, export, physical touch, or cross-browser proof claimed. Pointer-hover delay is implemented; automated browser checks exercised focus/click rather than pointer hover. Family evidence: family-parameter-help-checks.json.
