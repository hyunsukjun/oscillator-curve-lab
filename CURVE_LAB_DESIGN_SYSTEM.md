# Curve Lab Design System v1.0: Oscillator mapping

Audio Curve Lab supplies the shared visual-language reference, not code ownership. Oscillator Curve Lab keeps its own controls, two-canvas frequency/curve workspace, modulation, convolution, and FFT observation panel. This document records portable token meanings; `src/styles.css` and Canvas paint are the current web mapping.

## Visual hierarchy

1. Brand/header: 48 px Curve Lab mark, product name with colored `Curve Lab`, compact supporting text.
2. Transport: time, Open Audio, Play/Stop, duration, channel format, WAV download.
3. Parameter/tool area: waveform, count, stack, modulation, optional convolution; curve-mode buttons and Pen/Eraser.
   The sound-generation row uses equal-weight Oscillator, Resynthesis, and Convolution buttons. Mode-specific controls appear beside them; the shared curve editor remains in place.
4. Thin status strip: current curve, points, voices, base, deviation, slope, safety, WAV.
5. Dark workspace: current oscillator values above the larger curve editor. FFT is a separate optional observation panel below; it never edits curves.

The canvas remains the primary work surface. Do not replace the module layout with an Audio Curve Lab screenshot or a decorative hero.

## Portable tokens and current web values

| Meaning | Current value | Web token / source |
| --- | --- | --- |
| Environment | deep navy `#07111c`, deeper `#050b12` | `--cl-bg`, `--cl-bg-deep` |
| Surface / raised surface | `#0d1b29` / `#122438` | `--cl-surface`, `--cl-surface-raised` |
| Border / strong border | `#203a52` / `#345672` | `--cl-border`, `--cl-border-strong` |
| Primary / secondary text | `#e8f0f6` / `#aabccc` | `--cl-text`, `--cl-text-secondary` |
| Oscillator identity | Teal `#28CDB0` | `--cl-accent`; mark, title, restrained focus/identity accents |
| Focus | `#98eadc`, 2 px outline with 2 px offset | `--cl-focus`, `:focus-visible` |
| Small/medium/large radius | 4/6/8 px | `--cl-radius-sm/md/lg` |
| Spacing scale | 4/8/12/16/24 px | `--cl-space-1/2/3/4/6` |
| Common control / toolbar height | 38/54 px | `--cl-control-height`, `--cl-toolbar-height` |
| Type | system UI font; compact workbench hierarchy | root font stack and component rules |
| Button motion | 140 ms color/border transition | button rules; disabled under reduced motion |

Brand color is **not** parameter meaning. Do not wash the whole app green. Current parameter identities are Base Freq `#6de0c0`, Deviation `#e34b4b`, Spectral Slope `#6fa8dc`, FM Strength `#b887f4`, AM Depth `#e1a058`, and Ring Blend `#ec809a` (`src/app.js`). The curve, points, active mode border/background, and tooltip border follow parameter identity. Tune only for contrast, preserving meaning.

## Workspace and states

Canvas uses a dark `#0c1f31` field, more visible major than minor grid, legible axis labels, and a restrained playhead. Base Freq's editor axis follows the actual 20-4000 Hz logarithmic mapping; the FFT panel has a separate 20 Hz-20 kHz observation axis. The current-value panel shows oscillator frequencies, not a second editable curve. Point and tooltip placement must remain coherent at both curve extremes.

Buttons expose hover, active, focus-visible, and disabled states. Pen/Eraser remain a paired icon toggle with named hover help. Modulation and convolution controls appear only when meaningful. The page has a subtle ambient background; `prefers-reduced-motion` removes its motion. Use system fonts and no external visual package by default.

For narrow screens the toolbar/status wrap and the fixed-format canvas scrolls horizontally instead of changing normalized curve data. In a Standalone UI, map these meanings to native controls and drawing primitives; copying CSS pixels verbatim is not required. Any token change that alters hierarchy or parameter identity needs a decision record and a regression check.

## Hub v0.10 identity pilot — 2026-10-05

Source of truth: CURVE LAB HUB for macOS v0.10. Header symbol and micro favicon are exact source SVGs. Shared six-Lab palette and source hashes live in `assets/identity/`. Oscillator uses #28CDB0, hover #60DBC5, focus #98EADC. Parameter, meter, FFT and canvas colors retain their musical meanings. See `docs/IDENTITY_PILOT.md`.


