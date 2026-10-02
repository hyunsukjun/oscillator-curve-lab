import assert from "node:assert/strict";
import test from "node:test";
import {
  createSmoothingState,
  curveDefaults,
  renderFrame,
  stackFrequencies,
  voicePan
} from "../src/oscillator-core.js";
import { SAFETY_CEILING, LookaheadSafetyLimiter, StereoSafetyLimiter, limitChannels } from "../src/safety-limiter.js";

function settings(overrides = {}) {
  const curves = Object.fromEntries(Object.entries(curveDefaults).map(([name, y]) => [
    name, [{ x: 0, y }, { x: 1, y }]
  ]));
  return { waveform: "sine", count: 4, stack: "unison", modulationMode: "off", modulationRatio: 1,
    durationSeconds: 1, curves, ...overrides };
}

test("Unison count compensation follows 1/sqrt(N) and other stacks retain peak headroom", () => {
  const one = stackFrequencies(settings({ count: 1 }), 0)[0].amplitude;
  for (const count of [2, 4, 8, 16]) {
    const voices = stackFrequencies(settings({ count }), 0);
    assert.equal(voices.length, count);
    assert.ok(Math.abs(voices[0].amplitude / one - 1 / Math.sqrt(count)) < 1e-12);
  }
  const harmonic = stackFrequencies(settings({ count: 16, stack: "harmonic" }), 0);
  assert.ok(harmonic.reduce((sum, voice) => sum + voice.amplitude, 0) <= 0.82 + 1e-12);
  const multiplier = stackFrequencies(settings({ count: 16, stack: "multiplier" }), 0);
  assert.ok(multiplier.reduce((sum, voice) => sum + voice.amplitude, 0) <= 1.64 + 1e-12);
});

test("FM, ratio, and deviation slew without flattening their target values", () => {
  const current = settings({ modulationMode: "fm" });
  current.curves.fmIndex = [{ x: 0, y: 1 }, { x: 0.49, y: 1 }, { x: 0.5, y: 0 }, { x: 1, y: 0 }];
  current.curves.deviation = [{ x: 0, y: 1 }, { x: 0.49, y: 1 }, { x: 0.5, y: 0 }, { x: 1, y: 0 }];
  const state = createSmoothingState();
  const phases = new Float64Array(64);
  const modPhases = new Float64Array(64);
  renderFrame(current, 0, 48000, phases, modPhases, state);
  current.modulationRatio = 8;
  renderFrame(current, 0.5, 48000, phases, modPhases, state);
  assert.ok(state.amount > 0 && state.amount < 0.1);
  assert.ok(state.deviation > 0 && state.deviation < 0.1);
  assert.ok(Math.exp(state.ratioLog) > 1 && Math.exp(state.ratioLog) < 1.1);
  for (let frame = 0; frame < 4800; frame += 1) {
    renderFrame(current, 0.6, 48000, phases, modPhases, state);
  }
  assert.ok(state.amount > 3.99 && state.deviation > 0.99);
  assert.ok(Math.exp(state.ratioLog) > 7.99);
});

test("final limiter is transparent below threshold and stereo-linked at peaks", () => {
  const limiter = new StereoSafetyLimiter(48000);
  assert.deepEqual(limiter.process(0.4, -0.7), { left: 0.4, right: -0.7 });
  const clipped = limiter.process(2, -0.5);
  assert.ok(Math.abs(clipped.left - SAFETY_CEILING) < 1e-12);
  assert.ok(Math.abs(clipped.right / clipped.left + 0.25) < 1e-12);
  assert.ok(limiter.process(0.4, 0.4).left < 0.4);
  const channels = [Float32Array.from([0.2, 2, 0.2]), Float32Array.from([-0.2, -0.5, -0.2])];
  const limited = limitChannels(channels, 48000);
  assert.equal(limited[0].length, channels[0].length + 240);
  assert.equal(limited[0][0], 0);
  assert.ok(Math.max(...limited[0].map(Math.abs)) <= SAFETY_CEILING + 1e-6);
});

test("lookahead limiter delays both channels equally and preserves linked stereo", () => {
  const limiter = new LookaheadSafetyLimiter(48000);
  const output = [];
  for (let frame = 0; frame < 242; frame += 1) {
    output.push(limiter.process(frame === 0 ? 2 : 0, frame === 0 ? -0.5 : 0));
  }
  assert.ok(output.slice(0, 240).every((frame) => frame.left === 0 && frame.right === 0));
  assert.ok(Math.abs(output[240].left) <= SAFETY_CEILING + 1e-6);
  assert.ok(Math.abs(output[240].right / output[240].left + 0.25) < 1e-6);
  limiter.reset();
  assert.deepEqual(limiter.process(0, 0), { left: 0, right: 0 });
});

test("streaming lookahead matches the offline B future-peak calculation after its delay", () => {
  const rate = 1000;
  const limiter = new LookaheadSafetyLimiter(rate);
  const source = Array.from({ length: 100 }, (_, index) => [
    index % 17 === 0 ? 1.8 : Math.sin(index * 0.7) * 0.8,
    index % 23 === 0 ? -1.2 : Math.cos(index * 0.37) * 0.4
  ]);
  const rendered = [...source, ...Array.from({ length: limiter.ahead }, () => [0, 0])]
    .map(([left, right]) => limiter.process(left, right));
  const peaks = source.map(([left, right]) => Math.max(Math.abs(left), Math.abs(right)));
  let gain = 1;
  const attack = 1 - Math.exp(-1 / (rate * 0.001));
  const release = 1 - Math.exp(-1 / (rate * 0.1));
  for (let index = 0; index < source.length; index += 1) {
    const futurePeak = Math.max(...peaks.slice(index, index + limiter.ahead + 1));
    const target = futurePeak > SAFETY_CEILING ? SAFETY_CEILING / futurePeak : 1;
    gain += (target - gain) * (target < gain ? attack : release);
    if (peaks[index] * gain > SAFETY_CEILING) gain = SAFETY_CEILING / peaks[index];
    assert.ok(Math.abs(rendered[index + limiter.ahead].left - source[index][0] * gain) < 1e-6);
    assert.ok(Math.abs(rendered[index + limiter.ahead].right - source[index][1] * gain) < 1e-6);
  }
});

test("approved Harmonic pair pan preserves the outer sweep without changing other stacks", () => {
  assert.equal(voicePan(0, 1), 0);
  assert.equal(voicePan(0, 16, "unison"), -1);
  assert.equal(voicePan(15, 16, "odd"), 1);
  assert.ok(Math.abs(voicePan(0, 16, "harmonic") + 0.73) < 1e-12);
  assert.equal(voicePan(15, 16, "harmonic"), 1);
  assert.ok(voicePan(0, 16, "harmonic") < voicePan(2, 16, "harmonic"));
  assert.equal(voicePan(0, 16, "multiplier"), -1);
});
