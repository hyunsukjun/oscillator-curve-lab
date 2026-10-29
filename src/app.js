import {createSourceLoadGate, fetchDefaultSource} from "./default-source.js?v=20261029-bach1";
import {beginVerticalGroup, moveVerticalGroup, restoreVerticalGroup, verticalGroupSuffix, drawVerticalGroupRing} from "./curve-group-edit.js?v=20261027-shift1";
import {canvasAxisWidth, drawEditorGrid, frequencyTicks, frequencyLabel, spacedMarks, canvasLabelFont} from "./canvas-grid.js?v=20261026-graphite1";
import {createSourceOverview} from "./source-overview.js?v=20261018-axis64";
import {mountTransport} from "./common-transport.js?v=20261013-1";
import { readAudioFile, validateAudioBuffer } from "./audio-import.js?v=20261029-input-validation1";
import {
  TARGET_SAMPLE_RATE,
  MAX_SOUND_DURATION_SECONDS,
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
} from "./oscillator-core.js?v=20261026-harmonic-pan8";

import { renderOscillator } from "./offline-render.js?v=20261026-harmonic-pan8";
import { LOOKAHEAD_SECONDS } from "./safety-limiter.js?v=20261002-lookahead1";
import { OutputMeterAnalyzer } from "./output-meter.js?v=20261001-playback1";
import {
  MAX_IR_FILE_BYTES,
  impulseLength,
  mixGains,
  prepareImpulse,
  tailSeconds
} from "./convolution.js?v=20261002-stereotail1";

const sourceLoadGate = createSourceLoadGate();
let defaultResynthesisRequest = null;

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
const durationInput = document.getElementById("durationInput");
const durationPanel = document.getElementById("durationPanel");
const durationValue = document.getElementById("durationValue");
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
const resynthesisModeButton = document.getElementById("resynthesisMode");
const oscillatorControls = document.getElementById("oscillatorControls");
const resynthesisControls = document.getElementById("resynthesisControls");
const resynthesisSource = document.getElementById("resynthesisSource");
const partialCountSelect = document.getElementById("partialCountSelect");
const analysisStatus = document.getElementById("analysisStatus");
const convolutionControls = document.getElementById("convolutionControls");
const convolutionWet = document.getElementById("convolutionWet");
const convolutionWetValue = document.getElementById("convolutionWetValue");
const impulseLengthInput = document.getElementById("impulseLength");
const impulseLengthValue = document.getElementById("impulseLengthValue");
const impulseUsedLength = document.getElementById("impulseUsedLength");
const sourceOverview = createSourceOverview(document.getElementById("sourceOverviewCanvas"));
const frequencyCanvas = document.getElementById("frequencyCanvas");
const frequencyCtx = frequencyCanvas.getContext("2d");
const canvas = document.getElementById("curveCanvas");
const ctx = canvas.getContext("2d");
const penTool = document.getElementById("penTool");
const eraserTool = document.getElementById("eraserTool");
const eraseModifier = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgentData?.platform || "")
  ? "altKey"
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
let curvePointerId = null;
let verticalDrag = null;
let shiftHeld = false;
let hoverPoint = null;
let dragging = false;
let playheadSeconds = 0;
let isPlaying = false;
let isScrubbing = false;
let meterClipLatched = false;
const meterDisplay = [{ peak: 0, rms: 0, hold: 0, holdUntil: 0 }, { peak: 0, rms: 0, hold: 0, holdUntil: 0 }];
let playbackToken = 0;
let playbackClock = null;
let boundaryPauseRequest = null;
function awaitBoundaryPause(id) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { if(boundaryPauseRequest?.id===id)boundaryPauseRequest=null; reject(new Error("Playback pause timed out")); }, 2000);
    boundaryPauseRequest = {id, complete(){clearTimeout(timer); resolve();}};
    safetyLimiterNode.port.postMessage({type:"boundaryPause",id});
  });
}
const irControl = { phase:'idle', epoch:0, snapshot:null, pending:null, note:'' };
function irBusy(){return irControl.phase==='pausing'||irControl.phase==='resuming';}
function irFingerprint(){return JSON.stringify(settings());}
function irForget(note=''){irControl.epoch++;irControl.snapshot=null;irControl.phase='idle';irControl.pending=null;irControl.note=note;}
function irChanged(){if((irControl.snapshot||irBusy()) && (!irControl.snapshot || irControl.snapshot.fingerprint!==irFingerprint()))stop(true);}
function irEligible(){return !!(audioContext && node && convolver && settings().convolutionEnabled && settings().convolutionWet>0);}
async function irPauseRetained(){
 if(irBusy())return irControl.pending;
 const epoch=++irControl.epoch, context=audioContext, source=node, filter=convolver, limiter=safetyLimiterNode;
 irControl.phase='pausing';irControl.note='일시정지 준비';
 updateTransport();
 const pending=(async()=>{
  try{
   await awaitBoundaryPause(epoch);
   if(epoch!==irControl.epoch)return;
   await context.suspend();
   if(epoch!==irControl.epoch)return;
   if(!isPlaying||source!==node||filter!==convolver){irForget('종료됨');return;}
   if(playbackClock?.token===playbackToken)playheadSeconds=Math.max(0,Math.min(settings().durationSeconds+settings().tailSeconds+LOOKAHEAD_SECONDS,playbackClock.seconds+context.currentTime-playbackClock.contextTime-LOOKAHEAD_SECONDS));
   isPlaying=false;
   irControl.snapshot={context,source,filter,limiter,fingerprint:irFingerprint(),position:playheadSeconds,contextTime:context.currentTime};
   irControl.phase='pausedRetained';irControl.note=filter?'일시정지 · 잔향 이력 보존':'일시정지 · 재생 위치 보존';updateTransport();draw();
  }catch(error){if(epoch===irControl.epoch){stop(true);irControl.note='일시정지 실패 · 정지';updateTransport();}throw error;}
  finally{if(epoch===irControl.epoch)irControl.pending=null;}
 })();irControl.pending=pending;return pending;
}
async function irResumeRetained(){
 const saved=irControl.snapshot;
 if(!saved || saved.context!==audioContext||saved.source!==node||saved.filter!==convolver||saved.limiter!==safetyLimiterNode||saved.fingerprint!==irFingerprint()){
  stop(true);irControl.note='보존 상태 변경 · 처음부터 다시 재생 필요';updateTransport();return;
 }
 const epoch=++irControl.epoch;irControl.phase='resuming';irControl.note='재개 준비';updateTransport();
 const pending=(async()=>{
  try{
   const now=audioContext.currentTime;outputGain.gain.cancelScheduledValues(now);outputGain.gain.setValueAtTime(0,now);outputGain.gain.setValueAtTime(1,now);
   safetyLimiterNode.port.postMessage({type:"boundaryResume"});
   await audioContext.resume();
   if(epoch!==irControl.epoch)return;
   irControl.snapshot=null;irControl.phase='idle';irControl.note=saved.filter?'같은 잔향 재개':'같은 위치 재개';isPlaying=true;updateTransport();draw();
  }catch(error){if(epoch===irControl.epoch){stop(true);irControl.note='재개 실패 · 정지';updateTransport();}throw error;}
  finally{if(epoch===irControl.epoch)irControl.pending=null;}
 })();irControl.pending=pending;return pending;
}
let downloadUrl = null;
let renderAbortController = null;
let canvasCssWidth = 1;
let canvasCssHeight = 1;
let frequencyCssWidth = 1;
let frequencyCssHeight = 1;
const canvasBaseHeight = 440;
const frequencyBaseHeight = 110;
const curveAxisWidth = canvasAxisWidth;
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
    durationSeconds: Math.max(0, Math.min(MAX_SOUND_DURATION_SECONDS, Number(durationInput.value))),
    convolutionEnabled: soundMode === "convolution" && Boolean(impulseBuffer48k),
    convolutionWet: convolutionWetAmount,
    impulseRevision,
    tailSeconds: soundMode === "convolution" && impulseBuffer48k && convolutionWetAmount > 0 ? tailSeconds(impulseBuffer48k) : 0,
    format: "stereo",
    curves
  };
}

