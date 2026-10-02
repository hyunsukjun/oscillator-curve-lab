import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  curveDefaults,
  edgeFade,
  encodeWav24,
  normFromBaseFrequency,
  oscillatorSample,
  softLimit,
  stackFrequencies,
  voicePan
} from "../src/oscillator-core.js";
import { limitChannels } from "../src/safety-limiter.js";
import { renderOscillator } from "../src/offline-render.js";

const rate = 48000;
const durationSeconds = 4;
const frames = rate * durationSeconds;
const destination = resolve(dirname(fileURLToPath(import.meta.url)), "../work/stereo-glissando-ab");
const curves = Object.fromEntries(
  Object.entries(curveDefaults).map(([id, y]) => [id, [{ x: 0, y }, { x: 1, y }]])
);
curves.basePitch = [
  { x: 0, y: normFromBaseFrequency(2900) },
  { x: 1, y: normFromBaseFrequency(110) }
];
const settings = {
  waveform: "saw",
  count: 16,
  stack: "harmonic",
  modulationMode: "off",
  modulationRatio: 1,
  durationSeconds,
  format: "stereo",
  curves
};

function renderWithPan(panAt) {
  const channels = [new Float32Array(frames), new Float32Array(frames)];
  const phases = new Float64Array(64);
  for (let frame = 0; frame < frames; frame += 1) {
    const voices = stackFrequencies(settings, frame / frames, rate);
    let left = 0;
    let right = 0;
    for (const voice of voices) {
      const pan = panAt(voice.index, voices.length);
      const angle = (pan + 1) * Math.PI * 0.25;
      const phase = (phases[voice.index] + voice.phaseOffset) % 1;
      const sample = oscillatorSample("saw", phase, voice.frequency / rate) * voice.amplitude;
      left += sample * Math.cos(angle);
      right += sample * Math.sin(angle);
      phases[voice.index] = (phases[voice.index] + voice.frequency / rate) % 1;
    }
    const fade = edgeFade(frame, frames, rate);
    channels[0][frame] = softLimit(left) * fade;
    channels[1][frame] = softLimit(right) * fade;
  }
  return limitChannels(channels, rate);
}

function measure(channels, start = 0, end = frames) {
  let leftPower = 0;
  let rightPower = 0;
  let peak = 0;
  for (let frame = start; frame < end; frame += 1) {
    const left = channels[0][frame];
    const right = channels[1][frame];
    leftPower += left * left;
    rightPower += right * right;
    peak = Math.max(peak, Math.abs(left), Math.abs(right));
  }
  return {
    rms: Math.sqrt((leftPower + rightPower) / (2 * (end - start))),
    lrDb: 10 * Math.log10(leftPower / rightPower),
    peak
  };
}

const originalPan = (index, activeCount) => activeCount <= 1 ? 0 : ((index / (activeCount - 1)) * 2) - 1;
const original = renderWithPan(originalPan);
const paired = renderWithPan((index, activeCount) => voicePan(index, activeCount, "harmonic"));
const production = (await renderOscillator({ settings, samplesOnly: true })).samples;
let maxError = 0;
for (let channel = 0; channel < 2; channel += 1) {
  for (let frame = 0; frame < frames; frame += 1) {
    maxError = Math.max(maxError, Math.abs(paired[channel][frame] - production[channel][frame]));
  }
}
assert.ok(maxError < 1e-6, `approved B differs from production render: ${maxError}`);
const candidates = [
  { name: "A-original", channels: original },
  { name: "B-two-voice-pairs", channels: paired }
];
const targetRms = Math.min(0.18, ...candidates.map(({ channels }) => {
  const { rms, peak } = measure(channels);
  return 0.85 * rms / peak;
}));
await mkdir(destination, { recursive: true });
for (const candidate of candidates) {
  const before = measure(candidate.channels);
  const gain = targetRms / before.rms;
  const matched = candidate.channels.map((channel) => Float32Array.from(channel, (sample) => sample * gain));
  const wav = encodeWav24(matched, rate);
  await writeFile(resolve(destination, `${candidate.name}.wav`), new Uint8Array(await wav.arrayBuffer()));
  console.log(JSON.stringify({
    file: `${candidate.name}.wav`,
    matched: measure(matched),
    startLrDb: measure(matched, 0, rate).lrDb,
    middleLrDb: measure(matched, rate + rate / 2, rate * 2 + rate / 2).lrDb,
    endLrDb: measure(matched, rate * 3, frames).lrDb
  }));
}
