export const SAFETY_CEILING = Math.pow(10, -1 / 20);
export const LOOKAHEAD_SECONDS = 0.005;

export class StereoSafetyLimiter {
  constructor(sampleRate, ceiling = SAFETY_CEILING) {
    this.ceiling = ceiling;
    this.gain = 1;
    this.release = 1 - Math.exp(-1 / (0.06 * sampleRate));
  }

  process(left, right) {
    const peak = Math.max(Math.abs(left), Math.abs(right));
    const target = peak > this.ceiling ? this.ceiling / peak : 1;
    this.gain = target < this.gain
      ? target
      : this.gain + (target - this.gain) * this.release;
    return { left: left * this.gain, right: right * this.gain };
  }
}

export class LookaheadSafetyLimiter {
  constructor(sampleRate, ceiling = SAFETY_CEILING) {
    this.ceiling = ceiling;
    this.ahead = Math.round(sampleRate * LOOKAHEAD_SECONDS);
    this.attack = 1 - Math.exp(-1 / (sampleRate * 0.001));
    this.release = 1 - Math.exp(-1 / (sampleRate * 0.1));
    this.left = new Float32Array(this.ahead + 1);
    this.right = new Float32Array(this.ahead + 1);
    this.indices = new Float64Array(this.ahead + 2);
    this.peaks = new Float32Array(this.ahead + 2);
    this.reset();
  }

  reset() {
    this.left.fill(0);
    this.right.fill(0);
    this.sample = 0;
    this.head = 0;
    this.tail = 0;
    this.gain = 1;
  }

  process(left, right) {
    const index = this.sample++;
    const peak = Math.max(Math.abs(left), Math.abs(right));
    const size = this.indices.length;
    while (this.tail > this.head && this.peaks[(this.tail - 1) % size] <= peak) this.tail--;
    this.indices[this.tail % size] = index;
    this.peaks[this.tail % size] = peak;
    this.tail++;
    const outputIndex = index - this.ahead;
    while (this.head < this.tail && this.indices[this.head % size] < outputIndex) this.head++;
    const slot = index % this.left.length;
    this.left[slot] = left;
    this.right[slot] = right;
    if (outputIndex < 0) return { left: 0, right: 0 };
    const delayedSlot = outputIndex % this.left.length;
    const delayedLeft = this.left[delayedSlot];
    const delayedRight = this.right[delayedSlot];
    const futurePeak = this.peaks[this.head % size];
    const target = futurePeak > this.ceiling ? this.ceiling / futurePeak : 1;
    this.gain += (target - this.gain) * (target < this.gain ? this.attack : this.release);
    const delayedPeak = Math.max(Math.abs(delayedLeft), Math.abs(delayedRight));
    if (delayedPeak * this.gain > this.ceiling) this.gain = this.ceiling / delayedPeak;
    return { left: delayedLeft * this.gain, right: delayedRight * this.gain };
  }
}

export function limitChannels(channels, sampleRate) {
  const limiter = new LookaheadSafetyLimiter(sampleRate);
  const left = channels[0];
  const right = channels[1] || left;
  const originalLength = left.length;
  const output = Array.from({ length: channels.length }, () => new Float32Array(originalLength + limiter.ahead));
  for (let frame = 0; frame < output[0].length; frame += 1) {
    const limited = limiter.process(frame < originalLength ? left[frame] : 0, frame < originalLength ? right[frame] : 0);
    output[0][frame] = limited.left;
    if (channels.length > 1) output[1][frame] = limited.right;
  }
  return output;
}