## Common bottom transport — 2026-10-13
COMMON CANDIDATE, implemented locally. Audio reference adopted: Return to start,
Play, Pause, output-position slider, time, continuous green/yellow/red stereo meter,
CLIP. Neutral 16px icons are centered inside 38x32px buttons; 34px slider hit area.
Return to start seeks to zero while preserving playing/paused state. Pause retains
position; Play resumes; Space toggles Play/Pause outside editable controls.
Internal reset stops for import/export/settings remain distinct and unchanged.
No DSP algorithm or output format changes. Resume uses this Lab's existing engine
initialization; continuous-sample-identical resumption is not promised.
The existing waveform guides remain in their existing locations.
OUT and numeric meter values are visually removed (values remain accessible).
Meter color fields are clipped at the level, not stretched; retain analysis,
ballistics, peak hold and CLIP semantics. Shared CSS/module are vendored locally,
with per-Lab adapters and no external runtime dependency.
Oscillator retains its existing source-duration seek cap for convolution tails.
Verification covers syntax, keyboard contracts and browser layout; file-based
Labs also exercised silent-WAV pause/resume. Audible listening, Safari/Windows,
long-file performance and Oscillator mode-specific listening remain separate QA.


## 2026-10-14 viewport budget
Canvas height follows measured controls and transport, including wrapped rows and mode changes. Single 0–10 min Duration row, no FFT Preview panel. See docs/UI_REVIEW_2026-10-14.md for verified viewport sizes.


## 2026-10-14 — Common Clear Current / Reset All appearance
Both actions follow Audio's neutral navy reference: background #122438, text #aabccc, 6px radius, 13px/620 type, 92px minimum width, 38px height (30px at >=900px viewport width). Clear border #3b5063; Reset border #203a52. Shared hover/pressed/focus/disabled styles live in src/curve-actions.css. Red action emphasis is removed; brand/parameter colors elsewhere stay independent. Existing IDs, handlers, reset scope, confirmation mechanism and keyboard behavior remain unchanged. This is a local visual update, separate from DSP verification.


## 2026-10-14 — Synthesis hierarchy (local review)

Source selection precedes settings; waveform/count/frequency-layout are grouped apart from modulation. Secondary numerical/voice detail is collapsed by default. The curve gets remaining viewport space; details open/close triggers canvas resize without changing normalized points.


## 2026-10-14 — Family file information

Approved circular dotted-i disclosure immediately left of Open Audio. Default format guidance moves into this optional panel; privacy and actual error/status notices remain. Space operates disclosure without audio transport; Escape/outside click dismiss. Output guidance: 1–600 sec synthesis, plus file IR tail when used · Mono / stereo · 48 kHz / 24-bit WAV. Input limits reflect current implementation, not a device-memory guarantee. No DSP, admission, export, IDs or defaults changed.


## 2026-10-14 — Family parameter help

Static parameter descriptions are available on the relevant buttons using the Audio help design; current values, axes and activation feedback remain visible. See `docs/PARAMETER_HELP.md` (or `PARAMETER_HELP.md` in this directory). No DSP or curve mapping changes.

## 2026-10-15 Render action label
The existing Download WAV control changes to Cancel while exporting, then Cancelling until cleanup. It returns to Download WAV after success, cancellation or error. No new color or separate control; no DSP change.


## 2026-10-15 — Studio family visual pilot (local)
Reference: approved Audio design, commit 3e9723b. Apply deep cool-grey surfaces,
high-contrast typography, continuous panel boundaries and framed meters through
src/studio-theme.css. Preserve this Lab's brand accent, effect identities,
parameter mapping, feature layout and audio engine. No JS/DSP change.
This is a local first-pass candidate, not deployed; Canvas-rendered colors remain
the current implementation pending individual visual review. Narrow transport
uses document flow to avoid covering the editor. Listening is not implied.

Pilot smoke evidence: 1422px viewport, no horizontal overflow; default initialization and one parameter/effect selection verified; no browser errors captured. No full audio lifecycle, narrow/zoom certification or listening repeated. Only HTML/CSS/documentation changed.

### 2026-10-15 — Canvas alignment and zoom verification

- Canvas paper `#191C20`; neutral minor/major grid `rgba(139,149,162,.08/.18)`, matching the approved Audio direction. Parameter colors and audio processing are unchanged.
- Local browser: 800 CSS px viewport; actual Brave 125% (952 CSS px, DPR 2.5) and 150% (793 CSS px, DPR 3). No document horizontal overflow in any of the five Labs. Narrow layouts use vertical scrolling.
- Parameter selection and Clear Current smoke passed in all five; no captured console errors. Timbre play/pause/rewind smoke passed.
- Oscillator only: narrow-screen curve minimum height 220 px prevents crowded frequency labels; expanded Synthesis detail remains accessible.
- Syntax, keyboard tests and whitespace checks passed. Evidence: family workspace `evidence/family-studio-zoom-checks-20261015.json` and `*-studio-150-20261015.png`.
- Not a listening approval or a complete Safari/Windows regression. Local changes only; release decision remains pending.
- Additional targeted lifecycle/render regression suites passed; full results in family `UI_DESIGN_FAMILY_CANVAS_2026-10-15.md`.

