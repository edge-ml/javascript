# ONNX fixtures

Small models exported by the edge-ml backend's ONNX exporter
(`ml/app/ml/PipelineExport/Onnx/OnnxCompiler.py`), trained on the synthetic
windows of `ml/tests/test_torch_executorch.py` (window size 20, sensors x/y/z):

- `random_forest/`: SimpleFeatureExtractor, MinMaxNormalizer, Random Forest (8 trees, depth 4). Outputs probabilities.
- `torch_dense/`: SimpleFeatureExtractor, ZNormalizer, PyTorch dense network. Outputs logits.

`reference.json` holds 6 unseen windows (`windows`, with their `timestamps`),
the class the Python pipeline predicts for each (`python_predictions`) and the
scores onnxruntime (Python) produces for the exported graph (`onnx_scores`).
The JS tests check that `OnnxPredictor` reproduces both.

To regenerate them, run the backend's ONNX exporter on the same pipelines and
write `model.onnx`, `manifest.json` and `reference.json` per model.

The manifests above predate units, so they also cover old models. For the unit
tests, `input_units.json` is the `input.units` block the backend
(`ml/app/units/deploy.py`) writes for a model trained on x in m/s^2
(acceleration), y in degC (temperature) and z in a custom unit, and
`unit_catalog.json` is the backend's `GET /ml/units/` response.

## Models that take sound (manifest schema 2)

`audio_mixed/` (sensors acc_x/acc_y at 50 Hz + sound at 8 kHz) and
`audio_only/` (sound only) come from the backend's audio pipeline (#100):
time-based windows of 500 ms, log-mel spectrogram, per-channel Z
normalization and the audio & sensor CNN, trained on the synthetic recordings
of `ml/tests/test_audio_export.py` (class 0 "still": a tone, device still;
class 1 "shaking": noise, device moving). 8 kHz keeps the fixtures small.

`reference.json` holds 4 windows: `sensors` (rows of the sensor grid),
`audio` (base64 little-endian float32 at 8 kHz), the scores of the Python
pipeline and of onnxruntime for the export, and per window a `streams` entry:
the same sound at 48 kHz from 200 ms before the window (`lead_ms`), to test
streaming microphone input through the resampler.

Regenerate with `make_audio_fixtures.py OUT_DIR`, run from the ml/ directory
of the backend in its Docker image. It also writes `model.pte` (ExecuTorch)
for the Flutter library's fixtures.
