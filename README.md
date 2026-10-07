# edge-ml

JavaScript library for [edge-ml](https://github.com/edge-ml). Works in the browser and in Node.js (>= 18):

- **Collect data**: upload sensor data to an edge-ml project, incrementally or as a whole dataset.
- **Train models**: train a model on the edge-ml server from your code.
- **Run models**: run trained models locally with [ONNX Runtime](https://onnxruntime.ai/docs/tutorials/web/), in the browser (`onnxruntime-web`) or in Node.js (`onnxruntime-node`).

Everything is authenticated with the project's **Device API key** (project settings → Device API). Uploading data and training need the write key; listing and downloading models also work with the read key.

## Installation

```bash
npm i edge-ml
# only needed to run models:
npm i onnxruntime-web    # browser
npm i onnxruntime-node   # Node.js
```

```js
import edgeML, { datasetCollector, trainModel, loadModel } from "edge-ml"; // ES modules
const edgeML = require("edge-ml");                                         // CommonJS
```

From a CDN, the library is available as the global `edgeML`:

```html
<!-- only needed to run models -->
<script src="https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js"></script>
<script src="https://unpkg.com/edge-ml"></script>
```

## Quick start: collect, train, predict

```js
const URL = "https://app.edge-ml.org";
const WRITE_KEY = "<device api write key>";

// 1. collect labeled data
const collector = await edgeML.datasetCollector(URL, WRITE_KEY, "walk-1", true, ["accX", "accY", "accZ"], {}, "activity_walk");
collector.addDataPoint("accX", 0.12); // ... for every reading
await collector.onComplete();

// 2. train a model on the server and wait for it
const model = await edgeML.trainModel(URL, WRITE_KEY, {
  name: "activity-model",
  labeling: "activity",
}, { onProgress: (m) => console.log(m.stage, m.progress) });

// 3. run it in the browser
const predictor = await edgeML.loadModel(URL, WRITE_KEY, model.id);
setInterval(async () => {
  predictor.addSample({ accX, accY, accZ }); // your latest readings
  try {
    const { prediction, probabilities } = await predictor.predict();
    console.log(prediction);
  } catch (e) {
    if (!(e instanceof edgeML.PredictorError)) throw e; // PredictorError: window not full yet
  }
}, 20);
```

## Collect data

### Upload in increments

```js
const collector = await edgeML.datasetCollector(
  "backendUrl",       // edge-ml URL, e.g. https://app.edge-ml.org
  "deviceApiKey",     // Device API write key
  "datasetName",      // name of the new dataset
  false,              // false: you provide timestamps; true: the library uses the current time
  ["accX", "accY", "accZ"], // time-series of the dataset
  { key: "value" },   // optional metadata ({} to omit)
  "labeling_label"    // optional label for the whole dataset: {labeling}_{label}
);

collector.addDataPoint(1618760114000, "accX", 1.23); // own timestamps: (unix ms, sensor, value)
// with useDeviceTime = true:  collector.addDataPoint("accX", 1.23)

// Data is uploaded every 5 seconds. Upload the rest when you are done:
await collector.onComplete();
```

`addDataPoint` throws if a background upload failed. Values are rounded to two decimals.

### Upload a whole dataset

```js
const datasetId = await edgeML.sendDataset("backendUrl", "deviceApiKey", {
  name: "datasetName",
  timeSeries: [
    { name: "accX", data: [[1618760114000, 1.23], [1618760114020, 1.25]] }, // [unix ms, value]
  ],
  metaData: { key: "value" },  // optional
  labeling: "labeling_label",   // optional
});
```

## Train models

```js
const model = await edgeML.trainModel("backendUrl", "deviceApiKey", {
  name: "my-model",
  labeling: "activity",                     // labeling name or id
  datasets: ["walk-1", "run-1"],            // optional, default: every dataset with this labeling
  timeSeries: ["accX", "accY", "accZ"],     // optional, default: series all datasets share
  disabledLabels: ["idle"],                 // optional
  useZeroClass: false,                      // optional
  pipeline: {                               // optional, per step: option name and parameters
    windowing: { name: "Sample based", parameters: { window_size: 50, sliding_step: 25 } },
    featureExtraction: { name: "SimpleFeatureExtractor" },
    normalizer: { name: "MinMaxNormalizer" },
    classifier: { name: "Random Forest Classifier", parameters: { n_estimators: 50 } },
    evaluation: { name: "TestTrainSplit" },
  },
}, {
  interval: 2000,                           // polling interval (ms)
  timeout: 30 * 60 * 1000,
  onProgress: (m) => console.log(m.trainStatus, m.stage, m.progress),
});

console.log(model.metrics, model.formats); // formats includes "ONNX" if it can run in the browser
```

Leaving out `pipeline` uses the defaults above. `listPipelines(url, key)` returns every step, option and parameter. The server checks the request before training starts, so problems like unknown labels or a window larger than the data are reported straight away.

To run in the browser, a model has to be exportable to ONNX. It needs **sample-based windowing**, the **SimpleFeatureExtractor** or **Raw Time-Series** features, a **MinMax** or **Z** normalizer, and a **Decision Tree**, **Random Forest** or **PyTorch** classifier.

Other functions:

| Function | |
| --- | --- |
| `startTraining(url, key, options)` | Starts training and returns `{ id, warnings }` right away. |
| `waitForModel(url, key, id, waitOptions)` | Polls until training is done. |
| `getModel(url, key, id)` / `listModels(url, key)` | Status, labels, metrics and formats of models. |
| `listPipelines(url, key)` | Available pipeline steps, options and parameters. |

## Run models

Models are exported to ONNX with feature extraction and normalization included in the graph. You only feed raw sensor values: the predictor buffers them, aligns the sensors the same way training does, and classifies the latest window.

```js
// from the edge-ml server
const predictor = await edgeML.loadModel("backendUrl", "deviceApiKey", modelId);

// or from a downloaded export (Deploy → ONNX): model.onnx + manifest.json
const predictor = await edgeML.OnnxPredictor.fromUrls("model.onnx", "manifest.json"); // browser
const predictor = await edgeML.OnnxPredictor.fromFiles("model.onnx", "manifest.json"); // Node.js

predictor.sensors;    // ["accX", "accY", "accZ"]: input order
predictor.labels;     // label of every output
predictor.windowSize; // samples per window

predictor.addDatapoint("accX", 0.12);           // one sensor (optional 3rd argument: unix ms)
predictor.addSample({ accX: 0.12, accY: 9.81, accZ: 0.3 }); // all sensors at once
predictor.addSample([0.12, 9.81, 0.3], timestamp);          // ...in `sensors` order

const result = await predictor.predict();       // throws PredictorError until a window is full
// { prediction: "walk", index: 0, probabilities: [0.9, 0.1], labels: ["walk", "run"], scores: [...] }

await predictor.predictWindow(rows);            // classify your own window: windowSize rows of sensor values
predictor.reset();                              // clear the buffer
```

### Choosing the ONNX runtime

- **Node.js**: `onnxruntime-node` is loaded automatically, with `onnxruntime-web` as a fallback.
- **Browser, script tag**: the global `ort` from `ort.min.js` is used.
- **Browser, bundler** (Vite, webpack, ...): pass the runtime in:

```js
import * as ort from "onnxruntime-web";
import { OnnxPredictor } from "edge-ml";
OnnxPredictor.setRuntime(ort); // or per model: loadModel(url, key, id, { ort })
```

`sessionOptions` (e.g. `{ executionProviders: ["webgpu", "wasm"] }`) can be passed the same way and are forwarded to `ort.InferenceSession.create`.


## Changes from 4.x

- Node.js >= 18 is required (the library uses the built-in `fetch`; axios is no longer a dependency).
- The legacy `Predictor` (models exported as JavaScript code) is removed; use `OnnxPredictor`.
- `sendDataset` takes `{ name, timeSeries: [{ name, data }], metaData?, labeling? }` and resolves to the dataset id.
- The ES module build is now `dist/index.mjs`, with named exports.

## Development

```bash
npm install
npm run build          # dist/ (UMD + ESM for browsers, CJS + ESM for Node.js)
npm test               # Jest, against the built bundles
npm run test:browser   # the browser bundle with onnxruntime-web
BACKEND_URL=http://localhost:8000 npm run test:integration  # against a running backend
```

The ONNX models in `__tests__/fixtures` are exported by the edge-ml backend. The tests check that the library reproduces the predictions of the Python pipeline.
