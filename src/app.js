import {createFFTPreview} from "./fft-preview.js?v=20261002-lookahead1";
import {
  TARGET_SAMPLE_RATE,
  baseFrequencyFromNorm,
  normFromBaseFrequency,
  normFromSlopeDb,
  centsFromNorm,
  curveDefaults,
  deviationAmountFromCurveY,
  effectiveBaseFrequency,
  modulatedOscillatorSample,
  modulationAmountAt,
  partialDeviationFromNorm,
  resynthesisVoices,
  softLimit,
  slopeDbFromNorm,
  stackFrequencies,
  valueAt
} from "./oscillator-core.js?v=20261002-fixedpan1";

import { renderOscillator } from "./offline-render.js?v=20261002-lookahead1";
import { LOOKAHEAD_SECONDS } from "./safety-limiter.js?v=20261002-lookahead1";
import { OutputMeterAnalyzer } from "./output-meter.js?v=20261001-playback1";
import {
  MAX_IR_FILE_BYTES,
  impulseLength,
  mixGains,
  prepareImpulse,
  tailSeconds
} from "./convolution.js?v=20261002-stereotail1";

const timeStatus = document.getElementById("timeStatus");
const playbackScrubber = document.getElementById("playbackScrubber");
const meterRows = [...document.querySelectorAll(".meterRow")];
const meterClipButton = document.getElementById("meterClipButton");
const engineStatus = document.getElementById("engineStatus");
const playButton = document.getElementById("playButton");
const openAudioButton = document.getElementById("openAudioButton");
const stopButton = document.getElementById("stopButton");
const downloadButton = document.getElementById("downloadButton");
const clearCurveButton = document.getElementById("clearCurveButton");
const resetButton = document.getElementById("resetButton");
const sonogramToggle = document.getElementById("sonogramToggle");
const durationInput = document.getElementById("durationInput");
const formatSelect = document.getElementById("formatSelect");
const waveformButtons = [...document.querySelectorAll(".waveformButton")];
const countSelect = document.getElementById("countSelect");
const stackSelect = document.getElementById("stackSelect");
const modulationSelect = document.getElementById("modulationSelect");
const modulationRatioField = document.getElementById("modulationRatioField");
const modulationRatioInput = document.getElementById("modulationRatioInput");
const modulationCurveButton = document.getElementById("modulationCurveMode");
const modulationInfo = document.getElementById("modulationInfo");
const modulationFrequencyInfo = document.getElementById("modulationFrequencyInfo");
const modulationAmountInfo = document.getElementById("modulationAmountInfo");
const impulseInput = document.getElementById("impulseInput");
const impulseStatus = document.getElementById("impulseStatus");
const convolutionButton = document.getElementById("convolutionButton");
const oscillatorModeButton = document.getElementById("oscillatorMode");
const resynthesisModeButton = document.getElementById("resynthesisMode");
const oscillatorControls = document.getElementById("oscillatorControls");
const resynthesisControls = document.getElementById("resynthesisControls");
const resynthesisSource = document.getElementById("resynthesisSource");
const analyzeButton = document.getElementById("analyzeButton");
const partialCountSelect = document.getElementById("partialCountSelect");
const analysisStatus = document.getElementById("analysisStatus");
const convolutionControls = document.getElementById("convolutionControls");
const convolutionWet = document.getElementById("convolutionWet");
const convolutionWetValue = document.getElementById("convolutionWetValue");
const impulseLengthInput = document.getElementById("impulseLength");
const impulseLengthValue = document.getElementById("impulseLengthValue");
const impulseUsedLength = document.getElementById("impulseUsedLength");
const frequencyCanvas = document.getElementById("frequencyCanvas");
const frequencyCtx = frequencyCanvas.getContext("2d");
const canvas = document.getElementById("curveCanvas");
const ctx = canvas.getContext("2d");
const penTool = document.getElementById("penTool");
const eraserTool = document.getElementById("eraserTool");
const eraseModifier = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgentData?.platform || "")
  ? "metaKey"
  : "ctrlKey";

const modeButtons = {
  basePitch: document.getElementById("basePitchMode"),
  deviation: document.getElementById("deviationMode"),
  slope: document.getElementById("slopeMode")
};

const readouts = {
  mode: document.getElementById("modeReadout"),
  points: document.getElementById("pointsReadout"),
  stack: document.getElementById("stackReadout"),
  basePitch: document.getElementById("basePitchReadout"),
  deviation: document.getElementById("deviationReadout"),
  slope: document.getElementById("slopeReadout"),
  voices: document.getElementById("voicesReadout"),
  safety: document.getElementById("safetyReadout"),
  download: document.getElementById("downloadReadout")
};

const curveColors = {
  basePitch: "#6de0c0",
  deviation: "#e34b4b",
  slope: "#6fa8dc",
  fmIndex: "#b887f4",
  amDepth: "#e1a058",
  ringMix: "#ec809a"
};

const curveLabels = {
  basePitch: "Base Freq",
  deviation: "Deviation",
  slope: "Spectral Slope",
  fmIndex: "FM Strength",
  amDepth: "AM Depth",
  ringMix: "Ring Blend"
};

const modulationCurves = { fm: "fmIndex", am: "amDepth", ring: "ringMix" };

let audioContext;
let audioSetupPromise = null;
let node;
let bypassGain;
let effectDryGain;
let effectWetGain;
let safetyLimiterNode;
let outputGain;
let outputMeter;
let convolver;
let impulseBytes;
let impulseSource48k;
let impulseSourceNative;
let impulseBuffer48k;
let impulseFileName = "";
let appliedImpulsePercent = 0;
let soundMode = "oscillator";
let analysisResult = null;
let analysisSamples = null;
let analysisSource = null;
let analysisWorker = null;
let analysisGeneration = 0;
let impulseRevision = 0;
let activeCurve = "basePitch";
let selectedTool = "pen";
let selectedWaveform = "sine";
let selectedPoint = null;
let hoverPoint = null;
let dragging = false;
let playheadSeconds = 0;
let isPlaying = false;
let isScrubbing = false;
let meterClipLatched = false;
const meterDisplay = [{ peak: 0, rms: 0, hold: 0, holdUntil: 0 }, { peak: 0, rms: 0, hold: 0, holdUntil: 0 }];
let playbackToken = 0;
let downloadUrl = null;
let renderAbortController = null;
let canvasCssWidth = 1;
let canvasCssHeight = 1;
let frequencyCssWidth = 1;
let frequencyCssHeight = 1;
let canvasBaseWidth = 0;




const canvasMinimumWidth = 1800;
const canvasBaseHeight = 560;
const frequencyBaseHeight = 220;
const curveAxisWidth = 62;
const frequencyAxisPadding = 14;

let curves = Object.fromEntries(Object.entries(curveDefaults).map(([name, y]) => [name, defaultCurve(y)]));
let editedCurves = Object.fromEntries(Object.keys(curves).map((name) => [name, false]));
const oscillatorState = { curves, editedCurves };
let resynthesisState = null;

