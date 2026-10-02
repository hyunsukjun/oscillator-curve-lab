export const TARGET_SAMPLE_RATE = 48000;
export const MIN_BASE_FREQUENCY = 20;
export const MAX_BASE_FREQUENCY = 4000;

export const curveDefaults = {
  basePitch: normFromBaseFrequency(110),
  deviation: 1,
  slope: normFromSlopeDb(-9),
  fmIndex: 0.75,
  amDepth: 0.5,
  ringMix: 0.5
};

export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function edgeFade(frame, frameCount, sampleRate) {
  const attackFrames = Math.max(1, Math.round(sampleRate * 0.008));
  const releaseFrames = Math.max(1, Math.round(sampleRate * 0.012));
  return clamp(Math.min(frame / attackFrames, (frameCount - 1 - frame) / releaseFrames));
}

export function valueAt(curve, x) {
  if (!curve || curve.length === 0) return 0;
  if (x <= curve[0].x) return curve[0].y;
  for (let i = 1; i < curve.length; i += 1) {
    const a = curve[i - 1];
    const b = curve[i];
    if (x <= b.x) {
      const t = (x - a.x) / Math.max(1e-6, b.x - a.x);
      const eased = t * t * (3 - (2 * t));
      return a.y + ((b.y - a.y) * eased);
    }
  }
  return curve[curve.length - 1].y;
}

export function centsFromNorm(y) {
  return Math.round(clamp(y) * 50);
}

export function partialDeviationFromNorm(y) {
  return clamp(y) * 0.38;
}

export function deviationAmountFromCurveY(y) {
  return 1 - clamp(y);
}

export function slopeDbFromNorm(y) {
  return -24 + (clamp(y) * 36);
}

export function normFromSlopeDb(db) {
  return clamp((db + 24) / 36);
}

export function baseFrequencyFromNorm(y) {
  const min = MIN_BASE_FREQUENCY;
  const max = MAX_BASE_FREQUENCY;
  return max * Math.pow(min / max, clamp(y));
}

export function normFromBaseFrequency(frequency) {
  const min = MIN_BASE_FREQUENCY;
  const max = MAX_BASE_FREQUENCY;
  return clamp(Math.log(max / Math.max(min, frequency)) / Math.log(max / min));
}

export function parseMultipliers(text) {
  const values = String(text || "")
    .split(/[:\s,]+/)
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
  return values.length ? values.slice(0, 16) : [1, 1.5, 2, 2.5];
}

export function stackFrequencies(settings, t, sampleRate = TARGET_SAMPLE_RATE, deviationOverride = null) {
  const count = clampCount(settings.count);
  const base = effectiveBaseFrequency(settings, t);
  const stack = settings.stack || "unison";
  const multipliers = parseMultipliers(settings.multiplierText);
  const deviationNorm = deviationOverride ?? deviationAmountFromCurveY(valueAt(settings.curves?.deviation, t));
  const slopeDb = slopeDbFromNorm(valueAt(settings.curves?.slope, t));
  const nyquist = sampleRate * 0.48;
  const voices = [];

  for (let index = 0; index < count; index += 1) {
    const centered = count <= 1 ? 0 : ((index / (count - 1)) * 2) - 1;
    let multiplier = 1;
    let label = "1";

    if (stack === "harmonic" || stack === "odd") {
      multiplier = stack === "odd" ? (2 * index) + 1 : index + 1;
      const bend = partialDeviationFromNorm(deviationNorm) * harmonicBend(index);
      multiplier = Math.max(0.125, multiplier + bend);
      label = String(stack === "odd" ? (2 * index) + 1 : index + 1);
    } else if (stack === "multiplier") {
      const baseMultiple = multipliers[index % multipliers.length];
      const bend = partialDeviationFromNorm(deviationNorm) * multiplierBend(index);
      multiplier = Math.max(0.125, baseMultiple + bend);
      label = baseMultiple.toFixed(baseMultiple % 1 === 0 ? 0 : 3).replace(/0+$/, "").replace(/\.$/, "");
    } else {
      const cents = centered * centsFromNorm(deviationNorm);
      multiplier = Math.pow(2, cents / 1200);
      label = `${Math.round(cents)}c`;
    }

    const frequency = base * multiplier;
    if (frequency >= nyquist) continue;
    const octave = Math.log2(Math.max(1e-6, frequency / base));
    const slopeGain = Math.pow(10, (slopeDb * octave) / 20);
    voices.push({
      index,
      label,
      multiplier,
      frequency,
      amplitude: clamp(slopeGain, 0.03, 1.8),
      phaseOffset: index / count
    });
  }

  return normalizeVoices(voices, stack);
}

