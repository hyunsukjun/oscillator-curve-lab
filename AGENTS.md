# Oscillator Curve Lab working rules

Scope: this directory only. Audio Curve Lab is a design reference; other Curve Lab projects are not part of this checkout's work. The web app remains an independently evolving product and the executable reference for a future Standalone version.

1. Inspect current code, tests, README, and relevant specifications before changing behavior. Treat code and documents as evidence, not as automatically authoritative over one another. Investigate and report discrepancies.
2. Preserve the Oscillator-specific waveform, frequency, stack, deviation, partial, modulation, convolution, FFT, and safety behavior. Do not rewrite a working feature merely to anticipate a native implementation.
3. Separate product behavior, processing/data model, and platform implementation in both design and documentation. Keep parameter IDs, units, curve coordinates, interpolation, shortcuts, and established fine-tuning stable unless a requested change warrants migration.
4. Separate UI-only and DSP changes. Keep edits scoped; do not add dependencies or undertake broad refactors without a clear need and approval.
5. Update documentation with implementation: new feature -> `docs/FEATURE_REGISTRY.md`; parameter or mapping -> `docs/PARAMETER_SPEC.md`; gesture -> `docs/INTERACTION_SPEC.md`; audio algorithm -> `docs/DSP_BEHAVIOR.md`; consequential decision -> `docs/DECISIONS.md`; portable behavior or web/native boundary -> `docs/STANDALONE_MIGRATION.md`; design token or visual rule -> `CURVE_LAB_DESIGN_SYSTEM.md`.
   Record reference sounds, controlled listening outcomes, exact-value rationale, and performance/cross-engine measurements in `docs/KNOWLEDGE_PRESERVATION.md`; link related decisions rather than treating tests as listening approval.
   For Resynthesis analysis, peak selection, bank mapping, or sound-mode behavior, update `docs/RESYNTHESIS_SPEC.md` as well.
6. Mark implemented behavior separately from numerical verification and subjective listening. Record unresolved questions and test gaps instead of inventing approval or exact future-native parity.
7. After a change, run relevant regression tests, JavaScript syntax checks, and browser lifecycle checks scaled to its risk. Preview/Render parity matters for audio changes. Keep a local preview link verifiable by HTTP before reporting it.
8. Do not commit, push, publish, or deploy without an explicit request. Do not edit sibling Curve Lab projects.

Document order: `DEVELOPMENT_GUIDELINES.md` for engineering practice, `CURVE_LAB_DESIGN_SYSTEM.md` for visual semantics, and `docs/` for this module's portable product specification. Existing reports in `docs/` are historical test evidence, not blanket approval of later revisions.
