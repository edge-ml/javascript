import { http } from "./http";

const enc = encodeURIComponent;
const deviceBase = (key) => `/ml/device/${enc(key)}`;

/**
 * Lists the pipeline steps and their options/parameters that can be used in
 * `trainModel`'s `pipeline` field.
 * @param {string} url - The url of the backend server
 * @param {string} key - A Device-Api-Key (read or write)
 */
export function listPipelines(url, key) {
  return http.get(url, `${deviceBase(key)}/pipelines`);
}

/**
 * Starts training a model on the server and returns immediately.
 * @param {string} url - The url of the backend server
 * @param {string} key - A Device-Api-Key with write access
 * @param {import("../index").TrainOptions} options
 * @returns {Promise<{ id: string, warnings: string[] }>}
 */
export function startTraining(url, key, options) {
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
export function getModel(url, key, modelId) {
  return http.get(url, `${deviceBase(key)}/models/${enc(modelId)}`);
}

/**
 * @param {string} url - The url of the backend server
 * @param {string} key - A Device-Api-Key (read or write)
 * @returns {Promise<import("../index").ModelInfo[]>}
 */
export function listModels(url, key) {
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
export async function waitForModel(url, key, modelId, { interval = 2000, timeout = 30 * 60 * 1000, onProgress } = {}) {
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
export async function trainModel(url, key, options, waitOptions) {
  const { id } = await startTraining(url, key, options);
  return waitForModel(url, key, id, waitOptions);
}

/** @private */
export function fetchOnnx(url, key, modelId) {
  const base = `${deviceBase(key)}/models/${enc(modelId)}/onnx`;
  return Promise.all([
    http.get(url, `${base}/model.onnx`, { responseType: "arraybuffer" }),
    http.get(url, `${base}/manifest.json`),
  ]);
}
