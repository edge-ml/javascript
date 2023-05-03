# EdgeML-Node

Node library for <https://github.com/edge-ml>. Can be used to upload datasets as whole or incrementally or to do interference on models

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
const Predictor = require("edge-ml").Predictor;
```

### Use from CDN

```html
<script src="https://unpkg.com/edge-ml/dist/bundle.js"></script>
<script>
  sendDataset = edgeML.sendDataset
  datasetCollector = edgeML.datasetCollector
  Predictor = edgeML.Predictor
</script>
```

The functions `sendDataset`, `datasetCollector` and `Predictor` are then accessible as global functions.

<!-- ## How to use

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
``` -->

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

<!-- ### Prediction

`model_javascript.js` file and the following code can be found after training your models on edge-ml.

There are examples under `examples/` directory showing how to use the library in node.js (with a pre-existing csv file as input) and browser (with Web Sensors API).

```js
const { Predictor } = require('edge-ml')
const { score } = require('./model_javascript')

const p = new Predictor(
    (input) => score(input),
    ['AccelerometerX', 'AccelerometerY', 'AccelerometerZ'],
    50,
    ['Still', 'Shake'],
    {'scale': [79.25000000000001, 1.0, 1.5849999999999997, 1.0, 12.137992715350133, 233.5518440000001, 12.062295477964101, 23.600000000000005, 22.750000000000004, 34.60000000000001, 28.200000000000006, 1.0, 0.5640000000000001, 1.0, 4.851983387175274, 38.78205, 4.859832967726578, 11.0, 12.100000000000001, 12.200000000000003, 70.30000000000001, 0.025000000000000355, 1.4059999999999988, 1.0, 3.715476614703034, 23.929080000000006, 2.565530194566513, 13.850000000000001, 13.850000000000001, 10.100000000000001], 'center': [116.30000000000001, 0.0, 2.326, 50.0, 15.40061349427353, 237.17889599999998, 15.550241155686301, 32.9, 34.5, -34.5, 5.299999999999983, 0.0, 0.10599999999999966, 50.0, 4.708919621314427, 22.173924000000007, 4.756910762248962, 14.200000000000001, 14.200000000000001, -9.700000000000001, 548.0, 9.8, 10.96, 50.0, 3.5930132201259712, 12.909744, 11.87272504524551, 21.3, 21.3, 3.8000000000000003], 'name': 'RobustScaler'},
    {
      windowingMode: "sample"
    }
)

setInterval(() => {
    p.addDatapoint('AccelerometerX', getAccelerometerX())
    p.addDatapoint('AccelerometerY', getAccelerometerY())
    p.addDatapoint('AccelerometerZ', getAccelerometerZ())

    p.predict()
        .then(x => x)
        .catch(e => console.log(e.message))
}, 250)
``` -->