export function effectiveBaseFrequency(settings, t) {
  return baseFrequencyFromNorm(valueAt(settings.curves?.basePitch, t));
}

export function oscillatorSample(waveform, phase, phaseIncrement = 0) {
  const p = phase - Math.floor(phase);
  const step = clamp(Math.abs(phaseIncrement), 0, 0.49);
  if (waveform === "triangle") {
    const naive = 2 * Math.abs(2 * p - 1) - 1;
    if (step <= 1000 / TARGET_SAMPLE_RATE) return naive;
    const maxHarmonic = Math.floor(0.48 / step);
    let bandLimited = 0;
    for (let harmonic = 1; harmonic <= maxHarmonic; harmonic += 2) {
      bandLimited += Math.cos(2 * Math.PI * harmonic * p) / (harmonic * harmonic);
    }
    bandLimited *= 8 / (Math.PI * Math.PI);
    const blend = clamp((step - (1000 / TARGET_SAMPLE_RATE)) / (1000 / TARGET_SAMPLE_RATE));
    return naive * (1 - blend) + bandLimited * blend;
  }
  if (waveform === "saw") return (2 * p) - 1 - polyBlep(p, step);
  if (waveform === "square") {
    return (p < 0.5 ? 1 : -1) + polyBlep(p, step) - polyBlep((p + 0.5) % 1, step);
  }
  return Math.sin(Math.PI * 2 * p);
}

function polyBlep(phase, step) {
  if (step <= 0) return 0;
  if (phase < step) {
    const x = phase / step;
    return x + x - (x * x) - 1;
  }
  if (phase > 1 - step) {
    const x = (phase - 1) / step;
    return (x * x) + x + x + 1;
  }
  return 0;
}

export function modulationAmountAt(settings, t) {
  const curveName = { fm: "fmIndex", am: "amDepth", ring: "ringMix" }[settings.modulationMode];
  if (!curveName) return 0;
  const normalized = 1 - clamp(valueAt(settings.curves?.[curveName], t));
  return settings.modulationMode === "fm" ? normalized * 4 : normalized;
}

export function modulatedOscillatorSample(waveform, phase, modPhase, mode, amount, frequency, ratio, sampleRate) {
  const baseIncrement = frequency / sampleRate;
  if (mode === "off" || amount <= 0) return oscillatorSample(waveform, phase, baseIncrement);
  const modFrequency = frequency * ratio;
  const limit = sampleRate * 0.46;
  const modulator = Math.sin(2 * Math.PI * modPhase);

  if (mode === "fm") {
    const safeIndex = Math.min(amount, Math.max(0, ((limit - frequency) / modFrequency) - 2));
    const instantaneousIncrement = (frequency + (safeIndex * modFrequency * Math.cos(2 * Math.PI * modPhase))) / sampleRate;
    return oscillatorSample(waveform, phase + ((safeIndex / (2 * Math.PI)) * modulator), instantaneousIncrement);
  }

  const fade = clamp((limit - frequency - modFrequency) / Math.max(1, modFrequency * 0.25));
  const safeAmount = amount * fade;
  const carrier = oscillatorSample(waveform, phase, baseIncrement);
  if (mode === "am") return carrier * ((1 + (safeAmount * modulator)) / (1 + safeAmount));
  if (mode === "ring") return carrier * ((1 - safeAmount) + (safeAmount * modulator));
  return carrier;
}

export function softLimit(value) {
  const magnitude = Math.abs(value);
  if (magnitude <= 0.9) return value;
  return Math.sign(value) * (0.9 + (0.09 * Math.tanh((magnitude - 0.9) / 0.09)));
}

export function outputChannelCount(format) {
  return format === "mono" ? 1 : 2;
}

