import { clamp } from "./oscillator-core.js?v=20261002-fixedpan1";

export const MIN_IR_SECONDS = 3;
export const MAX_IR_FILE_BYTES = 16 * 1024 * 1024;

export function impulseLength(source, percent = 0) {
  const minimum = Math.min(source.length, Math.ceil(MIN_IR_SECONDS * source.sampleRate));
  return Math.min(source.length, Math.max(1, Math.round(minimum + (source.length - minimum) * clamp(percent / 100, 0, 1))));
}

export function prepareImpulse(context, source, percent = 0) {
  const length = impulseLength(source, percent);
  const channels = Math.min(2, source.numberOfChannels);
  const result = context.createBuffer(channels, length, source.sampleRate);
  const truncated = length < source.length;
  const fadeLength = truncated ? Math.min(length, Math.round(source.sampleRate * 0.01)) : 0;
  for (let channel = 0; channel < channels; channel += 1) {
    const target = result.getChannelData(channel);
    target.set(source.getChannelData(channel).subarray(0, length));
    for (let i = 0; i < fadeLength; i += 1) {
      target[length - fadeLength + i] *= 1 - (i / Math.max(1, fadeLength - 1));
    }
  }
  return result;
}

export function tailSeconds(impulse) {
  return impulse ? Math.max(0, (impulse.length - 1) / impulse.sampleRate) : 0;
}

export function mixGains(wet) {
  const position = clamp(wet);
  const eased = position * position * (3 - (2 * position));
  const angle = eased * Math.PI * 0.5;
  return { dry: Math.cos(angle), wet: Math.sin(angle) };
}

export async function renderConvolved(channels, sampleRate, impulse, wet, signal) {
  if (!impulse || wet <= 0) return channels;
  if (signal?.aborted) throw new DOMException("Render cancelled", "AbortError");
  const frameCount = channels[0].length + impulse.length - 1;
  const context = new OfflineAudioContext(channels.length, frameCount, sampleRate);
  // Keep the stereo source active through the IR tail so the Convolver cannot downmix mid-render.
  const dryBuffer = context.createBuffer(channels.length, frameCount, sampleRate);
  channels.forEach((channel, index) => dryBuffer.copyToChannel(channel, index));
  const source = context.createBufferSource();
  source.buffer = dryBuffer;
  const convolver = context.createConvolver();
  convolver.normalize = true;
  convolver.buffer = impulse;
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const gains = mixGains(wet);
  dryGain.gain.value = gains.dry;
  wetGain.gain.value = gains.wet;
  source.connect(dryGain).connect(context.destination);
  source.connect(convolver).connect(wetGain).connect(context.destination);
  source.start();
  // Native rendering has no close/terminate operation. Check cancellation at
  // suspended boundaries, clear the graph, then drain to completion before
  // rejecting, so a cancelled render never survives its returned promise.
  const disconnect = () => {
    source.disconnect();
    convolver.disconnect();
    dryGain.disconnect();
    wetGain.disconnect();
  };
  const duration = frameCount / sampleRate;
  let checkpoint = signal && duration > 2 ? context.suspend(2) : null;
  const rendering = context.startRendering();
  // Attach a rejection handler while awaiting checkpoints as well.
  const completed = rendering.then(value => ({ value }), error => ({ error }));
  try {
    let time = 2;
    while (checkpoint) {
      const outcome = await Promise.race([
        checkpoint.then(() => ({ suspended: true })), completed
      ]);
      if (!outcome.suspended) break;
      if (signal.aborted) {
        disconnect();
        source.buffer = null;
        convolver.buffer = null;
        await context.resume();
        break;
      }
      time += 2;
      checkpoint = time < duration ? context.suspend(time) : null;
      await context.resume();
    }
    const outcome = await completed;
    if (outcome.error) throw outcome.error;
    if (signal?.aborted) throw new DOMException("Render cancelled", "AbortError");
    return Array.from({ length: channels.length }, (_, index) => outcome.value.getChannelData(index).slice());
  } catch (error) {
    // A scheduling/resume error must not strand a suspended native render.
    disconnect();
    source.buffer = null;
    convolver.buffer = null;
    if (context.state === "suspended") await context.resume();
    await completed;
    throw error;
  } finally {
    disconnect();
  }
}
