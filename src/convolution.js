import { clamp, softLimit } from "./oscillator-core.js?v=20260928-audio1";

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

export function createSafetyShaper(context) {
  const node = context.createWaveShaper();
  const curve = new Float32Array(4097);
  for (let i = 0; i < curve.length; i += 1) {
    curve[i] = softLimit(((i / (curve.length - 1)) * 8) - 4);
  }
  node.curve = curve;
  node.oversample = "none";
  return node;
}

export async function renderConvolved(channels, sampleRate, impulse, wet, signal) {
  if (!impulse || wet <= 0) return channels;
  if (signal?.aborted) throw new DOMException("Render cancelled", "AbortError");
  const frameCount = channels[0].length + impulse.length - 1;
  const context = new OfflineAudioContext(channels.length, frameCount, sampleRate);
  const dryBuffer = context.createBuffer(channels.length, channels[0].length, sampleRate);
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
  const safety = createSafetyShaper(context);
  source.connect(dryGain).connect(safety);
  source.connect(convolver).connect(wetGain).connect(safety);
  safety.connect(context.destination);
  source.start();
  const rendered = await context.startRendering();
  if (signal?.aborted) throw new DOMException("Render cancelled", "AbortError");
  return Array.from({ length: channels.length }, (_, index) => rendered.getChannelData(index).slice());
}
