# Harmonic stereo placement — 2026-10-26

User authorized this change, commit and public deployment. The current Harmonic layout supersedes the earlier broad pair-offset D-011 policy; the earlier O3 B comparison centered all eight tested harmonics and was preferred by the user.

## Contract

- Harmonic stack only: original harmonic numbers 1–8 use `pan=0`. Existing equal-power channel gains are retained, so each channel receives the same signal at `cos/sin(pi/4)`, rather than doubling each voice's energy.
- Original harmonics 9, 11, 13 and 15 use `pan=-1` (left); 10, 12, 14 and 16 use `pan=+1` (right). The supported oscillator count remains 1/2/4/8/16.
- Use original voice index, not the number/rank of retained voices. Nyquist culling does not move surviving low harmonics or reverse upper-harmonic assignment.
- The same core feeds realtime synthesis, offline WAV and oscillator input to convolution. IR processing can intentionally change the final stereo image.
- Unison, Odd Harmonics, Multiplier and File Resynthesis mappings are unchanged. Waveform, phases, frequencies, deviation, slope, normalization, modulation, limiter and 10 ms boundary policies are unchanged.
- Browser import revisions are refreshed through the app, Worklet, offline renderer and historical FFT worker paths. No UI feature or control is added.

## Verification

- `node --test tests/*.test.mjs`: 37/37 passed, including actual synthesized partial-energy tests. With sixteen sine harmonics, 1–8 have equal L/R frequency components, odd harmonics 9–15 occur only on the left and even harmonics 10–16 only on the right. High-base Nyquist culling retains the low-harmonic center.
- `node tests/output-preview.mjs`: six Off/FM/AM/Ring/Harmonic16/stress cases passed. Actual source and final limiter/boundary Worklet classes match offline PCM within 5.97e-8; 24-bit in-memory WAV differs by at most 1.20e-7; FFT comparison remains within the existing 0.002 dB tolerance. WAV remains stereo, 48 kHz, 24-bit, with one-second source frame count and unchanged endpoint treatment. No WAV is saved to disk.
- Brave isolated copy: six checks passed — 8/16-harmonic dry PCM, 8/16-harmonic native offline IR output, and actual native app Worklet Play/Pause/Resume/natural-end for both counts. An independent final zero-gain stage prevented audible playback. Pauses retained the same source/limiter graph and natural end returned to zero. Eight-harmonic dry PCM had maximum L/R difference zero.
- Before the change, the zero-duration VM mock lacked existing IR state and the older output-preview harness omitted the already-released final 10 ms boundary. The mock and comparator were updated to exercise current production contracts. The existing WAV tolerance was not relaxed.
- The first browser-only diagnostic attempted OfflineAudioContext MessagePort setup and returned all-zero Worklet output; that harness result is retained outside the product and is not classified as a product regression. Browser checks were separated into actual online app Worklet lifecycle with independent mute and offline PCM/native IR render checks. One duplicate-name syntax error in the diagnostic-only helper was corrected before its successful run. No such helper is included in production.
- Syntax and whitespace checks passed. Publication is recorded in the release evidence after commit/push; do not infer public deployment from this document alone.

## Listening and rollback

No new personal listening was performed. The earlier preferred B observation covers eight harmonics; the new 9–16 arrangement has numeric/browser evidence, not a new subjective approval. Do not transfer it to File Resynthesis or Odd Harmonics without a separate request.

Rollback restores this change's source/cache/test/specification set to parent `4fe20c2ad073d22839b8cacaa1a8681832e49b25`, preserving unrelated work and public-release history. Reverting this change must not remove the existing IR transport or 10 ms boundary updates. No unrelated AGENTS changes, IR audit files or sibling modules are part of this release.
