import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  curveDefaults,
  encodeWav24,
  normFromBaseFrequency
} from "../src/oscillator-core.js";
import { renderOscillator } from "../src/offline-render.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const destination = resolve(root, "work/clarity-ab-paired");
const rate = 48000;
const durationSeconds = 3;

function flat(y) {
  return [{ x: 0, y }, { x: 1, y }];
}

function makeSettings(slopeDb) {
  const curves = Object.fromEntries(
    Object.entries(curveDefaults).map(([id, y]) => [id, flat(y)])
  );
  curves.basePitch = flat(normFromBaseFrequency(220));
  curves.slope = flat((slopeDb + 24) / 36);
  return {
    waveform: "saw",
    count: 16,
    stack: "harmonic",
    modulationMode: "off",
    modulationRatio: 1,
    durationSeconds,
    format: "stereo",
    curves
  };
}

function measure(channels) {
  const alpha = Math.exp((-2 * Math.PI * 2000) / rate);
  let sum = 0;
  let high = 0;
  let peak = 0;
  for (const channel of channels) {
    let lowPass = 0;
    for (const sample of channel) {
      lowPass = alpha * lowPass + (1 - alpha) * sample;
      sum += sample * sample;
      high += (sample - lowPass) ** 2;
      peak = Math.max(peak, Math.abs(sample));
    }
  }
  return { rms: Math.sqrt(sum / (channels.length * channels[0].length)), peak, highShare: Math.sqrt(high / sum) };
}

const candidates = [];
for (const [name, slopeDb] of [["A", -9], ["B", -6]]) {
  const result = await renderOscillator({ settings: makeSettings(slopeDb), samplesOnly: true });
  candidates.push({ name, slopeDb, channels: result.samples, before: measure(result.samples) });
}

// Use one common target that leaves both comparison files below -1 dBFS.
const targetRms = Math.min(0.2, ...candidates.map(({ before }) => 0.85 * before.rms / before.peak));
await mkdir(destination, { recursive: true });
for (const candidate of candidates) {
  const gain = targetRms / candidate.before.rms;
  const matched = candidate.channels.map((channel) => Float32Array.from(channel, (sample) => sample * gain));
  const wav = encodeWav24(matched, rate);
  await writeFile(resolve(destination, `${candidate.name}.wav`), new Uint8Array(await wav.arrayBuffer()));
  console.log(JSON.stringify({
    file: `${candidate.name}.wav`,
    slopeDb: candidate.slopeDb,
    before: candidate.before,
    matched: measure(matched)
  }));
}
