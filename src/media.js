// Audio and video recordings in datasets, and listing datasets.
//
// A recording is stored as uploaded and placed on the dataset's timeline by
// its `start` (unix ms), next to the time-series. The server accepts what
// browsers can play: MP4 (H.264/AAC) and WebM video; MP3, WAV, OGG, FLAC and
// M4A audio.
import { http } from "./http";
import { readFile } from "./onnx/platform.node";

const URLS = {
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
  return http.postForm(url, URLS.media + key + "/" + datasetId, form);
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
  return http.get(url, URLS.media + key + "/" + datasetId + "/" + mediaId, { responseType: "arraybuffer" });
}

/**
 * Lists the datasets of the project, with their time-series and recordings
 * (no sample values).
 * @param {string} url - The url of the backend server
 * @param {string} key - The Device-Api-Key (read or write access)
 * @returns {Promise<import("../index").DatasetInfo[]>}
 */
async function listDatasets(url, key) {
  const project = await http.get(url, URLS.project + key);
  return ((project && project.datasets) || []).map((dataset) => ({
    ...dataset,
    // datasets from before recordings existed have no such list
    mediaSeries: dataset.mediaSeries || [],
  }));
}

export { uploadMedia, downloadMedia, listDatasets };
