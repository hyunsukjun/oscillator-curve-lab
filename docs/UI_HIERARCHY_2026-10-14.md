# Synthesis hierarchy — local review

UI-only release approved by user on 2026-10-14. Deployment evidence is tracked in the family workspace. Existing exclusive paths, DSP, parameter IDs/defaults, curves, file analysis, and WAV generation preserved.

- Source paths above their settings; Open Audio beside path selection.
- Waveform/count/frequency layout grouped apart from modulation.
- Curve selection immediately before time-editing area.
- Synthesis detail initially closed; existing voice canvas and secondary readouts retained. Calculation view is labeled before modulation/file IR, not an output analyzer.
- Collapsed detail skips its canvas draw; toggling recalculates display geometry only.

Validation: JS syntax; duration/initial-play/pending-play/keyboard/render lifecycle/WAV tests passed (11 test-runner entries, with internal scenario assertions). Modulation/resynthesis/convolution/keyboard suites passed 20 entries. Initial keyboard harness extraction accidentally included the new toggle listener; listener moved after resize registration, existing tests passed without modifying tests. DSP sources unchanged.

Local browser: exclusive mode controls, Resynthesis settings visibility and oscillator settings hiding, Play state/time/level meter, detail toggle verified. No recorded console errors. Fixed iframe 1280x720 and 1024x768: default collapsed layout fits; expanded File IR (without imported file) also fits after adjustment. Actual file-loaded long names/IR controls plus FM-expanded layout and all native browser combinations remain to verify; no listening claim. Screenshot in family evidence/oscillator-hierarchy-20261014.png.