function outputDuration() {
  const current = settings();
  return current.durationSeconds > 0 ? current.durationSeconds + current.tailSeconds + LOOKAHEAD_SECONDS : 0;
}

function formatDurationLabel(seconds) {
  return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min${seconds % 60 ? ` ${seconds % 60} s` : ""}`;
}

function updateDurationDisplay() {
  const current = settings();
  const label = formatDurationLabel(current.durationSeconds);
  durationValue.textContent = `${String(Math.floor(current.durationSeconds / 60)).padStart(2, "0")}:${String(current.durationSeconds % 60).padStart(2, "0")}`;
  durationInput.setAttribute("aria-valuetext", label);

}

function fitEditorControls(force = false) {
  const editor = document.querySelector(".editor");
  const workspace = document.querySelector(".workspace");
  const footer = document.querySelector(".playbackBar");
  const gap = parseFloat(getComputedStyle(document.querySelector(".curveStack")).rowGap) || 8;
  // Measure actual wrapped controls and footer instead of subtracting fixed estimates.
  const available = Math.max(100, footer.getBoundingClientRect().top - workspace.getBoundingClientRect().top - 36);
  const details = document.getElementById("voiceDetails");
  const frequency = frequencyCanvas.closest(".frequencyFrame").hidden ? 0 : 64;
  const detailHeight = frequency + details.querySelector(".synthesisHeading").getBoundingClientRect().height + details.querySelector(".panel").getBoundingClientRect().height + 12;
  const curve = Math.max(80, available - detailHeight - gap - 4);
  document.documentElement.style.setProperty("--transport-reserve", `${footer.getBoundingClientRect().height + 20}px`);
  const value = `${curve}px`;
  if (!force && editor.style.getPropertyValue("--curve-height") === value) return;
  editor.style.setProperty("--curve-height", value);
  editor.style.setProperty("--frequency-height", `${frequency}px`);
  resizeCanvas();
}

function resizeCanvas() {
  frequencyCanvas.style.height = `${frequencyBaseHeight}px`;
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
  const hundredths = Math.round(Math.max(0, Number.isFinite(seconds) ? seconds : 0) * 100);
  const minutes = Math.floor(hundredths / 6000);
  const rest = (hundredths % 6000) / 100;
  return `${String(minutes).padStart(2, "0")}:${rest.toFixed(2).padStart(5, "0")}`;
}

function formatPointValue(curveName, point) {
  if (curveName === "basePitch") {
    const frequency = baseFrequencyFromNorm(point.y);
    return `${Math.round(frequency)} Hz · ${formatPitch(frequency)}`;
  }
  if (curveName === "deviation" && soundMode !== "resynthesis" && stackSelect.value === "unison") return `${centsFromNorm(deviationAmountFromCurveY(point.y))} cents`;
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
  irChanged();
  markDownloadStale();
  node?.port.postMessage({ type: "settings", settings: settings() });
  updateConvolutionRouting();

  updateDurationDisplay();
  draw();
  updateTransport();
}

function sendCurves() {
  irChanged();
  markDownloadStale();
  node?.port.postMessage({ type: "curves", curves });

  draw();
}

function markDownloadStale() {
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  downloadUrl = null;
  setExportStatus("needs export");
}

function clearDownload() {
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  downloadUrl = null;
}

function setBusy(isBusy) {
  playButton.disabled = isBusy || settings().durationSeconds <= 0 || (soundMode === "resynthesis" && !analysisResult);
  stopButton.disabled = isBusy || !isPlaying;
  downloadButton.disabled = renderAbortController ? renderAbortController.signal.aborted : isBusy || settings().durationSeconds <= 0;
  document.querySelectorAll("input, select, button").forEach((control) => {
    if ([playButton, stopButton, downloadButton].includes(control)) return;
    control.disabled = isBusy;
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
  await audioContext.audioWorklet.addModule("src/oscillator-worklet.js?v=20261029-live-crossfade1");
  await audioContext.audioWorklet.addModule("src/safety-limiter-worklet.js?v=20261029-live-crossfade1");
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
  safetyLimiterNode.port.onmessage = ({data}) => { if(data.type==="boundaryPaused" && boundaryPauseRequest?.id===data.id){boundaryPauseRequest.complete();boundaryPauseRequest=null;} };
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
    if (event.data.type === 'seeked') {
      safetyLimiterNode?.port.postMessage({type:'boundarySeek', endTime:event.data.endTime});
      playbackClock = {seconds:event.data.seconds, contextTime:event.data.contextTime, token:event.data.token};
      if (!isScrubbing) {
        playheadSeconds = Math.max(0, Math.min(outputDuration(), event.data.seconds + audioContext.currentTime - event.data.contextTime - LOOKAHEAD_SECONDS));
        if (irControl.snapshot?.context === audioContext && irControl.snapshot.source === node) irControl.snapshot.position = playheadSeconds;
      }
      updateTransport(); draw();
    } else if (event.data.type === "position") {
      playbackClock = {seconds:event.data.seconds, contextTime:event.data.contextTime, token:event.data.token};
      if (isPlaying && !isScrubbing) {
        playheadSeconds = Math.max(0, event.data.seconds - LOOKAHEAD_SECONDS);
        updateTransport();
        draw();
      }
    } else if (event.data.type === "ended" || event.data.type === "stopped") {
      if(event.data.type === "ended")irForget("자연 종료");
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
    await validateAudioBuffer(nativeSource);
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

function transportState() {
 const duration=outputDuration();
 return {duration,seconds:Math.max(0,Math.min(duration,playheadSeconds)),playing:isPlaying,disabled:playButton.disabled||!!renderAbortController};
}

function transportFailure() {
 return {
  '일시정지 실패 · 정지':'Pause failed',
  '재개 실패 · 정지':'Resume failed',
  '보존 상태 변경 · 처음부터 다시 재생 필요':'Restart required'
 }[irControl.note]||'';
}

function transportDescription() {
 const current=settings();
 const failure=transportFailure();
 const notice=failure ? `${failure}; playback stopped`
  : irControl.note==='잔향 시점 직접 탐색 미지원 · 현재 위치 유지'?'IR tail seeking is unavailable; current position retained':'';
 const phase=irBusy() ? (irControl.phase==='pausing'?'Pausing':'Resuming')
  : isPlaying ? (playheadSeconds>=current.durationSeconds?'Finishing output':'Playing')
  : irControl.snapshot ? 'Paused; Play resumes the retained playback history'
  : 'Paused or stopped';
 const seek=current.tailSeconds>0
  ? `IR tail is included in output time. Seek within synthesis (${formatClock(current.durationSeconds)}); the tail plays through without direct seeking.`
  : 'Click or drag to seek.';
 return `${notice||phase}. ${seek}`;
}

function updateTransport() {
 const current=settings(),duration=outputDuration(),source=current.durationSeconds;
 const position=Math.max(0,Math.min(duration,playheadSeconds));
 const failure=transportFailure();
 timeStatus.textContent=`${formatClock(position)} / ${formatClock(duration)}${failure?' · '+failure:''}`;
 timeStatus.style.whiteSpace=failure?'normal':'';
 timeStatus.title=transportDescription();
 if(!isScrubbing)playbackScrubber.value=String(duration>0?position/duration:0);
 playbackScrubber.setAttribute('aria-label','Output playback position');
 playbackScrubber.setAttribute('title',timeStatus.title);
 playbackScrubber.setAttribute('aria-description',timeStatus.title);
 playbackScrubber.setAttribute('aria-valuetext',timeStatus.textContent);
 playbackScrubber.disabled=irBusy() || soundMode==='resynthesis'&&!analysisResult;
 downloadButton.disabled=irBusy() || (renderAbortController?renderAbortController.signal.aborted:source<=0||(soundMode==='resynthesis'&&!analysisResult));
 playButton.disabled=irBusy() || source<=0 || soundMode==='resynthesis'&&!analysisResult;
 playButton.setAttribute('aria-label','Play');
 playButton.title=!isPlaying&&!irControl.snapshot&&source>0&&playheadSeconds>=source?'Play from start · Space':'Play · Space';
 stopButton.disabled=irBusy()||!isPlaying;
}

function meterPercent(value) {
  if (value <= 0) return 0;
  return Math.max(0, Math.min(100, (20 * Math.log10(value) + 60) / 60 * 100));
}

let irMeterAwaitTime=null;
function updateMeter() {
  const eligible=!!audioContext && audioContext.state==='running' && isPlaying && !irBusy();
  if(!eligible)irMeterAwaitTime=audioContext?.currentTime??0;
  const fresh=eligible && (irMeterAwaitTime===null || audioContext.currentTime>irMeterAwaitTime);
  if(!fresh){
    const label=irBusy()?'preparing':irControl.phase==='pausedRetained'?'paused':'stopped';
    meterDisplay.forEach((state,index)=>{
      state.peak=state.rms=state.hold=state.holdUntil=0;
      const row=meterRows[index];if(!row)return;
      row.dataset.readingState=label;row.setAttribute('aria-label',`${index?'R':'L'} output level · ${label} · no live reading`);
      row.querySelector('.meterRms').style.clipPath='inset(0 100% 0 0)';
      row.querySelector('.meterPeak').style.clipPath='inset(0 100% 0 0)';
      row.querySelector('.meterHold').style.left='0%';row.querySelector('.meterHold').style.opacity='0';
      row.querySelector('.meterValue').textContent='—';
    });
  }else{
    irMeterAwaitTime=null;
    const readings=outputMeter?.read() || [{peak:0,rms:0},{peak:0,rms:0}];
    const now=performance.now();
    readings.forEach((reading,index)=>{
      const state=meterDisplay[index],row=meterRows[index];if(!state||!row)return;
      row.dataset.readingState='live';row.setAttribute('aria-label',`${index?'R':'L'} live output level`);
      state.peak=reading.peak>=state.peak?reading.peak:Math.max(reading.peak,state.peak*.88);
      state.rms=reading.rms>=state.rms?reading.rms:Math.max(reading.rms,state.rms*.8);
      if(reading.peak>=state.hold){state.hold=reading.peak;state.holdUntil=now+1000;}else if(now>state.holdUntil)state.hold*=.97;
      row.querySelector('.meterRms').style.clipPath=`inset(0 ${100-meterPercent(state.rms)}% 0 0)`;
      row.querySelector('.meterPeak').style.clipPath=`inset(0 ${100-meterPercent(state.peak)}% 0 0)`;
      row.querySelector('.meterHold').style.left=`${meterPercent(state.hold)}%`;
      row.querySelector('.meterHold').style.opacity=state.hold>.001?'1':'0';
      row.querySelector('.meterValue').textContent=state.peak>.0001?`${Math.max(-60,20*Math.log10(state.peak)).toFixed(0)}`:'-∞';
      if(reading.clipped)meterClipLatched=true;
    });
  }
  meterClipButton.classList.toggle('clipped',meterClipLatched);
  meterClipButton.setAttribute('aria-pressed',String(meterClipLatched));
  requestAnimationFrame(updateMeter);
}

function seekSourceSeconds(requested) {
 const duration=settings().durationSeconds;
 if(!Number.isFinite(requested)||requested<0||requested>duration){irControl.note='잔향 시점 직접 탐색 미지원 · 현재 위치 유지';updateTransport();return false;}
 const invalidates=irControl.snapshot || irBusy();
 if(invalidates || requested===duration)stop(true);
 irControl.note=requested===duration?'발음 끝 · 다음 Play는 처음부터': '발음 위치 선택';
 playheadSeconds=requested;
 node?.port.postMessage({type:'seek',seconds:requested,token:nextPlaybackToken(),crossfade:isPlaying});
 if(isPlaying)safetyLimiterNode?.port.postMessage({type:'boundarySeek',endTime:audioContext.currentTime+duration+Math.max(0,settings().tailSeconds||0)+LOOKAHEAD_SECONDS-requested});
 else safetyLimiterNode?.port.postMessage({type:'reset'});
 updateTransport();draw();return true;
}
function seekFromScrubber(){
 const current=settings();
 const requested=Number(playbackScrubber.value)*outputDuration();
 // The output bar follows the whole tail; the existing engine still seeks sound time only.
 const target=current.tailSeconds>0?requested:Math.min(current.durationSeconds,requested);
 const accepted=seekSourceSeconds(target);
 if(!accepted){
  const state=transportState();
  playbackScrubber.value=String(state.duration>0?state.seconds/state.duration:0);
 }
 return accepted;
}

async function play() {
  if(irBusy())return irControl.pending;
  if(irControl.phase==='pausedRetained')return irResumeRetained();
  if(!isPlaying && playheadSeconds>=settings().durationSeconds)playheadSeconds=0;
  irControl.note='';
  if (isPlaying || settings().durationSeconds <= 0) return;
  if (soundMode === "resynthesis" && !analysisResult) return;
  const requestToken = playbackToken;
  try {
    await ensureAudio();
    if (isPlaying || requestToken !== playbackToken) return;
    if (soundMode === "convolution" && impulseBuffer48k && !convolver) impulseSourceNative = await installConvolver(impulseBuffer48k);
    if (isPlaying || requestToken !== playbackToken) return;
    const now = audioContext.currentTime;
    outputGain.gain.cancelScheduledValues(now);
    outputGain.gain.setValueAtTime(0, now);
    outputGain.gain.setValueAtTime(1, now);
    const token = nextPlaybackToken();
    playheadSeconds = Math.min(playheadSeconds, settings().durationSeconds);
    isPlaying = true;
    updateTransport();
    sendSettings();
    sendCurves();
    node.port.postMessage({ type: "seek", seconds: playheadSeconds, token });
    safetyLimiterNode.port.postMessage({ type: "reset" });
    safetyLimiterNode.port.postMessage({ type: "boundaryStart", seconds: Math.max(0, settings().durationSeconds + settings().tailSeconds + LOOKAHEAD_SECONDS - playheadSeconds) });
    node.port.postMessage({ type: "play", token });
  } catch (error) {
    alert(error.message || String(error));
  }
}

function stop(reset = true) {
  if(!reset && irControl.phase==='pausedRetained')return;
  if(!reset && irBusy())return irControl.pending;
  if(!reset && isPlaying && audioContext && node)return irPauseRetained();
  irForget(reset?'정지':'일시정지');
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
  if (settings().durationSeconds <= 0) return;
  if (soundMode === "resynthesis" && !analysisResult) return;
  if (renderAbortController) {
    renderAbortController.abort();
    downloadButton.textContent = "Cancelling";
    downloadButton.disabled = true;
    return;
  }
  renderAbortController = new AbortController();
  downloadButton.textContent = "Cancel";
  setBusy(true);
  setExportStatus("rendering 0%");
  try {
    const result = await renderOscillator({
      settings: settings(),
      impulse: impulseBuffer48k,
      signal: renderAbortController.signal,
      onProgress: (progress) => {
        setExportStatus(`rendering ${Math.round(progress * 100)}%`);
      }
    });
    clearDownload();
    downloadUrl = URL.createObjectURL(result.blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `oscillator-curve-lab-${Date.now()}-${result.channelCount}ch-48k-24bit.wav`;
    anchor.click();
    setExportStatus(`${result.channelCount}ch 48k/24`);
    readouts.safety.textContent = result.peak > 0.98 ? "auto gain / limited" : "auto gain / limiter";
  } catch (error) {
    if (error.name === "AbortError") {
      setExportStatus("cancelled");
    } else {
      console.error(error);
      setExportStatus("export failed");
      alert(error.message || String(error));
    }
  } finally {
    renderAbortController = null;
    downloadButton.textContent = "Download WAV";
    setBusy(false);
    updateTransport();
  }
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(1, ((event.clientX - rect.left) - curveAxisWidth) / curvePlotWidth())),
    y: Math.max(0, Math.min(1, (event.clientY - rect.top - 10) / curvePlotHeight()))
  };
}

function findPoint(point) {
  const curve = curves[activeCurve];
  for (let i = 0; i < curve.length; i += 1) {
    const dx = (curve[i].x - point.x) * curvePlotWidth();
    const dy = (curve[i].y - point.y) * curvePlotHeight();
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
  if (verticalDrag) finishCurveDrag(true);
  activeCurve = name;
  selectedPoint = null;
  hoverPoint = null;
  Object.entries(modeButtons).forEach(([key, button]) => button.classList.toggle("active", key === name));
  modulationCurveButton.classList.toggle("active", name === modulationCurves[modulationSelect.value]);
  draw();
}

function clearCurrentCurve() {
  if (verticalDrag) finishCurveDrag(true);
  curves[activeCurve] = defaultCurve(defaultCurveY(activeCurve));
  editedCurves[activeCurve] = false;
  selectedPoint = null;
  sendCurves();
}

function resetAll() {
  if (verticalDrag) finishCurveDrag(true);
  if (!confirm("Reset all curves?")) return;
  Object.entries(curveDefaults).forEach(([name, y]) => {
    curves[name] = defaultCurve(defaultCurveY(name));
    editedCurves[name] = false;
  });
  selectedPoint = null;
  sendCurves();
}

function draw() {
  if (!frequencyCanvas.closest(".frequencyFrame").hidden) drawFrequency();
  drawCurves();
  updateReadouts();
}

function prepareContext(renderCtx, width, height) {
  const scale = window.devicePixelRatio || 1;
  renderCtx.setTransform(scale, 0, 0, scale, 0, 0);
  renderCtx.clearRect(0, 0, width, height);
}

function drawFrequency() {
  // Reserve one readable column per voice; scrolling belongs to the monitor only.
  const totalColumns = soundMode === "resynthesis" ? (analysisResult?.partialCount || 1) : Number(countSelect.value);
  const monitorWidth = Math.max(frequencyCanvas.parentElement.clientWidth, 150 + totalColumns * 96);
  if (Math.abs(frequencyCssWidth - monitorWidth) > 1) {
    frequencyCanvas.style.width = `${monitorWidth}px`;
    frequencyCssWidth = monitorWidth;
    frequencyCanvas.width = Math.max(1, Math.floor(monitorWidth * (window.devicePixelRatio || 1)));
  }
  prepareContext(frequencyCtx, frequencyCssWidth, frequencyCssHeight);
  frequencyCtx.fillStyle = "#191c20";
  frequencyCtx.fillRect(0, 0, frequencyCssWidth, frequencyCssHeight);
  frequencyCtx.lineWidth = 1;
  for (let x = 80, index = 0; x < frequencyCssWidth; x += 60, index += 1) {
    frequencyCtx.strokeStyle = index % 2 === 0 ? "rgba(139, 149, 162, 0.18)" : "rgba(139, 149, 162, 0.08)";
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
  const bottom = frequencyCssHeight - 28;
  const top = 26;
  frequencyCtx.font = "12px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  frequencyCtx.fillStyle = "#e8f0f6";
  const heading = soundMode === "resynthesis" ? "Current Analyzed Partials" : "Current Oscillator Values";
  frequencyCtx.fillText(heading, 18, 20);
  frequencyCtx.fillStyle = "rgba(170, 188, 204, 0.78)";
  frequencyCtx.fillText(`${voices.length}/${soundMode === "resynthesis" ? analysisResult?.partialCount || 0 : countSelect.value} voices below Nyquist`, 30 + frequencyCtx.measureText(heading).width, 20);

  voices.forEach((voice) => {
    const y = bottom - ((Math.log10(voice.frequency / minHz) / Math.log10(maxHz / minHz)) * (bottom - top));
    const total = soundMode === "resynthesis" ? analysisResult.partialCount : Number(countSelect.value);
    const x = 90 + ((voice.index + 0.5) * ((frequencyCssWidth - 150) / Math.max(1, total)));
    const radius = (5 + Math.min(18, voice.amplitude * 40)) * 0.25;
    frequencyCtx.beginPath();
    frequencyCtx.fillStyle = curveColors.deviation;
    frequencyCtx.globalAlpha = 0.86;
    frequencyCtx.arc(x, y, radius, 0, Math.PI * 2);
    frequencyCtx.fill();
    frequencyCtx.globalAlpha = 1;
    frequencyCtx.fillStyle = "#e8f0f6";
    {
      frequencyCtx.fillText(`${Math.round(voice.frequency)} Hz`, x + 12, y + 4);
      frequencyCtx.fillStyle = "rgba(170, 188, 204, 0.78)";
      frequencyCtx.fillText(voice.label, x + 12, y + 18);
    }
  });

}

function drawCurves() {
  prepareContext(ctx, canvasCssWidth, canvasCssHeight);
  ctx.fillStyle = "#191c20";
  ctx.fillRect(0, 0, canvasCssWidth, canvasCssHeight);
  drawGrid();
  Object.keys(curves).filter((name) => !Object.values(modulationCurves).includes(name) || (soundMode !== "resynthesis" && name === modulationCurves[modulationSelect.value]))
    .forEach((name) => drawCurve(name, name === activeCurve));
  drawPlayhead();
}

function drawGrid() {
  // Quiet background grid; retain scales, points and curve contrast.
  ctx.save();
  ctx.globalAlpha *= 0.65;
  drawEditorGrid(ctx, curveAxisWidth, 10, curvePlotWidth(), curvePlotHeight(), {frequency:activeCurve==='basePitch'});
  ctx.restore();
  drawFrequencyAxis();
}

function drawFrequencyAxis() {
  ctx.fillStyle = "#191c20";
  ctx.fillRect(0, 0, curveAxisWidth, canvasCssHeight);
  ctx.strokeStyle = "rgba(95, 141, 177, 0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(curveAxisWidth + 0.5, 0);
  ctx.lineTo(curveAxisWidth + 0.5, canvasCssHeight);
  ctx.stroke();

  ctx.font = "11px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillStyle = "#a9b1bb";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const mark of spacedMarks(axisMarksForActiveCurve())) {
    ctx.strokeStyle = "rgba(139,149,162,.18)";
    ctx.beginPath();
    ctx.moveTo(curveAxisWidth - 7, mark.y);
    ctx.lineTo(activeCurve === "basePitch" ? canvasCssWidth - 10 : curveAxisWidth, mark.y);
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
      y: curveToCanvasY(y)
    }));
  }
  if (activeCurve === "amDepth" || activeCurve === "ringMix") {
    return [0, 0.25, 0.5, 0.75, 1].map((y) => ({
      label: (1 - y).toFixed(y === 0 || y === 1 ? 0 : 2),
      y: curveToCanvasY(y)
    }));
  }
  if (activeCurve === "slope") {
    return [0, 0.25, 0.5, 0.75, 1].map((y) => ({
      label: `${slopeDbFromNorm(y) > 0 ? "+" : ""}${slopeDbFromNorm(y)}`,
      y: curveToCanvasY(y)
    }));
  }
  if (activeCurve === "deviation") {
    return [1, 0.75, 0.5, 0.25, 0].map((amount) => ({
      label: formatDeviationAxis(amount),
      y: curveToCanvasY(1 - amount)
    }));
  }
  return frequencyTicks(20, 4000).map((hz) => ({
    label: frequencyLabel(hz),
    y: curveToCanvasY(normFromBaseFrequency(hz))
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
    const y = curveToCanvasY(valueAt(curve, normX));
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  if (!isActive) return;
  const groupPoints = new Set(getVerticalPoints());
  curve.forEach((point, index) => {
    const x = curveToCanvasX(point.x);
    const y = curveToCanvasY(point.y);
    ctx.beginPath();
    ctx.fillStyle = index === selectedPoint ? "#e8f0f6" : curveColors[name];
    ctx.strokeStyle = "#06111c";
    ctx.lineWidth = 2;
    ctx.arc(x, y, index === hoverPoint ? 6.5 : 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (groupPoints.has(point)) drawVerticalGroupRing(ctx, x, y, curveColors[name], canvasCssWidth - x);
  });
  drawPointTooltip(name);
}

function drawPointTooltip(name) {
  const pointIndex = hoverPoint ?? selectedPoint;
  if (pointIndex == null || pointIndex < 0) return;
  const point = curves[name][pointIndex];
  if (!point) return;

  const x = curveToCanvasX(point.x);
  const y = curveToCanvasY(point.y);
  const label = `${formatPointTime(point)}  ${formatPointValue(name, point)}` + verticalGroupSuffix(getVerticalPoints().length);
  ctx.font = "500 12px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
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

function curvePlotHeight() { return Math.max(1, canvasCssHeight - 20); }
function curveToCanvasY(value) { return 10 + value * curvePlotHeight(); }

function curvePlotWidth() {
  return Math.max(1, canvasCssWidth - curveAxisWidth - 10);
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
    ? `${centsFromNorm(deviationAmount)} cents`
    : `${partialDeviationFromNorm(deviationAmount).toFixed(2)} partial`;
  readouts.slope.textContent = `${slopeDbFromNorm(valueAt(curves.slope, t)).toFixed(1)} dB/oct`;
  readouts.voices.textContent = `${voices.length}/${soundMode === "resynthesis" ? analysisResult?.partialCount || 0 : countSelect.value} in range`;
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
  if (!downloadUrl && readouts.download.textContent === "not ready") setExportStatus("ready");
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
  if (nextMode !== "resynthesis" && defaultResynthesisRequest) {
    sourceLoadGate.cancel();
    defaultResynthesisRequest = null;
    analysisStatus.textContent = "";
  }
  if (verticalDrag) finishCurveDrag(true);
  if (nextMode === soundMode && nextMode !== "oscillator") return;
  if(irControl.snapshot || irBusy())stop(true);
  if (isPlaying) stop(true);
  else nextPlaybackToken();
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
  for (const [mode, button] of [["resynthesis", resynthesisModeButton], ["convolution", convolutionButton]]) {
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

async function runResynthesisAnalysis({ preservePlayback = false } = {}) {
  if (!analysisSamples) return;
  const keepCurrent = preservePlayback && Boolean(analysisResult);
  if (!keepCurrent) {
    if (isPlaying) stop(true);
    else nextPlaybackToken();
  }
  analysisWorker?.terminate();
  const generation = ++analysisGeneration;
  if (!keepCurrent) analysisResult = null;
  analysisStatus.textContent = "Analyzing spectrum...";
  sendSettings();
  const worker = new Worker(new URL("./resynthesis-worker.js?v=20260930-resynthesis2", import.meta.url), { type: "module" });
  analysisWorker = worker;
  worker.onmessage = ({ data }) => {
    if (generation !== analysisGeneration) return;
    worker.terminate();
    analysisWorker = null;
    if (data.error) {
      analysisStatus.textContent = `Analysis failed: ${data.error}`;
      return;
    }
    analysisResult = data.result;
    const base = Math.max(20, Math.min(4000, analysisResult.fundamentalEstimate));
    if (!keepCurrent && resynthesisState && !resynthesisState.editedCurves.basePitch) {
      resynthesisState.curves.basePitch = defaultCurve(normFromBaseFrequency(base));
    }
    analysisStatus.textContent = "";
    sendSettings();
  };
  worker.onerror = (error) => {
    if (generation !== analysisGeneration) return;
    worker.terminate();
    analysisWorker = null;
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

resynthesisModeButton.addEventListener("click", () => {
  setSoundMode("resynthesis");
  loadDefaultResynthesisSource();
});
convolutionButton.addEventListener("click", () => setSoundMode("convolution"));
partialCountSelect.addEventListener("change", () => { if (analysisSamples) runResynthesisAnalysis({ preservePlayback: true }); });

openAudioButton.addEventListener("click", () => impulseInput.click());
impulseInput.addEventListener("change", async () => {
  const file = impulseInput.files?.[0];
  if (!file) return;
  if (file.size > MAX_IR_FILE_BYTES) {
    impulseStatus.textContent = "File too large (16 MiB max)";
    analysisStatus.textContent = "File too large (16 MiB max)";
    impulseInput.value = "";
    return;
  }
  const sourceRequest = sourceLoadGate.begin();
  defaultResynthesisRequest = null;
  const modeAtOpen = soundMode;
  if (isPlaying || irControl.snapshot || irBusy()) stop(true);
  else nextPlaybackToken();
  openAudioButton.disabled = true;
  impulseLengthInput.disabled = true;
  impulseStatus.textContent = "Decoding audio…";
  analysisStatus.textContent = "Decoding audio…";
  try {
    const bytes = await readAudioFile(file, Math.max(TARGET_SAMPLE_RATE, audioContext?.sampleRate || TARGET_SAMPLE_RATE));
    const decoder = new OfflineAudioContext(2, 1, TARGET_SAMPLE_RATE);
    const decoded = await decoder.decodeAudioData(bytes.slice(0));
    await validateAudioBuffer(decoded, { signal: sourceRequest.signal, isCurrent: sourceRequest.current });
    if (!sourceRequest.current()) return;
    const prepared = prepareImpulse(decoder, decoded, Number(impulseLengthInput.value));
    const input = await prepareResynthesisInput(file, decoded);
    if (!sourceRequest.current()) return;
    const nativeSource = node && soundMode === "convolution" && audioContext.sampleRate !== TARGET_SAMPLE_RATE
      ? await audioContext.decodeAudioData(bytes.slice(0)) : null;
    if (nativeSource) await validateAudioBuffer(nativeSource, { signal: sourceRequest.signal, isCurrent: sourceRequest.current });
    if (!sourceRequest.current()) return;
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
    sourceOverview.setBuffer(decoded);
    for (const [name, y] of Object.entries(curveDefaults)) {
      resynthesisState.curves[name] = defaultCurve(name === "slope" ? normFromSlopeDb(0) : y);
      resynthesisState.editedCurves[name] = false;
    }
    if (modeAtOpen === "oscillator" && soundMode === "oscillator") setSoundMode("convolution");
    await runResynthesisAnalysis();
    sendSettings();
  } catch (error) {
    if (!sourceRequest.current()) return;
    console.error(error);
    const message = error.message || String(error);
    impulseStatus.textContent = impulseBuffer48k
      ? `${message} Previous audio remains available.`
      : message;
    analysisStatus.textContent = `${message}${analysisSamples ? ` Previous audio remains available: ${analysisSource?.name || resynthesisSource.textContent}` : ""}`;
  } finally {
    if (sourceRequest.current()) {
      openAudioButton.disabled = false;
      impulseLengthInput.disabled = false;
      impulseInput.value = "";
    }
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
  if (event) shiftHeld = Boolean(event.shiftKey);
  const editable = Boolean(activeCurve);
  const erasing = editable && curvePointerId == null && isErasing(event);
  canvas.classList.toggle("eraseMode", erasing);
  canvas.style.cursor = !editable ? "default" : verticalDrag || (curvePointerId == null && shiftHeld && !erasing)
    ? "ns-resize" : erasing ? "" : hoverPoint != null ? "pointer" : "crosshair";
}

function getVerticalPoints() {
  if (verticalDrag) return verticalDrag.points.map(entry => entry.point);
  if (curvePointerId != null || !shiftHeld || canvas.classList.contains("eraseMode") || !(Boolean(activeCurve))) return [];
  const index = hoverPoint;
  return index != null && index >= 0 ? curves[activeCurve].slice(index) : [];
}

function groupPointerY(event, anchorX) {
  return canvasPoint(event).y;
}

function beginCurveGroup(event, index) {
  event.preventDefault();
  if (index == null || index < 0) return false;
  const anchorX = curves[activeCurve][index].x;
  const group = beginVerticalGroup(curves[activeCurve], index, groupPointerY(event, anchorX));
  group.curveName = activeCurve;
  group.anchorX = anchorX;
  group.wasEdited = editedCurves[activeCurve];
  verticalDrag = group;
  curvePointerId = event.pointerId;
  dragging = true;
  canvas.setPointerCapture(event.pointerId);
  updateEraseCursor(event);
  draw();
  return true;
}

function moveCurveGroup(event) {
  if (moveVerticalGroup(verticalDrag, groupPointerY(event, verticalDrag.anchorX))) {
    editedCurves[verticalDrag.curveName] = true;
    sendCurves();
    draw();
  }
}

function finishCurveDrag(cancel = false) {
  if (cancel && restoreVerticalGroup(verticalDrag)) {
    editedCurves[verticalDrag.curveName] = verticalDrag.wasEdited;
    sendCurves();
    draw();
  }
  verticalDrag = null;
  dragging = false;
  const pointerId = curvePointerId;
  curvePointerId = null;
  if (pointerId != null && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
}

function cancelCurvePointer(event) {
  if (curvePointerId == null || event.pointerId !== curvePointerId) return;
  finishCurveDrag(true);
  updateEraseCursor(event);
  draw();
}

function setTool(tool) {
  if (verticalDrag) finishCurveDrag(true);
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
    waveformButtons.forEach((candidate) => {
      candidate.classList.toggle("active", candidate === button);
      candidate.setAttribute("aria-pressed", String(candidate === button));
    });
    sendSettings();
  });
});

canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || curvePointerId != null) return;
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
  if (event.shiftKey) {
    selectedPoint = found >= 0 ? found : null;
    hoverPoint = selectedPoint;
    beginCurveGroup(event, found);
    updateEraseCursor(event);
    draw();
    return;
  }
  curvePointerId = event.pointerId;
  canvas.setPointerCapture(event.pointerId);
  selectedPoint = found >= 0 ? found : null;
  if (found >= 0) updatePoint(found, point);
  else addPoint(point);
  dragging = true;
});

canvas.addEventListener("pointermove", (event) => {
  if (curvePointerId != null && event.pointerId !== curvePointerId) return;
  if (verticalDrag) { moveCurveGroup(event); return; }
  updateEraseCursor(event);
  const point = canvasPoint(event);
  hoverPoint = findPoint(point);
  if (dragging && selectedPoint != null) updatePoint(selectedPoint, point);
  else draw();
});

canvas.addEventListener("pointerup", (event) => {
  if (curvePointerId == null || event.pointerId !== curvePointerId) return;
  finishCurveDrag();
  updateEraseCursor(event);
  draw();
});

canvas.addEventListener("pointerleave", () => {
  hoverPoint = null;
  if (!dragging) draw();
});

canvas.addEventListener("pointerenter", updateEraseCursor);
canvas.addEventListener("pointercancel", cancelCurvePointer);
canvas.addEventListener("lostpointercapture", cancelCurvePointer);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && verticalDrag) {
    event.preventDefault();
    event.stopImmediatePropagation();
    finishCurveDrag(true);
    updateEraseCursor(event);
    draw();
    return;
  }
  const previousShift = shiftHeld;
  const previousErase = canvas.classList.contains("eraseMode");
  updateEraseCursor(event);
  if (previousShift !== shiftHeld || previousErase !== canvas.classList.contains("eraseMode")) draw();
});
window.addEventListener("keyup", (event) => {
  const previousShift = shiftHeld;
  const previousErase = canvas.classList.contains("eraseMode");
  updateEraseCursor(event);
  if (previousShift !== shiftHeld || previousErase !== canvas.classList.contains("eraseMode")) draw();
});
window.addEventListener("blur", () => {
  finishCurveDrag(true);
  shiftHeld = false;
  hoverPoint = null;
  updateEraseCursor();
  draw();
});






[
  countSelect,
  stackSelect,
].forEach((control) => {
  control.addEventListener("input", sendSettings);
  control.addEventListener("change", sendSettings);
});

durationInput.addEventListener("input", () => {
  stop(true);
  sendSettings();
});

clearCurveButton.addEventListener("click", clearCurrentCurve);
resetButton.addEventListener("click", resetAll);
playButton.addEventListener("click", play);
stopButton.addEventListener("click", () => stop(false));
meterClipButton.addEventListener("click", () => {
  meterClipLatched = false;
  meterClipButton.classList.remove("clipped");
  meterClipButton.setAttribute("aria-pressed", "false");
});
downloadButton.addEventListener("click", downloadWav);

function isTransportInput(target) {
  if (target instanceof HTMLSelectElement) {
    // A closed select retains focus after choosing; Space should control transport.
    // An open native popup keeps its own selection keys.
    try { return target.matches(":open"); } catch { return true; }
  }
  return target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement || target?.isContentEditable || target?.closest?.("summary");
}

window.addEventListener("keydown", (event) => {
  if (event.code !== "Space" || isTransportInput(event.target)) return;
  event.preventDefault();
  event.stopPropagation();
  if (event.repeat || playButton.disabled || renderAbortController) return;
  if (document.activeElement instanceof HTMLButtonElement || document.activeElement instanceof HTMLSelectElement) document.activeElement.blur();
  if (isPlaying) stop(false);
  else play();
});

window.addEventListener("keyup", (event) => {
  if (event.code !== "Space" || isTransportInput(event.target)) return;
  event.preventDefault();
  event.stopPropagation();
});

window.addEventListener("resize", () => fitEditorControls(true));


if ("ResizeObserver" in window) {
  const controlsObserver = new ResizeObserver(() => fitEditorControls());
  [document.querySelector(".sourceBand"), oscillatorControls, document.querySelector(".impulseBand"), document.querySelector(".legend"), modulationInfo, durationPanel, document.querySelector(".topbar"), document.querySelector(".panel"), document.querySelector(".playbackBar")].forEach((element) => controlsObserver.observe(element));
}
if ("ResizeObserver" in window) new ResizeObserver(resizeCanvas).observe(canvas);
setSoundMode("convolution");
fitEditorControls(true);
updateTransport();
requestAnimationFrame(updateMeter);


mountTransport({onScrub:value=>{isScrubbing=value;},state:transportState,seek:p=>{playbackScrubber.value=String(p);seekFromScrubber();}});

// Idle readiness is conveyed by the Download control; retain actionable feedback.
function setExportStatus(message) {
  const output = document.getElementById("downloadReadout");
  output.textContent = message;
  output.parentElement.hidden = ["", "ready", "not ready", "needs export"].includes(message);
}

async function loadDefaultResynthesisSource() {
  if (analysisSamples || defaultResynthesisRequest || openAudioButton.disabled) return;
  const request = sourceLoadGate.begin();
  defaultResynthesisRequest = request;
  analysisStatus.textContent = "Loading default sample…";
  try {
    const file = await fetchDefaultSource(request.signal);
    const decoder = new OfflineAudioContext(2, 1, TARGET_SAMPLE_RATE);
    const decoded = await decoder.decodeAudioData(await file.arrayBuffer());
    await validateAudioBuffer(decoded, { signal: request.signal, isCurrent: request.current });
    const input = await prepareResynthesisInput(file, decoded);
    if (!request.current() || soundMode !== "resynthesis" || analysisSamples) return;
    ensureResynthesisState();
    analysisSamples = input.samples;
    analysisSource = input.source;
    resynthesisSource.textContent = file.name;
    sourceOverview.setBuffer(decoded);
    await runResynthesisAnalysis();
    sendSettings();
  } catch (error) {
    if (!request.current()) return;
    analysisStatus.textContent = "Default sample unavailable. Open an audio file to begin.";
  } finally {
    if (defaultResynthesisRequest === request) defaultResynthesisRequest = null;
  }
}
