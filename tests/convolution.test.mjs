import assert from "node:assert/strict";
import { test } from "node:test";
import { MIN_IR_SECONDS, impulseLength, mixGains, prepareImpulse, tailSeconds } from "../src/convolution.js";
import { curveDefaults } from "../src/oscillator-core.js";
import { renderOscillator } from "../src/offline-render.js";

test("Dry/Wet endpoints keep bypass and wet-only gains", () => {
  assert.ok(Math.abs(mixGains(0).dry - 1) < 1e-12);
  assert.ok(Math.abs(mixGains(0).wet) < 1e-12);
  assert.ok(Math.abs(mixGains(1).dry) < 1e-12);
  assert.ok(Math.abs(mixGains(1).wet - 1) < 1e-12);
  assert.ok(mixGains(0.01).wet < 0.001);
  assert.ok(mixGains(0.99).dry < 0.001);
});

test("IR length runs from three seconds to the full source", () => {
  const rate = 48000;
  const source = {
    length: rate * 4,
    sampleRate: rate,
    numberOfChannels: 1,
    getChannelData: () => new Float32Array(rate * 4).fill(1)
  };
  const context = {
    createBuffer: (channels, length, sampleRate) => {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return { length, sampleRate, getChannelData: (index) => data[index] };
    }
  };
  const minimum = prepareImpulse(context, source, 0);
  const middle = prepareImpulse(context, source, 50);
  const full = prepareImpulse(context, source, 100);
  assert.equal(minimum.length, MIN_IR_SECONDS * rate);
  assert.equal(middle.length, 3.5 * rate);
  assert.equal(full.length, source.length);
  assert.equal(minimum.getChannelData(0).at(-1), 0);
  assert.equal(middle.getChannelData(0).at(-1), 0);
  assert.equal(full.getChannelData(0).at(-1), 1);
  assert.ok(tailSeconds(full) > 3.99 && tailSeconds(full) < 4);
  assert.equal(impulseLength({ length: rate * 2, sampleRate: rate }, 0), rate * 2);
  assert.equal(impulseLength({ length: rate * 2, sampleRate: rate }, 100), rate * 2);
});

test("Convolution Off leaves oscillator WAV byte-identical", async () => {
  const curves = Object.fromEntries(Object.entries(curveDefaults).map(([name, y]) => [
    name, [{ x: 0, y }, { x: 1, y }]
  ]));
  const settings = { waveform: "sine", count: 4, stack: "harmonic", durationSeconds: 1, format: "stereo", curves };
  const reference = await renderOscillator({ settings });
  const bypassed = await renderOscillator({ settings: { ...settings, convolutionEnabled: false, convolutionWet: 0.5 }, impulse: {} });
  assert.deepEqual(new Uint8Array(await bypassed.blob.arrayBuffer()), new Uint8Array(await reference.blob.arrayBuffer()));
});
