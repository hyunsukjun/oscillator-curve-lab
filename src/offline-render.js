import { fadeOutput } from "./playback-boundary.js";
import { renderFrame, createSmoothingState, TARGET_SAMPLE_RATE, MAX_SOUND_DURATION_SECONDS, clamp, edgeFade, encodeWav24Steps, outputChannelCount } from "./oscillator-core.js?v=20261006-cooperative1";
import { renderConvolved } from "./convolution.js?v=20261006-cancel-drain1";
import { limitChannelsSteps, LOOKAHEAD_SECONDS } from "./safety-limiter.js?v=20261006-cooperative1";

export async function renderOscillator({ settings, impulse, signal, onProgress, samplesOnly = false }) {
  settings = structuredClone(settings);
  const checkAbort = () => {
    if (signal?.aborted) throw new DOMException("Render cancelled", "AbortError");
  };
  const yieldUI = async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
    checkAbort();
  };
  const consume = async steps => {
    let step;
    let lastYield = performance.now();
    do {
      checkAbort();
      step = steps.next();
      if (!step.done && performance.now() - lastYield >= 12) {
        await yieldUI();
        lastYield = performance.now();
      }
    } while (!step.done);
    checkAbort();
    return step.value;
  };
  checkAbort();
  const sampleRate = TARGET_SAMPLE_RATE;
  const requestedDuration = Number(settings.durationSeconds ?? 20);
  if (!Number.isFinite(requestedDuration) || requestedDuration <= 0) throw new RangeError("Choose an Output Duration above 0 sec.");
  const duration = clamp(requestedDuration, 1, MAX_SOUND_DURATION_SECONDS);
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
    const fade = 1; // Apply the boundary once, to completed output including the IR tail.
    const left = sample.left * fade;
    const right = sample.right * fade;
    peak = Math.max(peak, Math.abs(left), Math.abs(right));
    output[0][frame] = left;
    if (channelCount > 1) output[1][frame] = right;

    const progress = (frame / frameCount) * (convolving ? 0.75 : 0.85);
    const now = performance.now();
    if (progress - lastProgress > 0.01 || now - lastYield > 12) {
      lastProgress = progress;
      lastYield = now;
      onProgress?.(progress);
      await yieldUI();
    }
  }

  if (convolving) output = await renderConvolved(output, sampleRate, impulse, settings.convolutionWet, signal);
  // Flush the unchanged limiter, then remove only its leading algorithmic delay.
  // Preserve every source/tail sample; do not trim the end to force duration.
  const latencyFrames = Math.round(sampleRate * LOOKAHEAD_SECONDS);
  output = await consume(limitChannelsSteps(output, sampleRate));
  // Internal FFT/reference PCM retains the realtime timeline. Compensate files only.
  if (!samplesOnly) output = output.map(channel => channel.subarray(latencyFrames));
  fadeOutput(samplesOnly ? output.map(channel => channel.subarray(latencyFrames)) : output, sampleRate);
  peak = 0;
  for (const channel of output) {
    for (let start = 0; start < channel.length; start += 65536) {
      const end = Math.min(channel.length, start + 65536);
      for (let i = start; i < end; i++) peak = Math.max(peak, Math.abs(channel[i]));
      if (performance.now() - lastYield > 12) {
        await yieldUI();
        lastYield = performance.now();
      }
    }
  }
  const blob = samplesOnly ? null : await consume(encodeWav24Steps(output, sampleRate));
  checkAbort();
  onProgress?.(1);
  return {
    blob,
    samples: samplesOnly ? output : null,
    duration: output[0].length / sampleRate,
    channelCount,
    peak
  };
}
