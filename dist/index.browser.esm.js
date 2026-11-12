/**
 * Minimal fetch wrapper (browsers and Node.js >= 18 ship fetch).
 * Errors are thrown as `Error("<status>: <message>")`, matching the messages
 * the library produced with axios before.
 */

const joinUrl = (base, path) => base.replace(/\/+$/, "") + path;

async function request(method, base, path, body, { responseType = "json", form = false } = {}) {
  let res;
  try {
    res = await fetch(joinUrl(base, path), {
      method,
      // a form is sent as multipart; fetch adds the header with its boundary
      headers: body !== undefined && !form ? { "Content-Type": "application/json" } : undefined,
      body: body === undefined ? undefined : form ? body : JSON.stringify(body),
    });
  } catch (e) {
    throw new Error("Server error: " + (e && e.message ? e.message : e));
  }

  if (!res.ok) {
    let detail;
    try {
      const data = await res.json();
      detail = data.error || data.detail || JSON.stringify(data);
    } catch (e) {
      detail = res.statusText;
    }
    throw new Error(res.status + ": " + detail);
  }

  if (responseType === "arraybuffer") return res.arrayBuffer();
  const text = await res.text();
  return text ? JSON.parse(text) : undefined;
}

const http = {
  get: (base, path, opts) => request("GET", base, path, undefined, opts),
  post: (base, path, body, opts) => request("POST", base, path, body, opts),
  postForm: (base, path, form, opts) => request("POST", base, path, form, { ...opts, form: true }),
};

/** Thrown by OnnxPredictor.predict while not enough data is buffered for a window. */
class PredictorError extends Error {}

/**
 *
 * @param {number} x 
 * @param {number} y 
 * @param {number} a 
 * @returns {number}
 */
 const lerp = (x, y, a) => x * (1 - a) + y * a;
 /**
  * in place
  * @param {(number | null)[]} arr
  * @param {number | undefined} l value for entries before first known, if undefined first known
  * @param {number | undefined} r value for entries after last known, if undefined last known
  * @return {number[]} 
  */
 const interpolateLinear = (arr, l, r) => {
     let leftmost = l;
     let nullCount = 0;
 
     for (let i = 0; i < arr.length;) {
         if (arr[i] !== null) {
             for (let j = 0; j < nullCount; j++) {
                 arr[i - (nullCount - j)] = typeof leftmost !== 'undefined' ? lerp(leftmost, arr[i], (j + 1) / (nullCount + 1)) : arr[i];
             }
             nullCount = 0;
 
             leftmost = arr[i];
             i++;
             continue;
         }
         for (; arr[i] === null; i++) {
             nullCount++;
         }
     }
     for (let j = 0; j < nullCount; j++) {
         arr[arr.length - (nullCount - j)] = leftmost;
     }
 };

// keep up to STORE_FACTOR * windowSize datapoints per sensor
const STORE_FACTOR = 4;

/**
 * Buffers sensor values and produces the last sample-based window, aligned the
 * way training aligns datasets: rows are the union of all timestamps (outer
 * join), gaps are filled by linear interpolation over the rows, and leading /
 * trailing gaps take the nearest known value.
 */
