## Examples

### example-train-and-predict-web

Records the phone's motion sensor into an edge-ml project, trains a model on the server with `trainModel` and runs it in the page with `loadModel` (ONNX Runtime Web). Needs a Device API write key.

### example-audio-web

Classifies the microphone live with a model trained on sound (`audio_cnn` or `mixed_cnn`): an AudioWorklet passes the samples to `predictor.addAudio`, which resamples them to the model's rate. Loads the model from the server (Device API read key) or from a downloaded ONNX export. Models that also take sensors use the phone's motion sensor.