export function encodeWav24(channels, sampleRate) {
  const channelCount = channels.length;
  const frameCount = channels[0].length;
  const bytesPerSample = 3;
  const blockAlign = channelCount * bytesPerSample;
  const dataSize = frameCount * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 24, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const sample = clamp(channels[channel][frame], -1, 1);
      const int = sample < 0 ? Math.round(sample * 0x800000) : Math.round(sample * 0x7fffff);
      view.setUint8(offset, int & 0xff);
      view.setUint8(offset + 1, (int >> 8) & 0xff);
      view.setUint8(offset + 2, (int >> 16) & 0xff);
      offset += bytesPerSample;
    }
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function clampCount(value) {
  const count = Number(value) || 4;
  return [1, 2, 4, 8, 16].includes(count) ? count : 4;
}

function harmonicBend(index) {
  return Math.sin((index + 1) * 1.618) * 0.5;
}

function multiplierBend(index) {
  return Math.cos((index + 1) * 2.137) * 0.45;
}

function normalizeVoices(voices, stack = "harmonic") {
  if (!voices.length) return [];
  const sum = voices.reduce((total, voice) => total + Math.abs(voice.amplitude), 0);
  const count = voices.length;
  const countLift = stack === "unison" ? Math.sqrt(count)
    : stack === "multiplier" ? Math.pow(count, 0.25) : 1;
  const scale = 0.82 * countLift / Math.max(1, sum);
  return voices.map((voice) => ({ ...voice, amplitude: voice.amplitude * scale }));
}

export function voicePan(index, count, stack = "unison") {
  if (count <= 1) return 0;
  const sweep = ((index / (count - 1)) * 2) - 1;
  if (stack !== "harmonic") return sweep;
  const pairSide = Math.floor(index / 2) % 2 === 0 ? -1 : 1;
  return clamp(0.8 * sweep + 0.45 + 0.38 * pairSide, -1, 1);
}

export function createSmoothingState() {
  return { deviation: null, ratioLog: null, amount: null, mode: null, stack: null, coefficients: {} };
}

export function resetSmoothingState(state) {
  if (!state) return;
  state.deviation = state.ratioLog = state.amount = null;
  state.mode = state.stack = null;
}

function smoothValue(state, key, target, milliseconds, sampleRate) {
  if (!state) return target;
  if (state[key] == null) return (state[key] = target);
  const coefficientKey = `${milliseconds}:${sampleRate}`;
  const alpha = state.coefficients[coefficientKey] ??= 1 - Math.exp(-1000 / (milliseconds * sampleRate));
  state[key] += (target - state[key]) * alpha;
  return state[key];
}

