import { PredictorError } from "../errors";

// keep this many windows of sensor data
const STORE_FACTOR = 4;

/**
 * Buffers sensor values for models with windows of a fixed duration (schema 2
 * manifests): every sensor keeps its own timestamps, and a window is the
 * sensors linearly interpolated onto an even grid, the way training builds it.
 */
export class TimeGridBuffer {
  /**
   * @param {string[]} sensors - in model input order
   * @param {number} samples - grid points per window
   * @param {number} windowMs - window duration
   */
  constructor(sensors, samples, windowMs) {
    this.sensors = sensors;
    this.samples = samples;
    this.windowMs = windowMs;
    this.reset();
  }

  reset() {
    /** @type {{ [sensor: string]: { t: number[], v: number[] } }} */
    this.store = {};
    for (const s of this.sensors) this.store[s] = { t: [], v: [] };
  }

  /**
   * @param {string} sensor
   * @param {number} value
   * @param {number} [time] - unix ms, defaults to now
   */
  addDatapoint(sensor, value, time = Date.now()) {
    if (typeof value !== "number" || Number.isNaN(value)) throw new TypeError("Datapoint is not a number");
    const series = this.store[sensor];
    if (!series) throw new TypeError(`Unknown sensor '${sensor}'. The model expects: ${this.sensors.join(", ")}`);
    if (series.t.length && time < series.t[series.t.length - 1]) {
      // out of order: insert where it belongs
      const at = series.t.findIndex((t) => t > time);
      series.t.splice(at, 0, time);
      series.v.splice(at, 0, value);
    } else {
      series.t.push(time);
      series.v.push(value);
    }
    const keepFrom = time - STORE_FACTOR * this.windowMs;
    let drop = 0;
    while (drop < series.t.length - 2 && series.t[drop + 1] < keepFrom) drop++;
    if (drop) {
      series.t.splice(0, drop);
      series.v.splice(0, drop);
    }
  }

  /** @param {number[] | { [sensor: string]: number }} values @param {number} [time] */
  addSample(values, time = Date.now()) {
    if (Array.isArray(values)) {
      if (values.length !== this.sensors.length) {
        throw new TypeError(`Expected ${this.sensors.length} values (${this.sensors.join(", ")}), got ${values.length}`);
      }
      this.sensors.forEach((s, i) => this.addDatapoint(s, values[i], time));
    } else {
      for (const [s, v] of Object.entries(values)) this.addDatapoint(s, v, time);
    }
  }

  /** unix ms up to which every sensor has data, or null */
  get endTime() {
    let end = Infinity;
    for (const s of this.sensors) {
      const { t } = this.store[s];
      if (!t.length) return null;
      end = Math.min(end, t[t.length - 1]);
    }
    return this.sensors.length ? end : null;
  }

  /**
   * The window ending at `endTime`: `samples` rows of sensor values.
   * @param {number} [endTime]
   * @returns {number[][]}
   */
  window(endTime = this.endTime) {
    if (endTime === null) throw new PredictorError("No sensor data yet");
    const start = endTime - this.windowMs;
    const step = this.windowMs / this.samples;
    const rows = Array.from({ length: this.samples }, () => new Array(this.sensors.length));
    this.sensors.forEach((s, c) => {
      const { t, v } = this.store[s];
      // training only uses windows inside a sensor's data (1 ms tolerance)
      if (!t.length || t[0] > start + 1) {
        throw new PredictorError(`Not enough data for sensor '${s}' (need ${this.windowMs} ms)`);
      }
      let j = 0;
      for (let k = 0; k < this.samples; k++) {
        const x = start + k * step;
        while (j < t.length - 2 && t[j + 1] <= x) j++;
        if (x <= t[0]) rows[k][c] = v[0];
        else if (x >= t[t.length - 1]) rows[k][c] = v[v.length - 1];
        else {
          const a = t[j + 1] === t[j] ? 0 : (x - t[j]) / (t[j + 1] - t[j]);
          rows[k][c] = v[j] * (1 - a) + v[j + 1] * a;
        }
      }
    });
    return rows;
  }
}
