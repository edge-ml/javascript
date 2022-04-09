# EdgeML-Node

Node library for <https://github.com/edge-ml>. Can be used to upload datasets as whole or incrementally.

[![Node.js Package](https://github.com/edge-ml/node/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/edge-ml/node/actions/workflows/npm-publish.yml)

## Installation

### Install from npm

```bash
npm i edge-ml
```

### Install from cdn

```html
<script src="https://unpkg.com/edge-ml"></script>
```

## How to use

### Upload datasets as a whole

```js
const sendDataset = require("edge-ml").sendDataset;

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

#### Use custom timestamps

```js
const datasetCollector = require("edge-ml").datasetCollector;

// Generate collector function
try {
  const collector = await datasetCollector(
    (url = "explorerBackendUrl"),
    (key = "deviceApiKey"),
    (name = "datasetName"),
    (useDeviceTime = false) // true if you want to use the time of the device, false if you want to provide your own timestamps
  );
} catch (e) {
  // Error occurred, cannot use the collector as a function to upload.
  console.log(e);
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
  await collector.onComplete();
} catch (e) {
  console.log(e);
}
```

#### Use timestamps from the device

```js
const datasetCollector = require("edge-ml").datasetCollector;

// Generate collector function
try {
  const collector = await datasetCollector(
    (url = "explorerBackendUrl"),
    (key = "deviceApiKey"),
    (name = "datasetName"),
    (useDeviceTime = true) // The data point at which addDataPoint is called will be used.
  );
} catch (e) {
  console.log(e);
}

try {
  // No longer necessary to provide the time here
  collector.addDataPoint((sensorName = "sensorName"), (value = 1.23));

  // Tells the libarary that all data has been recorded.
  // Uploads all remaining datapoints to the server
  await collector.onComplete();
} catch (e) {
  console.log(e);
}
```
