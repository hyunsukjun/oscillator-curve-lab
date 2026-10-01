import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeSpectrum } from '../src/resynthesis-analysis.js';
import { curveDefaults, normFromBaseFrequency, normFromSlopeDb, renderFrame, resynthesisVoices } from '../src/oscillator-core.js';
import { renderOscillator } from '../src/offline-render.js';

function flat(y) { return [{ x: 0, y }, { x: 1, y }]; }

const rate = 48000;
const samples = Float32Array.from({ length: rate }, (_, i) =>
  0.5 * Math.sin(2 * Math.PI * 220 * i / rate)
  + 0.3 * Math.sin(2 * Math.PI * 441.7 * i / rate)
  + 0.15 * Math.sin(2 * Math.PI * 658.3 * i / rate));

test('static analysis extracts significant, non-quantized peaks and keeps metadata', () => {
  const result = analyzeSpectrum(samples, rate, 32, { name: 'three-partials.wav' });
  assert.equal(result.source.name, 'three-partials.wav');
  assert.equal(result.analysis.requestedPartials, 32);
  assert.ok(result.partialCount >= 3 && result.partialCount <= 32);
  for (const frequency of [220, 441.7, 658.3]) {
    assert.ok(result.partials.some((partial) => Math.abs(partial.frequency - frequency) < 2), `${frequency} Hz peak retained`);
  }
  assert.ok(result.partials.some((partial) => Math.abs(partial.harmonicDeviationCents) > 1));
  const extended = analyzeSpectrum(samples, rate, 64);
  assert.equal(extended.analysis.requestedPartials, 64);
  assert.ok(extended.partialCount >= result.partialCount);
});

test('rich spectrum fills the 32 and 64 partial selections without inventing bins', () => {
  const rich = Float32Array.from({ length: rate * 2 }, (_, i) => {
    let value = 0;
    for (let partial = 1; partial <= 64; partial += 1) {
      value += Math.sin(2 * Math.PI * (80 * partial + 0.03 * partial * partial) * i / rate) / partial ** 0.7;
    }
    return value * 0.06;
  });
  assert.equal(analyzeSpectrum(rich, rate, 32).partialCount, 32);
  assert.equal(analyzeSpectrum(rich, rate, 64).partialCount, 64);
});

test('default resynthesis keeps analysis ratios; curves transform output without altering analysis', async () => {
  const result = analyzeSpectrum(samples, rate, 32);
  const original = structuredClone(result.partials);
  const curves = Object.fromEntries(Object.entries(curveDefaults).map(([key, value]) => [key, flat(value)]));
  curves.basePitch = flat(normFromBaseFrequency(result.fundamentalEstimate));
  curves.slope = flat(normFromSlopeDb(0));
  const settings = { soundMode: 'resynthesis', analysisResult: result, curves, durationSeconds: 1, format: 'stereo' };
  const voices = resynthesisVoices(settings, 0, rate);
  for (const partial of result.partials) {
    const voice = voices.find((candidate) => candidate.index === partial.index - 1);
    if (voice) assert.ok(Math.abs(voice.frequency - partial.frequency) < 0.01);
  }
  const phases = new Float64Array(64);
  const before = renderFrame(settings, 0, rate, phases, new Float64Array(64));
  assert.ok(Number.isFinite(before.left) && before.voices > 0);
  curves.slope = flat(normFromSlopeDb(12));
  assert.notEqual(resynthesisVoices(settings, 0, rate)[1].amplitude, voices[1].amplitude);
  curves.basePitch = flat(normFromBaseFrequency(result.fundamentalEstimate * 1.5));
  assert.ok(resynthesisVoices(settings, 0, rate)[0].frequency > voices[0].frequency);
  assert.deepEqual(result.partials, original);
  const rendered = await renderOscillator({ settings });
  assert.equal(rendered.blob.size, 44 + rate * 2 * 3);
  assert.ok(rendered.peak > 0 && rendered.peak < 1);
});
