import {BOUNDARY_SECONDS} from './playback-boundary.js';

// A wet IR continues after the generated body. Taper its excitation at the body
// end, without adding another attack or changing the final output/tail deadline.
export function irSourceReleaseGain(frame, bodyFrames, tailFrames, rate) {
  if (!(tailFrames > 0)) return 1;
  const span = Math.max(1, Math.min(Math.round(rate * BOUNDARY_SECONDS), bodyFrames - 1));
  const remaining = Math.max(0, bodyFrames - 1 - frame);
  const sourceRelease = Math.min(1, remaining / span);
  if (sourceRelease >= 1) return 1;
  const finalSpan = Math.max(1, Math.min(Math.round(rate * BOUNDARY_SECONDS), Math.floor((bodyFrames + tailFrames - 1) / 2)));
  const outputRelease = Math.max(0, Math.min(1, (bodyFrames + tailFrames - 1 - frame) / finalSpan));
  // A short tail can overlap the existing final output fade. Compensate the
  // undelayed branch so it does not receive two complete release envelopes.
  return outputRelease > 0 ? Math.min(1, sourceRelease / outputRelease) : 0;
}
