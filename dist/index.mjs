/**
 * Minimal fetch wrapper (browsers and Node.js >= 18 ship fetch).
 * Errors are thrown as `Error("<status>: <message>")`, matching the messages
 * the library produced with axios before.
 */

const joinUrl = (base, path) => base.replace(/\/+$/, "") + path;

async function request(method, base, path, body, { responseType = "json" } = {}) {
  let res;
  try {
    res = await fetch(joinUrl(base, path), {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
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

// Node.js implementation (the browser builds swap in platform.browser.js).

const pickOrt = (m) => (m && m.InferenceSession ? m : m && m.default && m.default.InferenceSession ? m.default : null);

/** Loads onnxruntime-node, falling back to onnxruntime-web. */
async function loadRuntime() {
  for (const load of [() => import('onnxruntime-node'), () => import('onnxruntime-web')]) {
    try {
      const ort = pickOrt(await load());
      if (ort) return ort;
    } catch (e) {
      // not installed — try the next one
    }
  }
  return null;
}

const RUNTIME_HINT = "npm install onnxruntime-node";

async function readFile(path) {
  const fs = await import('fs');
  return (fs.promises || fs.default.promises).readFile(path);
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
   */
  constructor(session, manifest, ort) {
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
   * @param {{ ort?: any, sessionOptions?: object }} [opts]
   */
  static async load(model, manifest, { ort, sessionOptions } = {}) {
    const rt = await getRuntime(ort);
    const session = await rt.InferenceSession.create(toBytes(model), sessionOptions);
    return new OnnxPredictor(session, manifest, rt);
  }

  /**
   * Loads model.onnx and manifest.json from URLs (e.g. an unzipped download from edge-ml).
   * @param {string} modelUrl
   * @param {string} manifestUrl
   * @param {{ ort?: any, sessionOptions?: object }} [opts]
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
   * @param {{ ort?: any, sessionOptions?: object }} [opts]
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
   * @param {{ ort?: any, sessionOptions?: object }} [opts]
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
   * @param {number[][]} window - `windowSize` rows of values in `predictor.sensors` order
   * @returns {Promise<import("../../index").OnnxPrediction>}
   */
  async predictWindow(window) {
    const n = this.sensors.length;
    if (window.length !== this.windowSize || window.some((row) => row.length !== n)) {
      throw new TypeError(`Window must have shape [${this.windowSize}][${n}]`);
    }
    const data = Float32Array.from(window.flat());
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
 * @param {{ ort?: any, sessionOptions?: object }} [opts]
 */
function loadModel(url, key, modelId, opts) {
  return OnnxPredictor.fromServer(url, key, modelId, opts);
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
 * @param {{ name: string, timeSeries: { name: string, data: [number, number][] }[], metaData?: { [key: string]: string }, labeling?: string }} dataset
 *   time-series data as [unix ms, value] pairs; labeling as "{labeling}_{label}" for the whole dataset
 * @returns {Promise<string>} The id of the created dataset
 */
async function sendDataset(url, key, dataset) {
  if (!dataset || !dataset.name || !Array.isArray(dataset.timeSeries)) {
    throw new Error("dataset needs a name and a timeSeries array");
  }
  const init = await http.post(url, URLS.initDatasetIncrement + key, {
    name: dataset.name,
    metaData: dataset.metaData || {},
    timeSeries: dataset.timeSeries.map((ts) => ts.name),
  });
  if (!init || !init.id) {
    throw new Error("Could not create dataset");
  }
  let labeling = undefined;
  if (dataset.labeling) {
    const [labelingName, labelName] = dataset.labeling.split("_");
    labeling = { labelingName, labelName };
  }
  await http.post(url, URLS.addDatasetIncrement + key + "/" + init.id, {
    data: dataset.timeSeries.map((ts) => ({ name: ts.name, data: ts.data })),
    labeling: labeling,
  });
  return init.id;
}

/**
 *
 * @param {string} url - The url of the backend server
 * @param {string} key - The Device-Api-Key
 * @param {boolean} useDeviceTime - True if you want to use timestamps generated by the server
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

  const data = await http.post(url, URLS.initDatasetIncrement + key, {
    name: name,
    metaData: metaData,
    timeSeries: timeSeries,
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
  var timeSeries = timeSeries;

  /**
   * Uploads a vlaue for a specific timestamp to a datasets timeSeries with name sensorName
   * @param {string} name - The name of the timeSeries to upload the value to
   * @param {number} value - The datapoint to upload
   * @param {number} time - The timestamp assigned to the datapoint
   * @returns A Promise indicating success or failure of upload
   */
  function addDataPoint(time, name, value) {

    if (!timeSeries.includes(name)) {
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

export { OnnxPredictor, PredictorError, datasetCollector, edgeML as default, getModel, listModels, listPipelines, loadModel, sendDataset, startTraining, trainModel, waitForModel };
