# Interaction Specification

Snapshot: 2026-09-29. This describes **user intent** independently of Pointer Events and HTML. Web implementation references are given separately; they are not product-level gestures. No touch or native-device gesture has yet been approved.

## Workbench flow

The three sound-mode buttons are mutually exclusive. Oscillator is initially selected. Switching mode stops playback without reloading the page or rebuilding the AudioContext. Open Audio prepares one file for both Resynthesis and Convolution, so switching needs no second import. Resynthesis reveals Analyze, Partials 32/64, and concise analysis status while reusing the existing Base Freq, Deviation, and Spectral Slope curve editor. Its approved C stereo placement is fixed, with no placement selector. Convolution reveals the existing Dry/Wet and IR Length controls after audio is loaded. Import automatically analyzes; Analyze can run again after changing the partial limit. A sparse source may show fewer voices than the chosen maximum. No new level meter was introduced by this mode work.

1. Select waveform, oscillator count, stack, and optional modulation. The selected waveform and stack affect every active voice. Select a curve mode to edit one trajectory while the other trajectories remain visible.
2. Draw or adjust points in the large curve workspace. Horizontal position is normalized sound time; vertical position is the selected parameter's mapping. A point tooltip reports time and a parameter-appropriate value. Base Freq additionally displays nearest equal-tempered note and cents relative to A4=440 Hz; this is a reference pitch, not measured output pitch.
3. Play hears current settings from the start; Stop silences immediately and returns the playhead to zero. Spacebar toggles transport once per physical press when focus is not in an input/select/textarea or editable text. Held-key repeats do not toggle again. The shortcut respects disabled Play and active export, releases button focus after an accepted press, and consumes keyup outside editing controls to avoid a second button activation. The status strip and current-oscillator panel show present values. The optional FFT output panel is observation only.
4. Render downloads the current 48 kHz/24-bit WAV. Changing a setting or curve invalidates the previous export status and makes any displayed FFT result stale.

## Curve gestures and invariants

| Intent | Required behavior | Current web implementation |
| --- | --- | --- |
| Choose parameter | Switch editable trajectory without deleting or reinterpreting other curves. Modulation mode reveals its own saved curve. | Mode buttons and `setActiveCurve`; `modulationCurves` mapping. |
| Pen click empty area | Add one point at the normalized time/value and keep points time-ordered. | `addPoint` after hit test misses. |
| Pen drag a point | Move that point vertically and, for interior points, horizontally without crossing neighbors. | `updatePoint`, neighbor x gap `0.002`. |
| Endpoint drag | Start/end points stay at x=0/x=1; vertical value can change. | `updatePoint` fixes endpoint x. |
| Eraser click interior point | Delete only the targeted point. | `setTool("eraser")`, `findPoint`, splice only for indices between endpoints. |
| Eraser click empty area or endpoint | Do nothing; never create a replacement point or delete either endpoint. | Eraser branch returns before Pen addition. |
| Temporary erase | Mac Command-click or PC Ctrl-click has Eraser meaning without changing the persistent tool. | Platform-dependent `metaKey`/`ctrlKey` in `src/app.js`. Physical Windows Ctrl-click remains to be checked. |
| Clear Current | Restore only the active parameter's two-point default curve. | `clearCurrentCurve`. |
| Reset All | Ask for confirmation; accept restores every curve; cancel leaves all curves unchanged. | `window.confirm` then `resetAll`. Acceptance is code-defined; browser automation of cancellation was not completed in the design-system pass. |

The web hit-test radius is 12 CSS px. That value is an implementation detail, not a native gesture specification. A Standalone implementation may choose a device-appropriate hit area while preserving point selection and empty-space behavior. Likewise, Canvas resize or scrolling must not change stored normalized curves.

The frequency and curve Canvas use the available workspace width so the full output time range, including both endpoints, remains visible without horizontal scrolling on a laptop. Resize changes only display and backing-store dimensions; normalized points and their DSP timing stay fixed.

Audio smoothing after curve mapping does not move points, change tooltip values, or redraw a different gesture. A steep Deviation or FM gesture remains steep on screen while its audio target settles over 8 or 5 ms respectively. Numeric Ratio changes settle over 10 ms in log-frequency space.

