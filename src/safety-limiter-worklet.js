import { LookaheadSafetyLimiter } from "./safety-limiter.js?v=20261002-lookahead1";

class SafetyLimiterProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.limiter = new LookaheadSafetyLimiter(sampleRate);
    this.port.onmessage = ({ data }) => {
      if (data.type === "reset") this.limiter.reset();
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
      output[0][frame] = limited.left;
      if (output[1]) output[1][frame] = limited.right;
    }
    return true;
  }
}

registerProcessor("oscillator-safety-limiter", SafetyLimiterProcessor);