## Common button states — 2026-10-15

`src/button-states.css` is the identical six-Lab contract, loaded after studio-theme.
Available off/bypassed: Audio reference gradient #363F4B → #2D3540, text #F0F3F7, edge #626C79. Unavailable: #353B44 / #949EAC / #495360 at full opacity. Selected: preserve existing parameter-specific fill, text and border colors, replace text underline with a full-width dark lower inset bevel (3 px). Focus remains independent. No hit-target, state, DSP or timing changes.

### Common role dimensions — 2026-10-15

- Main text buttons: 13px, weight 500, line-height 18px; 4px corner radius.
- Open/Download/Save: 38px high. Parameter/effect/waveform/synthesis mode/chain/action/dialog buttons: 34px.
- Pen/Eraser: 32px with shared 4px outer group; joined inner edges remain square. Transport: 32px, existing 3px corners and CSS glyphs retained.
- Audio edit helpers: 26px, 11px text; zoom symbols 14px. Fade handles are excluded.
- Secondary status text 12px; readout labels 11px, strong values 14px. Parameter colors and state semantics unchanged.
- Verified all six at 1422px and 640px CSS widths: no document horizontal overflow or measured button text clipping. Representative mode switching passed; Timbre Flanger expanded controls inspected, Audio Pen/Eraser and zoom/Fit exercised. Keyboard regression and diff whitespace checks passed.
- This is CSS-only verification, not fresh audio/export or listening certification. Local changes remain unpublished.

## Current precedence
See `docs/SHARED_VISUAL_CONTRACT.md` for the accepted shared baseline and resolution of older pilot conflicts. Newer role/state rules supersede old underline and 30px compact-button guidance.

## Information-density pilot — local review, 2026-10-15

Selected parameter name/value visible; statistics and full overview in disclosure. Existing synthesis values at output playhead, before IR/output processing; voice/safety detail retained. All original readout IDs and update sources preserved. Details summary Space does not start transport. COMMON CANDIDATE for standalone; not committed/deployed.

## Functional surfaces
See docs/FUNCTIONAL_SURFACE_PILOT.md. Upper controls share the title background; waveform/analysis area has its own uniform surface. This refines continuous-shell styling without changing button identity or states.

## Readout disclosure rollback — 2026-10-15
User requested removal of the newly introduced Details disclosures across the family. Original always-visible readout panels restored; Oscillator retains its pre-existing Synthesis detail panel and original contents. Value computation and audio behavior unchanged. Do not add disclosure or restructure information during color/minor-UI work. Audio also removes the border above EDIT AUDIO.

## Shared content rails — 2026-10-15 (local review)
Title/icon, primary controls, values, editor outer edges and transport contents share 20px side insets; <=600px uses 10px. Dark canvas surfaces stop at this rail with neutral #373B43 outer gutters. Internal axis labels/plot margins remain part of the canvas, not the shell rail. Space retains its two-column spatial view; Oscillator retains Synthesis detail without double insets. Colors of controls/transport and all DSP behavior are preserved. Implementation: src/content-alignment.css. No release authorized for this alignment pass.

### Oscillator family surface review — 2026-10-15 (uncommitted)
Use #373B43 for the header, controls, transport and surrounding blank page space, matching approved Timbre/Granular/Spectral surfaces. Frequency display, curve canvas and frequency-axis gutter use #191C20. Remove transport outer border/shadow and Clear Current divider; retain controls and meter outlines. Preserve 20px content rails (10px narrow) and the original Synthesis details grouping. This supersedes initial waveform #252C32 / transport #30343C pilot colors. DSP, parameter values, curve coordinates and frequency-axis geometry remain unchanged. Review before commit/deployment.

### Shared transport alignment — 2026-10-15 (uncommitted review)
Return / Play / Pause retain their order and behavior. Each occupies a 38 × 32px cell with 4px spacing and a centered 16px icon. Remove the first button's extra 7px offset/divider so visual spacing is uniform. Audio reference palette: surround #292F37, thin border #596472, hover #343A42, playing #5C6978; no per-button accent colors. Override generic button backgrounds only inside transport. Preserve keyboard focus and disabled states.

