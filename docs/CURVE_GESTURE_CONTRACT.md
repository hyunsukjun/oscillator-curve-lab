# Curve gesture contract — Shift group / Option erase, 2026-10-27

Status: IMPLEMENTED and verified within the UI scope below. The user individually tested the five prepared Lab interactions, reported no major issues, and explicitly authorized commit/deployment on 2026-10-27. Deployment success is tracked separately from this interaction contract. Audio is the previously released reference and is unchanged by this five-Lab rollout.

## Approved interaction

- Pen, ordinary click/drag: existing add and single-point editing behavior.
- macOS Option + primary click: temporarily erase an interior point without changing the selected tool. PC Ctrl-click keeps its existing erase meaning. Command no longer means temporary erase on Mac. Persistent Eraser remains available; endpoint protection remains.
- Shift + primary drag starting on an existing point: capture that point and all following points in the active, ordered curve. Move only Y with one common delta in that curve's stored normalized coordinate. Keep every X, left-side point and other curve unchanged. Clamp the shared delta at the first member's allowed bound; never clamp members independently. Logarithmic parameters keep their mapping; a common normalized delta is not necessarily a common physical-unit offset.
- Shift on empty space does not add a point. Shift click without movement does not change values. Erase takes priority over Shift when combined.
- Captured membership persists if Shift is released during the drag. Pointer release accepts the group move. Escape, pointer cancellation, lost capture, window blur, tool/curve/state switch cancel the pending group and restore its original Y values/edited flags. This is a drag transaction, not a new Undo system. Existing single-point cancellation semantics remain.
- Pending groups receive a thin outline and count in the existing point hint, with vertical cursor feedback. Base point geometry, graph axes, layout and data colors remain.

## Preservation boundary

DSP/worklet/render algorithms, musical units and mappings, time axis, channels, panning and modulation are not changed. The helper owns normalized UI gesture state only. Each independent app keeps a local identical helper; no new package or DSP dependency is introduced. Source range/selection, curve editing target, listening playhead and rendered-output freshness remain distinct. Actual edits use each app's existing update/invalidation path; cancelling after an edit can conservatively leave a render stale rather than assert it is current. No new seek/reset, changed audio message schema, transport or IR transition is added.

## Local application

Base Frequency, Deviation, Slope, FM Index, AM Depth and Ring Mix. Keep logarithmic frequency and every modulation/deviation mapping, fixed endpoint X, neighbor-crossing limits, oscillator/resynthesis state, IR and channel policies. Stored Y increases downward; Shift follows the existing visual/mapping direction. The hidden partial monitor remains hidden.

## Verification boundary

New helper + actual-handler integration tests cover all 39 parameters across the five Labs, 195 cancellation cases and 273 unchanged ordinary-edit model/message traces against immutable pre-change sources. Browser synthetic-pointer checks cover 39 parameter group moves, X invariance, Esc restoration, Option deletion and protected endpoints. Synthetic input is not physical Shift-drag acceptance. Responsive/native/browser results and pre-existing test failures are recorded in the family QA report; Windows, touch, listening and product-wide completion are not certified. Native Brave Option deletion, Shift click without mutation and ordinary X/Y dragging passed in all five Labs (15 scenarios); user-held Shift group dragging was individually reviewed with no major issue reported. This is not exhaustive device or listening acceptance. The user approved the five-Lab UI commit/deployment after this review.

## Standalone asset

Preserve the operation contract, active-curve ordered suffix, common bound, fixed-time X, cancellation transaction, mapping direction and separation from audition/render state. Use native modifier naming and accessibility support. Web pixel sizes and pointer-capture APIs are implementation details, not a native product specification. Keep touch interaction separately designed and verified.
