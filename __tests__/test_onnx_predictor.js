const path = require("path");
const { OnnxPredictor, PredictorError } = require("../dist/index");

// Models exported by the edge-ml backend (ml/app/ml/PipelineExport/Onnx) with
// reference outputs computed in Python — see __tests__/fixtures/README.md.
const FIXTURES = path.join(__dirname, "fixtures");
const MODELS = ["random_forest", "torch_dense"];

const load = (name) =>
    OnnxPredictor.fromFiles(path.join(FIXTURES, name, "model.onnx"), path.join(FIXTURES, name, "manifest.json"));
const reference = (name) => require(path.join(FIXTURES, name, "reference.json"));

describe.each(MODELS)("OnnxPredictor (%s)", (name) => {
    let predictor;
    let ref;
    beforeAll(async () => {
        predictor = await load(name);
        ref = reference(name);
    });
    beforeEach(() => predictor.reset());

    it("reads sensors, labels and window size from the manifest", () => {
        expect(predictor.sensors).toEqual(["x", "y", "z"]);
        expect(predictor.labels).toEqual(["class_0", "class_1"]);
        expect(predictor.windowSize).toBe(20);
    });

    it("matches the scores of the Python export and the Python pipeline", async () => {
        for (let i = 0; i < ref.windows.length; i++) {
            const res = await predictor.predictWindow(ref.windows[i]);
            res.scores.forEach((s, j) => expect(s).toBeCloseTo(ref.onnx_scores[i][j], 4));
            expect(res.index).toBe(ref.python_predictions[i]);
            expect(res.prediction).toBe(predictor.labels[res.index]);
            expect(res.probabilities.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
        }
    });

    it("buffers datapoints into the same window", async () => {
        const window = ref.windows[1];
        ref.timestamps[1].forEach((t, row) => predictor.addSample(window[row], t));
        const buffered = await predictor.predict();
        const direct = await predictor.predictWindow(window);
        expect(buffered.scores).toEqual(direct.scores);
    });

    it("uses the latest window when more data is buffered", async () => {
        ref.timestamps[0].forEach((t, row) => predictor.addSample(ref.windows[0][row], t));
        ref.timestamps[1].forEach((t, row) => predictor.addSample(ref.windows[1][row], t));
        expect((await predictor.predict()).scores).toEqual((await predictor.predictWindow(ref.windows[1])).scores);
    });
});

describe("OnnxPredictor input handling", () => {
    let predictor;
    beforeAll(async () => {
        predictor = await load("random_forest");
    });
    beforeEach(() => predictor.reset());

    it("throws PredictorError until a full window is buffered", async () => {
        await expect(predictor.predict()).rejects.toBeInstanceOf(PredictorError);
        for (let i = 0; i < 19; i++) predictor.addSample({ x: 1, y: 2, z: 3 }, 1000 + i);
        await expect(predictor.predict()).rejects.toThrow("Not enough samples (19/20)");
        predictor.addSample([1, 2, 3], 2000);
        await expect(predictor.predict()).resolves.toHaveProperty("prediction");
    });

    it("rejects unknown sensors, non-numbers and wrong window shapes", async () => {
        expect(() => predictor.addDatapoint("w", 1)).toThrow("Unknown sensor 'w'");
        expect(() => predictor.addDatapoint("x", "1")).toThrow(TypeError);
        expect(() => predictor.addSample([1, 2])).toThrow("Expected 3 values");
        await expect(predictor.predictWindow([[1, 2, 3]])).rejects.toThrow("Window must have shape [20][3]");
    });

    it("accepts an injected runtime", async () => {
        const ort = require("onnxruntime-node");
        const fs = require("fs");
        const p = await OnnxPredictor.load(
            fs.readFileSync(path.join(FIXTURES, "random_forest", "model.onnx")),
            require(path.join(FIXTURES, "random_forest", "manifest.json")),
            { ort }
        );
        expect(p.ort).toBe(ort);
    });

    it("rejects manifests that are not edge-ml ONNX exports", () => {
        expect(() => new OnnxPredictor({}, { format: "pte" })).toThrow("Not an edge-ml ONNX manifest");
    });
});
