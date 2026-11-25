import { SampleBuffer } from "./SampleBuffer";
import { TimeGridBuffer } from "./TimeGridBuffer";
import { AudioBuffer } from "./AudioBuffer";
import { PredictorError } from "../errors";
import { loadRuntime, readFile, RUNTIME_HINT } from "./platform.node";
import { fetchOnnx } from "../training";
import { manifestUnits, resolveConversions } from "../units";

let runtime = null;

async function getRuntime(ort) {
  if (ort) return ort;
  if (!runtime) runtime = await loadRuntime();
  if (!runtime) throw new Error("No ONNX runtime available: " + RUNTIME_HINT);
  return runtime;
}

const softmax = (xs) => {
  const max = Math.max(...xs);
  const exps = xs.map((x) => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((x) => x / sum);
};

const toBytes = (data) => (data instanceof Uint8Array ? data : new Uint8Array(data));

/**
 * Runs an edge-ml model exported as ONNX (browser: onnxruntime-web,
 * Node.js: onnxruntime-node). Feature extraction and normalization are part of
 * the model; the predictor only buffers raw sensor values into windows.
 *
 * Models that take sound (manifest schema 2) are fed with `addAudio` too:
 * samples at any rate, which are converted to the model's rate. Their windows
 * have a fixed duration (`windowMs`), and sensors are interpolated onto the
 * model's rate the way training did.
 */
export class OnnxPredictor {
  /**
   * Use `OnnxPredictor.load`, `fromUrls`, `fromFiles` or `edgeML.loadModel` instead.
   * @param {any} session - ort.InferenceSession
   * @param {any} manifest - manifest.json of the export
   * @param {any} ort - the onnxruntime module
   * @param {{ units?: { [sensor: string]: string }, catalog?: object }} [unitOptions]
   */
  constructor(session, manifest, ort, { units, catalog } = {}) {
    if (!manifest || manifest.format !== "onnx") throw new Error("Not an edge-ml ONNX manifest");
    this.session = session;
    this.manifest = manifest;
    this.ort = ort;
    /** @type {string[]} */
    this.labels = manifest.output.labels;
    /** manifest schema 2: several inputs (sound and/or sensors), windows by duration */
    this.multiInput = manifest.schema_version >= 2;
    if (this.multiInput) {
      const sensors = (manifest.inputs || []).find((i) => i.kind === "sensors");
      const audio = (manifest.inputs || []).find((i) => i.kind === "audio");
      this._sensorInput = sensors || null;
      this._audioInput = audio || null;
      /** @type {string[]} */
      this.sensors = sensors ? sensors.timeseries : [];
      /** samples per window of the sensor input (0 without sensors) */
      this.windowSize = sensors ? sensors.shape[1] : 0;
      /** window duration in ms (schema 2) */
      this.windowMs = manifest.window.duration_ms;
      /** sample rate the model expects for sound, or null without a sound input */
      this.audioSampleRate = audio ? audio.sample_rate : null;
      this.buffer = new TimeGridBuffer(this.sensors, this.windowSize, this.windowMs);
      this.audioBuffer = audio ? new AudioBuffer(audio.sample_rate, audio.shape[1]) : null;
    } else {
      /** @type {string[]} */
      this.sensors = manifest.input.timeseries;
      /** @type {number} */
      this.windowSize = manifest.window.size;
      this.buffer = new SampleBuffer(this.sensors, this.windowSize);
      this.audioBuffer = null;
      this.audioSampleRate = null;
    }
    /**
     * Unit the model expects for each input, with conversions from other units.
     * Inputs of models trained before units existed have quantity null and unit "".
     * @type {import("../../index").InputUnit[]}
     */
    this.inputUnits = manifestUnits(manifest);
    this._conversions = this.sensors.map(() => null);
    this._catalog = catalog;
    if (units) this.setUnits(units);
  }

  /**
   * Declares the unit each sensor delivers, e.g. `{ accX: "g" }`. Values are
   * then converted to the unit the model expects before predicting. Sensors
   * left out (and inputs of models without unit information) are passed through.
   * Throws a UnitError if the model cannot convert from a declared unit.
   * @param {{ [sensor: string]: string }} units
   * @param {object} [catalog] - from `fetchUnits`, to also accept unit labels and aliases like "°C"
   */
  setUnits(units, catalog = this._catalog) {
    this._conversions = resolveConversions(this.inputUnits, units || {}, catalog);
    this._catalog = catalog;
  }

  /**
   * Sets the onnxruntime module to use (needed with bundlers in the browser).
   * @param {any} ort - e.g. `import * as ort from "onnxruntime-web"`
   */
  static setRuntime(ort) {
    runtime = ort;
  }

  /**
   * @param {ArrayBuffer | Uint8Array} model - bytes of model.onnx
   * @param {object} manifest - parsed manifest.json
   * @param {{ ort?: any, sessionOptions?: object, units?: { [sensor: string]: string }, catalog?: object }} [opts]
   */
  static async load(model, manifest, { ort, sessionOptions, units, catalog } = {}) {
    // check the units before creating the session, so a mistake fails fast
    if (units) resolveConversions(manifestUnits(manifest), units, catalog);
    const rt = await getRuntime(ort);
    const session = await rt.InferenceSession.create(toBytes(model), sessionOptions);
    return new OnnxPredictor(session, manifest, rt, { units, catalog });
  }

  /**
   * Loads model.onnx and manifest.json from URLs (e.g. an unzipped download from edge-ml).
   * @param {string} modelUrl
   * @param {string} manifestUrl
   * @param {import("../../index").LoadOptions} [opts]
   */
  static async fromUrls(modelUrl, manifestUrl, opts) {
    const [model, manifest] = await Promise.all([
      fetch(modelUrl).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}: ${modelUrl}`)))),
      fetch(manifestUrl).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}: ${manifestUrl}`)))),
    ]);
    return OnnxPredictor.load(model, manifest, opts);
  }

  /**
   * Node.js only: loads model.onnx and manifest.json from disk.
   * @param {string} modelPath
   * @param {string} manifestPath
   * @param {import("../../index").LoadOptions} [opts]
   */
  static async fromFiles(modelPath, manifestPath, opts) {
    const [model, manifest] = await Promise.all([readFile(modelPath), readFile(manifestPath)]);
    return OnnxPredictor.load(model, JSON.parse(manifest.toString()), opts);
  }

  /**
   * Downloads a trained model from the edge-ml server.
   * @param {string} url - The url of the backend server
   * @param {string} key - A Device-Api-Key (read or write)
   * @param {string} modelId
   * @param {import("../../index").LoadOptions} [opts]
   */
  static async fromServer(url, key, modelId, opts) {
    const [model, manifest] = await fetchOnnx(url, key, modelId);
    return OnnxPredictor.load(model, manifest, opts);
  }

  /**
   * @param {string} sensor - one of `predictor.sensors`
   * @param {number} value
   * @param {number} [time] - unix ms, defaults to now
   */
  addDatapoint(sensor, value, time) {
    this.buffer.addDatapoint(sensor, value, time);
  }

  /**
   * Adds one value per sensor with a shared timestamp.
   * @param {number[] | { [sensor: string]: number }} values - array in `predictor.sensors` order, or an object by sensor name
   * @param {number} [time] - unix ms, defaults to now
   */
  addSample(values, time) {
    this.buffer.addSample(values, time);
  }

  /**
   * Adds sound for models with a sound input (`predictor.audioSampleRate`).
   * Samples can have any rate; they are mixed to mono and resampled.
   * @param {ArrayLike<number>} samples - in [-1, 1] (e.g. a Float32Array from the Web Audio API); interleaved if channels > 1
   * @param {{ sampleRate: number, channels?: number, time?: number }} opts - time: unix ms of the last sample (default: now)
   */
  addAudio(samples, opts) {
    if (!this.audioBuffer) throw new TypeError("This model does not take sound");
    this.audioBuffer.add(samples, opts);
  }

  /**
   * Like `addAudio` for 16-bit PCM (e.g. from a recorder that delivers bytes).
   * @param {Int16Array} samples
   * @param {{ sampleRate: number, channels?: number, time?: number }} opts
   */
  addPcm16(samples, opts) {
    const floats = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) floats[i] = samples[i] / 32768;
    this.addAudio(floats, opts);
  }

  /** Clears all buffered datapoints (and sound). */
  reset() {
    this.buffer.reset();
    if (this.audioBuffer) this.audioBuffer.reset();
  }

  /** True when enough data is buffered for `predict()`. */
  get isReady() {
    try {
      if (this.multiInput) this._latestInputs();
      else this.buffer.window();
      return true;
    } catch (e) {
      if (e instanceof PredictorError) return false;
      throw e;
    }
  }

  /**
   * Classifies the latest window of buffered datapoints.
   * Throws a PredictorError while fewer than `windowSize` samples are buffered.
   * @returns {Promise<import("../../index").OnnxPrediction>}
   */
  async predict() {
    if (this.multiInput) return this.predictInputs(this._latestInputs());
    return this.predictWindow(this.buffer.window());
  }

  /** The latest window of every input, ending at the same time. */
  _latestInputs() {
    const ends = [];
    if (this.sensors.length) ends.push(this.buffer.endTime);
    if (this.audioBuffer) ends.push(this.audioBuffer.endTime);
    if (ends.some((t) => t === null)) {
      throw new PredictorError(this.audioBuffer && this.audioBuffer.endTime === null ? "No audio yet" : "No sensor data yet");
    }
    const end = Math.min(...ends);
    const inputs = {};
    if (this.sensors.length) inputs.sensors = this.buffer.window(end);
    if (this.audioBuffer) inputs.audio = this.audioBuffer.window(end);
    return inputs;
  }

  /**
   * Classifies one window of a model with a sound input (schema 2).
   * @param {{ sensors?: number[][], audio?: ArrayLike<number> }} inputs -
   *   sensors: `windowSize` rows in `sensors` order (declared units);
   *   audio: one window of mono samples at `audioSampleRate`, in [-1, 1]
   * @returns {Promise<import("../../index").OnnxPrediction>}
   */
  async predictInputs({ sensors, audio } = {}) {
    if (!this.multiInput) throw new TypeError("This model takes one sensor window; use predictWindow");
    const feeds = {};
    if (this._sensorInput) {
      feeds[this._sensorInput.name] = this._sensorTensor(sensors, this._sensorInput.name);
    }
    if (this._audioInput) {
      const n = this._audioInput.shape[1];
      if (!audio || audio.length !== n) throw new TypeError(`Audio window must have ${n} samples`);
      feeds[this._audioInput.name] = new this.ort.Tensor("float32", Float32Array.from(audio), [1, n]);
    }
    return this._run(feeds);
  }

  _sensorTensor(window, name) {
    const n = this.sensors.length;
    if (!window || window.length !== this.windowSize || window.some((row) => row.length !== n)) {
      throw new TypeError(`Window must have shape [${this.windowSize}][${n}]`);
    }
    const data = new Float32Array(this.windowSize * n);
    window.forEach((row, r) =>
      row.forEach((value, c) => {
        const conv = this._conversions[c];
        data[r * n + c] = conv ? value * conv.scale + conv.offset : value;
      })
    );
    return new this.ort.Tensor("float32", data, [1, this.windowSize, n]);
  }

  async _run(feeds) {
    const outputs = await this.session.run(feeds);
    const scores = Array.from(outputs[this.manifest.output.name].data);

    const probabilities = this.manifest.output.type === "logits" ? softmax(scores) : scores;
    const index = probabilities.reduce((best, p, i) => (p > probabilities[best] ? i : best), 0);
    return {
      prediction: this.labels[index],
      index,
      probabilities,
      labels: this.labels,
      scores,
    };
  }

  /**
   * Classifies one window.
   * @param {number[][]} window - `windowSize` rows of values in `predictor.sensors` order, in the declared units
   * @returns {Promise<import("../../index").OnnxPrediction>}
   */
  async predictWindow(window) {
    if (this.multiInput) {
      if (this._audioInput) throw new TypeError("This model also takes sound; use predictInputs({ sensors, audio })");
      return this.predictInputs({ sensors: window });
    }
    const n = this.sensors.length;
    if (window.length !== this.windowSize || window.some((row) => row.length !== n)) {
      throw new TypeError(`Window must have shape [${this.windowSize}][${n}]`);
    }
    const data = new Float32Array(this.windowSize * n);
    window.forEach((row, r) =>
      row.forEach((value, c) => {
        const conv = this._conversions[c];
        data[r * n + c] = conv ? value * conv.scale + conv.offset : value;
      })
    );
    const input = new this.ort.Tensor("float32", data, [1, this.windowSize, n]);
    const outputs = await this.session.run({ [this.manifest.input.name]: input });
    const scores = Array.from(outputs[this.manifest.output.name].data);

    const probabilities = this.manifest.output.type === "logits" ? softmax(scores) : scores;
    const index = probabilities.reduce((best, p, i) => (p > probabilities[best] ? i : best), 0);
    return {
      prediction: this.labels[index],
      index,
      probabilities,
      labels: this.labels,
      scores,
    };
  }
}

/**
 * Downloads a trained model from the edge-ml server, ready to predict.
 * @param {string} url - The url of the backend server
 * @param {string} key - A Device-Api-Key (read or write)
 * @param {string} modelId
 * @param {import("../../index").LoadOptions} [opts]
 */
export function loadModel(url, key, modelId, opts) {
  return OnnxPredictor.fromServer(url, key, modelId, opts);
}
