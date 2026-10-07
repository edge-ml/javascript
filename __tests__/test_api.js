const fs = require("fs");
const path = require("path");
const edgeML = require("../dist/index");

const URL = "https://edge-ml.example/";
const FIXTURE = path.join(__dirname, "fixtures", "random_forest");

// Replaces global fetch with a router; records every call.
function mockFetch(routes) {
    const calls = [];
    global.fetch = jest.fn(async (url, init = {}) => {
        const body = init.body ? JSON.parse(init.body) : undefined;
        calls.push({ url, method: init.method, body });
        const key = `${init.method} ${url.replace("https://edge-ml.example", "")}`;
        const handler = routes[key];
        if (!handler) return new Response(JSON.stringify({ detail: "no route " + key }), { status: 404 });
        const res = await handler(body, calls);
        if (res instanceof Response) return res;
        return new Response(JSON.stringify(res), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    return calls;
}

afterEach(() => {
    delete global.fetch;
});

describe("Training", () => {
    it("trainModel starts training and polls until done", async () => {
        const states = [
            { trainStatus: "training", stage: "Loading data", progress: null },
            { trainStatus: "training", stage: "Training", progress: 50 },
            { trainStatus: "done", stage: null, progress: 100, formats: ["C", "ONNX"] },
        ];
        const calls = mockFetch({
            "POST /ml/device/WRITE/train": () => ({ id: "m1", warnings: [] }),
            "GET /ml/device/WRITE/models/m1": () => ({ id: "m1", ...states.shift() }),
        });
        const progress = [];
        const model = await edgeML.trainModel(
            URL,
            "WRITE",
            { name: "walk-run", labeling: "activities", pipeline: { classifier: { name: "Decision Tree Classifier" } } },
            { interval: 1, onProgress: (m) => progress.push(m.stage) }
        );
        expect(model.formats).toContain("ONNX");
        expect(progress).toEqual(["Loading data", "Training", null]);
        expect(calls[0].body).toEqual({
            name: "walk-run",
            labeling: "activities",
            pipeline: { classifier: { name: "Decision Tree Classifier" } },
        });
    });

    it("surfaces server validation errors and failed training", async () => {
        mockFetch({
            "POST /ml/device/WRITE/train": () =>
                new Response(JSON.stringify({ detail: "Labeling 'x' does not exist in this project." }), { status: 400 }),
        });
        await expect(edgeML.startTraining(URL, "WRITE", { name: "m", labeling: "x" })).rejects.toThrow(
            "400: Labeling 'x' does not exist in this project."
        );

        mockFetch({ "GET /ml/device/K/models/m1": () => ({ trainStatus: "error", error: "boom" }) });
        await expect(edgeML.waitForModel(URL, "K", "m1", { interval: 1 })).rejects.toThrow("Training failed: boom");

        await expect(edgeML.startTraining(URL, "K", { name: "m" })).rejects.toThrow("needs at least a `name` and a `labeling`");
    });

    it("waitForModel times out", async () => {
        mockFetch({ "GET /ml/device/K/models/m1": () => ({ trainStatus: "training" }) });
        await expect(edgeML.waitForModel(URL, "K", "m1", { interval: 1, timeout: 5 })).rejects.toThrow("did not finish");
    });

    it("lists pipelines and models", async () => {
        mockFetch({
            "GET /ml/device/K/pipelines": () => [{ name: "Manual Classification Pipeline", steps: [] }],
            "GET /ml/device/K/models": () => [{ id: "m1" }],
        });
        expect((await edgeML.listPipelines(URL, "K"))[0].name).toBe("Manual Classification Pipeline");
        expect(await edgeML.listModels(URL, "K")).toEqual([{ id: "m1" }]);
    });

    it("loadModel downloads the ONNX export and predicts", async () => {
        const model = fs.readFileSync(path.join(FIXTURE, "model.onnx"));
        const manifest = JSON.parse(fs.readFileSync(path.join(FIXTURE, "manifest.json")));
        const ref = require(path.join(FIXTURE, "reference.json"));
        mockFetch({
            "GET /ml/device/K/models/m1/onnx/model.onnx": () => new Response(model, { status: 200 }),
            "GET /ml/device/K/models/m1/onnx/manifest.json": () => manifest,
        });
        const predictor = await edgeML.loadModel(URL, "K", "m1");
        const res = await predictor.predictWindow(ref.windows[0]);
        expect(res.index).toBe(ref.python_predictions[0]);
    });
});

describe("Data upload", () => {
    it("datasetCollector creates the dataset and uploads on completion with the labeling", async () => {
        const calls = mockFetch({
            "POST /api/v1/deviceapi/dataset/init/WRITE": () => ({ id: "ds1" }),
            "POST /api/v1/deviceapi/dataset/append/WRITE/ds1": () => null,
        });
        const collector = await edgeML.datasetCollector(URL, "WRITE", "rec", false, ["accX"], {}, "activities_walk");
        collector.addDataPoint(1000, "accX", 1.234);
        collector.addDataPoint(1010, "accX", 0);
        await collector.onComplete();

        expect(calls[0].body).toMatchObject({ name: "rec", timeSeries: ["accX"] });
        expect(calls[1].body).toEqual({
            data: [{ name: "accX", data: [[1000, 1.23], [1010, 0]] }],
            labeling: { labelingName: "activities", labelName: "walk" },
        });
        await expect(collector.onComplete()).rejects.toThrow("already uploaded");
    });

    it("datasetCollector validates input", async () => {
        mockFetch({ "POST /api/v1/deviceapi/dataset/init/WRITE": () => ({ id: "ds1" }) });
        const collector = await edgeML.datasetCollector(URL, "WRITE", "rec", true, ["accX"]);
        expect(() => collector.addDataPoint("accY", 1)).toThrow("invalid time-series name");
        expect(() => collector.addDataPoint("accX", "1")).toThrow("not a number");
    });

    it("sendDataset uploads a whole dataset", async () => {
        const calls = mockFetch({
            "POST /api/v1/deviceapi/dataset/init/WRITE": () => ({ id: "ds2" }),
            "POST /api/v1/deviceapi/dataset/append/WRITE/ds2": () => null,
        });
        const id = await edgeML.sendDataset(URL, "WRITE", {
            name: "whole",
            timeSeries: [{ name: "accX", data: [[1, 0.5], [2, 0.6]] }],
            labeling: "activities_run",
        });
        expect(id).toBe("ds2");
        expect(calls[0].body).toEqual({ name: "whole", metaData: {}, timeSeries: ["accX"] });
        expect(calls[1].body.labeling).toEqual({ labelingName: "activities", labelName: "run" });
    });

    it("reports authentication errors", async () => {
        mockFetch({
            "POST /api/v1/deviceapi/dataset/init/BAD": () => new Response(JSON.stringify({ detail: "Authentication failed" }), { status: 401 }),
        });
        await expect(edgeML.datasetCollector(URL, "BAD", "rec", true, ["accX"])).rejects.toThrow("401: Authentication failed");
    });
});
