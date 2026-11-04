import { SampleBuffer } from "./SampleBuffer";
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
    this.sensors = manifest.input.timeseries;
    /** @type {string[]} */
    this.labels = manifest.output.labels;
    /** @type {number} */
    this.windowSize = manifest.window.size;
    this.buffer = new SampleBuffer(this.sensors, this.windowSize);
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

  /** Clears all buffered datapoints. */
  reset() {
    this.buffer.reset();
  }

  /**
   * Classifies the latest window of buffered datapoints.
   * Throws a PredictorError while fewer than `windowSize` samples are buffered.
   * @returns {Promise<import("../../index").OnnxPrediction>}
   */
  async predict() {
    return this.predictWindow(this.buffer.window());
  }

  /**
   * Classifies one window.
   * @param {number[][]} window - `windowSize` rows of values in `predictor.sensors` order, in the declared units
   * @returns {Promise<import("../../index").OnnxPrediction>}
   */
  async predictWindow(window) {
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