function writeString(view, offset, value) {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

export function renderFrame(settings, t, sampleRate, phases, modPhases, smoothingState = null) {
  if (smoothingState && smoothingState.stack !== settings.stack) {
    smoothingState.deviation = null;
    smoothingState.stack = settings.stack;
  }
  const deviationTarget = deviationAmountFromCurveY(valueAt(settings.curves?.deviation, t));
  const deviation = smoothValue(smoothingState, "deviation", deviationTarget, 8, sampleRate);
  if (settings.soundMode === 'resynthesis') return renderResynthesisFrame(settings, t, sampleRate, phases, deviation);
  const voices = stackFrequencies(settings, t, sampleRate, deviation);
  const mode = settings.modulationMode || "off";
  if (smoothingState && smoothingState.mode !== mode) {
    smoothingState.amount = smoothingState.mode === null ? null : 0;
    smoothingState.mode = mode;
  }
  const ratioTarget = clamp(Number(settings.modulationRatio) || 1, 0.25, 8);
  const ratio = Math.exp(smoothValue(smoothingState, "ratioLog", Math.log(ratioTarget), 10, sampleRate));
  const amount = smoothValue(smoothingState, "amount", modulationAmountAt(settings, t), mode === "fm" ? 5 : 8, sampleRate);
  let left = 0;
  let right = 0;

  for (const voice of voices) {
    const pan = voicePan(voice.index, voices.length, settings.stack || "unison");
    const phase = (phases[voice.index] + voice.phaseOffset) % 1;
    const modPhase = (modPhases[voice.index] + voice.phaseOffset) % 1;
    const sample = modulatedOscillatorSample(
      settings.waveform, phase, modPhase, mode, amount, voice.frequency, ratio, sampleRate
    ) * voice.amplitude;
    const angle = (pan + 1) * Math.PI * 0.25;
    left += sample * Math.cos(angle);
    right += sample * Math.sin(angle);
    phases[voice.index] = (phases[voice.index] + (voice.frequency / sampleRate)) % 1;
    modPhases[voice.index] = (modPhases[voice.index] + ((voice.frequency * ratio) / sampleRate)) % 1;
  }

  left = softLimit(left);
  right = softLimit(right);

  return { left, right, voices: voices.length };
}

export function resynthesisVoices(settings, t, sampleRate = TARGET_SAMPLE_RATE) {
  const result = settings.analysisResult;
  if (!result?.partials?.length) return [];
  const base = effectiveBaseFrequency(settings, t);
  const reference = clamp(result.fundamentalEstimate, MIN_BASE_FREQUENCY, MAX_BASE_FREQUENCY);
  const deviation = partialDeviationFromNorm(deviationAmountFromCurveY(valueAt(settings.curves?.deviation, t)));
  const slopeDb = slopeDbFromNorm(valueAt(settings.curves?.slope, t));
  const voices = [];
  for (const partial of result.partials) {
    const ratio = partial.frequency / reference;
    const bend = deviation * harmonicBend(partial.index - 1);
    const frequency = base * Math.max(0.125, ratio + bend);
    const nyquistGain = resynthesisNyquistGain(frequency, sampleRate);
    if (nyquistGain <= 0) continue;
    const slope = Math.pow(10, slopeDb * Math.log2(Math.max(1e-6, frequency / base)) / 20);
    voices.push({
      index: partial.index - 1,
      label: partial.index.toString(),
      frequency,
      amplitude: partial.relativeAmplitude * clamp(slope, 0.03, 1.8) * nyquistGain,
      phaseOffset: 0
    });
  }
  return normalizeVoices(voices);
}

export function resynthesisNyquistGain(frequency, sampleRate) {
  const start = sampleRate * 0.42;
  const end = sampleRate * 0.48;
  if (frequency <= start) return 1;
  if (frequency >= end) return 0;
  const x = (frequency - start) / (end - start);
  return 1 - x * x * (3 - 2 * x);
}

function renderResynthesisFrame(settings, t, sampleRate, phases, deviationOverride = null) {
  const result = settings.analysisResult;
  if (!result?.partials?.length) return { left: 0, right: 0, voices: 0 };
  const base = effectiveBaseFrequency(settings, t);
  const reference = clamp(result.fundamentalEstimate, MIN_BASE_FREQUENCY, MAX_BASE_FREQUENCY);
  const deviation = partialDeviationFromNorm(deviationOverride ?? deviationAmountFromCurveY(valueAt(settings.curves?.deviation, t)));
  const slopeDb = slopeDbFromNorm(valueAt(settings.curves?.slope, t));
  let left = 0;
  let right = 0;
  let totalAmplitude = 0;
  let count = 0;
  for (const partial of result.partials) {
    const index = partial.index - 1;
    const frequency = base * Math.max(0.125, partial.frequency / reference + deviation * harmonicBend(index));
    const phase = phases[index];
    phases[index] = (phase + frequency / sampleRate) % 1;
    const nyquistGain = resynthesisNyquistGain(frequency, sampleRate);
    if (nyquistGain <= 0) continue;
    const slope = Math.pow(10, slopeDb * Math.log2(Math.max(1e-6, frequency / base)) / 20);
    const amplitude = partial.relativeAmplitude * clamp(slope, 0.03, 1.8) * nyquistGain;
    const pan = resynthesisPan(index, result.partials.length);
    const angle = (pan + 1) * Math.PI * 0.25;
    const sample = Math.sin(2 * Math.PI * phase) * amplitude;
    left += sample * Math.cos(angle);
    right += sample * Math.sin(angle);
    totalAmplitude += Math.abs(amplitude);
    count += 1;
  }
  const scale = 0.82 / Math.max(1, totalAmplitude);
  return { left: softLimit(left * scale), right: softLimit(right * scale), voices: count };
}

export function resynthesisPan(index, count) {
  if (count <= 1) return 0;
  const sweep = index / (count - 1) * 2 - 1;
  return index === 0 ? 0 : 0.8 * (index % 2 === 1 ? -1 : 1) + 0.2 * sweep;
}
