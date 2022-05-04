# EdgeML-Node

Node library for <https://github.com/edge-ml>. Can be used to upload datasets as whole or incrementally.

[![Node.js Package](https://github.com/edge-ml/node/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/edge-ml/node/actions/workflows/npm-publish.yml)

## Installation

### Install from npm (Node.js)

```bash
npm i edge-ml
```

The functions need to be included with the following code:

```js
const sendDataset = require("edge-ml").sendDataset;
const datasetCollector = require("edge-ml").datasetCollector;
```

### Use from CDN

```html
<script src="https://unpkg.com/edge-ml/dist/bundle.js"></script>
<script>
  sendDataset = edgeML.sendDataset
  datasetCollector = edgeML.datasetCollector
</script>
```

The functions `sendDataset` and `datasetCollector` are then accessible as global functions.

## How to use

### Upload datasets as a whole

```js
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
// Generate collector function
try {
  var collector = await datasetCollector(
    (url = "explorerBackendUrl"),
    (key = "deviceApiKey"),
    (name = "datasetName"),
    (useDeviceTime = false), // Provide own timestamps

    // These two parameters can be omitted
    (metaData = { key: "value" }), // Only object allowed
    (datasetLabel = "labeling_label")
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
// Generate collector function
try {
  var collector = await datasetCollector(
    (url = "explorerBackendUrl"),
    (key = "deviceApiKey"),
    (name = "datasetName"),
    (useDeviceTime = true), // Library sets time

    // These two parameters can be omitted
    (metaData = { key: "value" }), // Only object allowed
    (datasetLabel = "labeling_label")
  );
} catch (e) {
  console.log(e);
}

try {
  // No longer necessary to provide the time here
  collector.addDataPoint(
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
