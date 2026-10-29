import { PlaybackBoundary } from "./playback-boundary.js?v=20261029-live-crossfade1";
import { LookaheadSafetyLimiter } from "./safety-limiter.js?v=20261002-lookahead1";

class SafetyLimiterProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.boundary = new PlaybackBoundary(sampleRate);
    this.remaining = 0;
    this.startDelay = 0;
    this.limiter = new LookaheadSafetyLimiter(sampleRate);
    this.port.onmessage = ({ data }) => {
      if (data.type === "reset") this.limiter.reset();
      if (data.type === "boundaryStart") { this.boundary.start(); this.remaining = Math.ceil(data.seconds * sampleRate); this.startDelay = this.limiter.ahead; }
      if (data.type === "boundaryPause") { this.pauseId = data.id; this.boundary.release(); }
      if (data.type === "boundaryResume") this.boundary.start();
      if (data.type === 'boundarySeek') {
        this.remaining = Math.max(0, Math.ceil((data.endTime - (globalThis.currentTime || 0)) * sampleRate));
        // Keep limiter/IR history and never cancel a Pause already releasing to zero.
        if (this.boundary.releaseAge === null) this.boundary.start(this.boundary.gain);
      }
    };
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (!output?.length) return true;
    const left = input?.[0];
    const right = input?.[1] || left;
    for (let frame = 0; frame < output[0].length; frame += 1) {
      const limited = this.limiter.process(left?.[frame] || 0, right?.[frame] || 0);
      const gain = this.startDelay-- > 0 ? (this.remaining--, 0) : this.remaining > 0 ? this.boundary.next(this.remaining--) : 0;
      output[0][frame] = limited.left * gain;
      if (output[1]) output[1][frame] = limited.right * gain;
      if (this.pauseId != null && (this.boundary.done || this.remaining <= 0)) { this.port.postMessage({type:"boundaryPaused",id:this.pauseId}); this.pauseId = null; }
    }
    return true;
  }
}

registerProcessor("oscillator-safety-limiter", SafetyLimiterProcessor);
