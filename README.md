# Node

Node library for https://github.com/edge-ml. Can be used to upload datasets as whole or incrementally.

[![Node.js Package](https://github.com/edge-ml/node/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/edge-ml/node/actions/workflows/npm-publish.yml)

## How to use

### Installation

The library can be installed from npm

```bash
npm i explorer-node
```

### Upload datasets as a whole

```js
const sendDataset = require("explorer-node").sendDataset;

sendDataset(
  (url = "explorerBackendUrl"),
  (key = "deviceApiKey"),
  (dataset = dataset)
)
  .then((msg) =>
    // Handle success
    console.log(msg)
  )
  .catch((err) =>
    // Handle error
    console.log(err)
  );
```

### Upload datasets in increments

#### Upload datasets in increments with custom timestamps

```js
const datasetCollector = require("explorer-node").datasetCollector;

// Generate collector function
const collector = await datasetCollector(
  (url = "explorerBackendUrl"),
  (key = "deviceApiKey"),
  (name = "datasetName"),
  (useDeviceTime = false) // true if you want to use the time of the device, false if you want to provide your own timestamps
);
if (collector.error) {
  // Error occurred, cannot use the collector as a function to upload datasetincrements
  console.log(collector.error);
  return;
}

try {
  // time should be a unix timestamp
  collector.addDataPoint(
    (time = 1618760114000),
    (sensorName = "sensorName"),
    (value = 1.23)
  );

  // Tells the libarary that all data has been recorded.
  // Uploads all remaining datapoints to the server
  collector.onComplete();
} catch (e) {
  console.log(e);
}
```

#### Upload datasets in increments with timestamps from the device

```js
const datasetCollector = require("explorer-node").datasetCollector;

// Generate collector function
const collector = await datasetCollector(
  (url = "explorerBackendUrl"),
  (key = "deviceApiKey"),
  (name = "datasetName"),
  (useDeviceTime = true) // The datapoint at which addDataPoint is called will be used.
);
if (collector.error) {
  // Error occurred, cannot use the collector as a function to upload datasetincrements
  console.log(collector.error);
  return;
}

try {
  // No longer necessary to provide the time here
  collector.addDataPoint((sensorName = "sensorName"), (value = 1.23));

  // Tells the libarary that all data has been recorded.
  // Uploads all remaining datapoints to the server
  collector.onComplete();
} catch (e) {
  console.log(e);
}
```