function ensureResynthesisState() {
  if (resynthesisState) return;
  const savedCurves = Object.fromEntries(Object.entries(curveDefaults).map(([name, y]) => [name, defaultCurve(y)]));
  savedCurves.slope = defaultCurve(normFromSlopeDb(0));
  resynthesisState = {
    curves: savedCurves,
    editedCurves: Object.fromEntries(Object.keys(savedCurves).map((name) => [name, false]))
  };
}

function defaultCurve(y) {
  return [{ x: 0, y }, { x: 1, y }];
}

function defaultCurveY(name) {
  if (soundMode === "resynthesis" && name === "slope") return normFromSlopeDb(0);
  if (soundMode === "resynthesis" && name === "basePitch" && analysisResult) {
    return normFromBaseFrequency(analysisResult.fundamentalEstimate);
  }
  return curveDefaults[name];
}

function settings() {
  const convolutionWetAmount = Number(convolutionWet.value) / 100;
  return {
    soundMode,
    analysisResult: soundMode === "resynthesis" ? analysisResult : null,
    waveform: selectedWaveform,
    count: Number(countSelect.value) || 4,
    stack: stackSelect.value,
    modulationMode: modulationSelect.value,
    modulationRatio: Math.max(0.25, Math.min(8, Number(modulationRatioInput.value) || 1)),
    multiplierText: "1:1.5:2:2.5",
    durationSeconds: Math.max(1, Math.min(180, Number(durationInput.value) || 20)),
    convolutionEnabled: soundMode === "convolution" && Boolean(impulseBuffer48k),
    convolutionWet: convolutionWetAmount,
    impulseRevision,
    tailSeconds: soundMode === "convolution" && impulseBuffer48k && convolutionWetAmount > 0 ? tailSeconds(impulseBuffer48k) : 0,
    format: formatSelect.value,
    curves
  };
}

function outputDuration() {
  const current = settings();
  return current.durationSeconds + current.tailSeconds + LOOKAHEAD_SECONDS;
}

function resizeCanvas() {
  const frameRect = canvas.parentElement.getBoundingClientRect();
  const targetWidth = Math.max(frameRect.width, canvasBaseWidth, canvasMinimumWidth);
  canvasBaseWidth = targetWidth;
  frequencyCanvas.style.width = `${Math.round(canvasBaseWidth)}px`;
  frequencyCanvas.style.height = `${frequencyBaseHeight}px`;
  canvas.style.width = `${Math.round(canvasBaseWidth)}px`;
  canvas.style.height = `${canvasBaseHeight}px`;
  const frequencyRect = frequencyCanvas.getBoundingClientRect();
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  frequencyCssWidth = Math.max(1, frequencyRect.width);
  frequencyCssHeight = Math.max(1, frequencyRect.height);
  canvasCssWidth = Math.max(1, rect.width);
  canvasCssHeight = Math.max(1, rect.height);
  frequencyCanvas.width = Math.max(1, Math.floor(frequencyCssWidth * scale));
  frequencyCanvas.height = Math.max(1, Math.floor(frequencyCssHeight * scale));
  canvas.width = Math.max(1, Math.floor(canvasCssWidth * scale));
  canvas.height = Math.max(1, Math.floor(canvasCssHeight * scale));
  draw();
}

function formatClock(seconds) {
  const safeSeconds = Math.max(0, seconds || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds - (minutes * 60);
  return `${String(minutes).padStart(2, "0")}:${remaining.toFixed(2).padStart(5, "0")}`;
}

function formatPointValue(curveName, point) {
  if (curveName === "basePitch") {
    const frequency = baseFrequencyFromNorm(point.y);
    return `${Math.round(frequency)} Hz · ${formatPitch(frequency)}`;
  }
  if (curveName === "deviation" && soundMode !== "resynthesis" && stackSelect.value === "unison") return `${centsFromNorm(deviationAmountFromCurveY(point.y))} c`;
  if (curveName === "deviation") return `${partialDeviationFromNorm(deviationAmountFromCurveY(point.y)).toFixed(2)} partial`;
  if (curveName === "fmIndex") return `${((1 - point.y) * 4).toFixed(2)} index`;
  if (curveName === "amDepth" || curveName === "ringMix") return `${(1 - point.y).toFixed(2)}`;
  return `${slopeDbFromNorm(point.y).toFixed(1)} dB/oct`;
}

function formatPitch(frequency) {
  const semitone = Math.round(69 + (12 * Math.log2(frequency / 440)));
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const name = names[((semitone % 12) + 12) % 12];
  const octave = Math.floor(semitone / 12) - 1;
  const nearestFrequency = 440 * Math.pow(2, (semitone - 69) / 12);
  const cents = Math.round(1200 * Math.log2(frequency / nearestFrequency));
  return `${name}${octave} (${cents >= 0 ? "+" : ""}${cents}c)`;
}

function formatPointTime(point) {
  return `${(point.x * settings().durationSeconds).toFixed(2)} s`;
}

function formatStackName(value) {
  if (value === "harmonic") return "Harmonic";
  if (value === "odd") return "Odd Harmonics";
  if (value === "multiplier") return "Multiplier";
  return "Unison";
}

function sortCurve(curve) {
  curve.sort((a, b) => a.x - b.x);
}

function sendSettings() {
  markDownloadStale();
  node?.port.postMessage({ type: "settings", settings: settings() });
  updateConvolutionRouting();
  scheduleSonogramRender();
  draw();
  updateTransport();
}

function sendCurves() {
  markDownloadStale();
  node?.port.postMessage({ type: "curves", curves });
  scheduleSonogramRender();
  draw();
}

function markDownloadStale() {
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  downloadUrl = null;
  readouts.download.textContent = "needs export";
}

function clearDownload() {
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  downloadUrl = null;
}

function setBusy(isBusy) {
  playButton.disabled = isBusy || (soundMode === "resynthesis" && !analysisResult);
  stopButton.disabled = isBusy || !isPlaying;
  downloadButton.disabled = isBusy;
  document.querySelectorAll("input, select, button").forEach((control) => {
    if ([playButton, stopButton, downloadButton].includes(control)) return;
    control.disabled = isBusy || (control === analyzeButton && !analysisSamples);
  });
}

function nextPlaybackToken() {
  playbackToken += 1;
  return playbackToken;
}

async function ensureAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error("Web Audio is not available in this browser.");
    audioContext = new AudioContextClass({ sampleRate: TARGET_SAMPLE_RATE });
    engineStatus.textContent = audioContext.sampleRate === TARGET_SAMPLE_RATE
      ? "48 kHz preview engine"
      : `${Math.round(audioContext.sampleRate)} Hz native preview / 48 kHz WAV`;
  }
  if (audioContext.state !== "running") await audioContext.resume();
}