## Module controls

- `Duration`: An always-visible row below the parameter toolbar shows the range, slider, current seconds, and estimated WAV size; it does not change the active curve or tool. The short 1-60 s and long 60-600 s sliders use 1 s steps. Changing range clamps only when needed; changing the value stops playback and resets the playhead. Points retain normalized time/value and interpolation, so the whole gesture takes proportionally longer or shorter. Controls are disabled while rendering. The displayed WAV size includes output channels, current wet tail, and limiter flush, but not temporary render memory.

- `Waveform`: Sine/Triangle/Saw/Square are mutually exclusive source choices. The default is Sine.
- `Stack`: Unison, Harmonic, Odd Harmonics, or Multiplier. Multiplier currently uses an internal fixed pattern, not direct ratio entry. `Mod Freq x` is the modulator-to-carrier ratio and is shown only when FM/AM/Ring is selected.
- `Convolution`: the mode button remains selectable without an IR; until a valid local file is decoded it plays the dry oscillator and does not show Dry/Wet or IR Length. Opening audio loads an IR while preserving oscillator synthesis. Choosing Oscillator bypasses the effect. A new invalid file must not erase an earlier usable IR.
- `FFT Preview`: Off initially. Opening starts analysis; settings/curve changes mark a previous result stale; Update recomputes; playback/export cancel pending analysis. It is a feedback view, not a curve editor.

## Feedback and unresolved interaction work

The current-value panel shows voice frequency structure at the playhead and identifies omitted high voices by count. The editable Base Freq axis is 20-4000 Hz; the FFT's independent observation axis is 20 Hz-20 kHz. These scales must not be visually conflated. Keep focus-visible, hover, disabled, and reduced-motion behavior from `CURVE_LAB_DESIGN_SYSTEM.md`.

Open tests: Reset All cancellation in a real browser; PC Ctrl-click on Windows hardware; touch/pen semantics; browser zoom plus canvas scroll hit testing; long-duration playhead timing on devices with native-rate fallback. No Undo/Redo or persisted preset interaction currently exists.


## 2026-10-11 — Pending Play cancellation

Play now checks its captured playback token after both engine preparation and asynchronous Convolution installation. Stop during either wait prevents an obsolete request from opening output gain or starting playback. Multiple pending Play calls start only once; a subsequent explicit Play still works. DSP, IR preparation, safety limiter, curves, and export format are unchanged.

Actual-handler delayed-initialization regression failed before the fix and passes engine-wait cancellation, convolution-wait cancellation, duplicate Play and explicit retry after correction. Existing keyboard, render lifecycle, convolution and syntax checks pass. This is request cancellation evidence, not measured cold-start latency or listening approval. Mode switching/file-import cancellation during initialization remains a separate review item. Convolver installation itself is not aborted; this change prevents obsolete playback after its completion.


## 2026-10-11 — Pending Play across mode/import/analysis

Mode changes, analysis restarts with source samples, and accepted file reads now invalidate a pending Play even when isPlaying is still false. Previously these actions only stopped active playback and could allow engine preparation to complete into the new context. File chooser cancellation and over-limit files rejected before decoding preserve the current state. Failed accepted imports retain the existing usable IR but cancel the earlier Play request. Sound processing and analysis algorithms are unchanged.

Actual-handler regression tests/pending-play-context.mjs: old mode-switch case failed; corrected mode switch, analysis restart and corrupt-file cancellation pass, as do chooser cancellation and size rejection preservation. Existing pending setup tests pass. Controlled waits isolate the race; this is not an audible latency measurement. Standalone should invalidate asynchronous playback requests when the source or sound mode changes.


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


## 2026-10-14 UI scope update
Output Duration now uses one 0–600s slider (zero disables playback/export); FFT Preview UI and runtime wiring are removed. Resynthesis FFT analysis remains. Canvas heights follow the actual viewport budget. Earlier FFT descriptions are historical. See [implementation, verification and review](UI_REVIEW_2026-10-14.md). No sound-algorithm tuning or deployment in this change.
