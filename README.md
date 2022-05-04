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
  "backendUrl" // Backend-URL
  "deviceApiKey", // API-Key
  dataset // The dataset object
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
    "backendUrl", // Backend-URL
    "deviceApiKey", // API-Key
    "datasetName", // Name for the dataset
    false, // False to provide own timestamps

    // These two parameters can be omitted
    { key: "value" }, // Metadata: {} to omit
    "labeling_label" // Labeling and label for the whole dataset. Format: {labeling}_{label}
  );
} catch (e) {
  // Error occurred, cannot use the collector as a function to upload.
  console.log(e);
}

try {
  // Function expects 3 arguments
  collector.addDataPoint(
    1618760114000, // Timestamp to set in unix milliseconds
    "sensorName", // Name of the sensor
    1.23 // Value
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
    "backendUrl", // Backend-URL
    "deviceApiKey", // API-Key
    "datasetName", // Name for the dataset
    true, // True, the library provides timestamps

    // These two parameters can be omitted
    { key: "value" }, // Metadata: {} to omit
    "labeling_label" // Labeling and label for the whole dataset. Format: {labeling}_{label}
  );
} catch (e) {
  console.log(e);
}

try {
  // Function expects 2 arguments (timestamp omitted)
  collector.addDataPoint(
    "sensorName", // Name of the sensor
    1.23, // Value 
    );

  // Tells the libarary that all data has been recorded.
  // Uploads all remaining datapoints to the server
  await collector.onComplete();
} catch (e) {
  console.log(e);
}
```
