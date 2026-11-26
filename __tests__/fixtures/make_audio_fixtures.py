"""Schema-2 ONNX fixtures for the JS and Dart libraries (#100).

Run in the ml image from the ml/ directory:
    python make_audio_fixtures.py OUT_DIR
Writes OUT_DIR/{audio_mixed,audio_only}/{model.onnx,manifest.json,reference.json}
(and model.pte with manifest_executorch.json for the Flutter library)."""
import base64, json, os, sys
sys.path.insert(0, "tests"); sys.path.insert(0, "tests/fixtures")
import test_audio_export as t  # sets the test environment
import numpy as np, torch, onnxruntime as ort
from scipy.signal import resample_poly
from app.DataProcessor.DataLoader import media
from app.ml.Pipeline import Pipeline
from app.ml.Pipelines.AudioClassificationPipeline import AUDIO_CATEGORIES
from app.ml.Pipelines.Abstract.StepType import StepType
from app.ml.Pipelines.PipelineContainer import PipelineContainer
from app.ml.Pipelines.Categories.Windowing.SyncedTimeWindower import SyncedTimeWindower
from app.ml.Pipelines.Categories.FeatureExtraction.LogMelSensorExtractor import LogMelSensorExtractor
from app.ml.Pipelines.Categories.Normalizer.ChannelZNormalizer import ChannelZNormalizer
from app.ml.Pipelines.Categories.Classifier.TorchMultimodalCNN import TorchMultimodalCNN
from app.ml.Pipelines.Categories.Evaluation.TestTrainSplitEvaluation import TestTrainSplitEvaluation
from app.ml.PipelineExport import torch_export
from app.DataModels.model import AudioInput
from types import SimpleNamespace

OUT = sys.argv[1]
RATE = 8000
b64 = lambda a: base64.b64encode(np.asarray(a, dtype="<f4").tobytes()).decode()

for name, sensors in (("audio_mixed", True), ("audio_only", False)):
    torch.manual_seed(0)
    srcs, pcm = [], {}
    for seed in (0, 1):
        src, mid, p = t.synthetic(seed, sensors, True)
        # the synthetic sound is 16 kHz; this fixture's model takes 8 kHz
        pcm[mid] = resample_poly(p.astype(np.float64), 1, 2).astype(np.int16)
        srcs.append(src)
    media.load_audio = lambda media_id, rate: pcm[str(media_id)]
    options = [
        SyncedTimeWindower(t.params(SyncedTimeWindower, window_ms=500, stride_ms=500, audio_rate_hz="8000")),
        LogMelSensorExtractor(LogMelSensorExtractor.get_parameters()),
        ChannelZNormalizer([]),
        TorchMultimodalCNN(t.params(TorchMultimodalCNN, size="small", epochs=6)),
        TestTrainSplitEvaluation(t.params(TestTrainSplitEvaluation, Train_test_split=75)),
    ]
    pipeline = Pipeline(options, AUDIO_CATEGORIES)
    w = options[0]
    metrics = pipeline.eval(PipelineContainer(srcs, None, [s.meta for s in srcs]), ["still", "shaking"])
    rows = pipeline.exec(PipelineContainer(srcs, None, None), StepType.PRE).data
    # windows of both classes from the first dataset: 0-0.5 s still, 2-2.5 s shaking, ...
    picks = [0, 4, 9, 13]
    rows = rows[picks]
    python = t.AudioPipelineCase.python_scores(pipeline, rows)
    model = SimpleNamespace(name=name, id="2" * 24, timeSeries=w.channels, samplingRate=w.sensor_rate,
                            labels=[SimpleNamespace(name="still"), SimpleNamespace(name="shaking")],
                            inputUnits=None, audioInputs=[AudioInput(name="mic", sampleRate=RATE)])
    files = {f.name: f.content for f in torch_export.onnx_files(options, model)}
    os.makedirs(os.path.join(OUT, name), exist_ok=True)
    open(os.path.join(OUT, name, "model.onnx"), "wb").write(files["model.onnx"])
    open(os.path.join(OUT, name, "manifest.json"), "w").write(files["manifest.json"])
    manifest = json.loads(files["manifest.json"])
    open(os.path.join(OUT, name, "model.pte"), "wb").write(torch_export.build_pte(options))
    # the Flutter library runs the .pte with the ExecuTorch manifest
    open(os.path.join(OUT, name, "manifest_executorch.json"), "w").write(
        json.dumps(torch_export.executorch_manifest(options, model), indent=2))
    sess = ort.InferenceSession(files["model.onnx"])
    audio = w.audio_for(rows)
    feeds = {"audio": audio}
    windows = []
    if sensors:
        feeds["raw_window"] = w.sensors_for(rows)
    onnx_scores = sess.run(None, feeds)[0]
    # the stream around each window at 48 kHz (from 200 ms before it), for the resampler
    streams = []
    full = pcm[str(srcs[0].audio.id)].astype(np.float64) / 32768
    for k, row in enumerate(rows):
        first = int(row[2])
        lead = int(0.2 * RATE)
        seg = full[first - lead if first >= lead else 0: first + w.audio_samples]
        streams.append({"lead_ms": (first - max(0, first - lead)) * 1000 / RATE,
                        "audio_48k": b64(resample_poly(seg, 6, 1))})
    ref = {
        "accuracy": metrics["metrics"]["accuracy_score"],
        "window_ms": 500, "sensor_samples": w.sensor_samples, "audio_samples": w.audio_samples,
        "sensors": [w.sensors_for(rows)[k].tolist() for k in range(len(rows))] if sensors else None,
        "audio": [b64(a) for a in audio],
        "streams": streams,
        "onnx_scores": onnx_scores.tolist(),
        "python_scores": python.tolist(),
        "python_predictions": [int(x) for x in python.argmax(1)],
    }
    json.dump(ref, open(os.path.join(OUT, name, "reference.json"), "w"))
    w.release()
    print(name, "accuracy", ref["accuracy"], "predictions", ref["python_predictions"],
          "max |onnx - python|", float(np.abs(onnx_scores - python).max()), manifest["inputs"])
