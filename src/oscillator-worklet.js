import {clamp, edgeFade, renderFrame} from "./oscillator-core.js?v=20260929-edge-fade1";

class OscillatorCurveProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.playing = false;
    this.outputTime = 0;
    this.token = 0;
    this.phases = new Float64Array(64);
    this.modPhases = new Float64Array(64);
    this.framesUntilUpdate = 0;
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
        this.settings = { ...this.settings, ...data.settings };
      } else if (data.type === "curves") {
        this.settings.curves = data.curves || {};
      } else if (data.type === "play") {
        this.token = data.token ?? this.token;
        this.playing = true;
        this.port.postMessage({ type: "started", token: this.token });
      } else if (data.type === "seek") {
        this.token = data.token ?? this.token;
        this.outputTime = Math.max(0, Math.min(this.settings.durationSeconds, Number(data.seconds) || 0));
        this.phases.fill(0);
        this.modPhases.fill(0);
        this.framesUntilUpdate = 0;
      } else if (data.type === "stop") {
        this.token = data.token ?? this.token;
        this.playing = false;
        if (data.reset) this.outputTime = 0;
        this.port.postMessage({ type: "stopped", seconds: this.outputTime, token: this.token });
      }
    };
  }

  process(_, outputs) {
    const out = outputs[0];
    const outL = out[0];
    const outR = out[1] || out[0];
    for (let i = 0; i < outL.length; i += 1) {
      let left = 0;
      let right = 0;
      if (this.playing) {
        const duration = Math.max(0.1, this.settings.durationSeconds);
        const totalDuration = duration + Math.max(0, this.settings.tailSeconds || 0);
        let voices = 0;
        if (this.outputTime < duration) {
          const sample = renderFrame(this.settings, clamp(this.outputTime / duration), sampleRate, this.phases, this.modPhases);
          const frameCount = Math.ceil(duration * sampleRate);
          const frame = Math.min(frameCount - 1, Math.round(this.outputTime * sampleRate));
          const fade = edgeFade(frame, frameCount, sampleRate);
          left = sample.left * fade;
          right = sample.right * fade;
          voices = sample.voices;
        }
        this.outputTime += 1 / sampleRate;
        if (this.outputTime >= totalDuration) {
          this.playing = false;
          this.outputTime = totalDuration;
          this.port.postMessage({ type: "ended", token: this.token });
        }
        if (this.framesUntilUpdate <= 0) {
          this.port.postMessage({ type: "position", seconds: this.outputTime, voices, token: this.token });
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
