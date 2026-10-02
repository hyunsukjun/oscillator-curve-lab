import { renderFrame, createSmoothingState, TARGET_SAMPLE_RATE, clamp, edgeFade, encodeWav24, outputChannelCount } from "./oscillator-core.js?v=20261002-fixedpan1";
import { renderConvolved } from "./convolution.js?v=20261002-stereotail1";
import { limitChannels } from "./safety-limiter.js?v=20261002-lookahead1";

export async function renderOscillator({ settings, impulse, signal, onProgress, samplesOnly = false }) {
  const sampleRate = TARGET_SAMPLE_RATE;
  const duration = clamp(settings.durationSeconds || 20, 1, 180);
  const frameCount = Math.ceil(duration * sampleRate);
  const channelCount = outputChannelCount(settings.format);
  let output = Array.from({ length: channelCount }, () => new Float32Array(frameCount));
  const phases = new Float64Array(64);
  const modPhases = new Float64Array(64);
  const smoothingState = createSmoothingState();
  const convolving = Boolean(impulse && settings.convolutionEnabled && settings.convolutionWet > 0);
  let peak = 0;
  let lastProgress = 0;
  let lastYield = performance.now();

  for (let frame = 0; frame < frameCount; frame += 1) {
    if (signal?.aborted) throw new DOMException("Render cancelled", "AbortError");
    const t = frameCount <= 1 ? 0 : frame / (duration * sampleRate);
    const sample = renderFrame(settings, t, sampleRate, phases, modPhases, smoothingState);
    const fade = edgeFade(frame, frameCount, sampleRate);
    const left = sample.left * fade;
    const right = sample.right * fade;
    peak = Math.max(peak, Math.abs(left), Math.abs(right));
    output[0][frame] = left;
    if (channelCount > 1) output[1][frame] = right;

    const progress = (frame / frameCount) * (convolving ? 0.85 : 1);
    const now = performance.now();
    if (progress - lastProgress > 0.01 || now - lastYield > 60) {
      lastProgress = progress;
      lastYield = now;
      onProgress?.(progress);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  if (convolving) output = await renderConvolved(output, sampleRate, impulse, settings.convolutionWet, signal);
  output = limitChannels(output, sampleRate);
  peak = 0;
  for (const channel of output) {
    for (const sample of channel) peak = Math.max(peak, Math.abs(sample));
  }
  onProgress?.(1);
  return {
    blob: samplesOnly ? null : encodeWav24(output, sampleRate),
    samples: samplesOnly ? output : null,
    duration: output[0].length / sampleRate,
    channelCount,
    peak
  };
}
