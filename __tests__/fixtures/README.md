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