async function ensureAudio() {
  await ensureAudioContext();
  if (!node) {
    if (!audioSetupPromise) audioSetupPromise = setupAudio().finally(() => { audioSetupPromise = null; });
    await audioSetupPromise;
  }
}

async function setupAudio() {
  if (!audioContext.audioWorklet) throw new Error("AudioWorklet is not available. Use a current browser over localhost or HTTPS.");
  await audioContext.audioWorklet.addModule("src/oscillator-worklet.js?v=20261002-lookahead1");
  await audioContext.audioWorklet.addModule("src/safety-limiter-worklet.js?v=20261002-lookahead1");
  node = new AudioWorkletNode(audioContext, "oscillator-curve-processor", {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [2]
  });
  bypassGain = audioContext.createGain();
  effectDryGain = audioContext.createGain();
  effectWetGain = audioContext.createGain();
  safetyLimiterNode = new AudioWorkletNode(audioContext, "oscillator-safety-limiter", {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [2]
  });
  outputGain = audioContext.createGain();
  bypassGain.gain.value = 1;
  effectDryGain.gain.value = 0;
  effectWetGain.gain.value = 0;
  node.connect(bypassGain).connect(safetyLimiterNode);
  node.connect(effectDryGain).connect(safetyLimiterNode);
  effectWetGain.connect(safetyLimiterNode);
  outputMeter = new OutputMeterAnalyzer(audioContext, { channelCount: 2 });
  safetyLimiterNode.connect(outputGain).connect(outputMeter.input);
  outputMeter.connect(audioContext.destination);
  node.port.onmessage = (event) => {
    if (event.data.token != null && event.data.token !== playbackToken) return;
    if (event.data.type === "position") {
      if (isPlaying && !isScrubbing) {
        playheadSeconds = Math.max(0, event.data.seconds - LOOKAHEAD_SECONDS);
        updateTransport();
        draw();
      }
    } else if (event.data.type === "ended" || event.data.type === "stopped") {
      isPlaying = false;
      playheadSeconds = event.data.type === "stopped" ? event.data.seconds || 0 : 0;
      if (event.data.type === "ended") node.port.postMessage({ type: "seek", seconds: 0, token: playbackToken });
      if (event.data.type === "ended") disconnectConvolver();
      updateTransport();
      draw();
    }
  };
  try {
    if (impulseBytes && soundMode === "convolution") impulseSourceNative = await installConvolver(impulseBuffer48k);
  } catch (error) {
    node.disconnect();
    node = null;
    bypassGain.disconnect();
    effectDryGain.disconnect();
    effectWetGain.disconnect();
    safetyLimiterNode.disconnect();
    outputGain.disconnect();
    outputMeter.input.disconnect();
    outputMeter = null;
    bypassGain = effectDryGain = effectWetGain = safetyLimiterNode = outputGain = convolver = null;
    throw error;
  }
  sendSettings();
  sendCurves();
}

async function installConvolver(prepared48k, bytes = impulseBytes, nativeSource = impulseSourceNative) {
  if (!node) return nativeSource;
  if (audioContext.sampleRate !== TARGET_SAMPLE_RATE && !nativeSource) {
    nativeSource = await audioContext.decodeAudioData(bytes.slice(0));
  }
  const source = audioContext.sampleRate === TARGET_SAMPLE_RATE
    ? prepared48k
    : prepareImpulse(audioContext, nativeSource, Number(impulseLengthInput.value));
  const next = audioContext.createConvolver();
  next.normalize = true;
  next.buffer = source;
  node.connect(next).connect(effectWetGain);
  if (convolver) {
    node.disconnect(convolver);
    convolver.disconnect();
  }
  convolver = next;
  updateConvolutionRouting();
  return nativeSource;
}

function disconnectConvolver() {
  if (!convolver) return;
  node?.disconnect(convolver);
  convolver.disconnect();
  convolver = null;
}

function updateConvolutionRouting() {
  if (!bypassGain) return;
  const current = settings();
  const enabled = Boolean(convolver && current.convolutionEnabled && current.convolutionWet > 0);
  const gains = mixGains(current.convolutionWet);
  const now = audioContext.currentTime;
  for (const [nodeGain, value] of [
    [bypassGain, enabled ? 0 : 1],
    [effectDryGain, enabled ? gains.dry : 0],
    [effectWetGain, enabled ? gains.wet : 0]
  ]) {
    nodeGain.gain.setTargetAtTime(value, now, 0.006);
  }
}

function updateTransport() {
  const current = settings();
  const duration = outputDuration();
  timeStatus.textContent = `${formatClock(playheadSeconds)} / ${formatClock(duration)}`;
  if (!isScrubbing) playbackScrubber.value = String(Math.max(0, Math.min(1, playheadSeconds / duration)));
  playbackScrubber.setAttribute("aria-valuetext", `${formatClock(playheadSeconds)} of ${formatClock(duration)}`);
  playbackScrubber.disabled = soundMode === "resynthesis" && !analysisResult;
  playButton.disabled = soundMode === "resynthesis" && !analysisResult;
  stopButton.disabled = !isPlaying;
}

function meterPercent(value) {
  if (value <= 0) return 0;
  return Math.max(0, Math.min(100, (20 * Math.log10(value) + 60) / 60 * 100));
}

function updateMeter() {
  const readings = outputMeter?.read() || [{ peak: 0, rms: 0 }, { peak: 0, rms: 0 }];
  const now = performance.now();
  readings.forEach((reading, index) => {
    const state = meterDisplay[index];
    const row = meterRows[index];
    if (!state || !row) return;
    state.peak = reading.peak >= state.peak ? reading.peak : Math.max(reading.peak, state.peak * 0.88);
    state.rms = reading.rms >= state.rms ? reading.rms : Math.max(reading.rms, state.rms * 0.8);
    if (reading.peak >= state.hold) {
      state.hold = reading.peak;
      state.holdUntil = now + 1000;
    } else if (now > state.holdUntil) state.hold *= 0.97;
    row.querySelector(".meterRms").style.clipPath = `inset(0 ${100 - meterPercent(state.rms)}% 0 0)`;
    row.querySelector(".meterPeak").style.clipPath = `inset(0 ${100 - meterPercent(state.peak)}% 0 0)`;
    row.querySelector(".meterHold").style.left = `${meterPercent(state.hold)}%`;
    row.querySelector(".meterValue").textContent = state.peak > 0.0001
      ? `${Math.max(-60, 20 * Math.log10(state.peak)).toFixed(0)}` : "-∞";
    if (reading.clipped) meterClipLatched = true;
  });
  meterClipButton.classList.toggle("clipped", meterClipLatched);
  meterClipButton.setAttribute("aria-pressed", String(meterClipLatched));
  requestAnimationFrame(updateMeter);
}

