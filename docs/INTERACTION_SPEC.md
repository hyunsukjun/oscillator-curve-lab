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


## 2026-10-14 — Synthesis hierarchy (local review)

Synthesis path selection now precedes path-specific settings. Open Audio is in that source row. Basic Waveform, File Resynthesis and Oscillator + File IR retain the same mutually exclusive oscillator/resynthesis/convolution mode IDs and behavior. Frequency layout is the visible label for Stack; modulation is grouped separately. Synthesis detail is a native details disclosure, closed on each page load. Opening/closing adjusts canvas display geometry only; normalized points and sound are unchanged. WAV status stays next to Download WAV.


## 2026-10-14 — Family file information

Approved circular dotted-i disclosure immediately left of Open Audio. Default format guidance moves into this optional panel; privacy and actual error/status notices remain. Space operates disclosure without audio transport; Escape/outside click dismiss. Output guidance: 1–600 sec synthesis, plus file IR tail when used · Mono / stereo · 48 kHz / 24-bit WAV. Input limits reflect current implementation, not a device-memory guarantee. No DSP, admission, export, IDs or defaults changed.

Family verification: all six information panels passed desktop/narrow bounds and Space/Escape/outside-click checks; shared keyboard regression 27/27 passed. Existing dynamic errors and audio handlers unchanged. User approved commit and publication on 2026-10-14. Release evidence in family FILE_HELP_2026-10-14.md. Earlier Audio-only pilot status is superseded.


## 2026-10-14 — Family parameter help

Static parameter descriptions are available on the relevant buttons using the Audio help design; current values, axes and activation feedback remain visible. See `docs/PARAMETER_HELP.md` (or `PARAMETER_HELP.md` in this directory). No DSP or curve mapping changes.


## 2026-10-14 — Disclosure keyboard ownership
Synthesis detail 등 summary에 포커스한 Space는 기본 패널 열기/닫기에 맡기고 transport가 가로채지 않는다. Enter·Tab과 나머지 Space 재생 정책은 유지한다. 음향 엔진 변경 없음.

## 2026-10-15 — Reachable export cancellation

Download WAV becomes Cancel during rendering. A second click aborts the existing job and returns without starting another render. Cancelling is disabled until cleanup; completion restores Download WAV and controls. Abort reports cancelled. Previously an AbortController existed but the download control was disabled, making cancellation unreachable. Settings, curves, synthesis, IR, resynthesis, WAV format and DSP are unchanged. Future standalone should likewise expose cancellation and allow a clean retry. Verification: actual-handler regression and Safari lifecycle; listening and Windows remain separate.

## Information-density pilot — local review, 2026-10-15

Selected parameter name/value visible; statistics and full overview in disclosure. Existing synthesis values at output playhead, before IR/output processing; voice/safety detail retained. All original readout IDs and update sources preserved. Details summary Space does not start transport. COMMON CANDIDATE for standalone; not committed/deployed.

## Readout disclosure rollback — 2026-10-15
User requested removal of the newly introduced Details disclosures across the family. Original always-visible readout panels restored; Oscillator retains its pre-existing Synthesis detail panel and original contents. Value computation and audio behavior unchanged. Do not add disclosure or restructure information during color/minor-UI work. Audio also removes the border above EDIT AUDIO.

## Export feedback visibility
Idle WAV ready/not ready/needs export badges are hidden. The Download control retains its normal state. Progress, cancellation, limits and failure feedback remain visible; status values are not audio-engine inputs.

## 2026-10-15 review correction (uncommitted)
Open Audio and its file-help control move to the header, before channel selection. Synthesis detail is always visible (section, not disclosure), superseding the previous collapsed default. Curve display has 10px top/bottom/right inset; normalized parameter values and time remain unchanged. Pointer Y inversion and point hit-testing use the same inset plot height.

Expanded-editor layout (2026-10-15): viewport/control resizing changes canvas display dimensions only. Existing canvas sizing observers update backing stores and pointer coordinates; Oscillator additionally observes its main canvas. Curve data and transport state are retained. If controls plus minimum canvas exceed viewport height, use page scrolling rather than covering controls or compressing the editor.

## 2026-10-15 — values monitor
The always-visible oscillator/partial monitor may scroll horizontally when voices exceed readable width. It is focusable; keyboard arrows scroll its viewport. This changes presentation only, not the voices selected, Nyquist filtering or synthesis. Long source/analysis text wraps in full. Approved after 32/64-partial display and transport verification.