class SampleBuffer {
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

// Browser implementation (swapped in for platform.node.js by the browser builds).
// The runtime is not imported here so that apps which only collect data do not
// need onnxruntime-web: it is taken from the global `ort` of
// <script src=".../onnxruntime-web/dist/ort.min.js">, or passed in with
// OnnxPredictor.setRuntime(ort) / { ort } when using a bundler.

async function loadRuntime() {
  const g = typeof globalThis !== "undefined" ? globalThis : window;
  return g.ort && g.ort.InferenceSession ? g.ort : null;
}

const RUNTIME_HINT =
  'add <script src="https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js"></script>, ' +
  'or `import * as ort from "onnxruntime-web"` and call OnnxPredictor.setRuntime(ort)';

async function readFile() {
  throw new Error("OnnxPredictor.fromFiles is only available in Node.js; use fromUrls in the browser");
}

const enc = encodeURIComponent;
const deviceBase = (key) => `/ml/device/${enc(key)}`;

/**
 * Lists the pipeline steps and their options/parameters that can be used in
 * `trainModel`'s `pipeline` field.
 * @param {string} url - The url of the backend server
 * @param {string} key - A Device-Api-Key (read or write)
 */
function listPipelines(url, key) {
  return http.get(url, `${deviceBase(key)}/pipelines`);
}

/**
 * Starts training a model on the server and returns immediately.
 * @param {string} url - The url of the backend server
 * @param {string} key - A Device-Api-Key with write access
 * @param {import("../index").TrainOptions} options
 * @returns {Promise<{ id: string, warnings: string[] }>}
 */
function startTraining(url, key, options) {
  if (!options || !options.name || !options.labeling) {
    return Promise.reject(new Error("trainModel needs at least a `name` and a `labeling`"));
  }
  return http.post(url, `${deviceBase(key)}/train`, options);
}

/**
 * @param {string} url - The url of the backend server
 * @param {string} key - A Device-Api-Key (read or write)
 * @param {string} modelId
 * @returns {Promise<import("../index").ModelInfo>}
 */
function getModel(url, key, modelId) {
  return http.get(url, `${deviceBase(key)}/models/${enc(modelId)}`);
}

/**
 * @param {string} url - The url of the backend server
 * @param {string} key - A Device-Api-Key (read or write)
 * @returns {Promise<import("../index").ModelInfo[]>}
 */
function listModels(url, key) {
  return http.get(url, `${deviceBase(key)}/models`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Polls a model until training is done. Rejects if training fails or the timeout passes.
 * @param {string} url
 * @param {string} key
 * @param {string} modelId
 * @param {{ interval?: number, timeout?: number, onProgress?: (model: import("../index").ModelInfo) => void }} [opts]
 * @returns {Promise<import("../index").ModelInfo>}
 */
async function waitForModel(url, key, modelId, { interval = 2000, timeout = 30 * 60 * 1000, onProgress } = {}) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const model = await getModel(url, key, modelId);
    if (onProgress) onProgress(model);
    if (model.trainStatus === "done") return model;
    if (model.trainStatus === "error") throw new Error("Training failed: " + (model.error || "unknown error"));
    if (Date.now() > deadline) throw new Error(`Training did not finish within ${timeout} ms`);
    await sleep(interval);
  }
}

/**
 * Trains a model on the server and waits until it is done.
 *
 * The default pipeline (sample-based windowing, simple features, min-max
 * normalization, random forest) can be exported to ONNX, so the result can be
 * loaded with `loadModel` and run in the browser.
 *
 * @param {string} url - The url of the backend server
 * @param {string} key - A Device-Api-Key with write access
 * @param {import("../index").TrainOptions} options
 * @param {{ interval?: number, timeout?: number, onProgress?: (model: import("../index").ModelInfo) => void }} [waitOptions]
 * @returns {Promise<import("../index").ModelInfo>}
 */
async function trainModel(url, key, options, waitOptions) {
  const { id } = await startTraining(url, key, options);
  return waitForModel(url, key, id, waitOptions);
}

/** @private */
function fetchOnnx(url, key, modelId) {
  const base = `${deviceBase(key)}/models/${enc(modelId)}/onnx`;
  return Promise.all([
    http.get(url, `${base}/model.onnx`, { responseType: "arraybuffer" }),
    http.get(url, `${base}/manifest.json`),
  ]);
}

/**
 * Thrown when a sensor unit cannot be converted to the unit a model expects,
 * so the app gets an error instead of wrong predictions.
 */
class UnitError extends Error {}

/**
 * Fetches the unit catalog of the edge-ml server: every quantity with its
 * units and the unit models expect (`defaultUnit`). No API key needed.
 * @param {string} url - The url of the backend server
 * @returns {Promise<import("../index").UnitCatalog>}
 */
function fetchUnits(url) {
  return http.get(url, "/ml/units/");
}

/**
 * Time-series as given by the app: a plain name, or `{ name, unit?, quantity? }`.
 * @param {string | { name: string, unit?: string, quantity?: string }} ts
 * @returns {{ name: string, unit?: string, quantity?: string }}
 */
function seriesSpec(ts) {
  if (typeof ts === "string") return { name: ts };
  if (!ts || typeof ts.name !== "string" || !ts.name) {
    throw new TypeError("A time-series needs a name, e.g. \"accX\" or { name: \"accX\", unit: \"g\", quantity: \"acceleration\" }");
  }
  return ts;
}

/**
 * The time-series entry of a dataset init request. Plain names stay plain
 * strings, so servers without unit support keep accepting them.
 */
function initEntry(ts) {
  const { name, unit, quantity } = seriesSpec(ts);
  if (!unit && !quantity) return name;
  return { name, unit: unit || "", quantity: quantity || null };
}

/**
 * The expected unit of every model input, from `manifest.input.units`.
 * Exports made before units existed have none: every input is unknown.
 * @returns {import("../index").InputUnit[]}
 */
function manifestUnits(manifest) {
  const names = manifest.input.timeseries;
  const byName = {};
  for (const u of manifest.input.units || []) byName[u.name] = u;
  return names.map((name) => {
    const u = byName[name] || {};
    return { name, quantity: u.quantity || null, unit: u.unit || "", conversions: u.conversions || {} };
  });
}

const isUnknown = (input) => !input.quantity && !input.unit;

/** The catalog unit id of `unit` within `quantityId`, matching ids, labels and aliases. */
function catalogUnitId(catalog, quantityId, unit) {
  const quantity = catalog && (catalog.quantities || []).find((q) => q.id === quantityId);
  if (!quantity) return null;
  const match = quantity.units.find((u) => u.id === unit || u.label === unit || (u.aliases || []).includes(unit));
  return match ? match.id : null;
}

/**
 * Works out how to convert each input from the unit the app delivers to the
 * unit the model expects.
 *
 * @param {import("../index").InputUnit[]} inputs - from `manifestUnits`
 * @param {{ [sensor: string]: string }} sensorUnits - unit each sensor delivers; sensors the model does not use are ignored
 * @param {import("../index").UnitCatalog} [catalog] - optional, to also accept unit labels and aliases (e.g. "°C")
 * @returns {({ scale: number, offset: number } | null)[]} per input, null = pass values through
 */
function resolveConversions(inputs, sensorUnits, catalog) {
  return inputs.map((input) => {
    const unit = sensorUnits ? sensorUnits[input.name] : undefined;
    if (unit === undefined || unit === null) return null;
    if (typeof unit !== "string") throw new TypeError(`The unit of '${input.name}' must be a string`);
    // trained before units existed, or on data of unknown unit: values go in as they are
    if (isUnknown(input)) return null;

    let conv = input.conversions[unit];
    if (!conv && unit !== input.unit && input.quantity) {
      const id = catalogUnitId(catalog, input.quantity, unit);
      if (id) conv = input.conversions[id] || (id === input.unit ? { scale: 1, offset: 0 } : undefined);
    }
    if (!conv && unit === input.unit) conv = { scale: 1, offset: 0 };
    if (!conv) {
      const accepted = Object.keys(input.conversions);
      const expected = `${input.unit || "no unit"}${input.quantity ? ` (${input.quantity})` : ""}`;
      throw new UnitError(
        `'${input.name}' is declared in '${unit}', but the model expects ${expected} and cannot convert from '${unit}'. ` +
          (accepted.length > 1 ? `Accepted units: ${accepted.join(", ")}.` : `Deliver it in ${input.unit || "the unit it was trained on"}.`)
      );
    }
    return conv.scale === 1 && conv.offset === 0 ? null : { scale: conv.scale, offset: conv.offset };
  });
}

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
class OnnxPredictor {
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
    const [model, manifest] = await Promise.all([readFile(), readFile()]);
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
function loadModel(url, key, modelId, opts) {
  return OnnxPredictor.fromServer(url, key, modelId, opts);
}

// Audio and video recordings in datasets, and listing datasets.
//
// A recording is stored as uploaded and placed on the dataset's timeline by
// its `start` (unix ms), next to the time-series. The server accepts what
// browsers can play: MP4 (H.264/AAC) and WebM video; MP3, WAV, OGG, FLAC and
// M4A audio.

const URLS$1 = {
  media: "/api/v1/deviceapi/dataset/media/",
  project: "/api/v1/deviceapi/project/",
};

const isBlob = (value) => typeof Blob !== "undefined" && value instanceof Blob;

const baseName = (path) => path.split(/[\\/]/).pop();

/** Turns what the caller passed as `file` into a Blob and a file name. */
async function toUpload(file, fileName) {
  if (typeof file === "string") {
    let bytes;
    try {
      bytes = await readFile(file);
    } catch (e) {
      if (/only available in Node\.js/.test(e.message)) {
        throw new Error("File paths can only be uploaded from Node.js; pass a File or Blob in the browser");
      }
      throw e;
    }
    return { blob: new Blob([bytes]), name: fileName || baseName(file) };
  }
  if (isBlob(file)) {
    return { blob: file, name: fileName || file.name || "recording" };
  }
  if (file instanceof ArrayBuffer || ArrayBuffer.isView(file)) {
    return { blob: new Blob([file]), name: fileName || "recording" };
  }
  throw new Error("file must be a File, Blob, Buffer, ArrayBuffer or (in Node.js) a file path");
}

/**
 * Adds an audio or video recording to a dataset.
 * @param {string} url - The url of the backend server
 * @param {string} key - The Device-Api-Key (write access)
 * @param {string} datasetId - id of the dataset, e.g. from sendDataset
 * @param {Blob | ArrayBuffer | ArrayBufferView | string} file - a File or Blob
 *   (browser), a Buffer or ArrayBuffer, or a file path (Node.js)
 * @param {import("../index").MediaOptions} [options]
 * @returns {Promise<import("../index").MediaSeries>} the stored recording
 */
async function uploadMedia(url, key, datasetId, file, options = {}) {
  if (!datasetId) {
    throw new Error("uploadMedia needs the id of a dataset");
  }
  if (options.kind !== undefined && options.kind !== "audio" && options.kind !== "video") {
    throw new Error("kind must be 'audio' or 'video'");
  }
  if (options.start !== undefined && !Number.isFinite(options.start)) {
    throw new Error("start must be a unix timestamp in milliseconds");
  }
  const { blob, name } = await toUpload(file, options.fileName);
  const form = new FormData();
  // the file name tells the server nothing about the format (it looks at the
  // content), but names the recording when `name` is not given
  form.append("file", blob, name);
  if (options.kind) form.append("kind", options.kind);
  if (options.name) form.append("name", options.name);
  if (options.start !== undefined) form.append("start", String(Math.round(options.start)));
  return http.postForm(url, URLS$1.media + key + "/" + datasetId, form);
}

/**
 * Downloads a recording as it was uploaded.
 * @param {string} url - The url of the backend server
 * @param {string} key - The Device-Api-Key (read or write access)
 * @param {string} datasetId
 * @param {string} mediaId - `_id` of an entry of the dataset's `mediaSeries`
 * @returns {Promise<ArrayBuffer>}
 */
function downloadMedia(url, key, datasetId, mediaId) {
  return http.get(url, URLS$1.media + key + "/" + datasetId + "/" + mediaId, { responseType: "arraybuffer" });
}

/**
 * Lists the datasets of the project, with their time-series and recordings
 * (no sample values).
 * @param {string} url - The url of the backend server
 * @param {string} key - The Device-Api-Key (read or write access)
 * @returns {Promise<import("../index").DatasetInfo[]>}
 */
async function listDatasets(url, key) {
  const project = await http.get(url, URLS$1.project + key);
  return ((project && project.datasets) || []).map((dataset) => ({
    ...dataset,
    // datasets from before recordings existed have no such list
    mediaSeries: dataset.mediaSeries || [],
  }));
}

const UPLOAD_INTERVAL = 5 * 1000;

const URLS = {
  initDatasetIncrement: "/api/v1/deviceapi/dataset/init/",
  addDatasetIncrement: "/api/v1/deviceapi/dataset/append/"
};

/**
 * Uploads a whole dataset to a specific project
 * @param {string} url - The url of the backend server
 * @param {string} key - The Device-Api-Key (write access)
 * @param {import("../index").DatasetUpload} dataset
 *   time-series data as [unix ms, value] pairs, each with an optional unit and quantity
 *   (e.g. { name: "accX", unit: "g", quantity: "acceleration", data }); labeling as
 *   "{labeling}_{label}" for the whole dataset; `labels` over time ranges
 *   (e.g. { labeling: "activity", label: "walk", start, end }); `media` with audio/video
 *   recordings (e.g. { file, start }), in which case timeSeries may be empty
 * @returns {Promise<string>} The id of the created dataset
 */
async function sendDataset(url, key, dataset) {
  const media = dataset && dataset.media !== undefined ? dataset.media : [];
  if (!Array.isArray(media) || media.some((m) => !m || m.file === undefined)) {
    throw new Error("media must be an array of { file, kind?, name?, start? }");
  }
  // a dataset that only holds recordings needs no timeSeries
  const series = dataset && dataset.timeSeries === undefined && media.length > 0 ? [] : dataset && dataset.timeSeries;
  if (!dataset || !dataset.name || !Array.isArray(series)) {
    throw new Error("dataset needs a name and a timeSeries array");
  }
  const labels = labelEntries(dataset.labels);
  const init = await http.post(url, URLS.initDatasetIncrement + key, {
    name: dataset.name,
    metaData: dataset.metaData || {},
    timeSeries: series.map(initEntry),
  });
  if (!init || !init.id) {
    throw new Error("Could not create dataset");
  }
  let labeling = undefined;
  if (dataset.labeling) {
    const [labelingName, labelName] = dataset.labeling.split("_");
    labeling = { labelingName, labelName };
  }
  // A label for the whole dataset spans what the dataset holds when it is
  // sent, so with recordings the labels go last, once those are there.
  const labelsLast = media.length > 0;
  if (series.length > 0) {
    await http.post(url, URLS.addDatasetIncrement + key + "/" + init.id, {
      data: series.map((ts) => ({ name: ts.name, data: ts.data })),
      labeling: labelsLast ? undefined : labeling,
      // left out when there are none, as before
      labels: labelsLast || labels.length === 0 ? undefined : labels,
    });
  }
  for (const { file, ...options } of media) {
    await uploadMedia(url, key, init.id, file, options);
  }
  if (labelsLast && (labeling || labels.length > 0)) {
    await http.post(url, URLS.addDatasetIncrement + key + "/" + init.id, {
      data: [],
      labeling,
      labels: labels.length > 0 ? labels : undefined,
    });
  }
  return init.id;
}

/** Checks labels over time ranges and turns them into what the server takes. */
function labelEntries(labels) {
  if (labels === undefined) return [];
  if (!Array.isArray(labels)) {
    throw new Error("labels must be an array of { labeling, label, start, end }");
  }
  return labels.map((entry) => {
    const { labeling, label, start, end } = entry || {};
    if (typeof labeling !== "string" || !labeling || typeof label !== "string" || !label) {
      throw new Error("a label needs a labeling and a label, e.g. { labeling: 'activity', label: 'walk', start, end }");
    }
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      throw new Error(`label '${label}' needs start and end as unix timestamps in milliseconds`);
    }
    if (end < start) {
      throw new Error(`label '${label}' ends before it starts`);
    }
    return { labelingName: labeling, labelName: label, start: Math.round(start), end: Math.round(end) };
  });
}

/**
 * Adds labels over time ranges to a dataset, e.g. to one that holds recordings.
 * Labelings and labels that do not exist yet are created.
 * @param {string} url - The url of the backend server
 * @param {string} key - The Device-Api-Key (write access)
 * @param {string} datasetId - id of the dataset, e.g. from sendDataset
 * @param {import("../index").DatasetLabel[]} labels - e.g.
 *   [{ labeling: "activity", label: "walk", start: 1618760114000, end: 1618760124000 }]
 * @returns {Promise<void>}
 */
async function addLabels(url, key, datasetId, labels) {
  if (!datasetId) {
    throw new Error("addLabels needs the id of a dataset");
  }
  const entries = labelEntries(labels === undefined ? null : labels);
  if (entries.length === 0) return;
  await http.post(url, URLS.addDatasetIncrement + key + "/" + datasetId, { data: [], labels: entries });
}

/**
 *
 * @param {string} url - The url of the backend server
 * @param {string} key - The Device-Api-Key
 * @param {string} name - Name of the new dataset
 * @param {boolean} useDeviceTime - True if you want to use timestamps generated by the server
 * @param {(string | { name: string, unit?: string, quantity?: string })[]} timeSeries - names, or
 *   objects with the unit and quantity of the series, e.g. { name: "accX", unit: "g", quantity: "acceleration" }
 * @param {{ [key: string]: string }} [metaData]
 * @param {string} [datasetLabel] - label for the whole dataset as "{labeling}_{label}"
 * @returns Function to upload single datapoints to one dataset inside a specific project
 */
async function datasetCollector(
  url,
  key,
  name,
  useDeviceTime,
  timeSeries,
  metaData,
  datasetLabel
) {
  var labeling = undefined;
  if (datasetLabel) {
    labeling = {"labelingName": datasetLabel.split("_")[0], "labelName": datasetLabel.split("_")[1]};
  }

  if (!Array.isArray(timeSeries) || timeSeries.length === 0) {
    throw new Error("timeSeries must be a non-empty array");
  }
  const seriesNames = timeSeries.map((ts) => seriesSpec(ts).name);

  const data = await http.post(url, URLS.initDatasetIncrement + key, {
    name: name,
    metaData: metaData || {},
    timeSeries: timeSeries.map(initEntry),
    labeling: labeling
  });
  if (!data || !data.id) {
    throw new Error("Could not generate datasetCollector");
  }
  const datasetKey = data.id;

  var uploadComplete = false;
  var dataStore = { data: [] };
  var lastChecked = Date.now();
  var error = undefined;

  /**
   * Uploads a vlaue for a specific timestamp to a datasets timeSeries with name sensorName
   * @param {string} name - The name of the timeSeries to upload the value to
   * @param {number} value - The datapoint to upload
   * @param {number} time - The timestamp assigned to the datapoint
   * @returns A Promise indicating success or failure of upload
   */
  function addDataPoint(time, name, value) {

    if (!seriesNames.includes(name)) {
      throw Error("invalid time-series name")
    }

    if (error) {
      throw new Error(error);
    }
    if (typeof value !== "number") {
      throw new Error("Datapoint is not a number");
    }
    if (!useDeviceTime && typeof time !== "number") {
      throw new Error("Provide a valid timestamp");
    }

    if (useDeviceTime) {
      time = new Date().getTime();
    }

    value = Math.round(value * 100) / 100;

    if (dataStore.data.every((elm) => elm.name !== name)) {
      dataStore.data.push({
        name: name,
        data: [[time, value]],
      });
    } else {
      const idx = dataStore.data.findIndex(
        (elm) => elm.name === name
      );
      dataStore.data[idx].data.push([time, value]);

      if (dataStore.data[idx].start > time) {
        dataStore.data[idx].start = time;
      }
      if (dataStore.data[idx].end < time) {
        dataStore.data[idx].end = time;
      }
    }

    if (Date.now() - lastChecked > UPLOAD_INTERVAL) {
      // background upload: a failure is reported by the next addDataPoint / onComplete
      upload().catch((e) => {
        error = e.message;
      });
      lastChecked = Date.now();
      dataStore = { data: [] };
    }
  }

  async function upload(uploadLabel) {
    const tmp_datastore = JSON.parse(JSON.stringify(dataStore));
    await http.post(url, URLS.addDatasetIncrement + key + "/" + datasetKey, {"data": tmp_datastore.data, "labeling": uploadLabel});
  }

  /**
   * Synchronizes the server with the data when you have added all data
   */
  async function onComplete() {
    if (uploadComplete) {
      throw new Error("Dataset is already uploaded");
    }
    await upload(labeling);
    if (error) {
      throw new Error(error);
    }
    uploadComplete = true;
  }

  if (useDeviceTime) {
    return {
      addDataPoint: (sensorName, value) =>
        addDataPoint(undefined, sensorName, value),
      onComplete: onComplete,
    };
  } else {
    return {
      addDataPoint: (time, sensorName, value) =>
        addDataPoint(time, sensorName, value),
      onComplete: onComplete,
    };
  }
}

const edgeML = {
  // data collection
  datasetCollector: datasetCollector,
  sendDataset: sendDataset,
  addLabels: addLabels,
  listDatasets: listDatasets,
  // audio and video
  uploadMedia: uploadMedia,
  downloadMedia: downloadMedia,
  // units
  fetchUnits: fetchUnits,
  UnitError: UnitError,
  // training on the edge-ml server
  listPipelines: listPipelines,
  trainModel: trainModel,
  startTraining: startTraining,
  waitForModel: waitForModel,
  getModel: getModel,
  listModels: listModels,
  // inference
  loadModel: loadModel,
  OnnxPredictor: OnnxPredictor,
  PredictorError: PredictorError,
};

export { OnnxPredictor, PredictorError, UnitError, addLabels, datasetCollector, edgeML as default, downloadMedia, fetchUnits, getModel, listDatasets, listModels, listPipelines, loadModel, sendDataset, startTraining, trainModel, uploadMedia, waitForModel };
