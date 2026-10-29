import {clamp, createSmoothingState, renderFrame, resetSmoothingState} from "./oscillator-core.js?v=20261026-harmonic-pan8";
import {LOOKAHEAD_SECONDS} from "./safety-limiter.js?v=20261002-lookahead1";
import {BOUNDARY_SECONDS} from './playback-boundary.js?v=20261029-live-crossfade1';

const bankChanged = (a, b) => a.soundMode !== 'resynthesis' && b.soundMode !== 'resynthesis'
  && ['waveform', 'count', 'stack'].some(key => a[key] !== b[key]);

class OscillatorCurveProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.playing = false;
    this.outputTime = 0;
    this.token = 0;
    this.phases = new Float64Array(64);
    this.modPhases = new Float64Array(64);
    this.smoothingState = createSmoothingState();
    this.framesUntilUpdate = 0;
    this.transitionFrames = Math.max(2, Math.round(sampleRate * BOUNDARY_SECONDS));
    this.transition = null;
    this.queuedSettings = null;
    this.queuedSeek = null;
    this.settings = {
      waveform: "sine",
      count: 4,
      stack: "unison",
      multiplierText: "1:1.5:2:2.5",
      modulationMode: "off",
      modulationRatio: 1,
      durationSeconds: 20,
      tailSeconds: 0,
      curves: {}
    };

    this.port.onmessage = (event) => {
      const data = event.data;
      if (data.type === "settings") {
        const next = { ...(this.queuedSettings || this.settings), ...data.settings };
        if (this.playing && (this.transition || bankChanged(this.settings, next))) this.queuedSettings = next;
        else this.settings = next;
      } else if (data.type === "curves") {
        this.settings.curves = data.curves || {};
        if (this.queuedSettings) this.queuedSettings.curves = this.settings.curves;
      } else if (data.type === "play") {
        this.finishPending();
        this.token = data.token ?? this.token;
        this.playing = true;
        resetSmoothingState(this.smoothingState);
        this.port.postMessage({ type: "started", token: this.token });
      } else if (data.type === "seek") {
        this.token = data.token ?? this.token;
        if (data.crossfade && this.playing) {
          this.queuedSeek = Number(data.seconds) || 0;
          // Do not publish an old position under the new seek token while coalescing.
          this.framesUntilUpdate = Math.max(this.framesUntilUpdate, this.transitionFrames + 1);
        } else {
          this.finishPending();
          this.seekNow(data.seconds);
        }
      } else if (data.type === "stop") {
        this.finishPending();
        this.token = data.token ?? this.token;
        this.playing = false;
        if (data.reset) this.outputTime = 0;
        this.port.postMessage({ type: "stopped", seconds: this.outputTime, token: this.token });
      }
    };
  }

  finishPending() {
    if (this.queuedSettings) this.settings = this.queuedSettings;
    this.transition = this.queuedSettings = this.queuedSeek = null;
  }

  seekNow(seconds) {
    this.outputTime = Math.max(0, Math.min(this.settings.durationSeconds, Number(seconds) || 0));
    this.phases.fill(0);
    this.modPhases.fill(0);
    resetSmoothingState(this.smoothingState);
    this.framesUntilUpdate = 0;
  }

  applyQueued(contextTime) {
    if (this.transition || (!this.queuedSettings && this.queuedSeek === null)) return;
    const next = this.queuedSettings || this.settings, seek = this.queuedSeek;
    this.queuedSettings = this.queuedSeek = null;
    if (seek !== null || bankChanged(this.settings, next)) {
      this.transition = {
        settings: {...this.settings}, seconds: this.outputTime, age: 0,
        phases: this.phases.slice(), modPhases: this.modPhases.slice(),
        smoothingState: {...this.smoothingState, coefficients: {...this.smoothingState.coefficients}}
      };
    }
    this.settings = next;
    if (seek !== null) {
      this.seekNow(seek);
      // Absolute audio time keeps the final envelope aligned even if the UI is busy.
      this.port.postMessage({type:'seeked', seconds:this.outputTime, contextTime, token:this.token,
        endTime:contextTime + this.settings.durationSeconds + Math.max(0, this.settings.tailSeconds || 0) + LOOKAHEAD_SECONDS - this.outputTime});
    }
  }

  sample(settings, seconds, phases, modPhases, smoothingState) {
    const duration = Math.max(0.1, settings.durationSeconds);
    return seconds < duration
      ? renderFrame(settings, clamp(seconds / duration), sampleRate, phases, modPhases, smoothingState)
      : {left:0, right:0, voices:0};
  }

  process(_, outputs) {
    const out = outputs[0];
    const outL = out[0];
    const outR = out[1] || out[0];
    for (let i = 0; i < outL.length; i += 1) {
      let left = 0;
      let right = 0;
      if (this.playing) {
        this.applyQueued((globalThis.currentTime || 0) + i / sampleRate);
        const duration = Math.max(0.1, this.settings.durationSeconds);
        const totalDuration = duration + Math.max(0, this.settings.tailSeconds || 0) + LOOKAHEAD_SECONDS;
        let voices = 0;
        const sample = this.sample(this.settings, this.outputTime, this.phases, this.modPhases, this.smoothingState);
        left = sample.left; right = sample.right; voices = sample.voices;
        if (this.transition) {
          const old = this.transition;
          const before = this.sample(old.settings, old.seconds, old.phases, old.modPhases, old.smoothingState);
          const mix = old.age++ / (this.transitionFrames - 1);
          left = before.left * (1 - mix) + left * mix;
          right = before.right * (1 - mix) + right * mix;
          old.seconds += 1 / sampleRate;
          if (old.age >= this.transitionFrames) this.transition = null;
        }
        this.outputTime += 1 / sampleRate;
        if (this.outputTime >= totalDuration && this.queuedSeek === null) {
          this.playing = false;
          this.outputTime = totalDuration;
          this.port.postMessage({ type: "ended", token: this.token });
        }
        if (this.framesUntilUpdate <= 0) {
          this.port.postMessage({ type: "position", seconds: this.outputTime, contextTime: (globalThis.currentTime || 0) + (i + 1) / sampleRate, voices, token: this.token });
          this.framesUntilUpdate = Math.round(sampleRate / 30);
        }
        this.framesUntilUpdate -= 1;
      }
      outL[i] = left;
      outR[i] = right;
    }
    return true;
  }
}

registerProcessor("oscillator-curve-processor", OscillatorCurveProcessor);