function seekFromScrubber() {
  const duration = outputDuration();
  const soundDuration = settings().durationSeconds;
  const requested = Number(playbackScrubber.value) * duration;
  playheadSeconds = Math.min(soundDuration, requested);
  if (requested !== playheadSeconds) playbackScrubber.value = String(playheadSeconds / duration);
  node?.port.postMessage({ type: "seek", seconds: playheadSeconds, token: playbackToken });
  safetyLimiterNode?.port.postMessage({ type: "reset" });
  updateTransport();
  draw();
}

async function play() {
  if (isPlaying) return;
  if (soundMode === "resynthesis" && !analysisResult) return;
  fftPreview.cancel("Analysis cancelled for playback · Update to refresh");
  try {
    await ensureAudio();
    if (soundMode === "convolution" && impulseBuffer48k && !convolver) impulseSourceNative = await installConvolver(impulseBuffer48k);
    const now = audioContext.currentTime;
    outputGain.gain.cancelScheduledValues(now);
    outputGain.gain.setValueAtTime(0, now);
    outputGain.gain.linearRampToValueAtTime(1, now + 0.003);
    const token = nextPlaybackToken();
    playheadSeconds = Math.min(playheadSeconds, settings().durationSeconds);
    isPlaying = true;
    updateTransport();
    sendSettings();
    sendCurves();
    node.port.postMessage({ type: "seek", seconds: playheadSeconds, token });
    safetyLimiterNode.port.postMessage({ type: "reset" });
    node.port.postMessage({ type: "play", token });
  } catch (error) {
    alert(error.message || String(error));
  }
}

function stop(reset = true) {
  const token = nextPlaybackToken();
  isPlaying = false;
  playheadSeconds = reset ? 0 : playheadSeconds;
  if (outputGain && audioContext) {
    const now = audioContext.currentTime;
    outputGain.gain.cancelScheduledValues(now);
    outputGain.gain.setValueAtTime(0, now);
  }
  node?.port.postMessage({ type: "stop", reset, token });
  safetyLimiterNode?.port.postMessage({ type: "reset" });
  disconnectConvolver();
  updateConvolutionRouting();
  updateTransport();
  draw();
}

async function downloadWav() {
  if (soundMode === "resynthesis" && !analysisResult) return;
  fftPreview.cancel("Analysis cancelled for export · Update to refresh");
  if (renderAbortController) renderAbortController.abort();
  renderAbortController = new AbortController();
  setBusy(true);
  readouts.download.textContent = "rendering 0%";
  try {
    const result = await renderOscillator({
      settings: settings(),
      impulse: impulseBuffer48k,
      signal: renderAbortController.signal,
      onProgress: (progress) => {
        readouts.download.textContent = `rendering ${Math.round(progress * 100)}%`;
      }
    });
    clearDownload();
    downloadUrl = URL.createObjectURL(result.blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `oscillator-curve-lab-${Date.now()}-${result.channelCount}ch-48k-24bit.wav`;
    anchor.click();
    readouts.download.textContent = `${result.channelCount}ch 48k/24`;
    readouts.safety.textContent = result.peak > 0.98 ? "auto gain / limited" : "auto gain / limiter";
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error(error);
      readouts.download.textContent = "export failed";
      alert(error.message || String(error));
    }
  } finally {
    renderAbortController = null;
    setBusy(false);
    updateTransport();
  }
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(1, ((event.clientX - rect.left) - curveAxisWidth) / curvePlotWidth())),
    y: (event.clientY - rect.top) / rect.height
  };
}

function findPoint(point) {
  const curve = curves[activeCurve];
  for (let i = 0; i < curve.length; i += 1) {
    const dx = (curve[i].x - point.x) * curvePlotWidth();
    const dy = (curve[i].y - point.y) * canvasCssHeight;
    if (Math.hypot(dx, dy) < 12) return i;
  }
  return -1;
}

function updatePoint(index, point) {
  const curve = curves[activeCurve];
  const isEndpoint = index === 0 || index === curve.length - 1;
  const minX = index > 0 ? curve[index - 1].x + 0.002 : 0;
  const maxX = index < curve.length - 1 ? curve[index + 1].x - 0.002 : 1;
  curve[index].x = isEndpoint ? curve[index].x : Math.max(minX, Math.min(maxX, point.x));
  curve[index].y = Math.max(0, Math.min(1, point.y));
  editedCurves[activeCurve] = true;
  sendCurves();
}

function addPoint(point) {
  const curve = curves[activeCurve];
  curve.push({ x: Math.max(0, Math.min(1, point.x)), y: Math.max(0, Math.min(1, point.y)) });
  sortCurve(curve);
  selectedPoint = curve.findIndex((candidate) => candidate.x === Math.max(0, Math.min(1, point.x)) && candidate.y === Math.max(0, Math.min(1, point.y)));
  editedCurves[activeCurve] = true;
  sendCurves();
}

function setActiveCurve(name) {
  activeCurve = name;
  selectedPoint = null;
  hoverPoint = null;
  Object.entries(modeButtons).forEach(([key, button]) => button.classList.toggle("active", key === name));
  modulationCurveButton.classList.toggle("active", name === modulationCurves[modulationSelect.value]);
  draw();
}

function clearCurrentCurve() {
  curves[activeCurve] = defaultCurve(defaultCurveY(activeCurve));
  editedCurves[activeCurve] = false;
  selectedPoint = null;
  sendCurves();
}

function resetAll() {
  if (!confirm("Reset all curves?")) return;
  Object.entries(curveDefaults).forEach(([name, y]) => {
    curves[name] = defaultCurve(defaultCurveY(name));
    editedCurves[name] = false;
  });
  selectedPoint = null;
  sendCurves();
}

function draw() {
  drawFrequency();
  drawCurves();
  updateReadouts();
}

function prepareContext(renderCtx, width, height) {
  const scale = window.devicePixelRatio || 1;
  renderCtx.setTransform(scale, 0, 0, scale, 0, 0);
  renderCtx.clearRect(0, 0, width, height);
}

