import { interpolateLinear } from "./interpolation";
import { PredictorError } from "../errors";

// keep up to STORE_FACTOR * windowSize datapoints per sensor
const STORE_FACTOR = 4;

/**
 * Buffers sensor values and produces the last sample-based window, aligned the
 * way training aligns datasets: rows are the union of all timestamps (outer
 * join), gaps are filled by linear interpolation over the rows, and leading /
 * trailing gaps take the nearest known value.
 */
export class SampleBuffer {
  /**
   * @param {string[]} sensors - sensor names in model input order
   * @param {number} windowSize - samples per window
   */
  constructor(sensors, windowSize) {
    this.sensors = sensors;
    this.windowSize = windowSize;
    this.reset();
  }

  reset() {
    /** @type {{ [sensor: string]: [number, number][] }} */
    this.store = {};
    for (const s of this.sensors) this.store[s] = [];
  }

  /**
   * @param {string} sensor
   * @param {number} value
   * @param {number} [time] - unix ms, defaults to now
   */
  addDatapoint(sensor, value, time = Date.now()) {
    if (typeof value !== "number" || Number.isNaN(value)) throw new TypeError("Datapoint is not a number");
    if (!(sensor in this.store)) {
      throw new TypeError(`Unknown sensor '${sensor}'. The model expects: ${this.sensors.join(", ")}`);
    }
    const series = this.store[sensor];
    series.push([time, value]);
    if (series.length > 2 * STORE_FACTOR * this.windowSize) {
      this.store[sensor] = series.slice(-STORE_FACTOR * this.windowSize);
    }
  }

  /**
   * Adds one value per sensor with a shared timestamp.
   * @param {number[] | { [sensor: string]: number }} values - array in sensor order, or an object by sensor name
   * @param {number} [time] - unix ms, defaults to now
   */
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

  /**
   * @returns {number[][]} windowSize rows of sensor values (in sensor order)
   */
  window() {
    for (const s of this.sensors) {
      if (this.store[s].length === 0) throw new PredictorError(`No data for sensor '${s}' yet`);
    }

    /** @type {Map<number, (number | null)[]>} */
    const rows = new Map();
    this.sensors.forEach((s, col) => {
      for (const [time, value] of this.store[s]) {
        let row = rows.get(time);
        if (!row) {
          row = new Array(this.sensors.length).fill(null);
          rows.set(time, row);
        }
        row[col] = value;
      }
    });
    const merged = [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, row]) => row);

    if (merged.length < this.windowSize) {
      throw new PredictorError(`Not enough samples (${merged.length}/${this.windowSize})`);
    }

    for (let col = 0; col < this.sensors.length; col++) {
      const column = merged.map((row) => row[col]);
      interpolateLinear(column);
      merged.forEach((row, i) => (row[col] = column[i]));
    }
    return merged.slice(-this.windowSize);
  }
}
