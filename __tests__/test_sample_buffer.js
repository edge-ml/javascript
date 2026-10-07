// SampleBuffer is internal; exercise it through OnnxPredictor with a stub session.
const { OnnxPredictor, PredictorError } = require("../dist/index");

const manifest = (sensors, size) => ({
    format: "onnx",
    window: { size, stride: size, unit: "samples" },
    input: { name: "raw_window", timeseries: sensors },
    output: { name: "scores", type: "probabilities", labels: ["a", "b"] },
});

// captures the window the model receives
function stubPredictor(sensors, size) {
    const seen = [];
    const ort = {
        Tensor: class {
            constructor(type, data, dims) {
                Object.assign(this, { type, data, dims });
            }
        },
    };
    const session = {
        run: async (feeds) => {
            const t = feeds.raw_window;
            const rows = [];
            for (let i = 0; i < t.dims[1]; i++) rows.push(Array.from(t.data.slice(i * t.dims[2], (i + 1) * t.dims[2])));
            seen.push(rows);
            return { scores: { data: Float32Array.from([0.25, 0.75]) } };
        },
    };
    return { predictor: new OnnxPredictor(session, manifest(sensors, size), ort), seen };
}

describe("Windowing", () => {
    it("aligns sensors with different timestamps like training (outer join + linear interpolation)", async () => {
        const { predictor, seen } = stubPredictor(["a", "b"], 4);
        predictor.addDatapoint("a", 0, 0);
        predictor.addDatapoint("b", 10, 1);
        predictor.addDatapoint("a", 2, 2);
        predictor.addDatapoint("b", 30, 3);
        await predictor.predict();
        // rows t=0..3: a = 0, (1), 2, (2) ; b = (10), 10, (20), 30
        expect(seen[0]).toEqual([[0, 10], [1, 10], [2, 20], [2, 30]]);
    });

    it("treats a reading of 0 as a value", async () => {
        const { predictor, seen } = stubPredictor(["a"], 3);
        [5, 0, 5].forEach((v, t) => predictor.addDatapoint("a", v, t));
        await predictor.predict();
        expect(seen[0]).toEqual([[5], [0], [5]]);
    });

    it("needs data for every sensor", async () => {
        const { predictor } = stubPredictor(["a", "b"], 2);
        predictor.addDatapoint("a", 1, 0);
        predictor.addDatapoint("a", 1, 1);
        await expect(predictor.predict()).rejects.toThrow("No data for sensor 'b'");
        await expect(predictor.predict()).rejects.toBeInstanceOf(PredictorError);
    });

    it("keeps memory bounded and still predicts on the newest samples", async () => {
        const { predictor, seen } = stubPredictor(["a"], 5);
        for (let t = 0; t < 10000; t++) predictor.addDatapoint("a", t, t);
        expect(predictor.buffer.store.a.length).toBeLessThanOrEqual(40);
        await predictor.predict();
        expect(seen[0]).toEqual([[9995], [9996], [9997], [9998], [9999]]);
    });

    it("returns probabilities as-is and softmaxes logits", async () => {
        const { predictor } = stubPredictor(["a"], 1);
        predictor.addDatapoint("a", 1, 0);
        let res = await predictor.predict();
        expect(res).toMatchObject({ prediction: "b", index: 1, labels: ["a", "b"] });
        expect(res.probabilities).toEqual([0.25, 0.75]);

        predictor.manifest.output.type = "logits";
        res = await predictor.predict();
        const e = Math.exp(0.5);
        expect(res.probabilities[1]).toBeCloseTo(e / (1 + e), 6);
    });
});
