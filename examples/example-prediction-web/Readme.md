### example-prediction-web

This example uses Web Sensors API and a model that is trained with data collected on a mobile device to classify `Still` and `Shake` labels. Dataset was assembled via edge-ml "Record with Mobile Device" function. Training dataset and the resulting model are included in the directory.

#### Usage:

Web Sensors api only works with https or on localhost. Because of this, you need a static file server such as [serve](https://github.com/vercel/serve) to be able use the example.

```
❯ npm i -g serve
❯ serve --symlinks -p 50000
```

You can find the example on port 50000.
Most desktops don't have the Accelerometer sensor used in the example. You may need to access the example with a mobile browser to make use of it. 