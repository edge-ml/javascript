// Streaming sample-rate conversion for microphone audio.
//
// Windowed-sinc interpolation (Blackman window). When converting down (e.g.
// 48 kHz to 16 kHz) the kernel is widened and its cutoff lowered below the
// new Nyquist frequency, so sounds above it are filtered out instead of
// folding back as aliases. Chunks can be of any size; the output does not
// depend on how the input was split.

const sinc = (x) => (x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));

// share of the output Nyquist band that is kept when converting down
const PASSBAND = 0.92;

export class Resampler {
  /**
   * @param {number} inRate - sample rate of the input (Hz)
   * @param {number} outRate - sample rate of the output (Hz)
   * @param {{ zeroCrossings?: number }} [opts] - kernel length; more is sharper and slower
   */
  constructor(inRate, outRate, { zeroCrossings = 16 } = {}) {
    if (!(inRate > 0) || !(outRate > 0)) throw new RangeError("Sample rates must be positive");
    this.inRate = inRate;
    this.outRate = outRate;
    /** input samples per output sample */
    this.step = inRate / outRate;
    /** cutoff as a fraction of the input Nyquist frequency */
    this.cutoff = outRate < inRate ? (outRate / inRate) * PASSBAND : 1;
    /** kernel half-width in input samples */
    this.half = Math.ceil(zeroCrossings / this.cutoff);
    this.reset();
  }

  /** Forgets the past input (e.g. after a gap in the recording). */
  reset() {
    this.history = new Float32Array(0);
    // position of the next output sample, in input samples from history[0]
    this.pos = 0;
  }

  /**
   * How far the output lags the input, in ms: an output sample needs the
   * input up to half a kernel after it.
   */
  get latencyMs() {
    return this.inRate === this.outRate ? 0 : (this.half / this.inRate) * 1000;
  }

  /**
   * @param {ArrayLike<number>} input - the next input samples
   * @returns {Float32Array} the output samples they complete
   */
  process(input) {
    if (this.inRate === this.outRate) return Float32Array.from(input);
    const x = new Float32Array(this.history.length + input.length);
    x.set(this.history);
    x.set(input, this.history.length);

    const out = [];
    const { half, cutoff } = this;
    while (this.pos + half < x.length) {
      const center = this.pos;
      const first = Math.ceil(center - half);
      const last = Math.floor(center + half);
      let acc = 0;
      for (let i = Math.max(0, first); i <= last; i++) {
        const t = i - center;
        const w = 0.42 + 0.5 * Math.cos((Math.PI * t) / half) + 0.08 * Math.cos((2 * Math.PI * t) / half);
        acc += x[i] * cutoff * sinc(cutoff * t) * w;
      }
      out.push(acc);
      this.pos += this.step;
    }
    // keep what the next output samples still need
    const keep = Math.max(0, Math.floor(this.pos - half) - 1);
    this.history = x.slice(keep);
    this.pos -= keep;
    return Float32Array.from(out);
  }
}

/**
 * Mixes interleaved multi-channel samples down to mono.
 * @param {ArrayLike<number>} samples
 * @param {number} channels
 * @returns {Float32Array}
 */
export function downmix(samples, channels) {
  if (channels === 1) return Float32Array.from(samples);
  const frames = Math.floor(samples.length / channels);
  const out = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) sum += samples[f * channels + c];
    out[f] = sum / channels;
  }
  return out;
}
