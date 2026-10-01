import assert from "node:assert/strict";
import { test } from "node:test";
import { curveDefaults, edgeFade, modulatedOscillatorSample, oscillatorSample, softLimit, stackFrequencies } from "../src/oscillator-core.js";
import { renderOscillator } from "../src/offline-render.js";

const curves = Object.fromEntries(Object.entries(curveDefaults).map(([name, y]) => [
  name, [{ x: 0, y }, { x: 1, y }]
]));

const settings = {
  waveform: "sine",
  count: 4,
  stack: "unison",
  modulationRatio: 1,
  durationSeconds: 1,
  format: "stereo",
  curves
};

async function wavBytes(mode, overrides = {}) {
  const result = await renderOscillator({ settings: { ...settings, ...overrides, modulationMode: mode } });
  assert.equal(result.channelCount, 2);
  assert.equal(result.blob.size, 44 + (48000 * 2 * 3));
  assert.ok(Number.isFinite(result.peak) && result.peak > 0 && result.peak < 1);
  return new Uint8Array(await result.blob.arrayBuffer());
}

function changedPcmBytes(a, b) {
  let changed = 0;
  for (let i = 44; i < a.length; i += 1) if (a[i] !== b[i]) changed += 1;
  return changed;
}

test("FM, AM, and Ring produce distinct 48 kHz stereo 24-bit WAV output", async () => {
  const off = await wavBytes("off");
  const view = new DataView(off.buffer);
  assert.equal(view.getUint32(24, true), 48000);
  assert.equal(view.getUint16(22, true), 2);
  assert.equal(view.getUint16(34, true), 24);
  for (const mode of ["fm", "am", "ring"]) {
    assert.ok(changedPcmBytes(off, await wavBytes(mode)) > 1000, `${mode} must change the audio`);
  }
});

test("zero modulation restores the unmodulated output", async () => {
  const off = await wavBytes("off");
  for (const [mode, curveName] of [["fm", "fmIndex"], ["am", "amDepth"], ["ring", "ringMix"]]) {
    const zeroCurve = [{ x: 0, y: 1 }, { x: 1, y: 1 }];
    const actual = await wavBytes(mode, { curves: { ...curves, [curveName]: zeroCurve } });
    assert.deepEqual(actual, off, `${mode} at zero must match Off`);
  }
});

test("ratio changes FM and high-frequency modulation is bounded", async () => {
  const ratioOne = await wavBytes("fm");
  const ratioTwo = await wavBytes("fm", { modulationRatio: 2 });
  assert.ok(changedPcmBytes(ratioOne, ratioTwo) > 1000);
  const carrier = Math.sin(2 * Math.PI * 0.2);
  for (const mode of ["fm", "am", "ring"]) {
    const sample = modulatedOscillatorSample("sine", 0.2, 0.4, mode, 4, 5000, 8, 48000);
    assert.ok(Math.abs(sample - carrier) < 1e-8, `${mode} should avoid out-of-band modulation`);
  }
});

test("Odd Harmonics uses 1, 3, 5, 7 partials in preview and WAV", async () => {
  const oddSettings = { ...settings, stack: "odd" };
  const voices = stackFrequencies(oddSettings, 0);
  assert.deepEqual(voices.map((voice) => voice.label), ["1", "3", "5", "7"]);
  assert.deepEqual(voices.map((voice) => Math.round(voice.frequency)), [110, 330, 550, 770]);
  const harmonic = await wavBytes("off", { stack: "harmonic" });
  const odd = await wavBytes("off", { stack: "odd" });
  assert.ok(changedPcmBytes(harmonic, odd) > 1000);
});

test("normal oscillator peaks remain unshaped while overload is limited", () => {
  for (const value of [-0.82, -0.4, 0, 0.4, 0.82]) assert.equal(softLimit(value), value);
  assert.ok(softLimit(2) < 1 && softLimit(2) > 0.9);
});

test("oscillator output has short, sample-accurate start and end fades", () => {
  const rate = 48000;
  const frames = rate;
  assert.equal(edgeFade(0, frames, rate), 0);
  assert.equal(edgeFade(frames - 1, frames, rate), 0);
  assert.equal(edgeFade(Math.round(rate * 0.004), frames, rate), 0.5);
  assert.equal(edgeFade(Math.round(rate * 0.008), frames, rate), 1);
  assert.equal(edgeFade(Math.round(rate * 0.5), frames, rate), 1);
  assert.equal(edgeFade(frames - 1 - Math.round(rate * 0.006), frames, rate), 0.5);
});

test("high triangle, saw, and square notes are closer to band-limited partials", () => {
  const sampleRate = 48000;
  const frequency = 4000;
  for (const waveform of ["triangle", "saw", "square"]) {
    let correctedError = 0;
    let naiveError = 0;
    for (let frame = 0; frame < 480; frame += 1) {
      const phase = (frame * frequency / sampleRate) % 1;
      const harmonics = waveform === "saw" ? [1, 2, 3, 4, 5] : [1, 3, 5];
      const ideal = harmonics.reduce((sum, harmonic) => {
        if (waveform === "triangle") return sum + (8 * Math.cos(2 * Math.PI * harmonic * phase) / (Math.PI * Math.PI * harmonic * harmonic));
        if (waveform === "saw") return sum - (2 * Math.sin(2 * Math.PI * harmonic * phase) / (Math.PI * harmonic));
        return sum + (4 * Math.sin(2 * Math.PI * harmonic * phase) / (Math.PI * harmonic));
      }, 0);
      const naive = waveform === "saw" ? (2 * phase) - 1
        : waveform === "square" ? (phase < 0.5 ? 1 : -1)
          : 2 * Math.abs(2 * phase - 1) - 1;
      correctedError += (oscillatorSample(waveform, phase, frequency / sampleRate) - ideal) ** 2;
      naiveError += (naive - ideal) ** 2;
    }
    assert.ok(correctedError < naiveError * 0.3, `${waveform} should reduce out-of-band error`);
  }
});
