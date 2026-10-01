export class FFT {
  constructor(size) {
    if (!Number.isInteger(size) || size < 8 || (size & (size - 1))) throw new Error('FFT size must be a power of two');
    this.size = size;
    this.reverse = new Uint32Array(size);
    this.cos = new Float64Array(size / 2);
    this.sin = new Float64Array(size / 2);
    const bits = Math.log2(size);
    for (let i = 0; i < size; i++) {
      let n = i, r = 0;
      for (let j = 0; j < bits; j++) { r = (r << 1) | (n & 1); n >>= 1; }
      this.reverse[i] = r;
    }
    for (let i = 0; i < size / 2; i++) {
      this.cos[i] = Math.cos(2 * Math.PI * i / size);
      this.sin[i] = Math.sin(2 * Math.PI * i / size);
    }
  }
  transform(re, im, inverse = false) {
    const n = this.size;
    for (let i = 0; i < n; i++) {
      const j = this.reverse[i];
      if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (let len = 2; len <= n; len *= 2) {
      const half = len / 2, stride = n / len;
      for (let start = 0; start < n; start += len) {
        for (let j = 0; j < half; j++) {
          const c = this.cos[j * stride], s = this.sin[j * stride] * (inverse ? 1 : -1);
          const a = start + j, b = a + half;
          const tr = re[b] * c - im[b] * s, ti = re[b] * s + im[b] * c;
          re[b] = re[a] - tr; im[b] = im[a] - ti;
          re[a] += tr; im[a] += ti;
        }
      }
    }
    if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  }
}