function drawFrequency() {
  prepareContext(frequencyCtx, frequencyCssWidth, frequencyCssHeight);
  frequencyCtx.fillStyle = "#0c1f31";
  frequencyCtx.fillRect(0, 0, frequencyCssWidth, frequencyCssHeight);
  frequencyCtx.lineWidth = 1;
  for (let x = 80, index = 0; x < frequencyCssWidth; x += 60, index += 1) {
    frequencyCtx.strokeStyle = index % 2 === 0 ? "rgba(79, 121, 155, 0.28)" : "rgba(63, 101, 132, 0.12)";
    frequencyCtx.beginPath();
    frequencyCtx.moveTo(x, 18);
    frequencyCtx.lineTo(x, frequencyCssHeight - 24);
    frequencyCtx.stroke();
  }

  const duration = settings().durationSeconds;
  const t = Math.max(0, Math.min(1, playheadSeconds / Math.max(0.1, duration)));
  const currentSettings = settings();
  const voices = soundMode === "resynthesis"
    ? resynthesisVoices(currentSettings, t, audioContext?.sampleRate || TARGET_SAMPLE_RATE)
    : stackFrequencies(currentSettings, t, audioContext?.sampleRate || TARGET_SAMPLE_RATE);
  const minHz = 20;
  const maxHz = 20000;
  const bottom = frequencyCssHeight - 34;
  const top = 24;
  frequencyCtx.font = "12px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  frequencyCtx.fillStyle = "#e8f0f6";
  frequencyCtx.fillText(soundMode === "resynthesis" ? "Current Analyzed Partials" : "Current Oscillator Values", 18, 20);
  frequencyCtx.fillStyle = "rgba(170, 188, 204, 0.78)";
  frequencyCtx.fillText(`${voices.length}/${soundMode === "resynthesis" ? analysisResult?.partialCount || 0 : countSelect.value} voices below Nyquist`, 18, frequencyCssHeight - 12);

  voices.forEach((voice) => {
    const y = bottom - ((Math.log10(voice.frequency / minHz) / Math.log10(maxHz / minHz)) * (bottom - top));
    const total = soundMode === "resynthesis" ? analysisResult.partialCount : Number(countSelect.value);
    const x = 90 + ((voice.index + 0.5) * ((frequencyCssWidth - 150) / Math.max(1, total)));
    const radius = 5 + Math.min(18, voice.amplitude * 40);
    frequencyCtx.beginPath();
    frequencyCtx.fillStyle = curveColors.deviation;
    frequencyCtx.globalAlpha = 0.86;
    frequencyCtx.arc(x, y, radius, 0, Math.PI * 2);
    frequencyCtx.fill();
    frequencyCtx.globalAlpha = 1;
    frequencyCtx.fillStyle = "#e8f0f6";
    if (soundMode !== "resynthesis" || voice.index % Math.ceil(total / 16) === 0) {
      frequencyCtx.fillText(`${Math.round(voice.frequency)} Hz`, x + 12, y + 4);
      frequencyCtx.fillStyle = "rgba(170, 188, 204, 0.78)";
      frequencyCtx.fillText(voice.label, x + 12, y + 18);
    }
  });

}

function drawCurves() {
  prepareContext(ctx, canvasCssWidth, canvasCssHeight);
  ctx.fillStyle = "#0c1f31";
  ctx.fillRect(0, 0, canvasCssWidth, canvasCssHeight);
  drawGrid();
  Object.keys(curves).filter((name) => !Object.values(modulationCurves).includes(name) || (soundMode !== "resynthesis" && name === modulationCurves[modulationSelect.value]))
    .forEach((name) => drawCurve(name, name === activeCurve));
  drawPlayhead();
}

const fftPreview = createFFTPreview({
  getSettings: settings,
  isBusy: () => isPlaying || !!renderAbortController,
  renderProcessed: async (signal, onProgress) => {
    const result = await renderOscillator({
      settings: settings(), impulse: impulseBuffer48k, signal, onProgress, samplesOnly: true
    });
    return result.samples;
  }
});
function scheduleSonogramRender(){fftPreview.invalidate();}

function drawGrid() {
  drawFrequencyAxis();
  ctx.lineWidth = 1;
  for (let x = 0; x <= 20; x += 1) {
    ctx.strokeStyle = x % 2 === 0 ? "rgba(79, 121, 155, 0.28)" : "rgba(63, 101, 132, 0.12)";
    const px = curveToCanvasX(x / 20);
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, canvasCssHeight);
    ctx.stroke();
  }
  for (let y = 0; y <= 8; y += 1) {
    ctx.strokeStyle = y % 2 === 0 ? "rgba(79, 121, 155, 0.28)" : "rgba(63, 101, 132, 0.12)";
    const py = (y / 8) * canvasCssHeight;
    ctx.beginPath();
    ctx.moveTo(curveAxisWidth, py);
    ctx.lineTo(canvasCssWidth, py);
    ctx.stroke();
  }
}

