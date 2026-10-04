# Oscillator identity pilot

2026-10-05 · Local review completed; user authorized commit and GitHub publication on 2026-10-05.

Source: CURVE LAB HUB for macOS / DesignIdentity / iterations/2026-10-04-v0.10.
Source SVGs are copied exactly; SHA-256 values and all six canonical colors are recorded in assets/identity/palette.json. Shared tokens.css matches Spectral.

Oscillator #28CDB0 replaces temporary #53C78C. Hover #60DBC5 and focus #98EADC are derived UI colors. Header, favicon, title and download accents change. Synthesis, controls, curve/FFT/meter semantic colors and all JavaScript remain unchanged from baseline 813a7a7. The app tile is stored for future standalone reuse.

## Verification

- Exact Hub SVG bytes, recorded hashes and SVG parsing: PASS. Served HTML/CSS/icons match local files.
- All src JavaScript and test scripts unchanged from 813a7a7; JS syntax checks pass.
- `node --test tests/*.test.mjs`: 23/23 PASS.
- `node tests/output-preview.mjs`: FAIL at `wavError < 2e-7`. Reproduced unchanged on a separate archive of baseline 813a7a7 using Node v24.19.0. Existing output-parity issue/test expectation requires separate investigation; not repaired by this visual-only pilot.
- Browser: header icon loaded, computed identity #28CDB0; desktop 1309px and narrow approximately 434px show no page-level horizontal overflow. Existing horizontally scrollable curve workspace is preserved.
- Default oscillator playback advances time and output meters; natural completion and explicit Stop return to 0. No browser warning/error logged.
- Scope-limited visual smoke check: file import, mode-specific lifecycle, Spacebar, curve editing and browser export were not repeated. No human listening or hardware-output approval is claimed.
- Initial review completed before commit; publication authorized by the user on 2026-10-05.