Oscillator layout correction: file help + Open Audio are now in the top-right header. Synthesis detail is always visible; this supersedes the previous collapsible detail decision. Curve canvas reserves 10px at top/bottom/right for endpoint circles, with inverse pointer mapping and axis/grid coordinates updated together. Verified Deviation point add/erase and Clear Current, default Play/Pause/rewind, 600px narrow layout without horizontal overflow. Six-Lab transport DOM measurements confirm equal button widths/heights, equal Y and 4px spacing. No commit/deployment in this review.

Release approval (2026-10-15): user approved the reviewed transport/layout changes. All six transport-keyboard suites passed (27 tests total); Oscillator syntax and diff checks passed. Prior browser measurements confirmed equal transport cells, and Oscillator point add/erase, Clear Current, Play/Pause/rewind and narrow layout were checked.

### Transport surface continuity — 2026-10-15 (uncommitted review)
Transport and surrounding page #373B43, no outer border. Fixed transport docks at bottom:0 (no 12px floating gap); bar padding 8px vertically, minimum 56px. At <=1180px all transport containers return to document flow so wrapped controls/meters do not cover editors. Remaining track uses #8290A1; completed portion retains each Lab accent. Audio's canvas track already uses the same remaining color. Transport button capsule remains #292F37 / #596472. This supersedes older #30343C transport surface and mixed footer breakpoints.

- 좁은 화면(1180 CSS px 이하)에서는 Oscillator 커브 높이를 220px로 유지하여 재생부의 문서 흐름 전환 후 편집 영역이 축소되지 않도록 한다.

### COMMON CANDIDATE — title and identity geometry (2026-10-15)
Audio is the geometry reference: at 900 CSS px and above, mark 38×38 px, title 23 px/1.1, weight 600, tracking −.025em, mark-to-copy gap 10 px. Below 900 px retain Audio’s compact 40×40 px mark and 22 px title with 12 px gap. Center the mark vertically against the brand copy; retain each Lab’s symbol, palette, subtitle, and status content. This does not prescribe identical header heights when content wraps. Shared implementation: `src/brand-layout.css`.
- Browser layout validation: 1280, 768, 600, and 390 CSS px widths; consistent title/mark/gap measurements, no title clipping or document horizontal overflow. Existing SVG assets and audio/interaction JavaScript unchanged.

### COMMON CANDIDATE — channel selector and current-value rhythm
Header output-channel selectors match adjacent file/export controls at 38px height, 13px type, 4px radius. Other synthesis selects retain their own role dimensions. Current-value strips use 8px vertical padding, 14px label line, 4px label-to-value gap and 18px value line (11px/14px font sizes). Preserve existing column counts, wrapping, labels, units, value sources and horizontal rails. Implementation: `src/readout-layout.css`.

### COMMON CANDIDATE — header information rhythm
Use Audio header vertical padding 9px and section gap 12px. At 900px and above hide the descriptive tagline, as Audio already does; below 900px retain it with 12px/1.35 typography. Always retain file/engine status and the local-processing notice, wrapping as needed. Keep existing horizontal rails and control wrapping. Granular engine readout wraps in its own value row instead of clipping; preserve the full Preview/Render counts and dynamic text.
- Checked at 1280/900/768/390 CSS px: header status retained, no horizontal document overflow; Granular engine text remains complete. Separate pre-existing 900px readout truncations remain for Space Preview (Headphones) and Oscillator Safety; not changed in this header pass.

- Resolved the intermediate-width readout truncation: Space Preview uses 6px inner horizontal padding to retain the single-word Headphones label; Oscillator Safety wraps with an auto-height value row. No label, unit or processing behavior changes.

### COMMON CANDIDATE — time and unit notation
Transport clocks use mm:ss.hh, rounded before splitting minutes/seconds (59.999 s → 01:00.00). File-duration metadata uses seconds to two decimals; integer output-duration controls use s / min, preserving one-second steps. Keep millisecond editing precision and existing DSP-parameter precision. Separate numbers from s, ms, Hz, kHz, cents, st, dB/oct and x; keep percent formatting. Granular density uses grains/s and pitch ranges use an en dash. Spectral stretch retains three decimals with x. Compact axis labels may retain abbreviations where space is limited. Display changes do not alter duration, parameter mapping, interpolation, or audio processing.
- Verified clock rollover at 59.999 and 3599.999 s, zero/negative/non-finite fallback, and 10-minute display. Layout checked at 1280/900/390 CSS px. Audio transform-parity test passed; Granular duration control min/max and Audio transport smoke checked. Listening and cross-browser export are not revalidated by this display-only pass.
