import assert from "node:assert/strict";
import test from "node:test";
import { OutputMeterAnalyzer } from "../src/output-meter.js";

function audioNode() {
  return { connect() {}, gain: { value: 0 } };
}

test("output meter reads left and right independently without changing its signal path", () => {
  const analysers = [];
  const context = {
    createGain: audioNode,
    createChannelSplitter: audioNode,
    createAnalyser() {
      const analyser = {
        fftSize: 0,
        smoothingTimeConstant: 1,
        samples: [],
        connect() {},
        getFloatTimeDomainData(buffer) { buffer.set(this.samples); }
      };
      analysers.push(analyser);
      return analyser;
    }
  };
  const meter = new OutputMeterAnalyzer(context, { fftSize: 4 });
  assert.equal(meter.input.gain.value, 1);
  assert.equal(meter.input.channelCount, 2);
  analysers[0].samples = [1, 0, 0, 0];
  analysers[1].samples = [0.5, 0, 0, 0];
  const [left, right] = meter.read();
  assert.deepEqual(left, { peak: 1, rms: 0.5, clipped: true });
  assert.deepEqual(right, { peak: 0.5, rms: 0.25, clipped: false });
});
