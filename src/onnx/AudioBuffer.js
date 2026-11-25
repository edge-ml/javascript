import { PredictorError } from "../errors";
import { Resampler, downmix } from "./resample";

// keep this many windows of audio
const STORE_FACTOR = 4;

/**
 * Buffers microphone audio for a model: converts it to mono at the model's
 * sample rate and keeps the latest samples with the time of the last one.
 */
export class AudioBuffer {
  /**
   * @param {number} sampleRate - the rate the model expects
   * @param {number} windowSamples - samples per window
   */
  constructor(sampleRate, windowSamples) {
    this.sampleRate = sampleRate;
    this.windowSamples = windowSamples;
    this.capacity = STORE_FACTOR * windowSamples;
    this.reset();
  }

  reset() {
    this.data = new Float32Array(this.capacity);
    this.count = 0; // samples stored, up to capacity
    this.head = 0; // next write position
    /** unix ms of the last stored sample, or null before any audio */
    this.endTime = null;
    this.resampler = null;
  }

  /**
   * @param {ArrayLike<number>} samples - in [-1, 1]; interleaved when channels > 1
   * @param {{ sampleRate: number, channels?: number, time?: number }} opts -
   *   time: unix ms of the last sample in `samples` (default: now)
   */
  add(samples, { sampleRate, channels = 1, time = Date.now() } = {}) {
    if (!(sampleRate > 0)) throw new TypeError("addAudio needs the sampleRate of the samples");
    if (!this.resampler || this.resampler.inRate !== sampleRate) {
      this.resampler = new Resampler(sampleRate, this.sampleRate);
    }
    const mono = downmix(samples, channels);
    const out = this.resampler.process(mono);
    for (let i = 0; i < out.length; i++) {
      this.data[this.head] = out[i];
      this.head = (this.head + 1) % this.capacity;
    }
    this.count = Math.min(this.capacity, this.count + out.length);
    this.endTime = time - this.resampler.latencyMs;
  }

  /**
   * The `windowSamples` samples ending at `endTime` (unix ms, at most the time
   * of the last sample).
   * @param {number} [endTime]
   * @returns {Float32Array}
   */
  window(endTime = this.endTime) {
    if (this.endTime === null) throw new PredictorError("No audio yet");
    const back = Math.max(0, Math.round(((this.endTime - endTime) * this.sampleRate) / 1000));
    const needed = this.windowSamples + back;
    if (this.count < needed) {
      throw new PredictorError(`Not enough audio (${Math.max(0, this.count - back)}/${this.windowSamples} samples)`);
    }
    const out = new Float32Array(this.windowSamples);
    const start = this.head - needed;
    for (let i = 0; i < this.windowSamples; i++) {
      out[i] = this.data[(((start + i) % this.capacity) + this.capacity) % this.capacity];
    }
    return out;
  }
}