function drawFrequencyAxis() {
  ctx.fillStyle = "#0a1724";
  ctx.fillRect(0, 0, curveAxisWidth, canvasCssHeight);
  ctx.strokeStyle = "rgba(95, 141, 177, 0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(curveAxisWidth + 0.5, 0);
  ctx.lineTo(curveAxisWidth + 0.5, canvasCssHeight);
  ctx.stroke();

  ctx.font = "11px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillStyle = "rgba(170, 188, 204, 0.9)";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const mark of axisMarksForActiveCurve()) {
    ctx.strokeStyle = "rgba(95, 141, 177, 0.4)";
    ctx.beginPath();
    ctx.moveTo(curveAxisWidth - 7, mark.y);
    ctx.lineTo(curveAxisWidth, mark.y);
    ctx.stroke();
    ctx.fillText(mark.label, curveAxisWidth - 10, Math.min(canvasCssHeight - 8, Math.max(8, mark.y)));
  }
  if (activeCurve === "slope" || Object.values(modulationCurves).includes(activeCurve)) {
    ctx.textBaseline = "top";
    const unit = { slope: "dB/oct", fmIndex: "Strength", amDepth: "Depth", ringMix: "Blend" }[activeCurve];
    ctx.fillText(unit, curveAxisWidth - 10, frequencyAxisPadding + 18);
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function axisMarksForActiveCurve() {
  if (activeCurve === "fmIndex") {
    return [0, 0.25, 0.5, 0.75, 1].map((y) => ({
      label: ((1 - y) * 4).toFixed(0),
      y: y * canvasCssHeight
    }));
  }
  if (activeCurve === "amDepth" || activeCurve === "ringMix") {
    return [0, 0.25, 0.5, 0.75, 1].map((y) => ({
      label: (1 - y).toFixed(y === 0 || y === 1 ? 0 : 2),
      y: y * canvasCssHeight
    }));
  }
  if (activeCurve === "slope") {
    return [0, 0.25, 0.5, 0.75, 1].map((y) => ({
      label: `${slopeDbFromNorm(y) > 0 ? "+" : ""}${slopeDbFromNorm(y)}`,
      y: y * canvasCssHeight
    }));
  }
  if (activeCurve === "deviation") {
    return [1, 0.75, 0.5, 0.25, 0].map((amount) => ({
      label: formatDeviationAxis(amount),
      y: (1 - amount) * canvasCssHeight
    }));
  }
  return [4000, 2000, 1000, 500, 200, 100, 50, 20].map((hz) => ({
    label: formatAxisFrequency(hz),
    y: normFromBaseFrequency(hz) * canvasCssHeight
  }));
}

function formatAxisFrequency(hz) {
  if (hz >= 1000) return `${hz / 1000}k`;
  return String(hz);
}

function formatDeviationAxis(amount) {
  if (soundMode !== "resynthesis" && stackSelect.value === "unison") return `${centsFromNorm(amount)}c`;
  return partialDeviationFromNorm(amount).toFixed(amount === 0 ? 0 : 2);
}

function drawCurve(name, isActive) {
  const curve = curves[name];
  ctx.strokeStyle = curveColors[name];
  ctx.lineWidth = isActive ? 3.2 : 1.8;
  ctx.globalAlpha = isActive || editedCurves[name] ? 1 : 0.58;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  const samples = Math.max(48, Math.ceil(curvePlotWidth() / 9));
  for (let index = 0; index <= samples; index += 1) {
    const normX = index / samples;
    const x = curveToCanvasX(normX);
    const y = valueAt(curve, normX) * canvasCssHeight;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  if (!isActive) return;
  curve.forEach((point, index) => {
    const x = curveToCanvasX(point.x);
    const y = point.y * canvasCssHeight;
    ctx.beginPath();
    ctx.fillStyle = index === selectedPoint ? "#e8f0f6" : curveColors[name];
    ctx.strokeStyle = "#06111c";
    ctx.lineWidth = 2;
    ctx.arc(x, y, index === hoverPoint ? 6.5 : 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  drawPointTooltip(name);
}

function drawPointTooltip(name) {
  const pointIndex = hoverPoint ?? selectedPoint;
  if (pointIndex == null || pointIndex < 0) return;
  const point = curves[name][pointIndex];
  if (!point) return;

  const x = curveToCanvasX(point.x);
  const y = point.y * canvasCssHeight;
  const label = `${formatPointTime(point)}  ${formatPointValue(name, point)}`;
  ctx.font = "12px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  const paddingX = 8;
  const width = Math.ceil(ctx.measureText(label).width + (paddingX * 2));
  const height = 26;
  const preferredX = x + 12;
  const preferredY = y - 34;
  const boxX = Math.max(8, Math.min(canvasCssWidth - width - 8, preferredX));
  const boxY = Math.max(8, Math.min(canvasCssHeight - height - 8, preferredY));

  ctx.fillStyle = "rgba(7, 17, 28, 0.96)";
  ctx.strokeStyle = curveColors[name];
  ctx.lineWidth = 1;
  roundRect(ctx, boxX, boxY, width, height, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#e8f0f6";
  ctx.fillText(label, boxX + paddingX, boxY + 17);
}

function roundRect(renderCtx, x, y, width, height, radius) {
  const r = Math.min(radius, width * 0.5, height * 0.5);
  renderCtx.beginPath();
  renderCtx.moveTo(x + r, y);
  renderCtx.lineTo(x + width - r, y);
  renderCtx.quadraticCurveTo(x + width, y, x + width, y + r);
  renderCtx.lineTo(x + width, y + height - r);
  renderCtx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  renderCtx.lineTo(x + r, y + height);
  renderCtx.quadraticCurveTo(x, y + height, x, y + height - r);
  renderCtx.lineTo(x, y + r);
  renderCtx.quadraticCurveTo(x, y, x + r, y);
  renderCtx.closePath();
}

function drawPlayhead() {
  const duration = settings().durationSeconds;
  const x = curveToCanvasX(Math.max(0, Math.min(1, playheadSeconds / Math.max(0.1, duration))));
  ctx.strokeStyle = "rgba(226, 236, 244, 0.86)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, canvasCssHeight);
  ctx.stroke();
}

function curvePlotWidth() {
  return Math.max(1, canvasCssWidth - curveAxisWidth);
}

function curveToCanvasX(value) {
  return curveAxisWidth + (Math.max(0, Math.min(1, value)) * curvePlotWidth());
}

function frequencyToCanvasY(frequency, minHz, maxHz) {
  const clamped = Math.max(minHz, Math.min(maxHz, frequency));
  const norm = Math.log10(clamped / minHz) / Math.log10(maxHz / minHz);
  return frequencyAxisPadding + ((1 - norm) * frequencyPlotHeight());
}

function frequencyPlotHeight() {
  return Math.max(1, canvasCssHeight - (frequencyAxisPadding * 2));
}

function updateReadouts() {
  const duration = settings().durationSeconds;
  const t = Math.max(0, Math.min(1, playheadSeconds / Math.max(0.1, duration)));
  const currentSettings = settings();
  const voices = soundMode === "resynthesis"
    ? resynthesisVoices(currentSettings, t, audioContext?.sampleRate || TARGET_SAMPLE_RATE)
    : stackFrequencies(currentSettings, t, audioContext?.sampleRate || TARGET_SAMPLE_RATE);
  readouts.mode.textContent = curveLabels[activeCurve];
  readouts.points.textContent = String(curves[activeCurve].length);
  readouts.stack.textContent = soundMode === "resynthesis"
    ? `Analyzed ${voices.length}/${analysisResult?.partialCount || 0}`
    : `${formatStackName(stackSelect.value)} ${voices.length}/${countSelect.value}`;
  readouts.basePitch.textContent = `${Math.round(effectiveBaseFrequency(currentSettings, t))} Hz`;
  const deviationAmount = deviationAmountFromCurveY(valueAt(curves.deviation, t));
  readouts.deviation.textContent = soundMode !== "resynthesis" && stackSelect.value === "unison"
    ? `${centsFromNorm(deviationAmount)} c`
    : `${partialDeviationFromNorm(deviationAmount).toFixed(2)} partial`;
  readouts.slope.textContent = `${slopeDbFromNorm(valueAt(curves.slope, t)).toFixed(1)} dB/oct`;
  readouts.voices.textContent = `${voices.length}/${soundMode === "resynthesis" ? analysisResult?.partialCount || 0 : countSelect.value} visible`;
  const mode = currentSettings.modulationMode;
  if (soundMode !== "resynthesis" && mode !== "off") {
    const carrier = voices[0]?.frequency;
    const ratio = currentSettings.modulationRatio;
    modulationFrequencyInfo.textContent = carrier
      ? `Voice 1: ${Math.round(carrier)} Hz carrier × ${ratio} = ${Math.round(carrier * ratio)} Hz modulator · each voice follows its own carrier`
      : "No oscillator below Nyquist at this point";
    const amount = modulationAmountAt(currentSettings, t);
    const descriptions = {
      fm: `FM Strength ${amount.toFixed(2)} / 4 · tone change (0 = unchanged)`,
      am: `AM Depth ${amount.toFixed(2)} / 1 · level pulse (0 = unchanged)`,
      ring: `Ring Blend ${amount.toFixed(2)} / 1 · original 0 ↔ ring sound 1`
    };
    modulationAmountInfo.textContent = descriptions[mode];
  }
  updateTransport();
  if (!downloadUrl && readouts.download.textContent === "not ready") readouts.download.textContent = "ready";
}

Object.entries(modeButtons).forEach(([name, button]) => button.addEventListener("click", () => setActiveCurve(name)));
modulationCurveButton.addEventListener("click", () => setActiveCurve(modulationCurves[modulationSelect.value]));

modulationSelect.addEventListener("change", () => {
  const enabled = modulationSelect.value !== "off";
  modulationRatioField.hidden = !enabled;
  modulationInfo.hidden = !enabled;
  modulationCurveButton.hidden = !enabled;
  if (enabled) {
    modulationCurveButton.textContent = curveLabels[modulationCurves[modulationSelect.value]];
    modulationCurveButton.dataset.mode = modulationSelect.value;
  }
  if (Object.values(modulationCurves).includes(activeCurve)) {
    setActiveCurve(enabled ? modulationCurves[modulationSelect.value] : "basePitch");
  }
  sendSettings();
});

modulationRatioInput.addEventListener("change", () => {
  modulationRatioInput.value = String(Math.max(0.25, Math.min(8, Number(modulationRatioInput.value) || 1)));
  sendSettings();
});
modulationRatioInput.addEventListener("input", sendSettings);

function updateImpulseLengthLabel() {
  const percent = Number(impulseLengthInput.value);
  impulseLengthValue.value = `${percent}%`;
  if (impulseSource48k) {
    impulseUsedLength.textContent = `${(impulseLength(impulseSource48k, percent) / TARGET_SAMPLE_RATE).toFixed(2)} s`;
  }
}

function updateImpulseStatus() {
  if (!impulseSource48k || !impulseBuffer48k) return;
  impulseStatus.textContent = `${impulseFileName} · IR ${impulseBuffer48k.duration.toFixed(2)} / ${impulseSource48k.duration.toFixed(2)} s`;
  impulseStatus.title = impulseFileName;
  updateImpulseLengthLabel();
}

function setSoundMode(nextMode) {
  if (nextMode === soundMode && nextMode !== "oscillator") return;
  if (isPlaying) stop(true);
  playheadSeconds = 0;
  if (nextMode !== "convolution") disconnectConvolver();
  soundMode = nextMode;
  const nextState = nextMode === "resynthesis" ? resynthesisState : oscillatorState;
  if (nextState) {
    curves = nextState.curves;
    editedCurves = nextState.editedCurves;
  }
  if (nextMode === "resynthesis" && !resynthesisState) {
    ensureResynthesisState();
    curves = resynthesisState.curves;
    editedCurves = resynthesisState.editedCurves;
  }
  if (nextMode === "resynthesis" && Object.values(modulationCurves).includes(activeCurve)) activeCurve = "basePitch";
  for (const [mode, button] of [["oscillator", oscillatorModeButton], ["resynthesis", resynthesisModeButton], ["convolution", convolutionButton]]) {
    const active = mode === nextMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  oscillatorControls.classList.toggle("resynthesisActive", nextMode === "resynthesis");
  resynthesisControls.hidden = nextMode !== "resynthesis";
  impulseStatus.hidden = nextMode !== "convolution";
  convolutionControls.hidden = nextMode !== "convolution" || !impulseBuffer48k;
  modulationInfo.hidden = nextMode === "resynthesis" || modulationSelect.value === "off";
  modulationCurveButton.hidden = nextMode === "resynthesis" || modulationSelect.value === "off";
  openAudioButton.textContent = "Open Audio";
  readouts.safety.textContent = "auto gain / limiter";
  setActiveCurve(activeCurve);
  sendSettings();
}

async function runResynthesisAnalysis() {
  if (!analysisSamples) return;
  if (isPlaying) stop(true);
  analysisWorker?.terminate();
  const generation = ++analysisGeneration;
  analysisResult = null;
  analysisStatus.textContent = "Analyzing spectrum...";
  analyzeButton.disabled = true;
  sendSettings();
  const worker = new Worker(new URL("./resynthesis-worker.js?v=20260930-resynthesis2", import.meta.url), { type: "module" });
  analysisWorker = worker;
  worker.onmessage = ({ data }) => {
    if (generation !== analysisGeneration) return;
    worker.terminate();
    analysisWorker = null;
    analyzeButton.disabled = false;
    if (data.error) {
      analysisStatus.textContent = `Analysis failed: ${data.error}`;
      return;
    }
    analysisResult = data.result;
    const base = Math.max(20, Math.min(4000, analysisResult.fundamentalEstimate));
    if (resynthesisState && !resynthesisState.editedCurves.basePitch) {
      resynthesisState.curves.basePitch = defaultCurve(normFromBaseFrequency(base));
    }
    analysisStatus.textContent = `Estimated base ${analysisResult.fundamentalEstimate.toFixed(1)} Hz · ${analysisResult.partialCount} detected partials`;
    sendSettings();
  };
  worker.onerror = (error) => {
    if (generation !== analysisGeneration) return;
    worker.terminate();
    analysisWorker = null;
    analyzeButton.disabled = false;
    analysisStatus.textContent = `Analysis failed: ${error.message}`;
  };
  const samples = analysisSamples.slice();
  worker.postMessage({ samples, sampleRate: TARGET_SAMPLE_RATE, partials: Number(partialCountSelect.value), source: analysisSource }, [samples.buffer]);
}

async function prepareResynthesisInput(file, decoded) {
  const length = Math.min(decoded.length, 30 * TARGET_SAMPLE_RATE);
  const start = Math.max(0, Math.floor((decoded.length - length) / 2));
  const mono = new Float32Array(length);
  const channels = Array.from({ length: decoded.numberOfChannels }, (_, index) => decoded.getChannelData(index));
  const measured = channels.map((channel) => {
    let energy = 0;
    for (let i = 0; i < 2048; i += 1) {
      const sample = channel[start + Math.floor(i * Math.max(0, length - 1) / 2048)] || 0;
      energy += sample * sample;
    }
    return energy;
  });
  const chosenChannel = measured.indexOf(Math.max(...measured));
  for (let offset = 0; offset < length; offset += 65536) {
    const end = Math.min(length, offset + 65536);
    mono.set(channels[chosenChannel].subarray(start + offset, start + end), offset);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return {
    samples: mono,
    source: { name: file.name, byteLength: file.size, channels: decoded.numberOfChannels, analyzedChannel: chosenChannel + 1, sourceDurationSeconds: decoded.duration, analyzedStartSeconds: start / TARGET_SAMPLE_RATE }
  };
}

oscillatorModeButton.addEventListener("click", () => setSoundMode("oscillator"));
resynthesisModeButton.addEventListener("click", () => setSoundMode("resynthesis"));
convolutionButton.addEventListener("click", () => setSoundMode("convolution"));
analyzeButton.addEventListener("click", runResynthesisAnalysis);
partialCountSelect.addEventListener("change", () => { if (analysisSamples) runResynthesisAnalysis(); });

openAudioButton.addEventListener("click", () => impulseInput.click());
impulseInput.addEventListener("change", async () => {
  const file = impulseInput.files?.[0];
  if (!file) return;
  if (file.size > MAX_IR_FILE_BYTES) {
    impulseStatus.textContent = "File too large (16 MB max)";
    analysisStatus.textContent = "File too large (16 MB max)";
    impulseInput.value = "";
    return;
  }
  const modeAtOpen = soundMode;
  if (isPlaying) stop(true);
  openAudioButton.disabled = true;
  impulseLengthInput.disabled = true;
  impulseStatus.textContent = "Decoding audio…";
  analysisStatus.textContent = "Decoding audio…";
  try {
    const bytes = await file.arrayBuffer();
    const decoder = new OfflineAudioContext(2, 1, TARGET_SAMPLE_RATE);
    const decoded = await decoder.decodeAudioData(bytes.slice(0));
    const prepared = prepareImpulse(decoder, decoded, Number(impulseLengthInput.value));
    const input = await prepareResynthesisInput(file, decoded);
    const nativeSource = node && soundMode === "convolution" && audioContext.sampleRate !== TARGET_SAMPLE_RATE
      ? await audioContext.decodeAudioData(bytes.slice(0)) : null;
    const installedNative = node && soundMode === "convolution"
      ? await installConvolver(prepared, bytes, nativeSource) : nativeSource;
    impulseBytes = bytes;
    impulseSource48k = decoded;
    impulseSourceNative = installedNative;
    impulseBuffer48k = prepared;
    impulseFileName = file.name;
    appliedImpulsePercent = Number(impulseLengthInput.value);
    impulseRevision += 1;
    convolutionControls.hidden = soundMode !== "convolution";
    updateImpulseStatus();
    ensureResynthesisState();
    analysisWorker?.terminate();
    analysisGeneration += 1;
    analysisResult = null;
    analysisSamples = input.samples;
    analysisSource = input.source;
    resynthesisSource.textContent = file.name;
    for (const [name, y] of Object.entries(curveDefaults)) {
      resynthesisState.curves[name] = defaultCurve(name === "slope" ? normFromSlopeDb(0) : y);
      resynthesisState.editedCurves[name] = false;
    }
    if (modeAtOpen === "oscillator" && soundMode === "oscillator") setSoundMode("convolution");
    await runResynthesisAnalysis();
    sendSettings();
  } catch (error) {
    console.error(error);
    impulseStatus.textContent = impulseBuffer48k ? "Open failed · previous audio kept" : "Could not decode audio file";
    analysisStatus.textContent = error.message || String(error);
  } finally {
    openAudioButton.disabled = false;
    impulseLengthInput.disabled = false;
    impulseInput.value = "";
  }
});

convolutionWet.addEventListener("input", () => {
  convolutionWetValue.value = `${convolutionWet.value}%`;
  sendSettings();
});
impulseLengthInput.addEventListener("input", updateImpulseLengthLabel);
impulseLengthInput.addEventListener("change", async () => {
  if (!impulseSource48k) return;
  impulseLengthInput.disabled = true;
  try {
    const decoder = new OfflineAudioContext(2, 1, TARGET_SAMPLE_RATE);
    const prepared = prepareImpulse(decoder, impulseSource48k, Number(impulseLengthInput.value));
    if (node) impulseSourceNative = await installConvolver(prepared);
    impulseBuffer48k = prepared;
    appliedImpulsePercent = Number(impulseLengthInput.value);
    impulseRevision += 1;
    updateImpulseStatus();
    sendSettings();
  } catch (error) {
    console.error(error);
    impulseLengthInput.value = String(appliedImpulsePercent);
    updateImpulseStatus();
    impulseStatus.textContent = "IR length change failed";
  } finally {
    impulseLengthInput.disabled = false;
  }
});

function isErasing(event) {
  return selectedTool === "eraser" || Boolean(event?.[eraseModifier]);
}

function updateEraseCursor(event) {
  canvas.classList.toggle("eraseMode", isErasing(event));
}

function setTool(tool) {
  selectedTool = tool;
  penTool.classList.toggle("active", tool === "pen");
  eraserTool.classList.toggle("active", tool === "eraser");
  penTool.setAttribute("aria-pressed", String(tool === "pen"));
  eraserTool.setAttribute("aria-pressed", String(tool === "eraser"));
  selectedPoint = null;
  updateEraseCursor();
  draw();
}

penTool.addEventListener("click", () => setTool("pen"));
eraserTool.addEventListener("click", () => setTool("eraser"));

waveformButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedWaveform = button.dataset.waveform || "sine";
    waveformButtons.forEach((candidate) => candidate.classList.toggle("active", candidate === button));
    sendSettings();
  });
});

canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  const point = canvasPoint(event);
  const found = findPoint(point);
  if (isErasing(event)) {
    event.preventDefault();
    const curve = curves[activeCurve];
    if (found > 0 && found < curve.length - 1) {
      curve.splice(found, 1);
      selectedPoint = null;
      hoverPoint = null;
      editedCurves[activeCurve] = true;
      sendCurves();
    }
    return;
  }
  canvas.setPointerCapture(event.pointerId);
  selectedPoint = found >= 0 ? found : null;
  if (found >= 0) updatePoint(found, point);
  else addPoint(point);
  dragging = true;
});

canvas.addEventListener("pointermove", (event) => {
  updateEraseCursor(event);
  const point = canvasPoint(event);
  hoverPoint = findPoint(point);
  if (dragging && selectedPoint != null) updatePoint(selectedPoint, point);
  else draw();
});

canvas.addEventListener("pointerup", () => {
  dragging = false;
});

canvas.addEventListener("pointerleave", () => {
  hoverPoint = null;
  if (!dragging) draw();
});

canvas.addEventListener("pointerenter", updateEraseCursor);

window.addEventListener("keydown", updateEraseCursor);
window.addEventListener("keyup", updateEraseCursor);
window.addEventListener("blur", () => updateEraseCursor());

[
  countSelect,
  stackSelect,
  durationInput,
  formatSelect
].forEach((control) => {
  control.addEventListener("input", sendSettings);
  control.addEventListener("change", sendSettings);
});

clearCurveButton.addEventListener("click", clearCurrentCurve);
resetButton.addEventListener("click", resetAll);
playButton.addEventListener("click", play);
stopButton.addEventListener("click", () => stop(true));
playbackScrubber.addEventListener("pointerdown", () => { isScrubbing = true; });
playbackScrubber.addEventListener("input", seekFromScrubber);
playbackScrubber.addEventListener("change", () => { seekFromScrubber(); isScrubbing = false; updateTransport(); });
playbackScrubber.addEventListener("pointercancel", () => { isScrubbing = false; updateTransport(); });
meterClipButton.addEventListener("click", () => {
  meterClipLatched = false;
  meterClipButton.classList.remove("clipped");
  meterClipButton.setAttribute("aria-pressed", "false");
});
downloadButton.addEventListener("click", downloadWav);

window.addEventListener("keydown", (event) => {
  if (event.code !== "Space") return;
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
  event.preventDefault();
  if (isPlaying) stop(true);
  else play();
});

window.addEventListener("resize", resizeCanvas);
setSoundMode("oscillator");
resizeCanvas();
updateTransport();
requestAnimationFrame(updateMeter);
scheduleSonogramRender();
