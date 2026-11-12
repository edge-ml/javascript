import { http } from "./http";
import { PredictorError } from "./errors";
import { OnnxPredictor, loadModel } from "./onnx/OnnxPredictor";
import { UnitError, fetchUnits, initEntry, seriesSpec } from "./units";
import { uploadMedia, downloadMedia, listDatasets } from "./media";
import { listPipelines, startTraining, trainModel, waitForModel, getModel, listModels } from "./training";

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
    labeling = {"labelingName": datasetLabel.split("_")[0], "labelName": datasetLabel.split("_")[1]}
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
  var lastChecked = Date.now()
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

export default edgeML;
export {
  datasetCollector,
  sendDataset,
  addLabels,
  listDatasets,
  uploadMedia,
  downloadMedia,
  fetchUnits,
  UnitError,
  listPipelines,
  trainModel,
  startTraining,
  waitForModel,
  getModel,
  listModels,
  loadModel,
  OnnxPredictor,
  PredictorError,
};
