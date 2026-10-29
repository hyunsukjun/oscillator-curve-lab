import { FFT } from './fft.js';

export const ANALYSIS_FFT_SIZE = 8192;
// The existing window-energy floor now applies to AC, rather than a DC offset.
export const ANALYSIS_MIN_AC_POWER = 1e-8;
export const ANALYSIS_MIN_BAND_AMPLITUDE = 1e-6;

export function analyzeSpectrum(samples, sampleRate, requestedPartials = 32, source = {}) {
  if (!samples?.length || !Number.isFinite(sampleRate) || sampleRate <= 0) throw new Error('No decoded audio to analyze');
  const count = requestedPartials === 64 ? 64 : 32;
  const size = ANALYSIS_FFT_SIZE;
  const fft = new FFT(size);
  const real = new Float64Array(size);
  const imag = new Float64Array(size);
  const power = new Float64Array(size / 2 + 1);
  const window = Float64Array.from({ length: size }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / size));
  const windows = Math.min(9, Math.max(1, Math.floor(samples.length / Math.max(1, size / 2))));
  let usedWindows = 0;
  for (let w = 0; w < windows; w += 1) {
    const center = Math.round(samples.length * (0.1 + 0.8 * (w + 0.5) / windows));
    let count = 0, mean = 0, acEnergy = 0;
    for (let i = 0; i < size; i += 1) {
      const index = center - size / 2 + i;
      if (index < 0 || index >= samples.length) continue;
      const sample = samples[index];
      if (!Number.isFinite(sample)) throw new Error('Non-finite analysis input');
      const delta = sample - mean;
      mean += delta / ++count;
      acEnergy += delta * (sample - mean);
    }
    if (acEnergy / size < ANALYSIS_MIN_AC_POWER) continue;
    for (let i = 0; i < size; i += 1) {
      const index = center - size / 2 + i;
      // Center only available samples; zero padding is not part of the mean.
      const sample = index >= 0 && index < samples.length ? samples[index] - mean : 0;
      real[i] = sample * window[i];
      imag[i] = 0;
    }
    fft.transform(real, imag);
    for (let bin = 1; bin < power.length; bin += 1) power[bin] += real[bin] ** 2 + imag[bin] ** 2;
    usedWindows += 1;
  }
  if (!usedWindows) throw new Error('Audio contains no analyzable signal');
  const low = Math.max(2, Math.ceil(20 * size / sampleRate));
  const high = Math.min(power.length - 2, Math.floor(Math.min(20000, sampleRate * 0.45) * size / sampleRate));
  let maximum = 0;
  for (let bin = low; bin <= high; bin += 1) maximum = Math.max(maximum, power[bin]);
  const coherentWindowGain = window.reduce((sum, value) => sum + value, 0);
  if (2 * Math.sqrt(maximum / usedWindows) / coherentWindowGain < ANALYSIS_MIN_BAND_AMPLITUDE) {
    throw new Error('Audio contains no analyzable signal');
  }
  const candidates = [];
  for (let bin = low; bin <= high; bin += 1) {
    if (power[bin] < maximum * 1e-5 || power[bin] <= power[bin - 1] || power[bin] < power[bin + 1]) continue;
    const a = Math.log(Math.max(power[bin - 1], 1e-20));
    const b = Math.log(Math.max(power[bin], 1e-20));
    const c = Math.log(Math.max(power[bin + 1], 1e-20));
    const offset = Math.max(-0.5, Math.min(0.5, 0.5 * (a - c) / (a - 2 * b + c || 1)));
    candidates.push({ frequency: (bin + offset) * sampleRate / size, amplitude: Math.sqrt(power[bin] / usedWindows) });
  }
  candidates.sort((a, b) => b.amplitude - a.amplitude);
  const selected = [];
  const separation = Math.max(12, sampleRate / size * 1.5);
  for (const peak of candidates) {
    if (selected.every((other) => Math.abs(other.frequency - peak.frequency) >= separation)) selected.push(peak);
    if (selected.length === count) break;
  }
  if (!selected.length) throw new Error('No significant spectral peaks found');
  selected.sort((a, b) => a.frequency - b.frequency);
  const strongest = Math.max(...selected.map((peak) => peak.amplitude));
  const fundamental = selected[0].frequency;
  const partials = selected.map((peak, index) => {
    const ratio = peak.frequency / fundamental;
    const nearest = Math.max(1, Math.round(ratio));
    return {
      index: index + 1,
      frequency: peak.frequency,
      amplitude: peak.amplitude,
      relativeAmplitude: peak.amplitude / strongest,
      harmonicRatio: ratio,
      harmonicDeviationCents: 1200 * Math.log2(ratio / nearest)
    };
  });
  return {
    source: { ...source, sampleRate, durationSeconds: samples.length / sampleRate },
    analysis: { method: 'static averaged Hann spectrum', fftSize: size, windows: usedWindows, thresholdDb: -50, minimumPeakSeparationHz: separation, requestedPartials: count },
    fundamentalEstimate: fundamental,
    partialCount: partials.length,
    partials
  };
}