## 2026-10-15 — two visible synthesis paths (local review)
The top selector contains File Resynthesis and Oscillator + File IR; remove the redundant SYNTHESIS SOURCE label and standalone Basic Waveform button. Default to Oscillator + File IR with no IR, retaining the previous dry oscillator sound. The empty state reads “No IR loaded · dry oscillator”. Resynthesis shows file/Analyze/Partials; the oscillator path shows Waveform/Count/Layout/Modulation plus IR controls only when a file is available. Wet=0 preserves dry synthesis after import. Existing internal oscillator DSP branch and separate curve stores remain; no synthesis algorithm or parameter mapping change. Mode switching still stops playback and preserves each path's curves/settings.

Validation: pending-play-context, convolution (including bypass WAV identity), resynthesis tests pass. Actual browser dry/resynthesis/IR playback and four WAV saves passed (48kHz, 24-bit stereo; dry/resynthesis/Wet0=1s, Wet100=3s including 2s IR tail). FM choice restored after switching back. Both modes at900/390 CSS px had no horizontal overflow or curve/transport overlap; natural vertical scrolling remains. Listening and native confirmation keyboard deferred. No commit or deployment yet.

## 2026-10-15 — automatic partial refresh
Remove Reanalyze: importing a file and changing32/64 already trigger analysis. On a partial-count change with an existing result, keep the old result and transport running until the latest generation completes, then send updated settings without seek/restart. Preserve base curve, paused position, and paused state. Failure retains the old playable result and shows an error. Initial import retains its existing stop/invalidation contract. Remove the redundant Estimated base completion sentence; pending/error text remains and actual counts/base values stay in the monitor. This supersedes the earlier Reanalyze-label note.

Validation: live-partial-switch controlled race/failure tests and pending-play-context/resynthesis regressions pass. Browser32→64 at7.20s continued through7.36s with Play active and64/64; paused64→32 stayed paused at7.42s. This proves transport continuity, not artifact-free perceptual switching; comparison listening remains deferred.

### Compact duration clock — 2026-10-15 approved release
Match approved Granular layout: mm:ss readout at14px/600 with tabular digits, continuous slider, no endpoint labels or WAV estimate. Preserve0–600s/1s increments and zero-disabled behavior. Duration remains synthesis length; IR tail can extend total output (retained in help/footer). Browser483→08:03,0→00:00/disabled,600→10:00 and390px layout passed. Display only; no DSP/tail changes. Approved for commit and deployment. Native confirmation keyboard checks and comparison listening remain deferred.

## Space after selecting settings — 2026-10-18
A closed native select retaining focus must allow Space to play/pause in place. Open native menus, text/numeric inputs, editable content and summaries retain native key behavior. Repeat, disabled transport and active export guards remain. Closed Modulation selection followed by Space play/pause passed in Brave; native open-menu interaction remains a manual check. DSP unchanged.

## IR retained-history control — 2026-10-25

The approved local IR control update supersedes earlier output-position wording: the slider maps 0–1 to sound duration D, while the output clock includes the IR tail and limiter flush. Active wet-IR Pause retains the graph; a valid Play resumes it. The sound endpoint without retained history labels the next Play as starting from the beginning. Arbitrary tail seeking is unsupported.

Real mode/file/curve/settings changes invalidate retained history. Same-mode reselection and files rejected before admission preserve it. Return to start selects zero without starting stopped/paused playback. Pausing/resuming transitions and stopped meters are explicitly labelled; CLIP history still requires explicit reset. The shared transport module, source waveform and curve gestures are unchanged. Implementation and publication do not by themselves establish final scoped acceptance.


## 10 ms playback boundary candidate — 2026-10-25

The current local candidate supersedes earlier automatic transport-boundary durations with the [10 ms playback/WAV contract](PLAYBACK_BOUNDARY.md). Source/effect envelopes are separate. See that contract for pause-state retention, existing tail-length limits and verification status. Uncommitted; listening acceptance pending.

## Readout context family release — 2026-10-27

Stack/Base/Deviation/Slope/Voices captions identify output-playhead synthesis/derived values before modulation/IR/output processing. Static source overview and hidden partial canvas retained. No new gesture, seeking, point selection, transport command or audio mutation is introduced by displaying these values. See `READOUT_CONTEXT_CONTRACT.md` for basis, source-range rules, verification boundary and portability.
